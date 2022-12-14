import React from 'react';
import Recoil from 'recoil';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { openSettings } from 'react-native-permissions';

import typography from 'shared/theme/typography';
import { assets, SupportedBluetoothDevices } from 'shared/Constants';
import { ItemCell } from 'shared/components/ItemCell';
import { PFButton } from 'shared/components/PFButton';
import { SelectedPeripheralState } from 'shared/atoms/SelectedPeripheralState';
import { useBluetoothPermissions } from 'shared/hooks/useBluetoothPermissions';

const title = 'sync your devices';
const message = 'Select a device you would like to sync to your account.';

const SyncDeviceScreen = ({ navigation }) => {
  const setSelectedPeripheral = Recoil.useSetRecoilState(
    SelectedPeripheralState,
  );
  const { requestPermissions, permissionsGranted } = useBluetoothPermissions();

  const handleItemValueChange = async item => {
    if (!permissionsGranted) {
      showLocationPermissionDialog();
    } else {
      setSelectedPeripheral(item);
      navigation.navigate('PairDeviceScreen');
    }
  };

  const showLocationPermissionDialog = React.useCallback(() => {
    Alert.alert(
      '',
      'PACE requires Location permission in order to connect with our Bluetooth devices.',
      [
        {
          text: 'Cancel',
        },
        {
          text: 'Tap to edit permissions',
          onPress: () => {
            navigation.popToTop();
            openSettings().catch(() =>
              console.warn('could not open settings.'),
            );
          },
        },
      ],
    );
  }, []);

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const headerComponent = () => {
    return (
      <View style={styles.header}>
        <Text
          style={[typography.pageHeader, typography.orangeText, styles.spacing]}
        >
          {title.toUpperCase()}
        </Text>
        <Text
          style={[
            typography.regular,
            styles.spacing,
            typography.darkText,
            { textAlign: 'center' },
          ]}
        >
          {message}
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
          onSelectedItem={handleItemValueChange}
          meta={item}
        />
      </View>
    );
  };

  const footerComponent = () => {
    return (
      <View style={styles.footer}>
        <PFButton title="done" onPress={() => navigation.goBack()} />
      </View>
    );
  };

  return (
    <FlatList
      data={SupportedBluetoothDevices}
      renderItem={renderItem}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
    />
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: 40,
    marginBottom: 20,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  item: { marginHorizontal: 20 },
  spacing: {
    marginBottom: 10,
  },
  footer: {
    marginVertical: 20,
    marginHorizontal: 20,
  },
});

export default SyncDeviceScreen;
