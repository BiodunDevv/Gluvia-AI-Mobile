import { T } from "@/hooks/use-translation";
import { WifiOff } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export function OfflineBanner() {
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View className="mx-4 mb-3 flex-row items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <WifiOff size={16} color="#b45309" />
        <Text className="flex-1 text-xs font-medium text-amber-800 leading-4">
          <T>You're offline. This page requires an internet connection.</T>
        </Text>
      </View>
    </Animated.View>
  );
}
