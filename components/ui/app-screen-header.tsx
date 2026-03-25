import { ArrowLeft } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

interface AppScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export function AppScreenHeader({
  title,
  subtitle,
  onBack,
  rightSlot,
}: AppScreenHeaderProps) {
  return (
    <View className="px-4 pb-2 pt-4">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1 flex-row items-start">
          {onBack ? (
            <Pressable
              onPress={onBack}
              className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-xl bg-white"
            >
              <ArrowLeft size={20} color="#374151" />
            </Pressable>
          ) : null}

          <View className="flex-1">
            <View className="flex-row items-center">
              <Image
                source={require("@/assets/images/logo.png")}
                className="h-4 w-4"
                resizeMode="contain"
              />
              <Text className="ml-1.5 text-sm font-medium text-primary">
                Gluvia
              </Text>
            </View>
            <Text className="mt-1 text-2xl font-bold text-gray-800">{title}</Text>
            {subtitle ? (
              <Text className="mt-1 text-sm leading-6 text-gray-500" numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {rightSlot ? <View className="ml-3">{rightSlot}</View> : null}
      </View>
    </View>
  );
}
