import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const DashboardScreen = () => {
  const { signOut } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Driver Dashboard</Text>
      <Button title="Sign Out" onPress={signOut} color="red" />
    </View>
  );
};

export default DashboardScreen;