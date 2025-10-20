import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveJSON = async (key: string, value: any) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const loadJSON = async (key: string) => {
  const v = await AsyncStorage.getItem(key);
  return v ? JSON.parse(v) : null;
};

export const removeItem = async (key: string) => {
  await AsyncStorage.removeItem(key);
};
