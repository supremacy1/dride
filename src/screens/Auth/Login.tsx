import React, {useState} from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import {useAuth} from '../../context/AuthContext';
import {API_URL} from '../../config/api';
import {syncDriverLocation} from '../../utils/driverLocation';

const LoginScreen = ({navigation}: {navigation: any}) => {
  const [modalVariant, setModalVariant] = useState<'default' | 'accountNotFound' | 'approval'>('default');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginAs, setLoginAs] = useState<'user' | 'driver'>('user');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [modalActions, setModalActions] = useState<
    {text: string; onPress?: () => void}[]
  >([{text: 'OK'}]);

  const showModal = (
    title: string,
    message: string,
    actions: {text: string; onPress?: () => void}[] = [{text: 'OK'}],
    variant: 'default' | 'accountNotFound' | 'approval' = 'default',
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalActions(actions);
    setModalVariant(variant);
    setModalVisible(true);
  };

  const {signIn} = useAuth();

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
      payload = {email};
    } else {
      if (!password) {
        setLoading(false);
        showModal('Error', 'Please enter your password.');
        return;
      }
      url = `${API_URL}/api/auth/login-driver`;
      payload = {email, password};
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
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
              ? [
                  {text: 'Register', onPress: () => navigation.navigate('Register')},
                  {text: 'OK'},
                ]
              : [{text: 'OK'}],
            'accountNotFound',
          );
          return;
        }

        if (response.status === 403) {
          showModal(
            'Account Not Approved',
            data.message || 'Your driver account is pending approval.',
            [{text: 'OK'}],
            'approval',
          );
          return;
        }

        showModal('Login Failed', data.message || 'An error occurred.');
        return;
      }

      const userData = data?.user;
      if (!userData || !userData.id) {
        showModal('Login Failed', 'Received invalid user data from server.');
        return;
      }

      if (loginAs === 'driver') {
        syncDriverLocation(userData.id).catch(error => {
          console.warn('Driver location sync after login failed:', error);
        });
      }

      signIn({...userData, userType: loginAs === 'user' ? 'rider' : 'driver'});
    } catch (error: any) {
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
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: resetEmail}),
      });
      const data = await response.json();
      setForgotPasswordVisible(false);
      setResetEmail('');
      showModal('Request Sent', data.message || 'If an account exists, an email has been sent.');
    } catch {
      showModal('Error', 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backPill}>
              <MaterialIcons name="arrow-back" size={18} color="#7a3511" />
              <Text style={styles.backPillText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Secure sign in</Text>
            </View>
          </View>

          <Image
            source={require('../../assets/3636253.jpg')}
            style={styles.loginImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in with the same warm, simple ride experience you saw on the landing page.
          </Text>
        </View>

        <View style={styles.card}>
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

          <Text style={styles.helperText}>
            {loginAs === 'user'
              ? 'Enter your email to continue booking your ride.'
              : 'Use your approved driver credentials to continue.'}
          </Text>

          <Input
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          {loginAs === 'driver' && (
            <View>
              <View style={styles.passwordContainer}>
                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                  <MaterialIcons
                    name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                    size={22}
                    color="#8a6856"
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => setForgotPasswordVisible(true)}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}

          <Button
            title={loading ? 'Logging In...' : 'Login'}
            onPress={handleLogin}
            disabled={loading}
            color="#f46f1f"
          />

          <TouchableOpacity
            onPress={() => navigation.navigate(loginAs === 'user' ? 'Register' : 'RegisterDriver')}
            style={styles.linkButton}>
            <Text style={styles.linkText}>
              {loginAs === 'user' ? "Don't have an account? Register" : 'Apply to be a Driver'}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal transparent visible={modalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalBox,
                modalVariant === 'accountNotFound' && styles.accountNotFoundModal,
                modalVariant === 'approval' && styles.approvalModal,
              ]}>
              {modalVariant !== 'default' ? (
                <View
                  style={[
                    styles.modalIconWrap,
                    modalVariant === 'accountNotFound'
                      ? styles.accountNotFoundIconWrap
                      : styles.approvalIconWrap,
                  ]}>
                  <MaterialIcons
                    name={modalVariant === 'accountNotFound' ? 'person-search' : 'hourglass-top'}
                    size={32}
                    color={modalVariant === 'accountNotFound' ? '#c45518' : '#d97706'}
                  />
                </View>
              ) : null}
              <Text
                style={[
                  styles.modalTitle,
                  modalVariant !== 'default' && styles.centeredModalTitle,
                ]}>
                {modalTitle}
              </Text>
              <Text
                style={[
                  styles.modalMessage,
                  modalVariant !== 'default' && styles.centeredModalMessage,
                ]}>
                {modalMessage}
              </Text>
              <View style={styles.modalActions}>
                {modalActions.map((a, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.modalButton,
                      modalVariant !== 'default' && styles.primaryModalButton,
                      modalVariant === 'accountNotFound' && i === 0 && modalActions.length > 1 && styles.primaryAccountButton,
                      modalVariant === 'accountNotFound' && i === 1 && modalActions.length > 1 && styles.secondaryModalButton,
                    ]}
                    onPress={() => {
                      setModalVisible(false);
                      setModalVariant('default');
                      if (a.onPress) {
                        a.onPress();
                      }
                    }}>
                    <Text
                      style={[
                        styles.modalButtonText,
                        modalVariant !== 'default' && styles.primaryModalButtonText,
                        modalVariant === 'accountNotFound' && i === 1 && modalActions.length > 1 && styles.secondaryModalButtonText,
                      ]}>
                      {a.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={forgotPasswordVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalMessage}>
                Enter your email address to receive a password reset link.
              </Text>
              <Input
                placeholder="Email Address"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setForgotPasswordVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleForgotPassword}>
                  <Text style={styles.modalButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6efe8',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: '#22130c',
    borderRadius: 30,
    padding: 22,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    right: -50,
    backgroundColor: 'rgba(244,111,31,0.18)',
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: 40,
    left: -30,
    backgroundColor: 'rgba(255,214,168,0.10)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#fff3ea',
  },
  backPillText: {
    color: '#7a3511',
    fontWeight: '700',
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroBadgeText: {
    color: '#f6d5c4',
    fontSize: 12,
    fontWeight: '700',
  },
  loginImage: {
    width: '100%',
    height: 170,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff8f2',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#e7c3b0',
    textAlign: 'center',
  },
  card: {
    marginTop: 18,
    backgroundColor: '#fffaf6',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#412114',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff1e7',
    borderRadius: 18,
    padding: 5,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  roleButtonActive: {
    backgroundColor: '#f46f1f',
  },
  roleButtonText: {
    color: '#9b623f',
    fontWeight: '700',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  helperText: {
    marginTop: 16,
    marginBottom: 6,
    color: '#71584a',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  input: {
    marginVertical: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 20,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: '#c45518',
    fontSize: 14,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 10,
  },
  linkText: {
    color: '#7a3511',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,10,6,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fffaf6',
    padding: 18,
    borderRadius: 24,
  },
  accountNotFoundModal: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  approvalModal: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  accountNotFoundIconWrap: {
    backgroundColor: '#fff3ea',
  },
  approvalIconWrap: {
    backgroundColor: '#fff7e8',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#24140d',
    marginBottom: 8,
  },
  centeredModalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#71584a',
    marginBottom: 12,
  },
  centeredModalMessage: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },
  primaryModalButton: {
    minWidth: 120,
    borderRadius: 16,
    backgroundColor: '#c45518',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryAccountButton: {
    backgroundColor: '#f46f1f',
  },
  secondaryModalButton: {
    backgroundColor: '#fff1e7',
  },
  modalButtonText: {
    color: '#c45518',
    fontWeight: '800',
  },
  primaryModalButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  secondaryModalButtonText: {
    color: '#9b623f',
  },
  modalCancelText: {
    color: '#8a6856',
    fontWeight: '700',
  },
});

export default LoginScreen;
