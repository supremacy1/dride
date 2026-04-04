import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from '../../config/api';

const DashboardScreen = ({ navigation }: { navigation: any }) => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const profileImagePath = user?.profile_picture_url || user?.profile_picture || null;
  const normalizedProfileImagePath = profileImagePath
    ? profileImagePath.replace(/\\/g, '/').replace(/^src\/screens\/Auth\//i, '')
    : null;
  const profileImageUrl = normalizedProfileImagePath
    ? `${API_URL}/${normalizedProfileImagePath.replace(/^public\//i, '')}`
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Burger Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          style={styles.burgerButton}
        >
          <MaterialIcons name="menu" size={30} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Burger Menu Overlay */}
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
            <Text style={[styles.menuText, { color: 'red' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Section */}
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

        {/* Info Card */}
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

        {/* Action Button for Rides */}
        <TouchableOpacity 
          style={styles.onlineButton}
          onPress={() => navigation.navigate('RideAccept')}
        >
          <Text style={styles.onlineButtonText}>Go Online</Text>
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
  onlineButton: { backgroundColor: '#fa9907', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  onlineButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  historyButton: { backgroundColor: '#fff', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 14, borderWidth: 1, borderColor: '#fa9907' },
  historyButtonText: { color: '#fa9907', fontSize: 18, fontWeight: 'bold' },
});

export default DashboardScreen;
