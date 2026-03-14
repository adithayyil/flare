import { View, Text } from 'react-native';

export default function BubbleReply({ children }) {
  return (
    <View className="mb-5">
      <Text className="text-text text-[15px] leading-6">{children}</Text>
    </View>
  );
}
