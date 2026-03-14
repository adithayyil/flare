import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function BubbleQuestion({ children }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} className="mb-5">
      <Text className="text-text-secondary text-[13px] leading-5">{children}</Text>
    </Animated.View>
  );
}
