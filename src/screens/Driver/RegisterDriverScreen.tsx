import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';

// We receive navigation prop to be able to go back
const RegisterDriverScreen = ({ navigation }: { navigation: any }) => {
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Become a Driver</Text>
          <Text style={styles.subtitle}>
            Complete the form below to start earning.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Driver's License Number"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Car Model (e.g., Toyota Camry 2020)"
          value={carModel}
          onChangeText={setCarModel}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="License Plate Number"
          value={carPlate}
          onChangeText={setCarPlate}
          autoCapitalize="characters"
          placeholderTextColor="#888"
        />

        <Button title="Submit Application" onPress={handleRegister} />
        <View style={{ marginTop: 10 }} />
        <Button title="Go Back" onPress={() => navigation.goBack()} color="gray" />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    fontSize: 16,
  },
});

export default RegisterDriverScreen;