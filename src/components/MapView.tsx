import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Simple stub for map UI during development (replace with react-native-maps later)
const MapViewStub = ({ children }: { children?: React.ReactNode }) => (
  <View style={styles.map}>
    <Text style={{ color: '#666' }}>Map placeholder (install react-native-maps for full functionality)</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  map: { height: 300, backgroundColor: '#eef', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
});

export default MapViewStub;
