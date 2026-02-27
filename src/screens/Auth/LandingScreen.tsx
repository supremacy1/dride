import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Animated,
} from 'react-native';

const boltLogo = {
  uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
};

const Feature = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={styles.feature}>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureSubtitle}>{subtitle}</Text>
  </View>
);

// Simple crossfade slideshow used in the header background
const Slideshow = ({ images, style }: { images: string[]; style?: any }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [nextIndex, setNextIndex] = React.useState<number | null>(null);
  const fade = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const handle = setInterval(() => {
      const next = (currentIndex + 1) % images.length;
      setNextIndex(next);
      fade.setValue(0);
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(next);
        setNextIndex(null);
      });
    }, 3500);

    return () => clearInterval(handle);
  }, [currentIndex, fade, images.length]);

  return (
    <View style={[styles.slideshow, style]}>
      <Image
        source={{ uri: images[currentIndex] }}
        style={styles.slideshowImage}
      />
      {nextIndex !== null && (
        <Animated.Image
          source={{ uri: images[nextIndex] }}
          style={[
            styles.slideshowImage,
            { position: 'absolute', opacity: fade },
          ]}
        />
      )}
    </View>
  );
};

const LandingScreen = ({ navigation }: { navigation: any }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Slideshow
          images={[
            // driver-in-car / behind-the-wheel style images
            'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1516929562872-4f75a4f9b9c9?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1520975911887-8b8b0b1f4d1b?q=80&w=1200&auto=format&fit=crop',
          ]}
          style={styles.headerBackground}
        />
        {/* dark overlay to increase contrast for text/logo */}
        <View style={styles.headerOverlay} />

        <View style={styles.headerContent}>
          <Image source={require('../../assets/d1.jpg')} style={styles.logo} />
          <Text style={styles.brand}>D-Ride</Text>
        </View>
      </View>
      
      <View style={styles.hero}>
        {/* local hero background image and overlay */}
        {/* <Image source={require('../../assets/dride.jpg')} style={styles.heroBackground} /> */}
        {/* <View style={styles.heroOverlay} pointerEvents="none" /> */}

        <Text style={styles.heroTitle}>Get there faster.</Text>
        <Text style={styles.heroSubtitle}>
          Affordable rides, trusted drivers — all in one app.
        </Text>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.cta, styles.ctaPrimary]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.ctaPrimaryText}>Book a ride</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cta, styles.ctaAlt]}
            onPress={() => navigation.navigate('RegisterDriver')}
          >
            <Text style={styles.ctaAltText}>Become a driver</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.features}>
        <Feature
          title="Live tracking"
          subtitle="See drivers move in real time"
        />
        <Feature
          title="Transparent pricing"
          subtitle="Know your fare before you ride"
        />
        <Feature
          title="Driver approval"
          subtitle="Drivers are verified and approved by admin"
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  header: { height: 120, padding: 20, justifyContent: 'center' },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  headerContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  brand: { fontSize: 22, fontWeight: '700', color: '#fff' },
  hero: { paddingHorizontal: 20, paddingVertical: 10 },

  heroTitle: { fontSize: 34, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { fontSize: 16, color: '#141212ff', marginBottom: 18 },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  ctaRow: { flexDirection: 'row', gap: 12 },
  cta: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  ctaPrimary: { backgroundColor: '#FF4D00' },
  ctaAlt: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  ctaPrimaryText: { color: '#fff', fontWeight: '700' },
  ctaAltText: { color: '#333', fontWeight: '700' },
  slideshow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  slideshowImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  features: { padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  feature: { marginBottom: 14 },
  featureTitle: { fontSize: 16, fontWeight: '700' ,color:'#FF4D00'},
  featureSubtitle: { fontSize: 13, color: '#666' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f8f8f8' },
  linkButton: { paddingVertical: 10 },
  linkText: { color: '#007AFF', textAlign: 'center' },
});

export default LandingScreen;
