import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Dimensions,
  Keyboard,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const GOOGLE_API_KEY = 'AIzaSyBKByWTDAzcGoKnnJ9tLRLr64khD8NBAKQ';
const API_URL = 'http://192.168.1.102:3001'; // Taken from Login.tsx. Ensure this is your correct server IP.

const { height } = Dimensions.get('window');

const RIDE_TYPES = [
  { id: 'bike', label: 'Bike', multiplier: 0.7, icon: 'two-wheeler' },
  { id: 'standard', label: 'Standard', multiplier: 1, icon: 'directions-car' },
  { id: 'xl', label: 'XL', multiplier: 1.5, icon: 'airport-shuttle' },
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

  const { user } = useAuth();
  const navigation = useNavigation<any>();

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
          Alert.alert('Location Error', error.message);
          setLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 20000 }
      );
    };

    requestLocation();
  }, []);

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
      }
    } catch {
      Alert.alert('Error fetching place details');
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

  // ============================
  // FIND DRIVER
  // ============================
  const handleFindDriver = async () => {
    if (!pickupCoords || !destinationCoords) {
      Alert.alert('Missing Location', 'Please select both pickup and destination.');
      return;
    }
    if (!user) {
      Alert.alert('Not Logged In', 'You need to be logged in to book a ride.');
      return;
    }

    setIsFindingDriver(true);

    const rideDetails = {
      riderId: user.id,
      pickupAddress: pickup,
      destinationAddress: destination,
      pickupLocation: {
        type: 'Point',
        coordinates: [pickupCoords.longitude, pickupCoords.latitude],
      },
      destinationLocation: {
        type: 'Point',
        coordinates: [destinationCoords.longitude, destinationCoords.latitude],
      },
      rideType: selectedRideType,
      estimatedFare: price,
      distance,
      status: 'REQUESTED',
    };

    try {
      // This endpoint is an assumption. Replace with your actual backend endpoint.
      const response = await fetch(`${API_URL}/api/rides/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${user.token}`, // Add if your API uses token auth
        },
        body: JSON.stringify(rideDetails),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to request ride. No drivers might be available.');
      }

      Alert.alert(
        'Request Sent',
        'Searching for a driver near you. You will be notified shortly.',
        [
          { text: 'OK', onPress: () => navigation.navigate('Home') }, // Navigate home or to a tracking screen
        ]
      );
    } catch (error: any) {
      Alert.alert('Request Error', error.message || 'Could not find a driver. Please try again later.');
    } finally {
      setIsFindingDriver(false);
    }
  };

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
        >
          {pickupCoords && <Marker coordinate={pickupCoords} title="Pickup" />}

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

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <Text style={styles.title}>Book Ride</Text>

        <TextInput
          placeholder="Enter Pickup"
          value={pickup}
          onChangeText={(text) => {
            setPickup(text);
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
          onChangeText={(text) => {
            setDestination(text);
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
              <MaterialIcons
                name={type.icon}
                size={24}
                color={selectedRideType === type.id ? '#fff' : '#333'}
              />
              <Text
                style={[
                  styles.rideTypeText,
                  selectedRideType === type.id && styles.selectedRideTypeText,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {distance > 0 && (
          <View style={styles.fareBox}>
            <Text style={styles.distanceText}>
              Distance: {distance.toFixed(2)} km
            </Text>
            <Text style={styles.priceText}>
              Estimated Fare: ₦{price.toFixed(0)}
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

      {loadingLocation && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  rideTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  selectedRideType: {
    backgroundColor: '#fa9907',
    borderColor: '#fa9907',
  },
  rideTypeText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  selectedRideTypeText: {
    color: '#fff',
  },
  fareBox: {
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  distanceText: { fontSize: 14 },
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
});
