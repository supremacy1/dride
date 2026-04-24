import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Dimensions,
  Keyboard,
  Image,
  Modal,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';
import { GOOGLE_MAPS_API_KEY } from '../../config/generatedEnv';
import { io, Socket } from 'socket.io-client';

const GOOGLE_API_KEY = GOOGLE_MAPS_API_KEY;
// const API_URL = 'http://192.168.43.211:3001'; // Taken from Login.tsx. Ensure this is your correct server IP.

const { height } = Dimensions.get('window');

type FeedbackModalState = {
  visible: boolean;
  title: string;
  message: string;
  tone: 'success' | 'warning' | 'error';
};


const RIDE_TYPES = [
  { id: 'bike', label: 'Delivery', multiplier: 0.7, image: require('../../assets/db.jpg') },
  { id: 'standard', label: 'Standard', multiplier: 1, image: require('../../assets/car1.jpg') },
  { id: 'luxury', label: 'Luxury', multiplier: 1.25, image: require('../../assets/car2.jpg') },
  { id: 'van', label: 'Close Van', multiplier: 5.5, image: require('../../assets/van.png') },
];

const BookingScreen = () => {
  const [region, setRegion] = useState<any>(null);
  const [pickupCoords, setPickupCoords] = useState<any>(null);
  const [destinationCoords, setDestinationCoords] = useState<any>(null);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isFindingDriver, setIsFindingDriver] = useState(false);

  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [selectedRideType, setSelectedRideType] = useState('standard');
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showNoDriverModal, setShowNoDriverModal] = useState(false);
  const [showRideCancelledModal, setShowRideCancelledModal] = useState(false);
  const [showDriversModal, setShowDriversModal] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [acceptedDriver, setAcceptedDriver] = useState<any>(null);
  const [completedTrip, setCompletedTrip] = useState<any>(null);
  const [rideCancelledMessage, setRideCancelledMessage] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    visible: false,
    title: '',
    message: '',
    tone: 'success',
  });
  const [rideStatus, setRideStatus] = useState<'idle' | 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled'>('idle');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const isFindingRef = useRef(false);
  const findTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const acceptedRequestIdRef = useRef<string | null>(null);
  const acceptedDriverRef = useRef<any>(null);

  const { user } = useAuth();
  const driverProfileImagePath = acceptedDriver?.profile_picture_url || acceptedDriver?.profile_picture || null;
  const driverProfileImageUrl = driverProfileImagePath
    ? `${API_URL}/${driverProfileImagePath
        .replace(/\\/g, '/')
        .replace(/^src\/screens\/Auth\//i, '')
        .replace(/^public\//i, '')}`
    : null;

  const clearFindDriverTimeout = () => {
    if (findTimeoutRef.current) {
      clearTimeout(findTimeoutRef.current);
      findTimeoutRef.current = null;
    }
  };

  const showFeedbackModal = (
    title: string,
    message: string,
    tone: FeedbackModalState['tone'] = 'success'
  ) => {
    setFeedbackModal({
      visible: true,
      title,
      message,
      tone,
    });
  };

  const closeFeedbackModal = () => {
    setFeedbackModal((current) => ({
      ...current,
      visible: false,
    }));
  };

  const handleCancelAcceptedRide = () => {
    if (socketRef.current && acceptedDriver?.socketId) {
      socketRef.current.emit('cancelRide', {
        requestId: acceptedDriver.requestId || null,
        driverId: acceptedDriver.id,
        driverSocketId: acceptedDriver.socketId,
        riderId: user?.id,
        message: 'The rider cancelled this trip.',
      });
    }

    clearFindDriverTimeout();
    isFindingRef.current = false;
    activeRequestIdRef.current = null;
    acceptedRequestIdRef.current = null;
    setAcceptedDriver(null);
    setCompletedTrip(null);
    setRideStatus('cancelled');
    setRideCancelledMessage('Your ride request has been cancelled successfully.');
    setShowRideCancelledModal(true);
    setShowCancelConfirmModal(false);
  };

  useEffect(() => {
    acceptedRequestIdRef.current = acceptedDriver?.requestId ?? null;
    acceptedDriverRef.current = acceptedDriver;
  }, [acceptedDriver]);

  // ============================
  // INITIALIZE SOCKET
  // ============================
  useEffect(() => {
    if (!user?.id) return;

    const newSocket = io(API_URL, {
      transports: ['websocket'],
      forceNew: false,
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsSocketConnected(true);
      newSocket.emit('join', { userId: String(user.id), role: 'rider' });
    });
    newSocket.on('disconnect', () => setIsSocketConnected(false));

    newSocket.on('rideAccepted', (payload: any) => {
      const acceptedRequestId = payload?.requestId ?? null;
      const driverData = payload?.driver ?? payload;

      if (
        acceptedRequestId &&
        activeRequestIdRef.current &&
        acceptedRequestId !== activeRequestIdRef.current
      ) {
        return;
      }

      clearFindDriverTimeout();
      isFindingRef.current = false;
      activeRequestIdRef.current = null;
      setIsFindingDriver(false);
      setAcceptedDriver(driverData);
      setCompletedTrip(null);
      setRideStatus('accepted');
      acceptedRequestIdRef.current = driverData?.requestId ?? null;
    });

    newSocket.on('rideDriverLocation', (payload: any) => {
      if (!payload?.requestId) return;

      setAcceptedDriver((prev: any) => {
        if (!prev || prev.requestId !== payload.requestId) {
          return prev;
        }

        return {
          ...prev,
          current_lat: payload.latitude,
          current_lng: payload.longitude,
        };
      });
    });

    newSocket.on('tripStarted', (payload: any) => {
      if (acceptedRequestIdRef.current && payload?.requestId !== acceptedRequestIdRef.current) {
        return;
      }

      setRideStatus('started');
      showFeedbackModal(
        'Trip Started',
        payload?.message || 'Your driver has started the trip.',
        'success'
      );
    });

    newSocket.on('tripEnded', (payload: any) => {
      if (acceptedRequestIdRef.current && payload?.requestId !== acceptedRequestIdRef.current) {
        return;
      }

      setRideStatus('completed');
      setCompletedTrip({
        driver: acceptedDriverRef.current,
        fare: payload?.fare || 0,
      });
      showFeedbackModal(
        'Trip Completed',
        `Payment recorded: N${Number(payload?.fare || 0).toFixed(0)}`,
        'success'
      );
      acceptedRequestIdRef.current = null;
      activeRequestIdRef.current = null;
      setAcceptedDriver(null);
    });

    newSocket.on('rideCancelled', (payload: any) => {
      if (acceptedRequestIdRef.current && payload?.requestId !== acceptedRequestIdRef.current) {
        return;
      }

      setRideStatus('cancelled');
      acceptedRequestIdRef.current = null;
      activeRequestIdRef.current = null;
      setAcceptedDriver(null);
      setRideCancelledMessage(payload?.message || 'This ride has been cancelled.');
      setShowRideCancelledModal(true);
    });

    newSocket.on('rideRequestTimedOut', (payload: any) => {
      if (payload?.requestId && activeRequestIdRef.current && payload.requestId !== activeRequestIdRef.current) {
        return;
      }

      clearFindDriverTimeout();
      isFindingRef.current = false;
      activeRequestIdRef.current = null;
      setIsFindingDriver(false);
      setRideStatus('idle');
      setShowRideCancelledModal(false);
      setRideCancelledMessage('');
      setShowNoDriverModal(true);
    });

    newSocket.on('driverRideCancelled', (payload: any) => {
      if (acceptedRequestIdRef.current && payload?.requestId !== acceptedRequestIdRef.current) {
        return;
      }

      setRideStatus('cancelled');
      acceptedRequestIdRef.current = null;
      activeRequestIdRef.current = null;
      setAcceptedDriver(null);
      setRideCancelledMessage(payload?.message || 'The driver cancelled this ride.');
      setShowRideCancelledModal(true);
    });

    newSocket.on('rideRequestFailed', (payload: any) => {
      if (activeRequestIdRef.current && payload?.requestId !== activeRequestIdRef.current) {
        return;
      }

      clearFindDriverTimeout();
      isFindingRef.current = false;
      activeRequestIdRef.current = null;
      setIsFindingDriver(false);
      setRideStatus('idle');
      showFeedbackModal(
        'Request Error',
        payload?.message || 'Could not create ride request.',
        'error'
      );
    });

    return () => {
      clearFindDriverTimeout();
      newSocket.off('rideDriverLocation');
      newSocket.off('tripStarted');
      newSocket.off('tripEnded');
      newSocket.off('rideCancelled');
      newSocket.off('rideRequestTimedOut');
      newSocket.off('driverRideCancelled');
      newSocket.off('rideRequestFailed');
      socketRef.current = null;
      newSocket.disconnect();
    };
  }, [user?.id]);

  // ============================
  // GET CURRENT LOCATION
  // ============================
  useEffect(() => {
    const requestLocation = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
      }

      setLoadingLocation(true);

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          const currentRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };

          setRegion(currentRegion);
          setPickupCoords({ latitude, longitude });
          reverseGeocode(latitude, longitude);
          setLoadingLocation(false);
        },
        (error) => {
          showFeedbackModal('Location Error', error.message, 'error');
          setLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 20000 }
      );
    };

    requestLocation();
  }, []);

  // ============================
  // POLL FOR NEARBY DRIVERS
  // ============================
  useEffect(() => {
    let interval: any;
    const fetchNearby = async () => {
      if (pickupCoords) {
        try {
          const response = await fetch(
            `${API_URL}/api/driver/nearby?lat=${pickupCoords.latitude}&lng=${pickupCoords.longitude}&radius=10&rideType=${encodeURIComponent(selectedRideType)}`
          );
          const data = await response.json();
          if (response.ok && Array.isArray(data)) {
            setNearbyDrivers(data);
          }
        } catch (error) {
          console.warn('Error fetching nearby drivers', error);
        }
      }
    };

    if (pickupCoords && !acceptedDriver) { 
      fetchNearby(); 
      interval = setInterval(fetchNearby, 5000); // Poll every 5 seconds for smoother Bolt-like feel
    }
    return () => clearInterval(interval);
  }, [pickupCoords, acceptedDriver, selectedRideType]);

  // ============================
  // REVERSE GEOCODE
  // ============================
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.status === 'OK' && json.results.length > 0) {
        setPickup(json.results[0].formatted_address);
      }
    } catch (error) {
      console.warn('Reverse geocode error', error);
    }
  };

  // ============================
  // AUTOCOMPLETE & PLACES
  // ============================
  const fetchSuggestions = async (input: string, type: 'pickup' | 'destination') => {
    if (input.length < 2) {
      if (type === 'pickup') setPickupSuggestions([]);
      else setDestinationSuggestions([]);
      return;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${GOOGLE_API_KEY}&components=country:ng`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.status === 'OK') {
        if (type === 'pickup') setPickupSuggestions(json.predictions);
        else setDestinationSuggestions(json.predictions);
      }
    } catch (error) {
      console.warn('Autocomplete error', error);
    }
  };

  const handleSelectPlace = async (placeId: string, description: string, type: 'pickup' | 'destination') => {
    Keyboard.dismiss();
    if (type === 'pickup') {
      setPickup(description);
      setPickupSuggestions([]);
    } else {
      setDestination(description);
      setDestinationSuggestions([]);
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.status === 'OK') {
        const location = json.result.geometry.location;
        const coords = { latitude: location.lat, longitude: location.lng };
        if (type === 'pickup') setPickupCoords(coords);
        else setDestinationCoords(coords);
        setIsEditingRoute(false);
      }
    } catch {
      showFeedbackModal('Place Error', 'Error fetching place details.', 'error');
    }
  };

  // ============================
  // PRICE CALCULATION
  // ============================
  useEffect(() => {
    if (distance > 0) {
      setPrice(calculatePrice(distance, selectedRideType));
    }
  }, [distance, selectedRideType]);

  const calculatePrice = (km: number, typeId: string) => {
    const type = RIDE_TYPES.find((t) => t.id === typeId);
    const multiplier = type ? type.multiplier : 1;
    const baseFare = 500; // ₦500 base
    const perKm = 250;    // ₦250 per km
    return (baseFare + km * perKm) * multiplier;
  };

  const formatPrice = (amount: number) => `NGN ${amount.toFixed(0)}`;

  // ============================
  // FIND DRIVER
  // ============================
  const handleFindDriver = async () => {
    if (!pickupCoords || !destinationCoords) {
      showFeedbackModal('Missing Location', 'Please select both pickup and destination.', 'warning');
      return;
    }
    if (!user) {
      showFeedbackModal('Not Logged In', 'You need to be logged in to book a ride.', 'warning');
      return;
    }

    if (!isSocketConnected) {
      showFeedbackModal(
        'Connection Error',
        'Reconnecting to server. Please try again in a moment.',
        'warning'
      );
      return;
    }

    setIsFindingDriver(true);
    isFindingRef.current = true;
    setAcceptedDriver(null);
    setRideStatus('pending');
    clearFindDriverTimeout();

    const requestId = `ride-${user.id}-${Date.now()}`;
    activeRequestIdRef.current = requestId;

    try {
      // Step 2: Still broadcast the request via Socket for real-time acceptance
      if (socketRef.current) {
        socketRef.current.emit('requestRide', {
          requestId,
          riderId: user.id,
          riderSocketId: socketRef.current.id,
          pickupAddress: pickup,
          destinationAddress: destination,
          pickupCoords,
          destinationCoords,
          rideType: selectedRideType,
          estimatedFare: price,
          distance,
        });
      }

      // Step 3: Wait for a driver to accept. Clear this if driver accepts earlier.
      findTimeoutRef.current = setTimeout(() => {
        if (isFindingRef.current && activeRequestIdRef.current === requestId) {
          socketRef.current?.emit('rideRequestTimeout', {
            requestId,
            riderId: user.id,
            message: 'No driver accepted this ride request in time.',
          });
          clearFindDriverTimeout();
          isFindingRef.current = false;
          activeRequestIdRef.current = null;
          setIsFindingDriver(false);
          setRideStatus('idle');
          setShowRideCancelledModal(false);
          setRideCancelledMessage('');
          setShowNoDriverModal(true);
        }
      }, 30000);
    } catch {
      clearFindDriverTimeout();
      setIsFindingDriver(false);
      isFindingRef.current = false;
      activeRequestIdRef.current = null;
      setRideStatus('idle');
      showFeedbackModal(
        'Request Error',
        'Could not search for drivers. Please try again.',
        'error'
      );
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

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
        >
          {pickupCoords && <Marker coordinate={pickupCoords} title="Pickup" />}

          {/* Nearby Drivers Markers - Explicitly parsing strings to numbers */}
          {!acceptedDriver && nearbyDrivers.map((driver) => (
            <Marker
              key={driver.id}
              coordinate={{
                latitude: Number(driver.current_lat),
                longitude: Number(driver.current_lng),
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              title={driver.fullname}
            >
              <MaterialIcons name="directions-car" size={30} color="#fa9907" />
            </Marker>
          ))}

          {destinationCoords && (
            <Marker coordinate={destinationCoords} title="Destination" />
          )}

          {pickupCoords && destinationCoords && (
            <MapViewDirections
              origin={pickupCoords}
              destination={destinationCoords}
              apikey={GOOGLE_API_KEY}
              strokeWidth={4}
              strokeColor="black"
              onReady={(result) => {
                setDistance(result.distance);
              }}
            />
          )}
        </MapView>
      )}

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
              style={[styles.feedbackButton, { backgroundColor: feedbackAccentColor }]}
              onPress={closeFeedbackModal}
            >
              <Text style={styles.feedbackButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Accepted Driver UI */}
      {acceptedDriver ? (
        <View style={styles.acceptedDriverCard}>
          <View style={styles.driverHeader}>
            {driverProfileImageUrl ? (
              <Image source={{ uri: driverProfileImageUrl }} style={styles.driverAvatar} />
            ) : (
              <View style={styles.driverAvatarFallback}>
                <MaterialIcons name="person" size={34} color="#ccc" />
              </View>
            )}
            <View style={styles.driverInfoContainer}>
              <Text style={styles.acceptedDriverName}>{acceptedDriver.fullname}</Text>
              <Text style={styles.driverCarInfo}>
                {acceptedDriver.car_model} • {acceptedDriver.car_plate} . {acceptedDriver.car_color} 
              </Text>
              <Text style={styles.driverPhoneText}>
                Phone: {acceptedDriver.phone || 'Not available'}
              </Text>
              <Text style={styles.driverTripStatus}>
                Status: {rideStatus === 'started' ? 'Trip started' : 'Driver assigned'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.callIcon}
              onPress={() => Linking.openURL(`tel:${acceptedDriver.phone}`)}
            >
              <MaterialIcons name="phone" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowCancelConfirmModal(true)}
          >
            <Text style={styles.cancelBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>
      ) : completedTrip && rideStatus === 'completed' ? (
        <View style={styles.acceptedDriverCard}>
          <View style={styles.driverHeader}>
            <MaterialIcons name="check-circle" size={50} color="#1f8b4c" />
            <View style={styles.driverInfoContainer}>
              <Text style={styles.acceptedDriverName}>Trip Completed</Text>
              <Text style={styles.driverCarInfo}>
                Driver: {completedTrip.driver?.fullname || 'Assigned driver'}
              </Text>
              <Text style={styles.driverTripStatus}>
                Payment recorded: N{Number(completedTrip.fare || 0).toFixed(0)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.doneTripBtn}
            onPress={() => {
              setCompletedTrip(null);
              setRideStatus('idle');
            }}
          >
            <Text style={styles.doneTripBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Bottom Selection Card */
        <View style={styles.bottomCard}>
        <Text style={styles.title}>Book Ride</Text>

        <TextInput
          placeholder="Enter Pickup"
          value={pickup}
          onFocus={() => setIsEditingRoute(true)}
          onChangeText={(text) => {
            setIsEditingRoute(true);
            setPickup(text);
            setPickupCoords(null);
            fetchSuggestions(text, 'pickup');
          }}
          style={styles.input}
        />
        {pickupSuggestions.length > 0 && (
          <FlatList
            data={pickupSuggestions}
            keyExtractor={(item) => item.place_id}
            style={styles.suggestionsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectPlace(item.place_id, item.description, 'pickup')}
              >
                <Text>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        <TextInput
          placeholder="Enter Destination"
          value={destination}
          onFocus={() => setIsEditingRoute(true)}
          onChangeText={(text) => {
            setIsEditingRoute(true);
            setDestination(text);
            setDestinationCoords(null);
            fetchSuggestions(text, 'destination');
          }}
          style={styles.input}
        />
        {destinationSuggestions.length > 0 && (
          <FlatList
            data={destinationSuggestions}
            keyExtractor={(item) => item.place_id}
            style={styles.suggestionsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectPlace(item.place_id, item.description, 'destination')}
              >
                <Text>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {destinationCoords && !isEditingRoute ? (
          <>
            {/* Ride Type Selector */}
            <View style={styles.rideTypeContainer}>
              {RIDE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.rideTypeOption,
                    selectedRideType === type.id && styles.selectedRideType,
                  ]}
                  onPress={() => setSelectedRideType(type.id)}
                >
                  <Image source={type.image} style={styles.rideTypeImage} />
                  <View style={styles.rideTypeDetails}>
                    <Text
                      style={[
                        styles.rideTypeText,
                        selectedRideType === type.id && styles.selectedRideTypeText,
                      ]}
                    >
                      {type.label}
                    </Text>
                    <Text style={styles.rideTypeSubtext}>
                      {type.id === 'bike'
                        ? 'Fast package delivery'
                         : type.id === 'standard'
                        ? 'Premium comfort ride'
                        : type.id === 'luxury'
                        ? 'Luxury comfort ride'
                        : type.id === 'van'
                        ? 'Affordable for Relocation '
                        : 'Affordable for Relocation '}
                    </Text>
                  </View>
                  <View style={styles.rideTypeFareWrap}>
                    <Text
                      style={[
                        styles.rideTypeFare,
                        selectedRideType === type.id && styles.selectedRideTypeFareSelected,
                      ]}
                    >
                      {distance > 0 ? formatPrice(calculatePrice(distance, type.id)) : 'Set route'}
                    </Text>
                    <Text style={styles.rideTypeFareHint}>
                      {selectedRideType === type.id ? 'Selected' : 'Tap to choose'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {distance > 0 && (
              <View style={styles.fareBox}>
                <Text style={styles.distanceText}>
                  Distance: {distance.toFixed(2)} km
                </Text>
                <Text style={styles.priceText}>
                  Selected Ride: {formatPrice(price)}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.fareBox}>
            <Text style={styles.distanceText}>
              {isEditingRoute ? 'Finish typing your route' : 'Choose your destination first'}
            </Text>
            <Text style={styles.rideTypeHintText}>
              {isEditingRoute
                ? 'Ride options will come back after you select the location.'
                : 'Ride options will show after you select where you are going.'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (isFindingDriver || !pickupCoords || !destinationCoords) && styles.buttonDisabled]}
          onPress={handleFindDriver}
          disabled={isFindingDriver || !pickupCoords || !destinationCoords}
        >
          {isFindingDriver ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Find Driver</Text>
          )}
        </TouchableOpacity>
        </View>
      )}

      {loadingLocation && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}

      <Modal visible={showDriversModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nearby Drivers</Text>
            <FlatList
              data={nearbyDrivers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.driverItem}>
                  <View style={styles.driverMeta}>
                    <Text style={styles.driverName}>{item.fullname}</Text>
                    <Text style={styles.driverCar}>{item.car_model} - {item.car_plate} - {item.car_color}</Text>
                    <Text style={styles.driverDistance}>{item.distance.toFixed(2)} km away</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  >
                    <MaterialIcons name="phone" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDriversModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCancelConfirmModal} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.cancelModalContent}>
            <Text style={styles.modalTitle}>Cancel Ride?</Text>
            <Text style={styles.cancelModalText}>
              Are you sure you want to cancel this ride request?
            </Text>
            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={styles.cancelModalSecondaryButton}
                onPress={() => setShowCancelConfirmModal(false)}
              >
                <Text style={styles.cancelModalSecondaryText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelModalPrimaryButton}
                onPress={handleCancelAcceptedRide}
              >
                <Text style={styles.cancelModalPrimaryText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNoDriverModal} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.noDriverModalContent}>
            <View style={styles.noDriverIconWrap}>
              <MaterialIcons name="search-off" size={34} color="#fa9907" />
            </View>
            <Text style={styles.noDriverTitle}>No Driver Accepted</Text>
            <Text style={styles.noDriverText}>
              No driver accepted your request right now. Please try again in a moment.
            </Text>
            <TouchableOpacity
              style={styles.noDriverButton}
              onPress={() => setShowNoDriverModal(false)}
            >
              <Text style={styles.noDriverButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRideCancelledModal} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.rideCancelledModalContent}>
            <View style={styles.rideCancelledIconWrap}>
              <MaterialIcons name="cancel" size={34} color="#f44336" />
            </View>
            <Text style={styles.rideCancelledTitle}>Ride Cancelled</Text>
            <Text style={styles.rideCancelledText}>
              {rideCancelledMessage || 'This ride has been cancelled.'}
            </Text>
            <TouchableOpacity
              style={styles.rideCancelledButton}
              onPress={() => {
                setShowRideCancelledModal(false);
                setRideCancelledMessage('');
                setRideStatus('idle');
              }}
            >
              <Text style={styles.rideCancelledButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BookingScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { height: height * 0.55 },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  suggestionsList: {
    maxHeight: 100,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rideTypeContainer: {
    flexDirection: 'column',
    marginBottom: 15,
    gap: 10,
  },
  rideTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  selectedRideType: {
    backgroundColor: '#fff8ef',
    borderColor: '#fa9907',
    borderWidth: 2,
  },
  rideTypeImage: {
    width: 58,
    height: 58,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  rideTypeDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  rideTypeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  rideTypeSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },
  rideTypeFareWrap: {
    alignItems: 'flex-end',
  },
  rideTypeFare: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  rideTypeFareHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#888',
  },
  selectedRideTypeText: {
    color: '#0e0d0d',
    fontWeight: 'bold',
  },
  selectedRideTypeFareSelected: {
    color: '#fa9907',
  },
  fareBox: {
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  distanceText: { fontSize: 14 },
  rideTypeHintText: { fontSize: 13, color: '#666', marginTop: 4 },
  priceText: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  button: {
    backgroundColor: '#fa9907',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#fccb7c',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#fa9907',
  },
  cancelModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  cancelModalText: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  noDriverModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  noDriverIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff4e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noDriverTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  noDriverText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  noDriverButton: {
    width: '100%',
    backgroundColor: '#fa9907',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  noDriverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rideCancelledModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  rideCancelledIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fdeceb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rideCancelledTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  rideCancelledText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  rideCancelledButton: {
    width: '100%',
    backgroundColor: '#f44336',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  rideCancelledButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  feedbackButton: {
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelModalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelModalPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f44336',
  },
  cancelModalSecondaryText: {
    color: '#333',
    fontWeight: '700',
  },
  cancelModalPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  driverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverCar: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  driverDistance: {
    fontSize: 12,
    color: '#fa9907',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 25,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#fa9907',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalFooter: {
    marginTop: 20,
  },
  requestButton: {
    backgroundColor: '#fa9907',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptedDriverCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  driverInfoContainer: { flex: 1, marginLeft: 10 },
  driverMeta: { flex: 1 },
  driverHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  driverAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptedDriverName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  driverCarInfo: { fontSize: 15, color: '#666' },
  driverPhoneText: { fontSize: 14, color: '#444', marginTop: 4 },
  driverTripStatus: { fontSize: 13, color: '#1f8b4c', marginTop: 4, fontWeight: '600' },
  callIcon: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 30,
    elevation: 4,
  },
  cancelBtn: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  doneTripBtn: {
    backgroundColor: '#1f8b4c',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneTripBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

