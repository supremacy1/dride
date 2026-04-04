import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
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
import Geolocation from '@react-native-community/geolocation';
import { io, Socket } from 'socket.io-client';

const GOOGLE_API_KEY = 'AIzaSyBKByWTDAzcGoKnnJ9tLRLr64khD8NBAKQ';

const RideAcceptScreen = () => {
  const { user } = useAuth();
  const [locationReady, setLocationReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const acceptedRideRef = useRef<any>(null);
  const [acceptedRide, setAcceptedRide] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState('Detecting current location...');
  const [tripStatus, setTripStatus] = useState<'idle' | 'accepted' | 'started' | 'ended'>('idle');
  const [isEndingTrip, setIsEndingTrip] = useState(false);
  const [pendingRideRequest, setPendingRideRequest] = useState<any>(null);
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
      setPendingRideRequest(rideData);
    });

    newSocket.on('rideTaken', (payload: any) => {
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
      Alert.alert('Ride Unavailable', payload?.message || 'This ride is no longer available.');
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
      Alert.alert(
        'Ride Cancelled',
        payload?.message || 'The rider cancelled this trip.'
      );
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
      Alert.alert(
        'Trip Ended',
        `Ride saved as completed in the database. Fare earned: N${Number(
          payload?.fare || 0
        ).toFixed(0)}`
      );
    });

    newSocket.on('tripEndFailed', (payload: any) => {
      if (!acceptedRideRef.current || payload?.requestId !== getActiveRideId()) {
        return;
      }
      setIsEndingTrip(false);
      Alert.alert('End Trip Failed', payload?.message || 'Could not complete this trip.');
    });

    return () => {
      newSocket.off('rideAssigned');
      newSocket.off('rideUnavailable');
      newSocket.off('rideCancelled');
      newSocket.off('rideTaken');
      newSocket.off('newRideRequest');
      newSocket.off('tripStarted');
      newSocket.off('tripEnded');
      newSocket.off('tripEndFailed');
      socketRef.current = null;
      newSocket.disconnect();
    };
  }, [handleAccept, user?.id]);

  useEffect(() => {
    let watchId: number;

    const startTracking = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location access is needed to find rides near you.');
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
  }, [reverseGeocode, updateBackendLocation, user.id]);

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
          Alert.alert('Navigation Error', 'Could not open Google Maps.');
        });
      return;
    }

    Alert.alert('Navigation Error', 'Destination coordinates are not available for this trip.');
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
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => setPendingRideRequest(null)}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => pendingRideRequest && handleAccept(pendingRideRequest)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
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
