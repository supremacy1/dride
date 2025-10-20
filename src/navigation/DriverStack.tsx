import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/Driver/Dashboard';

const Stack = createStackNavigator();

const DriverStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      {/* Add other driver screens here: RideAccept, RideInProgress, Earnings */}
    </Stack.Navigator>
  );
};

export default DriverStack;