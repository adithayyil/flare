import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';

export default function BottomSheet({ visible, onDismiss, children, title }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onDismiss}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,21,32,0.15)' }}
        />

        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.duration(250)}
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: '#F0E0E0',
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#F0E0E0' }} />
          </View>

          {title && (
            <Text style={{ color: '#2D1520', fontSize: 16, fontWeight: '600', marginBottom: 20 }}>
              {title}
            </Text>
          )}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
