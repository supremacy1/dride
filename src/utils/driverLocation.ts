import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {API_URL} from '../config/api';

type DriverCoords = {
  latitude: number;
  longitude: number;
};

const getCurrentPosition = (options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}) =>
  new Promise<DriverCoords>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        reject(error);
      },
      options,
    );
  });

export const requestDriverLocation = async (): Promise<DriverCoords> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Location permission was denied.');
    }
  }

  if (Platform.OS === 'ios' && typeof Geolocation.requestAuthorization === 'function') {
    const authStatus = await Geolocation.requestAuthorization('whenInUse');
    if (authStatus === 'denied' || authStatus === 'disabled') {
      throw new Error('Location access is unavailable on this device.');
    }
  }

  try {
    return await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });
  } catch (highAccuracyError: any) {
    try {
      return await getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 120000,
      });
    } catch (fallbackError: any) {
      throw new Error(
        fallbackError?.message ||
          highAccuracyError?.message ||
          'We could not get the driver location. Please turn on device location and try again.',
      );
    }
  }
};

export const syncDriverLocation = async (driverId: number | string) => {
  const coords = await requestDriverLocation();

  const response = await fetch(`${API_URL}/api/driver/update-location`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      id: driverId,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }),
  });

  if (!response.ok) {
    let message = 'Could not update driver location.';

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {}

    throw new Error(message);
  }

  return coords;
};
