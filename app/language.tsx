import { T, useTranslation } from "@/hooks/use-translation";
import { showOfflineAlert } from "@/hooks/use-network";
import { useSyncStore } from "@/store/sync-store";
import { useAuthStore } from "@/store/auth-store";
import { router } from "expo-router";
import { ArrowLeft, Check, Globe2, X } from "lucide-react-native";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
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

  const handleSelect = async (nextLanguage: typeof language) => {
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
      <View className="border-b border-gray-100 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <Text className="text-base font-semibold text-gray-900">
            <T>Language</T>
          </Text>
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <X size={18} color="#374151" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-[28px] border border-gray-100 bg-white p-5">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Globe2 size={24} color="#1447e6" />
          </View>

          <Text className="mt-4 text-2xl font-bold text-gray-900">
            <T>Choose your language</T>
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-700">
            <T>
              Select the language Gluvia should use across onboarding and your
              app experience.
            </T>
          </Text>

          {!isOnline ? (
            <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <Text className="text-sm font-semibold text-amber-900">
                <T>Internet required</T>
              </Text>
              <Text className="mt-1 text-sm leading-6 text-amber-800">
                <T>
                  Come online to change your language. Connect to Wi-Fi or
                  mobile data, then try again.
                </T>
              </Text>
            </View>
          ) : null}

          <View className="mt-6 gap-3">
            {languages.map((item) => {
              const selected = item.value === language;

              return (
                <Pressable
                  key={item.value}
                  disabled={!isOnline}
                  onPress={() => handleSelect(item.value)}
                  className={`rounded-2xl border px-4 py-4 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white"
                  } ${!isOnline ? "opacity-60" : ""}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-semibold text-gray-900">
                        {item.label}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500">
                        {item.nativeLabel}
                      </Text>
                    </View>
                    {selected ? <Check size={20} color="#1447e6" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
