import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

const RiderRideHistoryScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/rides/history?role=rider&userId=${user?.id}`
        );
        const data = await response.json();
        if (response.ok) {
          setRides(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadHistory();
    }
  }, [user?.id]);

  const totalPaid = rides
    .filter((ride) => ride.status === 'completed')
    .reduce((sum, ride) => sum + Number(ride.fare || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ride History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total payments</Text>
        <Text style={styles.summaryValue}>N{totalPaid.toFixed(0)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fa9907" style={styles.loader} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No rides yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.rideCard}>
              <Text style={styles.rideStatus}>{item.status.toUpperCase()}</Text>
              <Text style={styles.rideText}>Driver: {item.driver_fullname || 'Pending assignment'}</Text>
              <Text style={styles.rideText}>Pickup: {item.pickup_address}</Text>
              <Text style={styles.rideText}>Destination: {item.destination_address}</Text>
              <Text style={styles.rideText}>Fare: N{Number(item.fare || 0).toFixed(0)}</Text>
              <Text style={styles.rideText}>Payment: {item.payment_status}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#fff',
  },
  backText: { color: '#fa9907', fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: '#222' },
  headerSpacer: { width: 40 },
  summaryCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },
  summaryLabel: { color: '#666', marginBottom: 6 },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#fa9907' },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingTop: 0 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 40 },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  rideStatus: { color: '#1f8b4c', fontWeight: '800', marginBottom: 8 },
  rideText: { color: '#333', marginBottom: 4 },
});

export default RiderRideHistoryScreen;
