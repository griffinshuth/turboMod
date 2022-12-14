import React from 'react';
import recoil from 'recoil';
import { Text, View } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

import { Icon } from 'shared/components/Icon';
import { PFButton } from 'shared/components/PFButton';
import typography from 'shared/theme/typography';
import colors from 'shared/theme/colors';
import storage from 'shared/Storage';
import { StorageNames } from 'shared/Constants';
import { SelectedPeripheralState } from 'shared/atoms/SelectedPeripheralState';
import LoadingView from 'shared/components/LoadingView';
import PFScreen from 'shared/pages/PFScreen';


const DeviceAddedScreen = ({ navigation }) => {
  const selectedPeripheral = recoil.useRecoilValue(SelectedPeripheralState);

  const handleFirstReadingEvent = async () => {
    try {
      const result = await storage.getItem(
        StorageNames.bypass_pairing_instructions,
      );
      if (result && result === 'yes') {
        navigation.replace('BiometricReadingScreen');
      } else {
        navigation.replace('BiometricInstructionScreen');
      }
    } catch (exception) {
      crashlytics.log('Error on get biometrics summary');
      crashlytics.recordError(exception);
       Alert.alert(
         'Something went wrong. Please try again and if the problem continues contact your care coordinator',
       );
    }
  };

  if (selectedPeripheral === null) {
    return <LoadingView isLoading={true} />;
  }

  return (
    <PFScreen>
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ marginVertical: 40 }}>
          <Icon name="check-circle" color={colors.primary} size={100} />
        </View>
        <Text
          style={[
            typography.pageHeader,
            typography.centerText,
            typography.darkText,
          ]}
        >
          {selectedPeripheral.deviceAddedDescription}
        </Text>
        <Text
          style={[
            typography.header,
            typography.orangeText,
            typography.centerText,
            { marginTop: 30 },
          ]}
        >
          {selectedPeripheral.deviceAddedDescriptionDetail}
        </Text>
        <Text
          style={[
            typography.header,
            typography.orangeText,
            typography.centerText,
            { marginTop: 30, marginBottom: 20 },
          ]}
        >
          {selectedPeripheral.deviceAddedCallToActionText}
        </Text>
      </View>
      <View style={{ marginHorizontal: 30 }}>
        <PFButton
          title="take your first reading"
          onPress={handleFirstReadingEvent}
        />
      </View>
    </PFScreen>
  );
};

export default DeviceAddedScreen;
