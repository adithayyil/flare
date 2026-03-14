import { View, Text, StyleSheet } from 'react-native';

/**
 * Pattern insight card — coral left border
 */
export default function InsightCard({ title, children }) {
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: '#F08080',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#F0E0E0',
        borderBottomColor: '#F0E0E0',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
      }}
    >
      {title && (
        <Text style={{ color: '#A8969F', fontSize: 11, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
          {title}
        </Text>
      )}
      <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}
