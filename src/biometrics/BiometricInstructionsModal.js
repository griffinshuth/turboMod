import React from 'react';
import Recoil from 'recoil';
import { View, Image, FlatList, Modal, StyleSheet, Text } from 'react-native';

import typography from 'shared/theme/typography';
import { BiometricInstructions, assets } from 'shared/Constants';
import { SelectedPeripheralState } from 'shared/atoms/SelectedPeripheralState';
import { PFButton } from 'shared/components/PFButton';

const BiometricInstructionsModal = ({ visible, onDismiss }) => {
  const selectedPeripheral = Recoil.useRecoilValue(SelectedPeripheralState);

  const renderHeader = () => {
    return (
      <View
        style={{
          marginVertical: 30,
          marginHorizontal: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Image
          source={assets[selectedPeripheral.image]}
          style={{
            width: 84,
            height: 68,
          }}
        />
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
    return (
      <Text style={[typography.regular, styles.item]}>
        {index + 1}. {item}
      </Text>
    );
  };

  const renderFooter = () => {
    return (
      <View style={{ marginTop: 30, marginHorizontal: 60 }}>
        <PFButton title="Done" onPress={onDismiss} />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <FlatList
        data={BiometricInstructions}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  item: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
});

export default BiometricInstructionsModal;
