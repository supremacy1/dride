import React, {useState} from 'react';
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import {API_URL} from '../../config/api';
import {requestDriverLocation} from '../../utils/driverLocation';

type UploadAsset = {
  fileName?: string;
  name?: string;
  type?: string;
  uri?: string;
} | null;

const uploadFields = [
  {key: 'profile', label: 'Profile Photo'},
  {key: 'license', label: 'Driver License'},
  {key: 'nin', label: 'NIN Slip'},
  {key: 'vehiclePapers', label: 'Vehicle Papers'},
  {key: 'address', label: 'Proof of Address'},
];

const rideTypeOptions = [
  {id: 'bike', label: 'Delivery'},
  {id: 'standard', label: 'Standard'},
  {id: 'luxury', label: 'Luxury'},
  {id: 'van', label: 'Close Van'},
];

const steps = [
  {
    id: 1,
    title: 'Personal Details',
    hint: 'Tell us who you are so we can verify and contact you.',
  },
  {
    id: 2,
    title: 'Vehicle Info',
    hint: 'Add your vehicle details and choose your ride category.',
  },
  {
    id: 3,
    title: 'Documents',
    hint: 'Upload every required document before submitting your application.',
  },
];

const RegisterDriverScreen = ({navigation}: {navigation: any}) => {
  const [registerAs, setRegisterAs] = useState<'user' | 'driver'>('driver');
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [rideType, setRideType] = useState('standard');
  const [licenseDoc, setLicenseDoc] = useState<UploadAsset>(null);
  const [vehiclePapersDoc, setVehiclePapersDoc] = useState<UploadAsset>(null);
  const [ninDoc, setNinDoc] = useState<UploadAsset>(null);
  const [profilePic, setProfilePic] = useState<UploadAsset>(null);
  const [proofOfAddressDoc, setProofOfAddressDoc] = useState<UploadAsset>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalActions, setModalActions] = useState<
    Array<{text: string; onPress?: () => void}>
  >([{text: 'OK'}]);
  const isApplicationSubmitted = modalTitle === 'Application Submitted';
  const activeStep = steps.find(step => step.id === currentStep) || steps[0];

  const showModal = (
    title: string,
    message: string,
    actions: Array<{text: string; onPress?: () => void}> = [{text: 'OK'}],
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalActions(actions);
    setModalVisible(true);
  };

  const handleUpload = (type: string) => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      response => {
        if (response.didCancel || !response.assets?.length) {
          return;
        }

        if (response.errorMessage) {
          showModal('Upload Error', response.errorMessage);
          return;
        }

        const asset = response.assets[0];

        if (type === 'license') {
          setLicenseDoc(asset);
        }
        if (type === 'vehiclePapers') {
          setVehiclePapersDoc(asset);
        }
        if (type === 'nin') {
          setNinDoc(asset);
        }
        if (type === 'profile') {
          setProfilePic(asset);
        }
        if (type === 'address') {
          setProofOfAddressDoc(asset);
        }
      },
    );
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const validatePersonalDetails = () => {
    if (!fullName || !surname || !email || !phone || !password || !address || !dateOfBirth) {
      showModal('Missing Fields', 'Please fill all personal details before continuing.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    if (password.length <= 6) {
      showModal('Invalid Password', 'Password must be more than 6 characters long.');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      showModal('Invalid Password', 'Password must contain at least one capital letter.');
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      showModal('Invalid Password', 'Password must contain at least one special character.');
      return false;
    }

    return true;
  };

  const validateVehicleInfo = () => {
    if (!licenseNumber || !carModel || !carColor || !carPlate || !rideType) {
      showModal('Missing Fields', 'Please complete your vehicle info and ride category.');
      return false;
    }

    return true;
  };

  const validateDocuments = () => {
    if (!profilePic || !licenseDoc || !vehiclePapersDoc || !ninDoc || !proofOfAddressDoc) {
      showModal('Missing Documents', 'Please upload all required documents.');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validatePersonalDetails()) {
      return;
    }

    if (currentStep === 2 && !validateVehicleInfo()) {
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleRegister = async () => {
    if (!validatePersonalDetails() || !validateVehicleInfo() || !validateDocuments()) {
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('fullname', fullName);
      formData.append('surname', surname);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('address', address);
      formData.append('date_of_birth', dateOfBirth!.toISOString().split('T')[0]);
      formData.append('license_number', licenseNumber);
      formData.append('car_model', carModel);
      formData.append('car_color', carColor);
      formData.append('car_plate', carPlate);
      formData.append('ride_type', rideType);

      let locationNotice = '';
      try {
        const registrationLocation = await requestDriverLocation();
        formData.append('current_lat', String(registrationLocation.latitude));
        formData.append('current_lng', String(registrationLocation.longitude));
      } catch (locationError: any) {
        locationNotice =
          ' We could not capture the driver location during registration, but it will update automatically after driver login.';
        console.warn('Driver registration location lookup failed:', locationError);
      }

      formData.append('profile_picture', {
        uri: profilePic!.uri,
        type: profilePic!.type,
        name: profilePic!.fileName || profilePic!.name || 'profile.jpg',
      } as any);

      formData.append('license', {
        uri: licenseDoc!.uri,
        type: licenseDoc!.type,
        name: licenseDoc!.fileName || licenseDoc!.name || 'license.jpg',
      } as any);

      formData.append('nin', {
        uri: ninDoc!.uri,
        type: ninDoc!.type,
        name: ninDoc!.fileName || ninDoc!.name || 'nin.jpg',
      } as any);

      formData.append('vehiclePapers', {
        uri: vehiclePapersDoc!.uri,
        type: vehiclePapersDoc!.type,
        name: vehiclePapersDoc!.fileName || vehiclePapersDoc!.name || 'papers.jpg',
      } as any);

      formData.append('proof_of_address', {
        uri: proofOfAddressDoc!.uri,
        type: proofOfAddressDoc!.type,
        name: proofOfAddressDoc!.fileName || proofOfAddressDoc!.name || 'address.jpg',
      } as any);

      const response = await fetch(`${API_URL}/api/auth/RegisterDriverScreen`, {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned an unexpected response format (Status: ${response.status}). Please check server logs. Raw: ${responseText.substring(0, 200)}...`,
        );
      }

      if (!response.ok) {
        throw new Error(data.message || `Registration failed with status: ${response.status}`);
      }

      const accountSummary = data.accountDetails?.account_number
        ? ` Your wallet funding account is ${data.accountDetails.account_number} (${data.accountDetails.bank_name || 'Paystack'}).`
        : '';
      const accountStatusNote = data.paystackWarning
        ? ` ${data.paystackWarning}`
        : '';

      showModal(
        'Application Submitted',
        `Your application is under review. You will be notified once your account is verified.${accountSummary}${accountStatusNote}${locationNotice}`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error: any) {
      showModal('Registration Failed', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getAssetForKey = (key: string) => {
    if (key === 'profile') {
      return profilePic;
    }
    if (key === 'license') {
      return licenseDoc;
    }
    if (key === 'nin') {
      return ninDoc;
    }
    if (key === 'vehiclePapers') {
      return vehiclePapersDoc;
    }
    return proofOfAddressDoc;
  };

  const renderPersonalDetailsStep = () => (
    <>
      <Text style={styles.sectionTitle}>Personal Details</Text>
      <Text style={styles.sectionHint}>
        These details help us verify you and contact you about your application.
      </Text>
      <View style={styles.infoBanner}>
        <MaterialIcons name="account-balance" size={18} color="#0f766e" />
        <Text style={styles.infoBannerText}>
          A Paystack virtual account will be created for your driver wallet after registration.
        </Text>
      </View>

      <Input
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />
      <Input
        placeholder="Surname"
        value={surname}
        onChangeText={setSurname}
        style={styles.input}
      />
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <View style={styles.passwordContainer}>
        <Input
          placeholder="Password"
          secureTextEntry={!isPasswordVisible}
          value={password}
          onChangeText={setPassword}
          style={styles.passwordInput}
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={styles.eyeButton}>
          <MaterialIcons
            name={isPasswordVisible ? 'visibility-off' : 'visibility'}
            size={22}
            color="#8a6856"
          />
        </TouchableOpacity>
      </View>

      {password.length > 0 && (
        <View style={styles.rulesCard}>
          <Text
            style={[
              styles.ruleText,
              password.length > 6 ? styles.ruleSuccess : styles.ruleError,
            ]}>
            * More than 6 characters
          </Text>
          <Text
            style={[
              styles.ruleText,
              /[A-Z]/.test(password) ? styles.ruleSuccess : styles.ruleError,
            ]}>
            * At least one capital letter
          </Text>
          <Text
            style={[
              styles.ruleText,
              /[!@#$%^&*(),.?":{}|<>]/.test(password)
                ? styles.ruleSuccess
                : styles.ruleError,
            ]}>
            * At least one special character
          </Text>
        </View>
      )}

      <Input
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <Input
        placeholder="Home Address"
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />

      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateField}>
        <Text style={dateOfBirth ? styles.dateValue : styles.placeholderText}>
          {dateOfBirth ? dateOfBirth.toLocaleDateString() : 'Date of Birth'}
        </Text>
        <MaterialIcons name="calendar-today" size={18} color="#c45518" />
      </TouchableOpacity>

      {showDatePicker && (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            testID="dateTimePicker"
            value={dateOfBirth || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
          />
          {Platform.OS === 'ios' && (
            <Button title="Done" onPress={() => setShowDatePicker(false)} color="#7a3511" />
          )}
        </View>
      )}
    </>
  );

  const renderVehicleStep = () => (
    <>
      <Text style={styles.sectionTitle}>Vehicle Info</Text>
      <Text style={styles.sectionHint}>
        Add the main details we need to match your account to your car.
      </Text>

      <Input
        placeholder="Driver License Number"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        style={styles.input}
      />
      <Input
        placeholder="Car Model"
        value={carModel}
        onChangeText={setCarModel}
        style={styles.input}
      />
      <Input
        placeholder="Car Color"
        value={carColor}
        onChangeText={setCarColor}
        style={styles.input}
      />
      <Input
        placeholder="Car Plate Number"
        value={carPlate}
        onChangeText={setCarPlate}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Ride Category</Text>
      <View style={styles.rideTypeSelector}>
        {rideTypeOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.rideTypeChip,
              rideType === option.id && styles.rideTypeChipActive,
            ]}
            onPress={() => setRideType(option.id)}>
            <Text
              style={[
                styles.rideTypeChipText,
                rideType === option.id && styles.rideTypeChipTextActive,
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderDocumentsStep = () => (
    <>
      <Text style={styles.sectionTitle}>Upload Documents</Text>
      <Text style={styles.sectionHint}>
        Each document card updates as soon as you choose a file from your gallery.
      </Text>

      {uploadFields.map(item => {
        const asset = getAssetForKey(item.key);
        const fileName = asset?.fileName || asset?.name;

        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.uploadCard, fileName && styles.uploadCardComplete]}
            onPress={() => handleUpload(item.key)}>
            <View style={styles.uploadIconWrap}>
              <MaterialIcons
                name={fileName ? 'check-circle' : 'upload-file'}
                size={22}
                color={fileName ? '#1f8b4c' : '#c45518'}
              />
            </View>
            <View style={styles.uploadTextWrap}>
              <Text style={styles.uploadTitle}>{item.label}</Text>
              <Text style={styles.uploadSubtitle}>
                {fileName ? fileName : `Tap to upload your ${item.label.toLowerCase()}.`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );

  const renderStepContent = () => {
    if (currentStep === 1) {
      return renderPersonalDetailsStep();
    }

    if (currentStep === 2) {
      return renderVehicleStep();
    }

    return renderDocumentsStep();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backPill}>
              <MaterialIcons name="arrow-back" size={18} color="#7a3511" />
              <Text style={styles.backPillText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Driver onboarding</Text>
            </View>
          </View>

          <Image
            source={require('../../assets/dride.jpg')}
            style={styles.heroImage}
            resizeMode="contain"
          />

          <Text style={styles.heroTitle}>Drive with confidence</Text>
          <Text style={styles.heroSubtitle}>
            Complete your application one step at a time with a calmer, clearer flow.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleButton, registerAs === 'user' && styles.roleButtonActive]}
              onPress={() => {
                setRegisterAs('user');
                navigation.navigate('Register');
              }}>
              <Text style={[styles.roleButtonText, registerAs === 'user' && styles.roleButtonTextActive]}>
                User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, registerAs === 'driver' && styles.roleButtonActive]}
              onPress={() => setRegisterAs('driver')}>
              <Text style={[styles.roleButtonText, registerAs === 'driver' && styles.roleButtonTextActive]}>
                Driver
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepHeader}>
            <View>
              <Text style={styles.stepLabel}>
                Step {currentStep} of {steps.length}
              </Text>
              <Text style={styles.stepTitle}>{activeStep.title}</Text>
              <Text style={styles.stepHint}>{activeStep.hint}</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            {steps.map(step => (
              <View
                key={step.id}
                style={[
                  styles.progressDot,
                  currentStep >= step.id && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {renderStepContent()}

          <View style={styles.navigationRow}>
            {currentStep > 1 ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={handlePrevious}>
                <Text style={styles.secondaryButtonText}>Previous</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonSpacer} />
            )}

            {currentStep < steps.length ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.submitButtonWrap}>
                <Button
                  title={loading ? 'Submitting...' : 'Submit Application'}
                  onPress={handleRegister}
                  disabled={loading}
                  color="#f46f1f"
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              isApplicationSubmitted && styles.successModalBox,
            ]}>
            {isApplicationSubmitted ? (
              <View style={styles.successIconWrap}>
                <MaterialIcons
                  name="verified"
                  size={34}
                  color="#1f8b4c"
                />
              </View>
            ) : null}
            <Text
              style={[
                styles.modalTitle,
                isApplicationSubmitted && styles.successModalTitle,
              ]}>
              {modalTitle}
            </Text>
            <Text
              style={[
                styles.modalMessage,
                isApplicationSubmitted && styles.successModalMessage,
              ]}>
              {modalMessage}
            </Text>
            {isApplicationSubmitted ? (
              <View style={styles.successNote}>
                <MaterialIcons
                  name="schedule"
                  size={16}
                  color="#c45518"
                />
                <Text style={styles.successNoteText}>
                  We will review your documents and notify you once your driver
                  account is approved.
                </Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              {modalActions.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.modalButton,
                    isApplicationSubmitted && styles.successModalButton,
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    if (a.onPress) {
                      a.onPress();
                    }
                  }}>
                  <Text
                    style={[
                      styles.modalButtonText,
                      isApplicationSubmitted && styles.successModalButtonText,
                    ]}>
                    {a.text === 'OK' && isApplicationSubmitted
                      ? 'Back to login'
                      : a.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6efe8',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: '#22130c',
    borderRadius: 30,
    padding: 22,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    right: -50,
    backgroundColor: 'rgba(244,111,31,0.18)',
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: 30,
    left: -30,
    backgroundColor: 'rgba(255,214,168,0.10)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#fff3ea',
  },
  backPillText: {
    color: '#7a3511',
    fontWeight: '700',
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroBadgeText: {
    color: '#f6d5c4',
    fontSize: 12,
    fontWeight: '700',
  },
  heroImage: {
    width: '100%',
    height: 170,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff8f2',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#e7c3b0',
    textAlign: 'center',
  },
  card: {
    marginTop: 18,
    backgroundColor: '#fffaf6',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#412114',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff1e7',
    borderRadius: 18,
    padding: 5,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  roleButtonActive: {
    backgroundColor: '#f46f1f',
  },
  roleButtonText: {
    color: '#9b623f',
    fontWeight: '700',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  stepHeader: {
    marginBottom: 12,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c45518',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#24140d',
    marginTop: 4,
  },
  stepHint: {
    marginTop: 6,
    color: '#71584a',
    fontSize: 14,
    lineHeight: 21,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  progressDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#f1d6c4',
  },
  progressDotActive: {
    backgroundColor: '#f46f1f',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#24140d',
    marginTop: 10,
  },
  sectionHint: {
    marginTop: 6,
    marginBottom: 10,
    color: '#71584a',
    fontSize: 14,
    lineHeight: 21,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ecfeff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#b7f0eb',
    padding: 12,
    marginBottom: 8,
  },
  infoBannerText: {
    flex: 1,
    color: '#115e59',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    marginVertical: 8,
  },
  fieldLabel: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#24140d',
  },
  rideTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  rideTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#fff3ea',
    borderWidth: 1,
    borderColor: '#f1d6c4',
  },
  rideTypeChipActive: {
    backgroundColor: '#f46f1f',
    borderColor: '#f46f1f',
  },
  rideTypeChipText: {
    color: '#8a6856',
    fontWeight: '700',
  },
  rideTypeChipTextActive: {
    color: '#fff',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    marginVertical: 8,
    paddingRight: 46,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 22,
  },
  rulesCard: {
    backgroundColor: '#fff3ea',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 13,
    marginBottom: 4,
  },
  ruleSuccess: {
    color: '#1f8b4c',
  },
  ruleError: {
    color: '#c45518',
  },
  dateField: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ead7ca',
    backgroundColor: '#fffaf6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateValue: {
    color: '#24140d',
    fontSize: 15,
  },
  placeholderText: {
    color: '#8a6856',
    fontSize: 15,
  },
  datePickerWrap: {
    marginTop: 6,
    marginBottom: 12,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fff3ea',
    marginBottom: 12,
  },
  uploadCardComplete: {
    backgroundColor: '#f4fbf6',
  },
  uploadIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fffaf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  uploadTextWrap: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#24140d',
  },
  uploadSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#71584a',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  buttonSpacer: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6b89a',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff3ea',
  },
  secondaryButtonText: {
    color: '#7a3511',
    fontWeight: '800',
    fontSize: 16,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f46f1f',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  submitButtonWrap: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,10,6,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fffaf6',
    padding: 18,
    borderRadius: 24,
  },
  successModalBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4fbf6',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#24140d',
    marginBottom: 8,
  },
  successModalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#71584a',
    marginBottom: 12,
  },
  successModalMessage: {
    textAlign: 'center',
    marginBottom: 14,
  },
  successNote: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff3ea',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  successNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#7a3511',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },
  successModalButton: {
    minWidth: 150,
    borderRadius: 16,
    backgroundColor: '#f46f1f',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginLeft: 0,
  },
  modalButtonText: {
    color: '#c45518',
    fontWeight: '800',
  },
  successModalButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default RegisterDriverScreen;
