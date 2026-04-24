import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import MapViewWrapper from '../../components/MapView';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';
import { GOOGLE_MAPS_API_KEY } from '../../config/generatedEnv';
import Geolocation from '@react-native-community/geolocation';
import { io, Socket } from 'socket.io-client';

const GOOGLE_API_KEY = GOOGLE_MAPS_API_KEY;

type FeedbackModalState = {
  visible: boolean;
  title: string;
  message: string;
  tone: 'success' | 'warning' | 'error';
};

const RideAcceptScreen = () => {
  const { user } = useAuth();
  const [locationReady, setLocationReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const acceptedRideRef = useRef<any>(null);
  const pendingRideRequestRef = useRef<any>(null);
  const pendingRideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [acceptedRide, setAcceptedRide] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(Number(user?.wallet?.balance || 0));
  const [currentLocation, setCurrentLocation] = useState('Detecting current location...');
  const [tripStatus, setTripStatus] = useState<'idle' | 'accepted' | 'started' | 'ended'>('idle');
  const [isEndingTrip, setIsEndingTrip] = useState(false);
  const [pendingRideRequest, setPendingRideRequest] = useState<any>(null);
  const [cancelledRideMessage, setCancelledRideMessage] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    visible: false,
    title: '',
    message: '',
    tone: 'success',
  });
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [region, setRegion] = useState({
    // latitude: 6.5244, // Default center
    // longitude: 3.3792,
    // latitudeDelta: 0.015,
    // longitudeDelta: 0.0121,
     latitude: 4.8156,
    longitude: 7.0498,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const getActiveRideId = () =>
    acceptedRideRef.current?.id || acceptedRideRef.current?.requestId || null;

  const normalizeRideType = useCallback((value: any) => {
    const normalizedValue = String(value || '').trim().toLowerCase();

    if (normalizedValue === 'xl') {
      return 'luxury';
    }

    return normalizedValue;
  }, []);

  const formatRideTypeLabel = useCallback((value: any) => {
    const normalizedValue = normalizeRideType(value);

    switch (normalizedValue) {
      case 'bike':
        return 'Delivery';
      case 'standard':
        return 'Standard';
      case 'luxury':
        return 'Luxury';
      case 'van':
        return 'Close Van';
      default:
        return 'Not specified';
    }
  }, [normalizeRideType]);

  const showFeedbackModal = useCallback(
    (title: string, message: string, tone: FeedbackModalState['tone'] = 'success') => {
      setFeedbackModal({
        visible: true,
        title,
        message,
        tone,
      });
    },
    []
  );

  const closeFeedbackModal = useCallback(() => {
    setFeedbackModal((current) => ({
      ...current,
      visible: false,
    }));
  }, []);

  const updateBackendLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await fetch(`${API_URL}/api/driver/update-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, latitude: lat, longitude: lng }),
      });
    } catch (error) {
      console.error('Failed to sync location with server:', error);
    }
  }, [user.id]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      setCurrentLocation('Updating current location...');
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();

      if (json.status === 'OK' && json.results.length > 0) {
        setCurrentLocation(json.results[0].formatted_address);
        return;
      }

      setCurrentLocation('Current location detected');
    } catch (error) {
      console.warn('Driver reverse geocode error', error);
      setCurrentLocation('Unable to fetch current location name');
    }
  }, []);

  const handleAccept = useCallback((rideData: any) => {
    const socket = socketRef.current;
    if (socket && rideData.riderId) {
      acceptedRideRef.current = rideData;
      setAcceptedRide(rideData);
      setTripStatus('accepted');
      setPendingRideRequest(null);
      console.log('[Socket] Emitting acceptRide for rider:', rideData.riderId);
      socket.emit('acceptRide', {
        requestId: rideData.requestId || null,
        riderId: String(rideData.riderId).trim(),
        riderSocketId: rideData.riderSocketId || null,
        driverSocketId: socket.id,
        driver: user,
      });
    }
  }, [user]);

  useEffect(() => {
    acceptedRideRef.current = acceptedRide;
  }, [acceptedRide]);

  useEffect(() => {
    setWalletBalance(Number(user?.wallet?.balance || 0));
  }, [user?.wallet?.balance]);

  useEffect(() => {
    let isMounted = true;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const loadWalletBalance = async () => {
      if (!user?.id) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/driver/wallet/${user.id}`);
        const data = await response.json();

        if (response.ok && isMounted) {
          setWalletBalance(Number(data?.wallet?.balance || 0));
        }
      } catch (error) {
        console.warn('RideAccept wallet fetch error:', error);
      }
    };

    loadWalletBalance();
    refreshInterval = setInterval(loadWalletBalance, 15000);

    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    pendingRideRequestRef.current = pendingRideRequest;
  }, [pendingRideRequest]);

  useEffect(() => {
    if (pendingRideTimeoutRef.current) {
      clearTimeout(pendingRideTimeoutRef.current);
      pendingRideTimeoutRef.current = null;
    }

    if (pendingRideRequest) {
      pendingRideTimeoutRef.current = setTimeout(() => {
        setPendingRideRequest((current: any) => {
          if (current?.requestId === pendingRideRequest.requestId) {
            return null;
          }

          return current;
        });
      }, 30000);
    }

    return () => {
      if (pendingRideTimeoutRef.current) {
        clearTimeout(pendingRideTimeoutRef.current);
        pendingRideTimeoutRef.current = null;
      }
    };
  }, [pendingRideRequest]);

  useEffect(() => {
    if (!user?.id) return;

    const newSocket = io(API_URL, {
      transports: ['websocket'],
      forceNew: false,
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      newSocket.emit('join', { userId: String(user.id), role: 'driver' });
    });

    newSocket.on('newRideRequest', (rideData: any) => {
      if (acceptedRideRef.current) {
        return;
      }

      const driverRideType = normalizeRideType(user?.ride_type || 'standard');
      const requestRideType = normalizeRideType(rideData?.rideType);

      if (requestRideType && driverRideType !== requestRideType) {
        return;
      }

      setPendingRideRequest(rideData);
    });

    newSocket.on('rideTaken', (payload: any) => {
      if (
        pendingRideRequestRef.current?.requestId &&
        payload?.requestId &&
        pendingRideRequestRef.current.requestId === payload.requestId
      ) {
        setPendingRideRequest(null);
      }

      if (
        acceptedRideRef.current?.id === payload?.requestId ||
        acceptedRideRef.current?.requestId === payload?.requestId
      ) {
        return;
      }
    });

    newSocket.on('rideAssigned', (payload: any) => {
      if (payload?.requestId) {
        acceptedRideRef.current = payload.ride;
        setAcceptedRide(payload.ride);
        setTripStatus('accepted');
      }
    });

    newSocket.on('rideUnavailable', (payload: any) => {
      showFeedbackModal(
        'Ride Unavailable',
        payload?.message || 'This ride is no longer available.',
        'warning'
      );
    });

    newSocket.on('rideCancelled', (payload: any) => {
      if (
        payload?.requestId &&
        acceptedRideRef.current?.requestId &&
        payload.requestId !== acceptedRideRef.current.requestId
      ) {
        return;
      }

      acceptedRideRef.current = null;
      setAcceptedRide(null);
      setTripStatus('idle');
      setPendingRideRequest(null);
      setCancelledRideMessage(payload?.message || 'The rider cancelled this trip.');
    });

    newSocket.on('rideRequestTimedOut', (payload: any) => {
      if (
        payload?.requestId &&
        pendingRideRequestRef.current?.requestId &&
        payload.requestId === pendingRideRequestRef.current.requestId
      ) {
        setPendingRideRequest(null);
      }
    });

    newSocket.on('tripStarted', (payload: any) => {
      if (!acceptedRideRef.current || payload?.requestId !== getActiveRideId()) {
        return;
      }
      setTripStatus('started');
    });

    newSocket.on('tripEnded', (payload: any) => {
      if (!acceptedRideRef.current || payload?.requestId !== getActiveRideId()) {
        return;
      }
      setIsEndingTrip(false);
      setTripStatus('ended');
      setAcceptedRide((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'completed',
            }
          : prev
      );
      showFeedbackModal(
        'Trip Ended',
        `Ride saved as completed. Fare: N${Number(payload?.fare || 0).toFixed(0)}. Driver earned: N${Number(
          payload?.earnedAmount ?? payload?.fare ?? 0
        ).toFixed(0)}. Commission: N${Number(payload?.commission || 0).toFixed(0)}.`,
        'success'
      );
    });

    newSocket.on('tripEndFailed', (payload: any) => {
      if (!acceptedRideRef.current || payload?.requestId !== getActiveRideId()) {
        return;
      }
      setIsEndingTrip(false);
      showFeedbackModal(
        'End Trip Failed',
        payload?.message || 'Could not complete this trip.',
        'error'
      );
    });

    return () => {
      if (pendingRideTimeoutRef.current) {
        clearTimeout(pendingRideTimeoutRef.current);
      }
      newSocket.off('rideAssigned');
      newSocket.off('rideUnavailable');
      newSocket.off('rideCancelled');
      newSocket.off('rideRequestTimedOut');
      newSocket.off('rideTaken');
      newSocket.off('newRideRequest');
      newSocket.off('tripStarted');
      newSocket.off('tripEnded');
      newSocket.off('tripEndFailed');
      socketRef.current = null;
      newSocket.disconnect();
    };
  }, [formatRideTypeLabel, handleAccept, normalizeRideType, showFeedbackModal, user?.id, user?.ride_type]);

  useEffect(() => {
    let watchId: number;

    const startTracking = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          showFeedbackModal(
            'Permission Denied',
            'Location access is needed to find rides near you.',
            'warning'
          );
          return;
        }
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setRegion((prev) => ({ ...prev, latitude, longitude }));
          setLocationReady(true);
          setCurrentLocation('Current location found. Naming location...');
          updateBackendLocation(latitude, longitude);
          reverseGeocode(latitude, longitude);
          if (socketRef.current && getActiveRideId()) {
            socketRef.current.emit('driverLocationUpdate', {
              requestId: getActiveRideId(),
              riderId: acceptedRideRef.current.rider_id || acceptedRideRef.current.riderId,
              driverId: user.id,
              latitude,
              longitude,
            });
          }
        },
        () => {
          setCurrentLocation('Trying to detect current location...');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );

      watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setRegion((prev) => ({ ...prev, latitude, longitude }));
          setLocationReady(true);
          setCurrentLocation('Current location found. Naming location...');
          updateBackendLocation(latitude, longitude);
          if (geocodeTimeoutRef.current) {
            clearTimeout(geocodeTimeoutRef.current);
          }
          geocodeTimeoutRef.current = setTimeout(() => {
            reverseGeocode(latitude, longitude);
          }, 300);
          if (socketRef.current && getActiveRideId()) {
            socketRef.current.emit('driverLocationUpdate', {
              requestId: getActiveRideId(),
              riderId: acceptedRideRef.current.rider_id || acceptedRideRef.current.riderId,
              driverId: user.id,
              latitude,
              longitude,
            });
          }
        },
        (error) => console.log('Location Error:', error),
        { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
      );
    };

    startTracking();
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
      if (watchId !== undefined) Geolocation.clearWatch(watchId);
    };
  }, [reverseGeocode, showFeedbackModal, updateBackendLocation, user.id]);

  const handleStartTrip = () => {
    const rideId = getActiveRideId();
    if (!socketRef.current || !rideId) return;

    const destinationLat =
      acceptedRideRef.current?.destination_lat ??
      acceptedRideRef.current?.destinationCoords?.latitude;
    const destinationLng =
      acceptedRideRef.current?.destination_lng ??
      acceptedRideRef.current?.destinationCoords?.longitude;

    socketRef.current.emit('startRide', {
      requestId: rideId,
      driverId: user.id,
    });
    setTripStatus('started');

    if (destinationLat && destinationLng) {
      const destination = `${destinationLat},${destinationLng}`;
      const googleNavigationUrl =
        Platform.OS === 'android'
          ? `google.navigation:q=${destination}&mode=d`
          : `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
      const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

      Linking.canOpenURL(googleNavigationUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(googleNavigationUrl);
          }

          return Linking.openURL(browserFallbackUrl);
        })
        .catch(() => {
          showFeedbackModal('Navigation Error', 'Could not open Google Maps.', 'error');
        });
      return;
    }

    showFeedbackModal(
      'Navigation Error',
      'Destination coordinates are not available for this trip.',
      'warning'
    );
  };

  const handleEndTrip = () => {
    const rideId = getActiveRideId();
    if (!socketRef.current || !rideId) return;

    setIsEndingTrip(true);
    socketRef.current.emit('completeRide', {
      requestId: rideId,
      driverId: user.id,
    });
  };

  const handleDoneTrip = () => {
    acceptedRideRef.current = null;
    setAcceptedRide(null);
    setTripStatus('idle');
    setIsEndingTrip(false);
  };

  const handleDriverCancelRide = () => {
    const rideId = getActiveRideId();
    if (!socketRef.current || !rideId) return;

    socketRef.current.emit('driverCancelRide', {
      requestId: rideId,
      driverId: user.id,
      riderId: acceptedRideRef.current?.rider_id || acceptedRideRef.current?.riderId,
      message: 'The driver cancelled this ride.',
    });

    acceptedRideRef.current = null;
    setAcceptedRide(null);
    setTripStatus('idle');
    setIsEndingTrip(false);
  };

  const getTripStatusLabel = () => {
    switch (tripStatus) {
      case 'accepted':
        return 'Accepted';
      case 'started':
        return 'Started';
      case 'ended':
        return 'Trip ended';
      default:
        return 'Idle';
    }
  };

  const feedbackAccentColor =
    feedbackModal.tone === 'error'
      ? '#d93025'
      : feedbackModal.tone === 'warning'
        ? '#b45309'
        : '#1f8b4c';
  const feedbackBackgroundColor =
    feedbackModal.tone === 'error'
      ? '#ffe9e7'
      : feedbackModal.tone === 'warning'
        ? '#fff4db'
        : '#eaf8ef';
  const feedbackIcon = feedbackModal.tone === 'error' ? '!' : feedbackModal.tone === 'warning' ? 'i' : '✓';
  const pendingRideAmount = Number(pendingRideRequest?.estimatedFare ?? pendingRideRequest?.fare ?? 0);
  const hasInsufficientBalance = pendingRideAmount > walletBalance;

  return (
    <View style={styles.container}>
      <MapViewWrapper
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      />

      <Modal visible={!!pendingRideRequest} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.requestModal}>
            <Text style={styles.requestModalTitle}>New Ride Request</Text>
            <View style={styles.requestInfoCard}>
              <Text style={styles.requestLabel}>Rider Phone</Text>
              <Text style={styles.requestValue}>
                {pendingRideRequest?.riderPhone || pendingRideRequest?.phone || 'Not available'}
              </Text>
            </View>
            <View style={styles.requestInfoCard}>
              <Text style={styles.requestLabel}>Pickup</Text>
              <Text style={styles.requestValue}>{pendingRideRequest?.pickupAddress}</Text>
            </View>
            <View style={styles.requestInfoCard}>
              <Text style={styles.requestLabel}>Destination</Text>
              <Text style={styles.requestValue}>{pendingRideRequest?.destinationAddress}</Text>
            </View>
            <View style={styles.requestInfoCard}>
              <Text style={styles.requestLabel}>Category</Text>
              <Text style={styles.requestValue}>
                {formatRideTypeLabel(pendingRideRequest?.rideType)}
              </Text>
            </View>
            <View style={styles.requestInfoCard}>
              <Text style={styles.requestLabel}>Trip Amount</Text>
              <Text style={styles.requestValue}>N{pendingRideAmount.toFixed(0)}</Text>
            </View>
            <View style={styles.requestInfoCard}>
              <Text style={styles.requestLabel}>Wallet Balance</Text>
              <Text style={styles.requestValue}>N{walletBalance.toFixed(2)}</Text>
            </View>
            {hasInsufficientBalance ? (
              <View style={styles.balanceWarningBox}>
                <Text style={styles.balanceWarningTitle}>Insufficient Balance</Text>
                <Text style={styles.balanceWarningText}>
                  This trip amount is greater than your wallet balance. Fund your wallet before accepting.
                </Text>
              </View>
            ) : null}
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => setPendingRideRequest(null)}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptButton, hasInsufficientBalance && styles.acceptButtonDisabled]}
                onPress={() => pendingRideRequest && handleAccept(pendingRideRequest)}
                disabled={hasInsufficientBalance}
              >
                <Text style={styles.acceptButtonText}>
                  {hasInsufficientBalance ? 'Insufficient Balance' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!cancelledRideMessage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.cancelledModal}>
            <View style={styles.cancelledIconWrap}>
              <Text style={styles.cancelledIcon}>!</Text>
            </View>
            <Text style={styles.cancelledTitle}>Ride Cancelled</Text>
            <Text style={styles.cancelledMessage}>{cancelledRideMessage}</Text>
            <TouchableOpacity
              style={styles.cancelledActionButton}
              onPress={() => setCancelledRideMessage('')}
            >
              <Text style={styles.cancelledActionText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={feedbackModal.visible} transparent animationType="fade" onRequestClose={closeFeedbackModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModal}>
            <View style={[styles.feedbackIconWrap, { backgroundColor: feedbackBackgroundColor }]}>
              <Text style={[styles.feedbackIconText, { color: feedbackAccentColor }]}>
                {feedbackIcon}
              </Text>
            </View>
            <Text style={styles.feedbackTitle}>{feedbackModal.title}</Text>
            <Text style={styles.feedbackMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={[styles.feedbackActionButton, { backgroundColor: feedbackAccentColor }]}
              onPress={closeFeedbackModal}
            >
              <Text style={styles.feedbackActionText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.statusCard}>
        <Text style={styles.statusText}>
          {acceptedRide ? 'Ride Accepted' : 'Searching for rides...'}
        </Text>
        {!locationReady ? <ActivityIndicator color="#fa9907" /> : null}
        <View style={styles.locationBox}>
          <Text style={styles.locationLabel}>Driver current location</Text>
          <Text style={styles.locationText}>
            {locationReady ? currentLocation : 'Detecting current location...'}
          </Text>
        </View>
        {acceptedRide ? (
          <View style={styles.rideBox}>
            <Text style={styles.rideLabel}>Accepted trip</Text>
            <Text style={styles.rideText}>Pickup: {acceptedRide.pickup_address || acceptedRide.pickupAddress}</Text>
            <Text style={styles.rideText}>To: {acceptedRide.destination_address || acceptedRide.destinationAddress}</Text>
            <Text style={styles.rideText}>
              Rider phone: {acceptedRide.rider_phone || acceptedRide.riderPhone || 'Not available'}
            </Text>
            <Text style={styles.rideText}>
              Category: {formatRideTypeLabel(acceptedRide.rideType)}
            </Text>
            <Text style={styles.rideText}>Trip status: {getTripStatusLabel()}</Text>
            {tripStatus === 'ended' ? (
              <Text style={styles.endedStatusText}>Database status: completed</Text>
            ) : null}
          </View>
        ) : null}
        {acceptedRide && tripStatus === 'accepted' ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleStartTrip}>
            <Text style={styles.actionButtonText}>Start Trip</Text>
          </TouchableOpacity>
        ) : null}
        {acceptedRide && tripStatus === 'started' ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleEndTrip} disabled={isEndingTrip}>
            <Text style={styles.actionButtonText}>
              {isEndingTrip ? 'Ending Trip...' : 'End Trip'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {acceptedRide && tripStatus !== 'ended' ? (
          <TouchableOpacity style={styles.cancelRideButton} onPress={handleDriverCancelRide}>
            <Text style={styles.cancelRideButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        ) : null}
        {acceptedRide && tripStatus === 'ended' ? (
          <TouchableOpacity style={styles.doneButton} onPress={handleDoneTrip}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.hintText}>Keep this screen open to receive requests</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  requestModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  cancelledModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  cancelledIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffe9e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cancelledIcon: {
    fontSize: 30,
    fontWeight: '800',
    color: '#d93025',
  },
  cancelledTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 10,
  },
  cancelledMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 22,
  },
  feedbackModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  feedbackIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedbackIconText: {
    fontSize: 32,
    fontWeight: '800',
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 22,
  },
  feedbackActionButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  feedbackActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelledActionButton: {
    width: '100%',
    backgroundColor: '#d93025',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelledActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  requestModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  requestInfoCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  requestLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a5800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  requestValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  balanceWarningBox: {
    backgroundColor: '#fff1f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f6b6b1',
  },
  balanceWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#d93025',
    marginBottom: 4,
  },
  balanceWarningText: {
    fontSize: 13,
    color: '#7a2520',
    lineHeight: 19,
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  declineButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    marginRight: 8,
  },
  declineButtonText: { color: '#333', fontWeight: '700', fontSize: 16 },
  acceptButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fa9907',
    marginLeft: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#f3c58c',
  },
  acceptButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statusCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    elevation: 10,
    alignItems: 'center',
  },
  statusText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  locationBox: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  locationLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6 },
  locationText: { fontSize: 13, color: '#555', lineHeight: 18 },
  rideBox: {
    width: '100%',
    backgroundColor: '#fff7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rideLabel: { fontSize: 14, fontWeight: '700', color: '#8a5800', marginBottom: 6 },
  rideText: { fontSize: 13, color: '#333', marginBottom: 4 },
  endedStatusText: { fontSize: 13, color: '#1f8b4c', fontWeight: '700', marginTop: 4 },
  actionButton: {
    width: '100%',
    backgroundColor: '#fa9907',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelRideButton: {
    width: '100%',
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelRideButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  doneButton: {
    width: '100%',
    backgroundColor: '#1f8b4c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  doneButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hintText: { fontSize: 14, color: '#888' },
});

export default RideAcceptScreen;
