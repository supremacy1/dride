import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

const DriverRideHistoryScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(user?.wallet || null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const loadScreenData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const rideResponse = await fetch(
        `${API_URL}/api/rides/history?role=driver&userId=${user.id}`
      );
      const rideData = await rideResponse.json();

      if (rideResponse.ok) {
        setRides(Array.isArray(rideData) ? rideData : []);
      }
    } catch (error) {
      console.warn('Ride history fetch error:', error);
      setRides([]);
    }

    try {
      const walletResponse = await fetch(`${API_URL}/api/driver/wallet/${user.id}`);
      const walletData = await walletResponse.json();

      if (walletResponse.ok) {
        setWallet(walletData.wallet || null);
        setTransactions(Array.isArray(walletData.transactions) ? walletData.transactions : []);
      }
    } catch (error) {
      console.warn('Wallet history fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
    }, [loadScreenData])
  );

  const totalEarned = rides
    .filter((ride) => ride.status === 'completed')
    .reduce((sum, ride) => {
      const fareAmount = Number(ride.fare || 0);
      const commissionAmount = Number((fareAmount * 0.1).toFixed(2));
      return sum + Number((fareAmount - commissionAmount).toFixed(2));
    }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Trips & Payments</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total earned</Text>
        <Text style={styles.summaryValue}>
          N{Number(wallet?.total_earned || totalEarned).toFixed(2)}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fa9907" style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.walletCard}>
            <Text style={styles.sectionTitle}>Wallet Balance</Text>
            <Text style={styles.walletBalance}>N{Number(wallet?.balance || 0).toFixed(2)}</Text>
            <View style={styles.walletStatsRow}>
              <View style={styles.walletStatBox}>
                <Text style={styles.walletStatLabel}>Earned</Text>
                <Text style={styles.walletStatValue}>
                  N{Number(wallet?.total_earned || totalEarned).toFixed(2)}
                </Text>
              </View>
              <View style={styles.walletStatBox}>
                <Text style={styles.walletStatLabel}>Withdrawn</Text>
                <Text style={styles.walletStatValue}>
                  N{Number(wallet?.total_withdrawn || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Wallet Transactions</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No wallet transactions yet.</Text>
          ) : (
            transactions.map((item) => (
              <View style={styles.transactionCard} key={`transaction-${item.id}`}>
                <View style={styles.transactionHeader}>
                  <Text
                    style={[
                      styles.transactionType,
                      item.type === 'credit' ? styles.creditText : styles.debitText,
                    ]}
                  >
                    {String(item.type || '').toUpperCase()}
                  </Text>
                  <Text style={styles.transactionAmount}>
                    {item.type === 'debit' ? '-' : '+'}N{Number(item.amount || 0).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.rideText}>{item.description || 'Wallet update'}</Text>
                <Text style={styles.metaText}>Ref: {item.reference || 'N/A'}</Text>
                <Text style={styles.metaText}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Trip History</Text>
          {rides.length === 0 ? (
            <Text style={styles.emptyText}>No trips yet.</Text>
          ) : (
            rides.map((item) => (
              <View style={styles.rideCard} key={`ride-${item.id}`}>
                <Text style={styles.rideStatus}>{String(item.status || '').toUpperCase()}</Text>
                <Text style={styles.rideText}>Rider: {item.rider_fullname || 'Unknown rider'}</Text>
                <Text style={styles.rideText}>Pickup: {item.pickup_address}</Text>
                <Text style={styles.rideText}>Destination: {item.destination_address}</Text>
                <Text style={styles.rideText}>Fare: N{Number(item.fare || 0).toFixed(0)}</Text>
                <Text style={styles.rideText}>Payment: {item.payment_status}</Text>
              </View>
            ))
          )}
        </ScrollView>
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
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 24 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#222', marginBottom: 12 },
  walletCard: {
    backgroundColor: '#fff7eb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f6d19d',
  },
  walletBalance: { fontSize: 30, fontWeight: '800', color: '#fa9907', marginBottom: 14 },
  walletStatsRow: { flexDirection: 'row', gap: 12 },
  walletStatBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  walletStatLabel: { color: '#8a5200', marginBottom: 4 },
  walletStatValue: { color: '#333', fontWeight: '700' },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: { fontWeight: '800' },
  creditText: { color: '#1f8b4c' },
  debitText: { color: '#c0392b' },
  transactionAmount: { fontSize: 18, fontWeight: '800', color: '#222' },
  metaText: { color: '#777', marginTop: 4, fontSize: 12 },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  rideStatus: { color: '#1f8b4c', fontWeight: '800', marginBottom: 8 },
  rideText: { color: '#333', marginBottom: 4 },
});

export default DriverRideHistoryScreen;
