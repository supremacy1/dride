import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const Button = ({ title, onPress, color = '#007bff' }: { title: string; onPress: () => void; color?: string }) => (
  <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={onPress}>
    <Text style={styles.txt}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: { padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  txt: { color: '#fff', fontWeight: '600' },
});

export default Button;
