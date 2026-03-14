import { View, Text, StyleSheet } from 'react-native';

/**
 * Clinical summary — document layout
 */
export default function GPBrief({ summary }) {
  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#F0E0E0',
        backgroundColor: '#FFFFFF',
        padding: 20,
      }}
    >
      <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 22 }}>
        {summary}
      </Text>
    </View>
  );
}
