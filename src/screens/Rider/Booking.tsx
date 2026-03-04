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

const GOOGLE_API_KEY = 'AIzaSyBKByWTDAzcGoKnnJ9tLRLr64khD8NBAKQ';

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

  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [selectedRideType, setSelectedRideType] = useState('standard');

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
    } catch (error) {
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

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Find Driver</Text>
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
  buttonText: { color: '#fff', fontWeight: 'bold' },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
});
