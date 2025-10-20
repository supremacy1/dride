import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

const Input = (props: any) => <TextInput style={styles.input} {...props} />;

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
});

export default Input;
