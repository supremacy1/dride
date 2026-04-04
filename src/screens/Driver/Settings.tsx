import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

const SettingsScreen = ({ navigation }: { navigation: any }) => {
  const { user, signIn } = useAuth();
  const [fullname, setFullname] = useState(user?.fullname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [carModel, setCarModel] = useState(user?.car_model || '');
  const [carPlate, setCarPlate] = useState(user?.car_plate || '');
  const [newProfilePic, setNewProfilePic] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    if (!fullname || !phone) {
      Alert.alert('Error', 'Full name and phone are required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', user.id);
      formData.append('fullname', fullname);
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('car_model', carModel);
      formData.append('car_plate', carPlate);

      if (newProfilePic) {
        formData.append('profile_picture', {
          uri: newProfilePic.uri,
          type: newProfilePic.type,
          name: newProfilePic.fileName || 'profile.jpg',
        } as any);
      }

      const response = await fetch(`${API_URL}/api/driver/update-profile`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Update failed');

      // Update local auth state and go back
      signIn({ ...data.driver, userType: 'driver' });
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
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

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullname} onChangeText={setFullname} placeholder="Full Name" />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone" />

        <Text style={styles.label}>Home Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Address" />

        <Text style={styles.label}>Car Model</Text>
        <TextInput style={styles.input} value={carModel} onChangeText={setCarModel} placeholder="Car Model" />

        <Text style={styles.label}>Car Plate</Text>
        <TextInput style={styles.input} value={carPlate} onChangeText={setCarPlate} placeholder="Car Plate" />

        <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { padding: 5 },
  content: { padding: 20 },
  imageContainer: { alignItems: 'center', marginBottom: 25 },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#fa9907' },
  placeholderImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  editIconBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#fa9907', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  label: { fontSize: 14, color: '#666', marginBottom: 5, fontWeight: '600' },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: '#fa9907', height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default SettingsScreen;
