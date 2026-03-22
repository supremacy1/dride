import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';

import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from '../../config/api';

const RegisterDriverScreen = ({ navigation }) => {

  const [registerAs, setRegisterAs] = useState<'user' | 'driver'>('driver');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');

  const [licenseDoc, setLicenseDoc] = useState(null);
  const [vehiclePapersDoc, setVehiclePapersDoc] = useState(null);
  const [ninDoc, setNinDoc] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [proofOfAddressDoc, setProofOfAddressDoc] = useState(null);

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalActions, setModalActions] = useState<
    Array<{ text: string; onPress?: () => void }>
  >([{ text: 'OK' }]);


  const handleUpload = (type) => {

    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;

      if (response.errorMessage) {
        showModal('Upload Error', response.errorMessage);
        return;
      }

      const asset = response.assets[0];

      if (type === 'license') setLicenseDoc(asset);
      if (type === 'vehiclePapers') setVehiclePapersDoc(asset);
      if (type === 'nin') setNinDoc(asset);
      if (type === 'profile') setProfilePic(asset);
      if (type === 'address') setProofOfAddressDoc(asset);

      // intentionally no success alert; the filename will show in the UI
    });
  };

  const showModal = (
    title: string,
    message: string,
    actions: Array<{ text: string; onPress?: () => void }> = [{ text: 'OK' }],
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalActions(actions);
    setModalVisible(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleRegister = async () => {

    if (
      !fullName ||
      !email ||
      !phone ||
      !password ||
      !address ||
      !dateOfBirth ||
      !licenseNumber ||
      !carModel ||
      !carPlate
    ) {
      showModal('Missing Fields', 'Please fill all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Password Validation
    if (password.length <= 6) {
      showModal('Invalid Password', 'Password must be more than 6 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      showModal('Invalid Password', 'Password must contain at least one capital letter.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      showModal('Invalid Password', 'Password must contain at least one special character.');
      return;
    }

    if (!profilePic || !licenseDoc || !vehiclePapersDoc || !ninDoc || !proofOfAddressDoc) {
      showModal('Missing Documents', 'Please upload all required documents.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('fullname', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('address', address);
      formData.append('date_of_birth', dateOfBirth.toISOString().split('T')[0]);
      formData.append('license_number', licenseNumber);
      formData.append('car_model', carModel);
      formData.append('car_plate', carPlate);

      formData.append('profile_picture', {
        uri: profilePic.uri,
        type: profilePic.type,
        name: profilePic.fileName || 'profile.jpg',
      });

      formData.append('license', {
        uri: licenseDoc.uri,
        type: licenseDoc.type,
        name: licenseDoc.fileName || 'license.jpg',
      });

      formData.append('nin', {
        uri: ninDoc.uri,
        type: ninDoc.type,
        name: ninDoc.fileName || 'nin.jpg',
      });

      formData.append('vehiclePapers', {
        uri: vehiclePapersDoc.uri,
        type: vehiclePapersDoc.type,
        name: vehiclePapersDoc.fileName || 'papers.jpg',
      });

      formData.append('proof_of_address', {
        uri: proofOfAddressDoc.uri,
        type: proofOfAddressDoc.type,
        name: proofOfAddressDoc.fileName || 'address.jpg',
      });

      const response = await fetch(`${API_URL}/api/auth/RegisterDriverScreen`, {
        method: 'POST',
        body: formData,
        // IMPORTANT: Do NOT set 'Content-Type' header for FormData.
        // The fetch API will automatically set it to 'multipart/form-data'
        // with the correct boundary.
      });

      // Read the response body as text first, as it can only be read once.
      const responseText = await response.text();
      let data;
      try {
        // Attempt to parse the text as JSON.
        data = JSON.parse(responseText);
      } catch (e) {
        // If JSON parsing fails, the response was not JSON (e.g., HTML error page).
        // We still have the raw text in `responseText` for debugging.
        console.error('Failed to parse server response as JSON. Raw response:', responseText);
        // Throw an error with the raw response, as it's not the expected JSON.
        throw new Error(`Server returned an unexpected response format (Status: ${response.status}). Please check server logs. Raw: ${responseText.substring(0, 200)}...`);
      }

      if (!response.ok) {
        // If response.ok is false, but we successfully parsed JSON, 'data' contains the server's error details.
        console.error('Driver registration failed (server error):', data);
        throw new Error(data.message || `Registration failed with status: ${response.status}`);
      }

      showModal(
        'Application Submitted',
        'Your application is under review. You will be notified once your account is verified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Driver registration request error:', error);
      showModal('Registration Failed', error.message || 'An unexpected error occurred.');
    } finally {

      setLoading(false);

    }
  };

  return (

    <SafeAreaView style={styles.container}>

      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleButton, registerAs === 'user' && styles.roleButtonActive]}
            onPress={() => {
              setRegisterAs('user');
              navigation.navigate('Register');
            }}>
            <Text style={[styles.roleButtonText, registerAs === 'user' && styles.roleButtonTextActive]}>
              User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, registerAs === 'driver' && styles.roleButtonActive]}
            onPress={() => setRegisterAs('driver')}>
            <Text style={[styles.roleButtonText, registerAs === 'driver' && styles.roleButtonTextActive]}>
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Become a Driver</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <MaterialIcons name={isPasswordVisible ? 'visibility-off' : 'visibility'} size={24} color="#555" />
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <View style={styles.rulesContainer}>
            <Text style={[styles.ruleText, password.length > 6 ? styles.ruleSuccess : styles.ruleError]}>• More than 6 characters</Text>
            <Text style={[styles.ruleText, /[A-Z]/.test(password) ? styles.ruleSuccess : styles.ruleError]}>• At least one capital letter</Text>
            <Text style={[styles.ruleText, /[!@#$%^&*(),.?":{}|<>]/.test(password) ? styles.ruleSuccess : styles.ruleError]}>• At least one special character</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Home Address"
          value={address}
          onChangeText={setAddress}
        />
        
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
          <Text style={!dateOfBirth ? styles.placeholderText : {color: '#000'}}>
            {dateOfBirth ? dateOfBirth.toLocaleDateString() : 'Date of Birth'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View>
            <DateTimePicker
              testID="dateTimePicker"
              value={dateOfBirth || new Date()}
              mode={'date'}
              display="default"
              onChange={onDateChange}
              maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
            />
            {Platform.OS === 'ios' && <Button title="Done" onPress={() => setShowDatePicker(false)} />}
          </View>
        )}

        <Text style={styles.sectionHeader}>Vehicle Info</Text>

        <TextInput
          style={styles.input}
          placeholder="Driver License Number"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
        />

        <TextInput
          style={styles.input}
          placeholder="Car Model"
          value={carModel}
          onChangeText={setCarModel}
        />

        <TextInput
          style={styles.input}
          placeholder="Car Plate"
          value={carPlate}
          onChangeText={setCarPlate}
        />

        <Text style={styles.sectionHeader}>Upload Documents</Text>

        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('profile')}>
          <Text>
            {profilePic?.fileName ? `Profile Photo: ${profilePic.fileName}` : 'Upload Profile Photo'}
          </Text>
        </TouchableOpacity>
        {/* additional filename display retained for readability */}
        {profilePic?.fileName ? (
          <Text style={styles.fileName}>{profilePic.fileName}</Text>
        ) : null}

        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('license')}>
          <Text>
            {licenseDoc?.fileName ? `Driver License: ${licenseDoc.fileName}` : 'Upload Driver License'}
          </Text>
        </TouchableOpacity>
        {licenseDoc?.fileName ? (
          <Text style={styles.fileName}>{licenseDoc.fileName}</Text>
        ) : null}

        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('nin')}>
          <Text>
            {ninDoc?.fileName ? `NIN Slip: ${ninDoc.fileName}` : 'Upload NIN Slip'}
          </Text>
        </TouchableOpacity>
        {ninDoc?.fileName ? (
          <Text style={styles.fileName}>{ninDoc.fileName}</Text>
        ) : null}

        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('vehiclePapers')}>
          <Text>
            {vehiclePapersDoc?.fileName ? `Vehicle Papers: ${vehiclePapersDoc.fileName}` : 'Upload Vehicle Papers'}
          </Text>
        </TouchableOpacity>
        {vehiclePapersDoc?.fileName ? (
          <Text style={styles.fileName}>{vehiclePapersDoc.fileName}</Text>
        ) : null}

        <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload('address')}>
          <Text>
            {proofOfAddressDoc?.fileName ? `Proof of Address: ${proofOfAddressDoc.fileName}` : 'Upload Proof of Address'}
          </Text>
        </TouchableOpacity>
        {proofOfAddressDoc?.fileName ? (
          <Text style={styles.fileName}>{proofOfAddressDoc.fileName}</Text>
        ) : null}

        <View style={{ marginTop: 20 }} />

        <Button
          title={loading ? "Submitting..." : "Submit Application"}
          onPress={handleRegister}
        />

        <View style={{ height: 40 }} />

      </ScrollView>
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalActions}>
              {modalActions.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.modalButton}
                  onPress={() => {
                    setModalVisible(false);
                    if (a.onPress) a.onPress();
                  }}
                >
                  <Text style={styles.modalButtonText}>{a.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
  },
  passwordToggleText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rulesContainer: {
    marginBottom: 15,
    paddingLeft: 5,
  },
  ruleText: { fontSize: 12, marginBottom: 2 },
  ruleSuccess: { color: 'green' },
  ruleError: { color: 'red' },

  uploadBtn: {
    backgroundColor: '#e1e1e1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  fileName: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    marginLeft: 5,
  },
  placeholderText: {
    color: '#aaa',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#333', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 10, marginLeft: 8 },
  modalButtonText: { color: '#007AFF', fontWeight: '600' },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
  },
  roleButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#fff',
  },

});

export default RegisterDriverScreen;