import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function BubbleQuestion({ children }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 10 }}>
      <Text style={{ color: '#7A6872', fontSize: 13, lineHeight: 20 }}>{children}</Text>
    </Animated.View>
  );
}
