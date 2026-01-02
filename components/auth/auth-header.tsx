import { Href, Link } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface AuthHeaderProps {
  rightButtonText?: string;
  rightButtonHref?: string;
  showLogo?: boolean;
}

export function AuthHeader({
  rightButtonText,
  rightButtonHref,
  showLogo = true,
}: AuthHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-1 py-2">
      {/* Logo and Brand */}
      {showLogo ? (
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
            <Image
              source={require("@/assets/images/logo.png")}
              className="w-7 h-7"
              resizeMode="contain"
            />
          </View>
          <Text className="ml-2.5 text-lg font-bold text-gray-900 tracking-tight">
            Gluvia
          </Text>
        </View>
      ) : (
        <View />
      )}

      {/* Right Button */}
      {rightButtonText && rightButtonHref ? (
        <Link href={rightButtonHref as Href} asChild>
          <TouchableOpacity
            className="px-4 py-2 rounded-full bg-gray-100"
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-sm font-semibold text-gray-700">
              {rightButtonText}
            </Text>
          </TouchableOpacity>
        </Link>
      ) : (
        <View />
      )}
    </View>
  );
}
