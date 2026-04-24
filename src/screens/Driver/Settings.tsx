import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

const SettingsScreen = ({ navigation }: { navigation: any }) => {
  const { user, signIn } = useAuth();
  const [newProfilePic, setNewProfilePic] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setNewProfilePic(response.assets[0]);
      }
    });
  };

  const handleUpdate = async () => {
    if (!newProfilePic) {
      Alert.alert('Error', 'Please select a profile picture to update.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Driver ID is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(user.id));
      formData.append('fullname', user?.fullname || '');
      formData.append('phone', user?.phone || '');
      formData.append('address', user?.address || '');
      formData.append('car_model', user?.car_model || '');
      formData.append('car_plate', user?.car_plate || '');
      formData.append('profile_picture', {
        uri: newProfilePic.uri,
        type: newProfilePic.type,
        name: newProfilePic.fileName || 'profile.jpg',
      } as any);

      const response = await fetch(`${API_URL}/api/driver/update-profile`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Update failed');

      signIn({ ...data.driver, userType: 'driver' });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const storedProfileImagePath = user?.profile_picture_url || user?.profile_picture || null;
  const normalizedProfileImagePath = storedProfileImagePath
    ? storedProfileImagePath.replace(/\\/g, '/').replace(/^src\/screens\/Auth\//i, '')
    : null;
  const profileImageUrl = newProfilePic 
    ? newProfilePic.uri 
    : (normalizedProfileImagePath
        ? `${API_URL}/${normalizedProfileImagePath.replace(/^public\//i, '')}`
        : null);

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconWrap}>
              <MaterialIcons name="check-circle" size={42} color="#1f8b4c" />
            </View>
            <Text style={styles.successTitle}>Profile Updated</Text>
            <Text style={styles.successMessage}>
              Your profile picture was updated successfully.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={pickImage}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialIcons name="person" size={60} color="#ccc" />
              </View>
            )}
            <View style={styles.editIconBadge}>
              <MaterialIcons name="photo-camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.helperText}>Tap the photo to choose a new profile picture.</Text>

        <TouchableOpacity
          style={[styles.button, (!newProfilePic || loading) && styles.buttonDisabled]}
          onPress={handleUpdate}
          disabled={!newProfilePic || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eaf8ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1c1c',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
    marginBottom: 22,
  },
  successButton: {
    width: '100%',
    backgroundColor: '#fa9907',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { padding: 5 },
  content: { padding: 20 },
  imageContainer: { alignItems: 'center', marginBottom: 25 },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#fa9907' },
  placeholderImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  editIconBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#fa9907', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  helperText: { textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 20 },
  button: { backgroundColor: '#fa9907', height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#fccb7c' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default SettingsScreen;
