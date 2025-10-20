import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/Rider/Home';

const Stack = createStackNavigator();

const RiderStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      {/* Add other rider screens here: RideRequest, RideTracking, Payment */}
    </Stack.Navigator>
  );
};

export default RiderStack;