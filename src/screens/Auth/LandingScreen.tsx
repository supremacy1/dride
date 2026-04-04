import React from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width} = Dimensions.get('window');

const heroImage = require('../../assets/dride.jpg');
const brandImage = require('../../assets/logo.jpg');

const highlights = [
  {
    icon: 'my-location',
    title: 'Fast pickup',
    subtitle: 'Nearby drivers arrive in minutes, not hours.',
  },
  {
    icon: 'verified-user',
    title: 'Safe every trip',
    subtitle: 'Verified drivers and clear ride details before you go.',
  },
  {
    icon: 'payments',
    title: 'Honest pricing',
    subtitle: 'See your fare early and ride with full confidence.',
  },
];

const quickStats = [
  {label: 'Average pickup', value: '3 min'},
  {label: 'Driver checks', value: '100%'},
];

const FeatureCard = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIconWrap}>
      <MaterialIcons name={icon} size={22} color="#f46f1f" />
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureSubtitle}>{subtitle}</Text>
  </View>
);

const LandingScreen = ({navigation}: {navigation: any}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(12)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1600,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashGlowLarge} />
        <View style={styles.splashGlowSmall} />
        <Animated.View
          style={[
            styles.splashCard,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <Image source={brandImage} style={styles.splashLogo} />
          <Text style={styles.splashTitle}>Urgent Ride</Text>
          <Text style={styles.splashSubtitle}>
            Quick city rides with a calmer, safer feel.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroShell}>
          <ImageBackground source={heroImage} style={styles.heroCard} imageStyle={styles.heroImage}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroGlow} />

            <View style={styles.heroTopRow}>
              <View style={styles.brandPill}>
                <Image source={brandImage} style={styles.logo} />
                <View>
                  <Text style={styles.brandName}>Urgent Ride</Text>
                  <Text style={styles.brandHint}>Move easy around your city</Text>
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Trusted daily rides</Text>
              </View>
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>Better trips start here</Text>
              <Text style={styles.heroTitle}>
                Beautifully simple rides for work, errands, and every quick escape.
              </Text>
              <Text style={styles.heroSubtitle}>
                Book fast, track your driver live, and enjoy clear pricing from pickup to drop-off.
              </Text>

              <View style={styles.statsRow}>
                {quickStats.map(stat => (
                  <View key={stat.label} style={styles.statPill}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.ctaRow}>
                <TouchableOpacity
                  style={[styles.ctaButton, styles.primaryButton]}
                  onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.primaryButtonText}>Book a ride</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ctaButton, styles.secondaryButton]}
                  onPress={() => navigation.navigate('RegisterDriver')}>
                  <Text style={styles.secondaryButtonText}>Drive with us</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.floatingCard}>
              <View>
                <Text style={styles.floatingLabel}>Pickup arriving</Text>
                <Text style={styles.floatingValue}>In 3 mins</Text>
              </View>
              <View style={styles.floatingDivider} />
              <View>
                <Text style={styles.floatingLabel}>Ride status</Text>
                <Text style={styles.floatingAccent}>Driver verified</Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Why riders stay with us</Text>
          <Text style={styles.sectionSubtitle}>
            Everything on the first screen is focused on trust, speed, and comfort.
          </Text>
        </View>

        <View style={styles.featuresGrid}>
          {highlights.map(item => (
            <FeatureCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
            />
          ))}
        </View>

        <View style={styles.promoCard}>
          <View style={styles.promoTextWrap}>
            <Text style={styles.promoTitle}>Ready when the city moves fast</Text>
            <Text style={styles.promoSubtitle}>
              Create an account once and keep booking smooth, secure rides any time you need them.
            </Text>
          </View>
          <MaterialIcons name="directions-car-filled" size={34} color="#f46f1f" />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Already have an account? Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.footerLink}>
            <Text style={styles.footerCreateText}>Create a rider account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6efe8',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#1f130d',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  splashGlowLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(244,111,31,0.18)',
    top: 110,
    left: -40,
  },
  splashGlowSmall: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,214,168,0.12)',
    bottom: 90,
    right: -50,
  },
  splashCard: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  splashLogo: {
    width: 74,
    height: 74,
    borderRadius: 20,
    marginBottom: 18,
  },
  splashTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff7f0',
    letterSpacing: 0.4,
  },
  splashSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#f5d4bf',
    textAlign: 'center',
  },
  heroShell: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  heroCard: {
    minHeight: 520,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 22,
  },
  heroImage: {
    borderRadius: 30,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21,12,9,0.54)',
  },
  heroGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(244,111,31,0.18)',
    top: 140,
    right: -40,
  },
  heroTopRow: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    maxWidth: '72%',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginRight: 12,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  brandHint: {
    fontSize: 12,
    color: '#f6d5c4',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,248,241,0.92)',
  },
  badgeText: {
    color: '#7a3511',
    fontSize: 12,
    fontWeight: '700',
  },
  heroContent: {
    zIndex: 1,
    marginTop: 48,
  },
  heroEyebrow: {
    color: '#ffd8c0',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    color: '#fffaf5',
    maxWidth: '88%',
  },
  heroSubtitle: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 23,
    color: '#f5d7c8',
    maxWidth: '88%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  statPill: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#f3d1bd',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  ctaButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#f46f1f',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: '#fff9f4',
    fontSize: 15,
    fontWeight: '800',
  },
  floatingCard: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#fff8f3',
  },
  floatingLabel: {
    fontSize: 12,
    color: '#8a6856',
    marginBottom: 4,
  },
  floatingValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#23130d',
  },
  floatingAccent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#c45518',
  },
  floatingDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#edd8ca',
    marginHorizontal: 16,
  },
  sectionHeader: {
    paddingHorizontal: 22,
    marginTop: 26,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#22130c',
  },
  sectionSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#71584a',
  },
  featuresGrid: {
    paddingHorizontal: 18,
    marginTop: 18,
    gap: 14,
  },
  featureCard: {
    backgroundColor: '#fffaf6',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#412114',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff1e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#24140d',
  },
  featureSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#7a6256',
  },
  promoCard: {
    marginHorizontal: 18,
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#22130c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  promoTextWrap: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff8f2',
  },
  promoSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#e7c3b0',
  },
  footer: {
    paddingHorizontal: 22,
    marginTop: 22,
    gap: 12,
  },
  footerLink: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#fffaf6',
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#2f1a11',
    fontSize: 15,
    fontWeight: '700',
  },
  footerCreateText: {
    color: '#c45518',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default LandingScreen;
