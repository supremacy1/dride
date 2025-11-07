import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
// import { MaterialIcons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current; // start off-screen to the right

  useEffect(() => {
    // Slide the bottom controls in from the right on mount
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
        showsMyLocationButton
      />
      {/* Top-left hamburger to open/close a simple review/menu panel */}
      <TouchableOpacity
        style={[styles.hamburger, { top: insets.top + 8 }]}
        onPress={() => setMenuOpen((s) => !s)}
        accessibilityLabel="Open menu"
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </TouchableOpacity>

      {menuOpen && (
        <View style={[styles.menuPanel, { top: insets.top + 56 }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate('Settings');
            }}
          >
            <Text style={styles.menuItemText}>Profile / Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              // placeholder for review action
              navigation.navigate('Booking');
            }}
          >
            <Text style={styles.menuItemText}>Review</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* 'Where to?' input moved to bottom bar for easier access */}
      <View style={styles.bottomContainer}>
        <Animated.View
          style={[
            styles.bottomBarContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.rideFormBottom}
            onPress={() => navigation.navigate('Booking')}
            accessibilityLabel="Where to"
          >
            <Text style={styles.input}>Where to?</Text>
          </TouchableOpacity>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.bottomButton}
              onPress={() => navigation.navigate('Home')}
              accessibilityLabel="Home"
            >
              <MaterialIcons name="home" size={18} color="#fa9907ff" />
              <Text style={styles.bottomLabel}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomButton}
              onPress={() => navigation.navigate('Settings')}
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
          
        </Animated.View>
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
  input: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    fontSize: 16,
    color: '#333',
  },
  bottomContainer: { position: 'absolute', bottom: 40, width: '80%', alignItems: 'center' },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  bottomBarContainer: { position: 'absolute', bottom: 16, width: '90%', alignItems: 'center' },
  rideFormBottom: {
    width: '100%',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bottomButton: { flex: 1, alignItems: 'center', paddingVertical: 6, justifyContent: 'center' },
  bottomIcon: { fontSize: 20 },
  bottomLabel: { fontSize: 12, marginTop: 4 },
  hamburger: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 8,
    elevation: 4,
  },
  hamburgerText: { fontSize: 20 },
  menuPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    elevation: 6,
  },
  menuItem: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  menuItemText: { fontSize: 16 },
});

export default HomeScreen;