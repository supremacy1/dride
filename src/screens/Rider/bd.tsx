import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import Geolocation from '@react-native-community/geolocation';

const GOOGLE_API_KEY = 'AIzaSyBKByWTDAzcGoKnnJ9tLRLr64khD8NBAKQ'; // Replace with your actual key
const PLACES_AUTOCOMPLETE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const BookingScreen = ({ navigation: _navigation }: { navigation: any }) => {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const { signOut } = useAuth();

  // --- Request location and fetch coordinates ---
  useEffect(() => {
    let isMounted = true;

    const requestAndFetch = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'EasyRide needs access to your location to detect your pickup point.',
              buttonPositive: 'OK',
              buttonNegative: 'Cancel',
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Location permission denied');
            return;
          }
        }

        Geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted) return;
            const { latitude, longitude } = pos.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
          },
          (error) => {
            console.warn('Geolocation error:', error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      } catch (err) {
        console.warn('Geolocation failed:', err);
      }
    };

    requestAndFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Reverse geocode current coordinates ---
  useEffect(() => {
    if (currentCoords) {
      setIsDetectingLocation(true);
      fetchCurrentAddress(currentCoords.lat, currentCoords.lng).finally(() => {
        setIsDetectingLocation(false);
      });
    }
  }, [currentCoords]);

  const fetchCurrentAddress = async (lat: number, lng: number) => {
    try {
      const url = `${GEOCODE_URL}?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json && json.status === 'OK' && json.results.length > 0) {
        const addr = json.results[0].formatted_address;
        setPickup(prev => (prev && prev !== 'Current location...' ? prev : addr));
      } else {
        const coordStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setPickup(prev => (prev && prev !== 'Current location...' ? prev : coordStr));
      }
    } catch (e) {
      console.warn('Reverse geocode error', e);
    }
  };

  // --- Fetch autocomplete suggestions ---
  const fetchSuggestions = async (input: string, setter: (v: any[]) => void) => {
    if (!input || input.length < 2 || !GOOGLE_API_KEY) {
      setter([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const session = Math.random().toString(36).slice(2);
      const url = `${PLACES_AUTOCOMPLETE}?input=${encodeURIComponent(
        input
      )}&key=${GOOGLE_API_KEY}&language=en&types=geocode&sessiontoken=${session}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status === 'OK' && Array.isArray(json.predictions)) {
        setter(json.predictions);
      } else if (json.status === 'ZERO_RESULTS') {
        setter([]);
      } else {
        console.warn('Places autocomplete returned status', json.status, json.error_message);
        Alert.alert('Location lookup error', json.error_message || json.status || 'Unknown error');
        setter([]);
      }
    } catch (e) {
      console.warn('Places autocomplete error', e);
      setter([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const onSelectPlace = async (placeId: string, forField: 'pickup' | 'destination') => {
    try {
      const url = `${PLACE_DETAILS}?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=formatted_address,name,geometry`;
      const res = await fetch(url);
      const json = await res.json();

      if (json && (json.status === 'OK' || json.result)) {
        const result = json.result || json;
        const addr = result.formatted_address || result.name || '';
        if (forField === 'pickup') {
          setPickup(addr);
          setPickupSuggestions([]);
        } else {
          setDestination(addr);
          setDestinationSuggestions([]);
        }
      } else {
        console.warn('Place details lookup failed', json?.status, json?.error_message);
        Alert.alert('Place lookup error', json?.error_message || json?.status || 'Unable to resolve place');
      }
    } catch (e) {
      console.warn('Place details error', e);
    }
  };

  const handleFindDriver = () => {
    if (!pickup || !destination) {
      Alert.alert('Missing information', 'Please enter both pickup and destination.');
      return;
    }
    Alert.alert('No drivers available', 'Sorry — there are no drivers nearby right now.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book a Ride</Text>

      <Text style={styles.label}>Pickup</Text>
      <View style={styles.inputRow}>
        <MaterialIcons name="my-location" size={20} color="#fa9907ff" style={styles.inputIcon} />
        <TextInput
          value={pickup}
          onChangeText={(t) => {
            setPickup(t);
            fetchSuggestions(t, setPickupSuggestions);
          }}
          placeholder={isDetectingLocation ? 'Detecting your location...' : 'Enter pickup location'}
          style={styles.inputFlex}
        />
      </View>
      {loadingSuggestions ? <ActivityIndicator /> : null}
      {pickupSuggestions.length > 0 && (
        <FlatList
          data={pickupSuggestions}
          keyExtractor={(item) => item.place_id}
          style={styles.suggestions}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => onSelectPlace(item.place_id, 'pickup')}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.label}>Destination</Text>
      <View style={styles.inputRow}>
        <MaterialIcons name="place" size={20} color="#fa9907ff" style={styles.inputIcon} />
        <TextInput
          value={destination}
          onChangeText={(t) => {
            setDestination(t);
            fetchSuggestions(t, setDestinationSuggestions);
          }}
          placeholder="Enter destination"
          style={styles.inputFlex}
        />
      </View>
      {destinationSuggestions.length > 0 && (
        <FlatList
          data={destinationSuggestions}
          keyExtractor={(item) => item.place_id}
          style={styles.suggestions}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => onSelectPlace(item.place_id, 'destination')}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.findBtn} onPress={handleFindDriver}>
        <MaterialIcons name="search" size={18} color="#fff" style={styles.findBtnIcon} />
        <Text style={styles.findBtnText}>Find Driver</Text>
      </TouchableOpacity>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Note: location suggestions require a Google Maps Places API key.
        </Text>
      </View>

      {/* Bottom navigation bar */}
      <View style={styles.bottomBarContainer}>
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => _navigation.navigate('Home')}
          >
            <MaterialIcons name="home" size={18} color="#fa9907ff" />
            <Text style={styles.bottomLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => _navigation.navigate('Settings')}
          >
            <MaterialIcons name="person" size={18} color="#fa9907ff" />
            <Text style={styles.bottomLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomButton} onPress={signOut}>
            <MaterialIcons name="logout" size={18} color="#fa9907ff" />
            <Text style={styles.bottomLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600' },
  suggestions: { maxHeight: 160, marginTop: 6, marginBottom: 6 },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  findBtn: { marginTop: 20, backgroundColor: '#fa9907ff', padding: 12, borderRadius: 8, alignItems: 'center' },
  findBtnText: { color: '#fff', fontWeight: '600' },
  noteBox: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 6 },
  noteText: { color: '#555', fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputIcon: { marginRight: 8 },
  inputFlex: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8 },
  findBtnIcon: { marginRight: 8 },
  bottomBarContainer: { position: 'absolute', bottom: 16, width: '90%', alignSelf: 'center' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 12, width: '100%', alignItems: 'center' },
  bottomButton: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  bottomLabel: { fontSize: 12, marginTop: 4 },
});

export default BookingScreen;