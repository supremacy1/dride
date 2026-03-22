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
import { API_URL } from '../../config/api';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginAs, setLoginAs] = useState<'user' | 'driver'>('user');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
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
    if (!email) {
      showModal('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    let url = '';
    let payload: any = {};

    if (loginAs === 'user') {
      url = `${API_URL}/api/auth/login`;
      payload = { email };
    } else {
      if (!password) {
        setLoading(false);
        showModal('Error', 'Please enter your password.');
        return;
      }
      url = `${API_URL}/api/auth/login-driver`;
      payload = { email, password };
    }

    console.log(`Login as ${loginAs}: POST`, url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          const notFoundMessage =
            loginAs === 'user'
              ? 'That email address is not registered. Please register first.'
              : 'No driver account found with that email.';
          showModal(
            'Account Not Found',
            data.message || notFoundMessage,
            loginAs === 'user'
              ? [{ text: 'Register', onPress: () => navigation.navigate('Register') }, { text: 'OK' }]
              : [{ text: 'OK' }]
          );
          return;
        }
        // For other errors like 401 (invalid password) or 403 (pending approval)
        showModal('Login Failed', data.message || 'An error occurred.');
        return;
      }

      const userData = data?.user;
      if (!userData || !userData.id) {
        showModal('Login Failed', 'Received invalid user data from server.');
        return;
      }

      console.log(`Login as ${loginAs} successful:`, userData);
      // Add role to the user object so the app context knows who is logged in
      signIn({ ...userData, role: loginAs });
    } catch (error: any) {
      console.error('Login request error:', error);
      showModal('Login Failed', `${error.message || JSON.stringify(error)}\n\nTried URL: ${url}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      showModal('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();
      setForgotPasswordVisible(false);
      setResetEmail('');
      showModal('Request Sent', data.message || 'If an account exists, an email has been sent.');
    } catch (error) {
      showModal('Error', 'Failed to send request. Please try again.');
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
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleButton, loginAs === 'user' && styles.roleButtonActive]}
            onPress={() => setLoginAs('user')}>
            <Text style={[styles.roleButtonText, loginAs === 'user' && styles.roleButtonTextActive]}>
              User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, loginAs === 'driver' && styles.roleButtonActive]}
            onPress={() => setLoginAs('driver')}>
            <Text style={[styles.roleButtonText, loginAs === 'driver' && styles.roleButtonTextActive]}>
              Driver
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {loginAs === 'user'
            ? 'Enter your email to log in and book a ride.'
            : 'Enter your driver credentials to log in.'}
        </Text>
        <Input
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {loginAs === 'driver' && (
          <View>
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => setForgotPasswordVisible(true)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        )}
        <Button
          title={loading ? 'Logging In...' : 'Login'}
      onPress={handleLogin}
          disabled={loading}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate(loginAs === 'user' ? 'Register' : 'RegisterDriver')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>{loginAs === 'user' ? "Don't have an account? Register" : "Apply to be a Driver"}</Text>
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

        {/* Forgot Password Modal */}
        <Modal transparent visible={forgotPasswordVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalMessage}>Enter your email address to receive a password reset link.</Text>
              <Input
                placeholder="Email Address"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.modalActions}>
                 <TouchableOpacity style={styles.modalButton} onPress={() => setForgotPasswordVisible(false)}>
                  <Text style={[styles.modalButtonText, { color: '#666' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleForgotPassword}>
                  <Text style={styles.modalButtonText}>Send</Text>
                </TouchableOpacity>
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 15,
    marginTop: -10,
  },
  forgotPasswordText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
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
  modalBox: { width: '85%', backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#333', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 10, marginLeft: 8 },
  modalButtonText: { color: '#007AFF', fontWeight: '600' },
});

export default LoginScreen;