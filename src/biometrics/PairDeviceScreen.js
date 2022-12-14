import React from 'react';
import Recoil from 'recoil';
import ReactNative, {
  Image,
  NativeEventEmitter,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';

import {
  assets,
  StorageNames,
  BluetoothConnectionStatus,
  NotificationIDs,
} from 'shared/Constants';
import PFScreen from 'shared/pages/PFScreen';
import typography from 'shared/theme/typography';
import { PFButton } from 'shared/components/PFButton';
import storage from 'shared/Storage';
import { SelectedPeripheralState } from 'shared/atoms/SelectedPeripheralState';
import LoadingView from 'shared/components/LoadingView';
import { NotificationsState } from 'shared/atoms/notificationsState';

const { Nexus } = ReactNative.NativeModules;
const NexusEvents = new NativeEventEmitter(Nexus);

const PairDeviceScreen = ({ navigation, route }) => {
  const [notifications, setNotifications] =
    Recoil.useRecoilState(NotificationsState);
  const selectedPeripheral = Recoil.useRecoilValue(SelectedPeripheralState);
  const [connectionState, setConnectionState] = React.useState('waiting...');

  const handleSavePeripheral = async () => {
    let items = await storage.getItem(StorageNames.connected_bluetooth_devices);
    if (items && items.length > 0) {
      if (
        items.filter(item => item.identifier === selectedPeripheral.identifier)
          .length > 0
      ) {
        handleNavigation();
      } else {
        items.push(selectedPeripheral);
        await storage.setItem(StorageNames.connected_bluetooth_devices, items);
        handleNavigation();
      }
    } else {
      items = [selectedPeripheral];
      await storage.setItem(StorageNames.connected_bluetooth_devices, items);
      await updateNotificationState();
      handleNavigation();
    }
  };

  const updateNotificationState = async () => {
    const notifs = [...notifications];
    const index = notifs.findIndex(
      current => current.id === NotificationIDs.pairDeviceSetup,
    );
    const updated = notifs.splice(index, 1);
    setNotifications(updated);
  };

  const handleNavigation = () => {
    navigation.replace('DeviceAddedScreen');
  };

  React.useEffect(() => {
    if (
      selectedPeripheral &&
      connectionState === BluetoothConnectionStatus.connected
    ) {
      handleSavePeripheral();
    }
  }, [connectionState]);

  React.useEffect(() => {
    const resultEvent = NexusEvents.addListener(
      'NexusResult',
      biometrics => {},
    );

    const errorEvent = NexusEvents.addListener('NexusError', status => {
      Alert.alert('PACE FIT', status, [
        {
          text: 'Cancel',

          onPress: () => {
            navigation.popToTop();
          },
        },
      ]);
    });

    const timeoutEvent = NexusEvents.addListener('NexusTimeout', () => {
      Alert.alert(
        'PACE FIT',
        `We couldn't find ${selectedPeripheral.display}`,
        [
          {
            text: 'Cancel',
            onPress: () => {
              navigation.popToTop();
            },
          },
          {
            text: 'Pair',
            onPress: () => {
              if (selectedPeripheral) {
                Nexus.scanAndPair(selectedPeripheral.identifier);
              }
            },
          },
        ],
      );
    });

    const statusEvent = NexusEvents.addListener('NexusStatus', status => {
      setConnectionState(status);
    });

    if (selectedPeripheral) {
      Nexus.scanAndPair(selectedPeripheral.identifier);
    }

    return () => {
      resultEvent.remove();
      errorEvent.remove();
      statusEvent.remove();
      timeoutEvent.remove();
    };
  }, [selectedPeripheral]);

  if (selectedPeripheral === null) {
    return <LoadingView isLoading={true} />;
  }

  return (
    <PFScreen>
      <View style={styles.weightContainer}>
        <Image source={assets[selectedPeripheral.image]} />
      </View>
      <View style={styles.pageHeader}>
        <Text style={[typography.pageHeader, typography.orangeText]}>
          ADDING DEVICE
        </Text>
      </View>
      <View style={styles.descriptionContainer}>
        <Text style={[typography.regular, styles.description]}>
          {selectedPeripheral.pairingDescription}
        </Text>
      </View>
      <View style={styles.connectionStateContainer}>
        <Text style={[typography.regular]}>{connectionState}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <PFButton
          title="Cancel"
          onPress={() => {
            navigation.goBack();
          }}
        />
      </View>
    </PFScreen>
  );
};

const styles = StyleSheet.create({
  weightContainer: {
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  description: {
    textAlign: 'center',
  },
  connectionStateContainer: {
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 30,
    marginHorizontal: 20,
  },
});

export default PairDeviceScreen;
