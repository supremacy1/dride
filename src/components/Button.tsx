import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';

const Button = ({
  title,
  onPress,
  color = '#f46f1f',
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.btn, {backgroundColor: color}, disabled && styles.btnDisabled]}
    onPress={onPress}
    disabled={disabled}>
    <Text style={styles.txt}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginVertical: 8,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  txt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default Button;
