import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics'
import { PFButton } from 'shared/components/PFButton';
import typography from 'shared/theme/typography';
import storage from 'shared/Storage';
import { BiometricInstructions, BiometricInstructionsSmartScale, StorageNames } from 'shared/Constants';
import colors from 'shared/theme/colors';
import CheckBox from '@react-native-community/checkbox';
import LoadingView from 'shared/components/LoadingView';
import { getCurrentDevice } from 'shared/Utils';

const BiometricInstructionScreen = ({ navigation }) => {
  const [bypassInstructionsScreen, setBypassInstructionsScreen] =
    React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const [currentDeviceInstructions, setCurrentDeviceInstructions] = useState(null)

  const handleInstructionsEvent = async () => {
    if (isLoading) {
      return;
    }

    setLoading(true);

    try {
      if (bypassInstructionsScreen) {
        await storage.setItem(StorageNames.bypass_pairing_instructions, 'no');
        setBypassInstructionsScreen(false);
         await analytics().logEvent('Next');
      } else {
        await storage.setItem(StorageNames.bypass_pairing_instructions, 'yes');
        setBypassInstructionsScreen(true);
         await analytics().logEvent('Dont_Show_Checked');
      }
      setLoading(false);
    } catch (exception) {
      setLoading(false);
      crashlytics.log('Error on handle instruction event');
      crashlytics.recordError(exception);
       Alert.alert(
         'Something went wrong. Please try again and if the problem continues contact your care coordinator',
       );
    }
  };

  const handleNextEvent = () => {
    navigation.navigate('BiometricReadingScreen');
  };

  const getPairingInstructionsState = async () => {
    try {
      const result = await storage.getItem(
        StorageNames.bypass_pairing_instructions,
      );
      if (result && result === 'yes') {
        setBypassInstructionsScreen(true);
      } else {
        setBypassInstructionsScreen(false);
      }
    } catch (exception) {
      crashlytics.log('Error on pairing instructions');
      crashlytics.recordError(exception);
       Alert.alert(
         'Something went wrong. Please try again and if the problem continues contact your care coordinator',
       );
    }
  };

  const getDeviceInstructions = async () => {
    let device = await getCurrentDevice()
    if (device[0].identifier.includes('A&D_UC-352BLE')) {
      setCurrentDeviceInstructions(BiometricInstructions);
      return BiometricInstructions;
    } else {
      setCurrentDeviceInstructions(BiometricInstructionsSmartScale);
      return BiometricInstructionsSmartScale;
    } 
  }

  useEffect(() => {
    getPairingInstructionsState();
  }, []);

  useEffect(() => {
    getDeviceInstructions();
  }, [])

  const headerComponent = () => {
    return (
      <View style={[styles.headerContainer]}>
        <View style={[styles.headerContent]}>
          <Text
            style={[typography.pageHeader, styles.pageHeader, styles.spacing]}
          >
            Take a Reading
          </Text>
          <Text style={[typography.header, styles.header]}>Body Weight</Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
    return (
      <Text style={[typography.regular, styles.text]}>
        {index + 1}. {item}
      </Text>
    );
  };

  const footerComponent = () => {
    return (
      <View style={{marginBottom: 20}}>
        <TouchableOpacity
          style={[styles.dismiss, styles.bypassButton]}
          onPress={handleInstructionsEvent}
        >
          <CheckBox
            disabled
            value={bypassInstructionsScreen}
            boxType="square"
            tintColor={colors.iron}
            onCheckColor={colors.primary}
            onFillColor={colors.white}
            onTintColor={colors.iron}
            onAnimationType="fade"
            offAnimationType="fade"
            animationDuration={0}
            style={{ height: 20, width: 20, marginRight: 10 }}
          />
          <Text style={[typography.regular, styles.dismissText]}>
            Don't show this again
          </Text>
        </TouchableOpacity>
        <PFButton
          title="NEXT"
          textStyle={[typography.header, styles.button]}
          onPress={handleNextEvent}
        />
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={currentDeviceInstructions}
        renderItem={renderItem}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={footerComponent}
        ListFooterComponentStyle={styles.footerComponentStyle}
      />
      <LoadingView isLoading={isLoading} />
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 30,
  },
  buttonContainer: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginHorizontal: 10,
  },
  headerContent: {
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    color: colors.primary,
  },
  header: {
    color: colors.darkText,
  },
  spacing: {
    marginBottom: 8,
  },
  text: {
    marginVertical: 20,
    marginHorizontal: 16,
  },
  button: {
    color: colors.white,
  },
  footerComponentStyle: {
    marginTop: 48,
    marginHorizontal: 42,
  },
  dismissText: {
    color: colors.darkText,
  },
  dismiss: {
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bypassButton: {
    height: 44,
  },
});

export default BiometricInstructionScreen;
