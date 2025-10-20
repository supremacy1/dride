import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

const CustomInput: React.FC<TextInputProps> = props => <TextInput {...props} style={[styles.input, props.style]} />;

const styles = StyleSheet.create({ input: { borderWidth: 1, padding: 10, borderRadius: 8 } });

export default CustomInput;