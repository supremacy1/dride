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
// Use a maintained geolocation package. Install `react-native-geolocation-service`.
// Lazy-loaded at runtime to avoid import-time native crashes when the
// native module is missing/unlinked.
// import Geolocation from 'react-native-geolocation-service';
// NOTE: You must provide a Google Maps Places API key. For development we
// expose it via `src/config/generatedEnv.ts`. That file should export
// `GOOGLE_MAPS_API_KEY` (this is a quick dev helper — don't commit secrets in
// production). For your convenience, I'm adding the key you provided.
// import { GOOGLE_MAPS_API_KEY as GOOGLE_API_KEY } from '../../config/generatedEnv';
 
// --- Temporary API Key for local testing ---
//const GOOGLE_API_KEY = 'AIzaSyC-2ySlslZZ7Yahh63B_qf7QpwlumElQnU'; // Replace with your actual key
 
const GOOGLE_API_KEY = 'AIzaSyBKByWTDAzcGoKnnJ9tLRLr64khD8NBAKQ'; // Replace with your actual key
const PLACES_AUTOCOMPLETE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

const BookingScreen = ({ navigation: _navigation }: { navigation: any }) => {
  const [pickup, setPickup] = useState('');
  const { signOut } = useAuth();
  const [destination, setDestination] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Request runtime location permission then get current position.
    let isMounted = true;
    // GEO will hold the runtime-loaded geolocation module (or null)
    let GEO: any = null;

    const requestAndFetch = async () => {
      // Try to load the native module at runtime. If the require fails or the
      // module doesn't expose expected functions, bail out gracefully.
      try {
        // runtime require; avoid top-level import which can crash if native module is missing
  GEO = require('react-native-geolocation-service');
      } catch {
        console.warn('react-native-geolocation-service not available at runtime');
        return;
      }

      // Defensive: ensure the runtime module exposes the expected API.
      const geoAvailable = !!GEO && typeof GEO.getCurrentPosition === 'function';
      if (!geoAvailable) {
        console.warn('Geolocation native module is not available. Skipping location fetch.');
        return;
      }
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message:
                'EasyRide needs access to your location to detect your pickup point and show nearby drivers.',
              buttonPositive: 'OK',
              buttonNegative: 'Cancel',
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Geolocation error: Location permission not granted.');
            return;
          }
        } else {
          // iOS: request authorization (guarded in case this method isn't present)
          try {
            if (typeof GEO.requestAuthorization === 'function') {
              const auth = await GEO.requestAuthorization('whenInUse');
              if (auth === 'denied' || auth === 'disabled' || auth === 'restricted') {
                console.warn('Geolocation error: Location permission not granted.');
                return;
              }
            }
          } catch {
            // Some versions return a boolean or throw — handle gracefully
            // Fall through and try to get position; if it fails we'll catch below.
            console.warn('Geolocation.requestAuthorization error');
          }
        }

        // Final guard before calling getCurrentPosition
        try {
          if (typeof GEO.getCurrentPosition === 'function') {
            GEO.getCurrentPosition(
              (pos: any) => {
                if (isMounted) {
                  const { latitude, longitude } = pos.coords;
                  setCurrentCoords({ lat: latitude, lng: longitude });
                }
              },
              (err: any) => {
                if (isMounted) {
                  console.warn('Geolocation error:', err?.message || err);
                }
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
            );
          } else {
            console.warn('Geolocation.getCurrentPosition is not a function.');
          }
        } catch (err) {
          console.warn('Geolocation.getCurrentPosition threw an error:', err);
        }
      } catch {
        console.warn('Geolocation not available');
      }
    };

    requestAndFetch();

    return () => {
      isMounted = false;
      try {
        if (GEO && typeof GEO.stopObserving === 'function') {
          GEO.stopObserving(); // Clean up any active location watchers
        }
      } catch {
        // ignore
      }
    };
  }, []);

  const fetchSuggestions = async (input: string, setter: (v: any[]) => void) => {
    if (!input || input.length < 2) {
      setter([]);
      return;
    }
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.includes('YOUR_GOOGLE')) {
      // Avoid making requests when key is missing
      setter([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      // Add a lightweight session token to group requests — helps billing & quota.
      const session = Math.random().toString(36).slice(2);
      const url = `${PLACES_AUTOCOMPLETE}?input=${encodeURIComponent(
        input
      )}&key=${GOOGLE_API_KEY}&language=en&types=geocode&sessiontoken=${session}`;

      const res = await fetch(url);
      const json = await res.json();

      // Debug: log raw response so it's visible in Metro console when troubleshooting
      console.debug('Places autocomplete response', json);

      // Handle API status codes from Google
      if (!json) {
        setter([]);
      } else if (json.status === 'OK' && Array.isArray(json.predictions)) {
        setter(json.predictions);
      } else if (json.status === 'ZERO_RESULTS') {
        // No matches — return empty list (not an error)
        setter([]);
      } else {
        // Other statuses like REQUEST_DENIED, OVER_QUERY_LIMIT indicate config issues
        console.warn('Places autocomplete returned status', json.status, json.error_message);
        // Show a friendly alert once so dev can notice (avoid spamming)
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
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.includes('YOUR_GOOGLE')) {
      // Can't resolve details without key; just close suggestions
      setPickupSuggestions([]);
      setDestinationSuggestions([]);
      return;
    }

    try {
      const url = `${PLACE_DETAILS}?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=formatted_address,name,geometry`;
      const res = await fetch(url);
      const json = await res.json();

      console.debug('Place details response', json);

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
    // Placeholder: in real app we'd query backend for nearby drivers.
    // For now show a friendly message.
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
          placeholder={currentCoords ? 'Detecting your location...' : 'Enter pickup location'}
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
          Note: location suggestions require a Google Maps Places API key. Set
          GOOGLE_MAPS_API_KEY in your environment or replace the placeholder in
          this file for local testing. Driver matching is not implemented yet.
        </Text>
      </View>

      {/* Bottom navigation bar (Home / Profile / Sign Out) */}
      <View style={styles.bottomBarContainer}>
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => _navigation.navigate('Home')}
            accessibilityLabel="Home"
          >
            <MaterialIcons name="home" size={18} color="#fa9907ff" />
            <Text style={styles.bottomLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => _navigation.navigate('Settings')}
            accessibilityLabel="Profile"
          >
            <MaterialIcons name="person" size={18} color="#fa9907ff" />
            <Text style={styles.bottomLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={signOut}
            accessibilityLabel="Sign out"
          >
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
  },
  suggestions: { maxHeight: 160, marginTop: 6, marginBottom: 6 },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  findBtn: {
    marginTop: 20,
    backgroundColor: '#fa9907ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  findBtnText: { color: '#fff', fontWeight: '600' },
  noteBox: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 6 },
  noteText: { color: '#555', fontSize: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  errorText: { textAlign: 'center', color: '#444' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputIcon: { marginRight: 8 },
  inputFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
  },
  findBtnIcon: { marginRight: 8 },
  bottomBarContainer: { position: 'absolute', bottom: 16, width: '90%', alignSelf: 'center' },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 8,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  bottomButton: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  bottomLabel: { fontSize: 12, marginTop: 4 },
});

// (Wrapped with ErrorBoundary at the bottom)

// Small error boundary to catch render/runtime errors inside the Booking screen
// and display a friendly message instead of allowing the native app to close.
class ErrorBoundary extends React.Component<any, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Log to console — in real app send to error tracking (Sentry, etc.)
    console.warn('Booking screen error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{String(this.state.error)}</Text>
        </View>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

export default (props: any) => (
  <ErrorBoundary>
    <BookingScreen {...props} />
  </ErrorBoundary>
);
