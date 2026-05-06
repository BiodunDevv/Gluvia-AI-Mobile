import { T, useTranslation } from "@/hooks/use-translation";
import { showOfflineAlert } from "@/hooks/use-network";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import { SupportedLanguage } from "@/lib/translations";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  Globe2,
  Languages,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { Alert, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.dismiss();
  }
};

export default function LanguageScreen() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const isOnline = useSyncStore((state) => state.isOnline);
  const { language, languages, setLanguage, t } = useTranslation();

  const handleSelect = async (nextLanguage: SupportedLanguage) => {
    if (!isOnline) {
      showOfflineAlert(
        t(
          "Come online to change your language. Connect to Wi-Fi or mobile data and try again.",
        ),
      );
      return;
    }

    try {
      await setLanguage(nextLanguage);

      if (user) {
        await updateProfile({
          profile: {
            language: nextLanguage,
          },
        });
      }

      handleBack();
    } catch (error: any) {
      Alert.alert(
        t("Language update failed"),
        error?.message || t("We could not update your language right now."),
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <View className="border-b border-gray-100 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <View className="items-center">
            <Text className="text-base font-bold text-gray-900">
              <T>Language</T>
            </Text>
            <Text className="text-xs text-gray-400">
              <T>App preference</T>
            </Text>
          </View>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 rounded-3xl border border-gray-100 bg-white p-5">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Languages size={25} color="#1447e6" />
          </View>
          <Text className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            <T>Choose your language</T>
          </Text>
          <Text className="mt-2 text-sm leading-6 text-gray-500">
            <T>
              Select the language Gluvia should use across onboarding,
              notifications, profile, and your app experience.
            </T>
          </Text>
        </View>

        <View
          className={`mb-5 flex-row items-center rounded-2xl border px-4 py-3 ${
            isOnline
              ? "border-emerald-100 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          {isOnline ? (
            <Wifi size={18} color="#059669" />
          ) : (
            <WifiOff size={18} color="#b45309" />
          )}
          <View className="ml-3 flex-1">
            <Text
              className={`text-sm font-semibold ${
                isOnline ? "text-emerald-800" : "text-amber-900"
              }`}
            >
              {isOnline ? (
                <T>Ready to update</T>
              ) : (
                <T>Internet required</T>
              )}
            </Text>
            <Text
              className={`mt-0.5 text-xs leading-5 ${
                isOnline ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              {isOnline ? (
                <T>Your language preference will sync to your account.</T>
              ) : (
                <T>Connect to Wi-Fi or mobile data, then try again.</T>
              )}
            </Text>
          </View>
        </View>

        <Text className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
          <T>Available languages</T>
        </Text>

        <View className="gap-3">
          {languages.map((item) => {
            const selected = item.value === language;

            return (
              <Pressable
                key={item.value}
                disabled={!isOnline}
                onPress={() => handleSelect(item.value)}
                className={`rounded-2xl border bg-white px-4 py-4 ${
                  selected ? "border-primary" : "border-gray-100"
                } ${!isOnline ? "opacity-60" : ""}`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`mr-3 h-11 w-11 items-center justify-center rounded-xl ${
                      selected ? "bg-primary/10" : "bg-gray-50"
                    }`}
                  >
                    <Globe2
                      size={20}
                      color={selected ? "#1447e6" : "#6b7280"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {item.label}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      {item.nativeLabel}
                    </Text>
                  </View>
                  {selected ? (
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
                      <Check size={16} color="#ffffff" />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
