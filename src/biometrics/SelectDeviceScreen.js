import React from 'react';
import recoil from 'recoil';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import storage from 'shared/Storage';
import { assets, StorageNames } from 'shared/Constants';
import colors from 'shared/theme/colors';
import typography from 'shared/theme/typography';
import { ItemCell } from 'shared/components/ItemCell';
import LoadingView from 'shared/components/LoadingView';
import { SelectedPeripheralState } from 'shared/atoms/SelectedPeripheralState';

export const SelectDeviceScreen = ({ navigation }) => {
  const [peripherals, setPeripherals] = React.useState([]);
  const [isLoading, setLoading] = React.useState(false);
  const setSelectedPeripheral = recoil.useSetRecoilState(
    SelectedPeripheralState,
  );

  const retrieveSavedDevices = async () => {
    try {
      setLoading(true);
      const items = await storage.getItem(
        StorageNames.connected_bluetooth_devices,
      );
      setPeripherals(items);
    } catch (exception) {
      crashlytics.log('Error in retrieve saved devices');
      crashlytics.recordError(exception);
       Alert.alert(
         'Something went wrong. Please try again and if the problem continues contact your care coordinator',
       );
    }
    setLoading(false);
  };

  const handleSelectedPeripheral = async peripheral => {
    setSelectedPeripheral(peripheral);
    analytics().logEvent(`Sync_Device${peripheral.replace(/\s+/g, '_')}_Device_Found`);
    analytics().logEvent(`Devices_${peripheral.replace(/\s+/g, '_')}`);
    try {
      const result = await storage.getItem(
        StorageNames.bypass_pairing_instructions,
      );
      if (result && result === 'yes') {
        analytics().logEvent(`Sync_Device_Device_Sync_Confirm_${peripherals}_Take_A_Reading`);

        navigation.navigate('BiometricReadingScreen');
      } else {
        navigation.navigate('BiometricInstructionScreen');
      }
    } catch (exception) {
      crashlytics.log('Error in selected peripheral');
      crashlytics.recordError(exception);
       Alert.alert(
         'Something went wrong. Please try again and if the problem continues contact your care coordinator',
       );
    }
  };

  React.useEffect(() => {
    retrieveSavedDevices();
  }, []);

  const headerComponent = () => {
    return (
      <View style={styles.headerContent}>
        <Text style={[typography.pageHeader, styles.pageHeader]}>
          Take a Reading
        </Text>
        <Text style={[typography.header, styles.header]}>
          Select your device
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.item}>
        <ItemCell
          title={item.display}
          image={assets[item.image]}
          onSelectedItem={() => handleSelectedPeripheral(item)}
          meta={item}
        />
      </View>
    );
  };

  return (
    <>
      {isLoading ? (
        <LoadingView isLoading={isLoading} />
      ) : (
        <FlatList
          data={peripherals}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={headerComponent}
          ListHeaderComponentStyle={styles.headerComponent}
          contentContainerStyle={styles.container}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ironLight,
  },
  headerComponent: {
    marginVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    color: colors.primary,
  },
  header: {
    color: colors.darkText,
    marginTop: 10,
  },
  emptyContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  text: {
    marginBottom: 10,
  },
  item: { marginHorizontal: 20 },
});
