import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/Driver/Dashboard';
import SettingsScreen from '../screens/Driver/Settings';
import RideAcceptScreen from '../screens/Driver/RideAccept';
import DriverRideHistoryScreen from '../screens/Driver/RideHistory';

const Stack = createStackNavigator();

const DriverStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="RideAccept" component={RideAcceptScreen} />
      <Stack.Screen name="RideHistory" component={DriverRideHistoryScreen} />
      {/* Add other driver screens here: RideAccept, RideInProgress, Earnings */}
    </Stack.Navigator>
  );
};

export default DriverStack;
