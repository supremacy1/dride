import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

const RegisterDriverScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');

  const handleRegister = () => {
    // Basic validation
    if (!fullName || !email || !phone || !licenseNumber || !carModel || !carPlate) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // In a real app, you would send this data to your backend API
    // for admin approval.
    console.log({
      fullName,
      email,
      phone,
      licenseNumber,
      carModel,
      carPlate,
    });

    Alert.alert(
      'Application Submitted',
      'Thank you for registering. Your application is under review. We will notify you once it is approved.',
    );
    // Potentially navigate back to login or a "pending approval" screen
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Driver Registration</Text>
      <Text style={styles.subtitle}>
        Complete the form below to start earning.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Driver's License Number"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Car Model (e.g., Toyota Camry 2020)"
        value={carModel}
        onChangeText={setCarModel}
      />
      <TextInput
        style={styles.input}
        placeholder="License Plate Number"
        value={carPlate}
        onChangeText={setCarPlate}
      />

      <Button title="Submit Application" onPress={handleRegister} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20 },
  input: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
});

export default RegisterDriverScreen;