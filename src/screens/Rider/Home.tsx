import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

// You would install and import MapView from 'react-native-maps'
// For now, we'll use a placeholder.
const MapViewPlaceholder = () => (
  <View style={styles.map}>
    <Text>Map Goes Here</Text>
  </View>
);

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <MapViewPlaceholder />
      <View style={[styles.rideForm, { top: insets.top + 20 }]}>
        <Text style={styles.input}>Current Location</Text>
        <Text style={styles.input}>Where to?</Text>
      </View>
      <View style={styles.bottomContainer}>
        <Button title="Find a Ride" onPress={() => { /* Find ride logic */ }} />
        <View style={{ marginTop: 20 }}>
          <Button title="Sign Out" onPress={signOut} color="red" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  rideForm: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  input: { padding: 15, backgroundColor: '#f0f0f0', borderRadius: 5, marginBottom: 10 },
  bottomContainer: { position: 'absolute', bottom: 40, width: '80%' },
});

export default HomeScreen;