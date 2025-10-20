import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Input from '../../components/Input';
import Button from '../../components/Button';

const API_URL = 'http://localhost:3001'; // Use your server's IP in production/testing on device

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullname || !email || !phone) {
      Alert.alert('Error', 'Please fill in all fields.');
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
        throw new Error(data.message || 'Something went wrong');
      }

      Alert.alert(
        'Success',
        'Registration successful! Please log in to continue.',
      );
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
          onPress={handleRegister}
          disabled={loading}
        />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
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
    marginBottom: 24,
    color: '#007AFF',
  },
  backButton: { marginTop: 16 },
  backButtonText: { color: '#007AFF', textAlign: 'center', fontSize: 16 },
});

export default RegisterScreen;
