import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Input from '../../components/Input';
import Button from '../../components/Button';

//const API_URL = 'http://localhost:3001'; // Use your server's IP in production/testing on device
// For Android emulator use 10.0.2.2:3001 (or 10.0.3.2 for Genymotion).
// Remove trailing slash to avoid accidental double-slash in requests.
// Use your machine's IP address (confirmed reachable in browser)
// const API_URL = 'http://192.168.166.186:3001';
const API_URL = 'http://192.168.1.103:3001';

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalActions, setModalActions] = useState<
    Array<{ text: string; onPress?: () => void }>
  >([{ text: 'OK' }]);

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

  const handleRegister = async () => {
    if (!fullname || !email || !phone) {
      showModal('Error', 'Please fill in all fields.');
      return;
    }
    // basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, email, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If email already exists, server returns 409
        if (response.status === 409) {
          showModal(
            'Account exists',
            data.message || 'An account with this email already exists.',
            [
              {
                text: 'Go to Login',
                onPress: () => navigation.navigate('Login'),
              },
              { text: 'Cancel' },
            ],
          );
          return;
        }
        throw new Error(data.message || 'Something went wrong');
      }

      // Show success alert and navigate to login after user dismisses
      // Keep success as alert so the user explicitly confirms, but use modal UI
      showModal(
        'Success',
        'Registration successful! Please log in to continue.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      );
    } catch (error: any) {
      // Show a clearer error message for debugging (some RN fetch errors are opaque)
      console.error('Register request error:', error);
      showModal('Registration Failed', error.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerImg}>
          <Image
            source={require('../../assets/3671751.jpg')}
            style={styles.loginImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Create an Account</Text>
        <Input
          placeholder="Full Name"
          value={fullname}
          onChangeText={setFullname}
        />
        <Input
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Button
          title={loading ? 'Registering...' : 'Register'}
          onPress={() => handleRegister()}
          disabled={loading}
        />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#007AFF',
  },
  loginImage:{
    width: '100%',
    height: 200,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#333', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 10, marginLeft: 8 },
  modalButtonText: { color: '#007AFF', fontWeight: '600' },
  backButton: { marginTop: 16 },
  backButtonText: { color: '#007AFF', textAlign: 'center', fontSize: 16 },
});

export default RegisterScreen;
