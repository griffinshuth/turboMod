import React from 'react';
import ReactNative, {
  Alert,
  Image,
  NativeEventEmitter,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput
} from 'react-native';
import Recoil from 'recoil';
import { evaluate } from 'mathjs';
import { getUniqueId } from 'react-native-device-info';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { PFButton } from 'shared/components/PFButton';
import colors from 'shared/theme/colors';
import typography from 'shared/theme/typography';
import { assets } from 'shared/Constants';
import LoadingView from 'shared/components/LoadingView';
import TextField from 'shared/components/TextField';
import biometricApi from 'shared/api/BiometricApi';
import PFScreen from 'shared/pages/PFScreen';
import { BiometricState } from 'shared/atoms/BiometricsState';
import { SelectedPeripheralState } from 'shared/atoms/SelectedPeripheralState';
import BiometricInstructionsModal from 'src/app-sections/biometrics/BiometricInstructionsModal';
import { Icon } from 'shared/components/Icon';

const { Nexus } = ReactNative.NativeModules;
const NexusEvents = new NativeEventEmitter(Nexus);

const BiometricReadingScreen = ({ navigation }) => {
  const [isScanning, setScanning] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const [isManualEntryEnabled, setManualEntry] = React.useState(false);
  const [progress, setProgress] = React.useState('waiting...');
  const [biometricReadings, setBiometricReadings] = React.useState([]);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [scanFinished, setScanFinished] = React.useState(false);
  const readingTextField = React.useRef();
  const setBiometrics = Recoil.useSetRecoilState(BiometricState);
  const selectedPeripheral = Recoil.useRecoilValue(SelectedPeripheralState);
 

  const getBiometricsSummaries = async () => {
    try {
      const result = await biometricApi.getBiometricsSummaries();
      setBiometrics(result);
      setBiometricReadings([]);
      navigation.popToTop();
    } catch (exception) {
      crashlytics.log('Error on get biometrics summary');
      crashlytics.recordError(exception);
       Alert.alert(
         'Something went wrong. Please try again and if the problem continues contact your care coordinator',
       );
    }
  };

  const handleSaveBiometricReading = async () => {
    if (isLoading) {
      return;
    }
    analytics().logEvent(`Take_A_Reading_Approve`);
    setLoading(true);
    if (biometricReadings.length > 0) {
      const temp = [...biometricReadings];
      const biometric = temp.pop();
      biometric.accepted = true;
      const items = [...temp, ...[biometric]];
      const data = { weights: items };
      try {
        await biometricApi.postBiometrics(data);
        await getBiometricsSummaries();
        analytics().logEvent(`Take_A_Reading_Scale_Reading_Added`);
      } catch (exception) {
        crashlytics.log('Error on save biometric reading');
        crashlytics.recordError(exception);
         Alert.alert(
           'Something went wrong. Please try again and if the problem continues contact your care coordinator',
         );
      }
    } else {
      Alert.alert('Biometric Reading', 'Reading can not be empty.', [
        {
          text: 'Ok, got it',
          onPress: () => {
            if (isManualEntryEnabled) {
              readingTextField.current.focus();
            }
          },
        },
      ]);
    }
    setLoading(false);
  };

  const handleReject = () => {
    analytics().logEvent(`Take_A_Reading_Deny`);
    handleStartScan();
  };

  const handleManualEntry = () => {
    Nexus.stopScan();
    setManualEntry(true);
    analytics().logEvent(`Take_A_Reading_Manual_Entry`);
    setBiometricReadings([]);

  };

  const handleSaveManualEntry = event => {
    if (
      event &&
      event.nativeEvent &&
      event.nativeEvent.text &&
      event.nativeEvent.text.length > 1
    ) {
      const date = new Date();
      setBiometricReadings([
        {
          value: evaluate(event.nativeEvent.text),
          accepted: true,
          device_id: getUniqueId(),
          collected_date: date.toISOString(),
        },
      ]);
      analytics().logEvent(`Take_A_Reading_Manual_Entry_Added`);
      setManualEntry(false);
      setScanning(false);
    } else {
      return
    }
  };

  const handleStartScan = async () => {
    if (selectedPeripheral) {
      setBiometricReadings([]);
      setScanFinished(false);
      setProgress('waiting...');
      setScanning(true);
      setManualEntry(false);
      setShowInstructions(false);
      Nexus.scanAndTransmit(selectedPeripheral.identifier);
    }
  };
  React.useEffect(() => {
    if (showInstructions || isManualEntryEnabled || !scanFinished) {
      return;
    }
    if (biometricReadings.length < 1 && progress != 'CONNECTED') {
    analytics().logEvent(`Take_A_Reading_Time_Out_Modal`);
      Alert.alert(
        'PACE FIT',
        `We couldn't find ${selectedPeripheral.display}`,
        [
          {
            text: 'Cancel',
            onPress: () => {
              analytics().logEvent(`Take_A_Reading_Time_Out_Cancel`);
              navigation.popToTop();
            },
          },
          {
            text: 'Take Reading',
            onPress: () => {
              handleStartScan(),
                analytics().logEvent(`Take_A_Reading_Time_Out_Take_A_Reading`);
            },
          },
        ],
      );
    }
  }, [scanFinished]);

  React.useEffect(() => {
    const resultEvent = NexusEvents.addListener('NexusResult', biometrics => {
      setBiometricReadings(biometrics);
      setScanning(false);
    });

    const errorEvent = NexusEvents.addListener('NexusError', status => {});

    const timeoutEvent = NexusEvents.addListener('NexusTimeout', () => {
      setScanFinished(true);
    });

    const statusEvent = NexusEvents.addListener('NexusStatus', status => {
      setProgress(status);
    });

    handleStartScan();

    return () => {
      resultEvent.remove();
      errorEvent.remove();
      statusEvent.remove();
      timeoutEvent.remove();
    };
  }, [selectedPeripheral]);

  React.useEffect(() => {
    if (isManualEntryEnabled) {
      readingTextField.current.focus();
    }
  }, [isManualEntryEnabled]);

  if (selectedPeripheral === null) {
    return <LoadingView isLoading={true} />;
  }

  return (
    <PFScreen>
      <View style={[styles.scaleContainer]}>
        <Image style={styles.scale} source={assets[selectedPeripheral.image]} />
      </View>
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[typography.pageHeader, typography.orangeText]}>
          TAKE A READING
        </Text>
        <Text style={[typography.header, typography.darkText]}>
          Body Weight
        </Text>
      </View>
      <View
        style={[styles.container, styles.centerContent, { marginVertical: 30 }]}
      >
        <Text
          style={[
            typography.header,
            typography.orangeText,
            typography.centerText,
            { marginBottom: 20 },
          ]}
        >
          {isScanning
            ? selectedPeripheral.beforeWeightReadingDescription
            : selectedPeripheral.afterWeightReadingDescription}
        </Text>
        <Text
          style={[
            typography.header,
            typography.darkText,
            typography.centerText,
          ]}
        >
          {isScanning
            ? selectedPeripheral.beforeWeightReadingDescriptionDetail
            : selectedPeripheral.afterWeightReadingDescriptionDetail}
        </Text>
      </View>
      <View style={[styles.textFieldContainer, styles.centerContent]}>
        <TextInput
          editable={isManualEntryEnabled}
          ref={readingTextField}
          onEndEditing={handleSaveManualEntry}
          keyboardType="numeric"
          placeholder=""
          defaultValue={
            biometricReadings.length > 0
              ? `${biometricReadings[biometricReadings.length - 1].value} lbs`
              : ''
          }
          placeholderTextColor={colors.darkText}
          style={{
            borderColor: colors.ironLight,
            borderRadius: 8,
            borderWidth: 2,
            height: 40,
            width: 150,
            paddingHorizontal: 8,
            color: colors.darkText,
          }}
        />
      </View>
      <View
        style={[styles.container, { marginVertical: 30, marginHorizontal: 60 }]}
      >
        {isScanning && (
          <TouchableOpacity
            style={{
              height: 44,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={handleManualEntry}
          >
            <Text
              style={[
                typography.orangeText,
                styles.manualEntryText,
                typography.regular,
              ]}
            >
              Manual Entry
            </Text>
          </TouchableOpacity>
        )}
        {!isScanning && (
          <View>
            <View style={{ marginBottom: 20 }}>
              <PFButton title="approve" onPress={handleSaveBiometricReading} />
            </View>
            <TouchableOpacity
              style={{
                borderColor: colors.iron,
                borderWidth: 3,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleReject}
            >
              <Text style={[typography.header, { color: colors.darkText }]}>
                DENY
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {isScanning && (
        <View style={[styles.container, styles.centerContent]}>
          <Text>{progress}</Text>
        </View>
      )}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={() => {
          Nexus.stopScan();
          setShowInstructions(true);
        }}
      >
        <Icon name="information-outline" size={30} color={colors.trout} />
      </TouchableOpacity>
      <LoadingView isLoading={isLoading} />
      <BiometricInstructionsModal
        visible={showInstructions}
        onDismiss={() => {
          setShowInstructions(false);
        }}
      />
    </PFScreen>
  );
};

const styles = StyleSheet.create({
  scaleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  scale: {
    width: 84,
    height: 68,
  },
  container: {
    marginHorizontal: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryText: {
    textDecorationLine: 'underline',
  },
  textFieldContainer: {
    marginHorizontal: 20,
  },
});

export default BiometricReadingScreen;
