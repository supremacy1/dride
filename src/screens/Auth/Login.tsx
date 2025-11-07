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
import { useAuth } from '../../context/AuthContext';

//const API_URL = 'http://localhost:3001'; // Use your server's IP for device testing
// const API_URL = 'http://192.168.1.101'; // Use your server's IP for device testing
// For Android emulator use 10.0.2.2:3001 (or 10.0.3.2 for Genymotion).
// Use your machine's IP address (confirmed reachable in browser)
const API_URL = 'http://192.168.1.103:3001';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalActions, setModalActions] = useState<{ text: string; onPress?: () => void }[]>([
    { text: 'OK' },
  ]);

  const showModal = (
    title: string,
    message: string,
    actions: { text: string; onPress?: () => void }[] = [{ text: 'OK' }]
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalActions(actions);
    setModalVisible(true);
  };
  const { signIn } = useAuth();

  
  const handleLogin = async () => {
    // Check with server whether this email is registered. If registered -> sign in.
    setLoading(true);
    const url = `${API_URL}/api/auth/login`;
    const payload = { email };
    console.log('Login: POST', url, payload);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // If server says not found (404) or returns non-ok without a user, prompt to register.
      if (!response.ok) {
        if (response.status === 404) {
          showModal(
            'Email Not Registered',
            'That email address is not registered. Please register first to continue.',
            [
              { text: 'Register', onPress: () => navigation.navigate('Register') },
              { text: 'OK' },
            ]
          );
          return;
        }

        // other server error
        let errData: any = {};
        try {
          errData = await response.json();
        } catch {}
        showModal('Login Failed', errData.message || 'Server error during login.');
        return;
      }

      // Parse user data and ensure a user object exists
      let data: any = {};
      try {
        data = await response.json();
      } catch (e) {
        console.warn('Login: failed to parse JSON response', e);
      }

      const userData = data && (data.user || data);
      if (!userData || !(userData.id || userData.email)) {
        // Treat as not registered
        showModal(
          'Email Not Registered',
          'That email address is not registered. Please register first to continue.',
          [
            { text: 'Register', onPress: () => navigation.navigate('Register') },
            { text: 'OK' },
          ]
        );
        return;
      }

      // Verified: email is registered. Sign in and let the Auth context / navigator
      // switch stacks. Do not manually navigate to 'Booking' from the Auth stack
      // because that screen lives in the Rider stack and the current navigator
      // doesn't expose it (causes a 'not handled by any navigator' warning).
      console.log('Login: signing in with', userData);
      signIn(userData);
    } catch (error: any) {
      console.error('Login request error:', error);
      // keep a modal for network errors so user sees them
      showModal('Login Failed', `${error.message || JSON.stringify(error)}\n\nTried URL: ${url}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
       <View style={styles.headerImg}>
  <Image 
    source={require('../../assets/3636253.jpg')} 
    style={styles.loginImage} 
    resizeMode="contain"
  />
</View>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>
          Enter your email to log in and book a ride.
        </Text>
        <Input
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button
          title={loading ? 'Logging In...' : 'Login'}
      onPress={handleLogin}
          disabled={loading}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginImage:{
    width: '100%',
    height: 200,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 24,
  },
  linkButton: { marginTop: 16 },
  linkText: { color: '#007AFF', textAlign: 'center', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#333', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 10, marginLeft: 8 },
  modalButtonText: { color: '#007AFF', fontWeight: '600' },
});

export default LoginScreen;