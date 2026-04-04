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
import {API_URL} from '../../config/api';

const RegisterScreen = ({navigation}: {navigation: any}) => {
  const [registerAs, setRegisterAs] = useState<'user' | 'driver'>('user');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalActions, setModalActions] = useState<
    Array<{text: string; onPress?: () => void}>
  >([{text: 'OK'}]);

  const showModal = (
    title: string,
    message: string,
    actions: Array<{text: string; onPress?: () => void}> = [{text: 'OK'}],
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({fullname, email, phone}),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          showModal(
            'Account exists',
            data.message || 'An account with this email already exists.',
            [
              {
                text: 'Go to Login',
                onPress: () => navigation.navigate('Login'),
              },
              {text: 'Cancel'},
            ],
          );
          return;
        }
        throw new Error(data.message || 'Something went wrong');
      }

      showModal('Success', 'Registration successful! Please log in to continue.', [
        {text: 'OK', onPress: () => navigation.navigate('Login')},
      ]);
    } catch (error: any) {
      showModal('Registration Failed', error.message || JSON.stringify(error));
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
              <Text style={styles.heroBadgeText}>New rider setup</Text>
            </View>
          </View>

          <Image
            source={require('../../assets/3671751.jpg')}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Start with the same soft amber look and a simple setup flow for riders.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleButton, registerAs === 'user' && styles.roleButtonActive]}
              onPress={() => setRegisterAs('user')}>
              <Text style={[styles.roleButtonText, registerAs === 'user' && styles.roleButtonTextActive]}>
                User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, registerAs === 'driver' && styles.roleButtonActive]}
              onPress={() => {
                setRegisterAs('driver');
                navigation.navigate('RegisterDriver');
              }}>
              <Text style={[styles.roleButtonText, registerAs === 'driver' && styles.roleButtonTextActive]}>
                Driver
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            Enter your details once and you will be ready to request rides in seconds.
          </Text>

          <Input
            placeholder="Full Name"
            value={fullname}
            onChangeText={setFullname}
            style={styles.input}
          />
          <Input
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <Input
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Button
            title={loading ? 'Registering...' : 'Register'}
            onPress={handleRegister}
            disabled={loading}
            color="#f46f1f"
          />

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
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
                    if (a.onPress) {
                      a.onPress();
                    }
                  }}>
                  <Text style={[styles.modalButtonText, a.text === 'Cancel' && styles.modalCancelText]}>
                    {a.text}
                  </Text>
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
    bottom: 30,
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
  heroImage: {
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
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#24140d',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#71584a',
    marginBottom: 12,
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
  modalButtonText: {
    color: '#c45518',
    fontWeight: '800',
  },
  modalCancelText: {
    color: '#8a6856',
  },
});

export default RegisterScreen;
