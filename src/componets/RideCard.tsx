import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Ride = { id?: string; destination?: string; fare?: number };

const RideCard: React.FC<{ ride: Ride }> = ({ ride }) => (
  <View style={styles.card}>
    <Text style={styles.title}>Ride</Text>
    <Text>{ride.destination || 'Unknown destination'}</Text>
  </View>
);

const styles = StyleSheet.create({ card: { padding: 12, backgroundColor: '#fff', borderRadius: 8 }, title: { fontWeight: '700', marginBottom: 6 } });

export default RideCard;