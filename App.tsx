/**
 * EasyRide App Entry
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { RideProvider } from './src/context/RideContext';
import { WalletProvider } from './src/context/WalletContext';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <RideProvider>
            <WalletProvider>
              <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
              <RootNavigator />
            </WalletProvider>
          </RideProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
