import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Wrapper that uses `react-native-maps` when available, otherwise falls back
// to a small placeholder. This avoids crashes on devices where the native
// module hasn't been installed/configured yet.
let RNMapView: any = null;
let PROVIDER_GOOGLE: any = null;
try {
  // Use require so bundlers don't attempt to resolve this when not installed
  // (helps during development without native setup).
   
  const maps = require('react-native-maps');
  RNMapView = maps.default || maps;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE || (maps.default && maps.default.PROVIDER_GOOGLE);
} catch (e) {
  RNMapView = null;
}

type Props = {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: any;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  provider?: any;
};

const MapViewWrapper = (props: Props) => {
  if (RNMapView) {
    // Render the native map component
    return (
      // @ts-ignore – dynamic component
      <RNMapView
        provider={props.provider || PROVIDER_GOOGLE}
        style={props.style || styles.full}
        initialRegion={props.initialRegion}
        showsUserLocation={props.showsUserLocation}
        showsMyLocationButton={props.showsMyLocationButton}
      >
        {props.children}
      </RNMapView>
    );
  }

  // Fallback placeholder
  return (
    <View style={[styles.map, props.style]}>
      <Text style={{ color: '#666' }}>Map placeholder — install react-native-maps for full functionality</Text>
      {props.children}
    </View>
  );
};

const styles = StyleSheet.create({
  map: { height: 300, backgroundColor: '#eef', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  full: { ...StyleSheet.absoluteFillObject },
});

export default MapViewWrapper;
