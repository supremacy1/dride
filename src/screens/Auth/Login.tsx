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
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:3001'; // Use your server's IP for device testing

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // On success, sign the user in using the context
      signIn(data.user);
      // The RootNavigator will automatically switch to the App stack
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Enter your email to log in and book a ride.</Text>
        <Input placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button title={loading ? 'Logging In...' : 'Login'} onPress={handleLogin} disabled={loading} />
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'gray', textAlign: 'center', marginBottom: 24 },
  linkButton: { marginTop: 16 },
  linkText: { color: '#007AFF', textAlign: 'center', fontSize: 16 },
});

export default LoginScreen;