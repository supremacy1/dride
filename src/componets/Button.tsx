import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = { title: string; onPress: () => void; color?: string };

const CustomButton: React.FC<Props> = ({ title, onPress }) => (
  <TouchableOpacity style={styles.btn} onPress={onPress}>
    <Text style={styles.txt}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({ btn: { padding: 10, backgroundColor: '#007bff', borderRadius: 8 }, txt: { color: '#fff', fontWeight: '600' } });

export default CustomButton;