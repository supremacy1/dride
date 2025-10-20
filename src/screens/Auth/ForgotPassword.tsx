import React from 'react';
import { View, Text, Button } from 'react-native';

const ForgotPasswordScreen = ({ navigation }: { navigation: any }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Forgot Password Screen</Text>
    <Button title="Go back to Login" onPress={() => navigation.goBack()} />
  </View>
);

export default ForgotPasswordScreen;