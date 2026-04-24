import React, { useState } from 'react';
import {
  Clipboard,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from '../../config/api';
import { syncDriverLocation } from '../../utils/driverLocation';

const DashboardScreen = ({ navigation }: { navigation: any }) => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wallet, setWallet] = useState<any>(user?.wallet || null);
  const [accountDetails, setAccountDetails] = useState<any>(user?.accountDetails || null);
  const [copied, setCopied] = useState(false);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const profileImagePath = user?.profile_picture_url || user?.profile_picture || null;
  const normalizedProfileImagePath = profileImagePath
    ? profileImagePath.replace(/\\/g, '/').replace(/^src\/screens\/Auth\//i, '')
    : null;
  const profileImageUrl = normalizedProfileImagePath
    ? `${API_URL}/${normalizedProfileImagePath.replace(/^public\//i, '')}`
    : null;
  const canGoOnline = Number(wallet?.balance || 0) > 0;

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      let refreshInterval: ReturnType<typeof setInterval> | null = null;

      const loadWallet = async () => {
        if (!user?.id) {
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/driver/wallet/${user.id}`);
          const data = await response.json();

          if (response.ok && isMounted) {
            setWallet(data.wallet || null);
            setAccountDetails(data.accountDetails || null);
          }
        } catch (error) {
          console.warn('Wallet fetch error:', error);
        }
      };

      const refreshDriverLocation = async () => {
        if (!user?.id) {
          return;
        }

        try {
          await syncDriverLocation(user.id);
        } catch (error) {
          console.warn('Dashboard driver location sync failed:', error);
        }
      };

      refreshDriverLocation();
      loadWallet();
      refreshInterval = setInterval(loadWallet, 15000);

      return () => {
        isMounted = false;
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      };
    }, [user?.id])
  );

  const handleCopyAccountNumber = () => {
    if (!accountDetails?.account_number) {
      return;
    }

    Clipboard.setString(String(accountDetails.account_number));
    setCopied(true);
    setCopyModalVisible(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          style={styles.burgerButton}
        >
          <MaterialIcons name="menu" size={30} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      {menuOpen && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            <MaterialIcons name="logout" size={20} color="red" />
            <Text style={[styles.menuText, styles.menuTextDanger]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={copyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCopyModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="check-circle" size={34} color="#059669" />
            </View>
            <Text style={styles.modalTitle}>Account Number Copied</Text>
            <Text style={styles.modalMessage}>
              The funding account number has been copied to your clipboard.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setCopyModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            {profileImageUrl ? (
              <Image
                source={{
                  uri: profileImageUrl,
                }}
                style={styles.headerProfilePic}
              />
            ) : (
              <View style={[styles.headerProfilePic, styles.placeholderPic]}>
                <MaterialIcons name="person" size={40} color="#ccc" />
              </View>
            )}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.driverName}>{user?.fullname || 'Driver'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Account Information</Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={20} color="#666" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={20} color="#666" />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{user?.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="directions-car" size={20} color="#666" />
            <Text style={styles.infoLabel}>Vehicle:</Text>
            <Text style={styles.infoValue}>{user?.car_model} ({user?.car_plate})</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="local-shipping" size={20} color="#666" />
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{user?.ride_type || 'standard'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color="#666" />
            <Text style={styles.infoLabel}>License:</Text>
            <Text style={styles.infoValue}>{user?.license_number}</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialIcons name="edit" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Edit Information</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletTitle}>Wallet</Text>
            <MaterialIcons name="account-balance-wallet" size={22} color="#fa9907" />
          </View>
          <Text style={styles.walletBalance}>N{Number(wallet?.balance || 0).toFixed(2)}</Text>
          <View style={styles.walletStatsRow}>
            <View style={styles.walletStatBox}>
              <Text style={styles.walletStatLabel}>Earned</Text>
              <Text style={styles.walletStatValue}>
                N{Number(wallet?.total_earned || 0).toFixed(2)}
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

        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountTitle}>Funding Account</Text>
            <MaterialIcons name="payments" size={22} color="#0f766e" />
          </View>
          {accountDetails?.account_number ? (
            <>
              <TouchableOpacity style={styles.accountNumberBox} onPress={handleCopyAccountNumber}>
                <View style={styles.accountNumberRow}>
                  <Text style={styles.accountNumber}>{accountDetails.account_number}</Text>
                  <MaterialIcons
                    name={copied ? 'check-circle' : 'content-copy'}
                    size={20}
                    color={copied ? '#059669' : '#0f766e'}
                  />
                </View>
                <Text style={styles.copyHint}>
                  {copied ? 'Copied to clipboard' : 'Tap to copy account number'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.accountName}>
                {accountDetails.account_name || user?.fullname || 'Driver account'}
              </Text>
              <Text style={styles.accountMeta}>
                {accountDetails.bank_name || 'Paystack'} - {accountDetails.currency || 'NGN'}
              </Text>
              {!!accountDetails?.status && (
                <Text style={styles.accountStatus}>
                  Status: {String(accountDetails.status).replace(/_/g, ' ')}
                </Text>
              )}
              <Text style={styles.accountHint}>
                Send funds to this virtual account to top up your wallet balance.
              </Text>
            </>
          ) : (
            <Text style={styles.accountHint}>
              Your Paystack funding account is still being prepared. Refresh this page after setup.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.onlineButton, !canGoOnline && styles.onlineButtonDisabled]}
          onPress={() => {
            if (canGoOnline) {
              navigation.navigate('RideAccept');
            }
          }}
          disabled={!canGoOnline}
        >
          <Text style={styles.onlineButtonText}>
            {canGoOnline ? 'Go Online' : 'Fund Wallet To Go Online'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('RideHistory')}
        >
          <Text style={styles.historyButtonText}>Trips & Payments</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    elevation: 2,
    zIndex: 1001,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerSpacer: { width: 30 },
  burgerButton: { padding: 5 },
  menuOverlay: {
    position: 'absolute',
    top: 60,
    left: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  menuText: { fontSize: 16, marginLeft: 10 },
  menuTextDanger: { color: 'red' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 120,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: { padding: 20 },
  welcomeSection: { marginBottom: 25 },
  welcomeHeader: { flexDirection: 'row', alignItems: 'center' },
  headerProfilePic: { width: 60, height: 60, borderRadius: 30, marginRight: 15, borderWidth: 2, borderColor: '#fa9907' },
  placeholderPic: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  welcomeTextContainer: { flex: 1 },
  welcomeText: { fontSize: 18, color: '#666' },
  driverName: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#fa9907' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#888', marginLeft: 10, width: 60 },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '500', flex: 1 },
  editButton: { flexDirection: 'row', backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  editButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  walletCard: { backgroundColor: '#fff7eb', borderRadius: 12, padding: 20, marginTop: 18, borderWidth: 1, borderColor: '#f6d19d' },
  walletHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  walletTitle: { fontSize: 18, fontWeight: 'bold', color: '#8a5200' },
  walletBalance: { fontSize: 30, fontWeight: '800', color: '#fa9907', marginBottom: 16 },
  walletStatsRow: { flexDirection: 'row', gap: 12 },
  walletStatBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  walletStatLabel: { color: '#8a5200', marginBottom: 4 },
  walletStatValue: { color: '#333', fontSize: 16, fontWeight: '700' },
  accountCard: {
    backgroundColor: '#ecfeff',
    borderRadius: 12,
    padding: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#b7f0eb',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accountTitle: { fontSize: 18, fontWeight: 'bold', color: '#115e59' },
  accountNumberBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#c6f3ef',
  },
  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountNumber: { fontSize: 28, fontWeight: '800', color: '#0f766e', marginBottom: 6 },
  copyHint: { color: '#0f766e', marginTop: 4, fontSize: 13, fontWeight: '600' },
  accountName: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  accountMeta: { color: '#0f766e', marginBottom: 10 },
  accountStatus: { color: '#475569', marginBottom: 8, textTransform: 'capitalize' },
  accountHint: { color: '#475569', lineHeight: 20 },
  onlineButton: { backgroundColor: '#fa9907', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  onlineButtonDisabled: { backgroundColor: '#f5c98d' },
  onlineButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  historyButton: { backgroundColor: '#fff', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 14, borderWidth: 1, borderColor: '#fa9907' },
  historyButtonText: { color: '#fa9907', fontSize: 18, fontWeight: 'bold' },
});

export default DashboardScreen;
