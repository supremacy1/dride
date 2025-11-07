import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/Rider/Home';
import BookingScreen from '../screens/Rider/Booking';

const Stack = createStackNavigator();

const RiderStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Booking" component={BookingScreen} />
      {/* Add other rider screens here: RideRequest, RideTracking, Payment */}
    </Stack.Navigator>
  );
};

export default RiderStack;