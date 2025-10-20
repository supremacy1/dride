import React from 'react';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import RiderStack from './RiderStack';
import DriverStack from './DriverStack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const RootNavigator = () => {
  const { userToken, userType, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userToken) {
    return <AuthStack />;
  }

  return userType === 'rider' ? <RiderStack /> : <DriverStack />;
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default RootNavigator;