import { T, useTranslation } from "@/hooks/use-translation";
import { Href, Link, router } from "expo-router";
import { Globe2 } from "lucide-react-native";
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
  const { language, languages } = useTranslation();
  const languageCode =
    languages
      .find((item) => item.value === language)
      ?.label.slice(0, 2)
      .toUpperCase() || "EN";

  return (
    <View className="flex-row items-center justify-between py-3">
      {showLogo ? (
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Image
              source={require("@/assets/images/logo.png")}
              className="h-7 w-7"
              resizeMode="contain"
            />
          </View>
          <Text className="ml-2.5 text-lg font-bold tracking-tight text-gray-900">
            Gluvia
          </Text>
        </View>
      ) : (
        <View />
      )}

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          className="h-10 flex-row items-center justify-center rounded-full border border-gray-200 bg-white px-3"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.push("/language" as Href)}
        >
          <Globe2 size={18} color="#374151" />
          <Text className="ml-1.5 text-xs font-semibold text-gray-700">
            {languageCode}
          </Text>
        </TouchableOpacity>

        {rightButtonText && rightButtonHref ? (
          <Link href={rightButtonHref as Href} asChild>
            <TouchableOpacity
              className="rounded-full bg-gray-100 px-4 py-2"
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-sm font-semibold text-gray-700">
                <T>{rightButtonText}</T>
              </Text>
            </TouchableOpacity>
          </Link>
        ) : null}
      </View>
    </View>
  );
}
