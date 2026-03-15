import { View, Text } from 'react-native';

export default function BubbleReply({ children }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: '#2D1520', fontSize: 15, lineHeight: 24 }}>{children}</Text>
    </View>
  );
}
