import React from 'react';
import {StyleSheet, TextInput} from 'react-native';

const Input = ({style, placeholderTextColor = '#8a6856', ...props}: any) => (
  <TextInput
    style={[styles.input, style]}
    placeholderTextColor={placeholderTextColor}
    {...props}
  />
);

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ead7ca',
    backgroundColor: '#fffaf6',
    color: '#24140d',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    marginVertical: 6,
    fontSize: 15,
  },
});

export default Input;
