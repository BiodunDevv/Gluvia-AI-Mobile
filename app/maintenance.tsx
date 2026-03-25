import { T, useTranslation } from "@/hooks/use-translation";
import { translateDynamicText } from "@/lib/translator";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import { router } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MaintenanceScreen() {
  const { language } = useTranslation();
  const { maintenanceMessage, dismissMaintenance } = useAuthStore();
  const isOnline = useSyncStore((state) => state.isOnline);
  const [translatedMessage, setTranslatedMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    const translateMessage = async () => {
      if (!maintenanceMessage || !isOnline || language === "english") {
        setTranslatedMessage(null);
        return;
      }

      const translated = await translateDynamicText(maintenanceMessage, language);

      if (!cancelled) {
        setTranslatedMessage(translated);
      }
    };

    translateMessage().catch(() => {
      if (!cancelled) {
        setTranslatedMessage(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, language, maintenanceMessage]);

  return (
    <SafeAreaView className="flex-1 bg-amber-50 items-center justify-center px-6">
      <View className="w-20 h-20 rounded-full bg-amber-100 items-center justify-center">
        <AlertTriangle size={36} color="#d97706" />
      </View>
      <Text className="mt-6 text-2xl font-bold text-amber-900 text-center">
        <T>Maintenance Mode</T>
      </Text>
      <Text className="mt-3 text-center text-base leading-7 text-amber-800">
        {translatedMessage ||
          maintenanceMessage ||
          "Gluvia AI is temporarily unavailable for maintenance. Please try again later."}
      </Text>
      <Pressable
        onPress={async () => {
          await dismissMaintenance();
          router.replace("/(auth)/login");
        }}
        className="mt-8 rounded-2xl bg-amber-600 px-6 py-4"
      >
        <Text className="font-semibold text-white">
          <T>Back to Login</T>
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
