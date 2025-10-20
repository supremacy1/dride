import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from '../screens/Auth/LandingScreen';
import LoginScreen from '../screens/Auth/Login';
import RegisterScreen from '../screens/Auth/Register'; // Assuming this file exists
import RegisterDriverScreen from '../screens/Driver/RegisterDriverScreen';

const Stack = createStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="RegisterDriver"
        component={RegisterDriverScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;