import { AppLoader } from "@/components/ui";
import { T, useTranslation } from "@/hooks/use-translation";
import { api } from "@/lib/api";
import { translateDynamicText } from "@/lib/translator";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import { Image } from "expo-image";
import { router } from "expo-router";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MaintenanceScreen() {
  const { language, t } = useTranslation();
  const { maintenanceMessage, setMaintenanceMessage } = useAuthStore();
  const isOnline = useSyncStore((state) => state.isOnline);
  const [translatedMessage, setTranslatedMessage] = useState<string | null>(
    null
  );
  const [isChecking, setIsChecking] = useState(false);

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

  const checkStatus = async () => {
    if (!isOnline || isChecking) return;

    setIsChecking(true);
    try {
      const response = await api.get("/health");
      const stillInMaintenance = Boolean(response.data?.maintenanceMode);

      if (stillInMaintenance) {
        await setMaintenanceMessage(
          response.data?.maintenanceMessage ||
            "Gluvia AI is temporarily unavailable for maintenance."
        );
        return;
      }

      await setMaintenanceMessage(null);
      router.replace("/current-user");
    } catch {
      // A 503 response is handled by the API interceptor and keeps this page active.
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="flex-1 justify-between px-6 py-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image
              source={require("@/assets/images/logo.png")}
              className="h-8 w-8"
              contentFit="contain"
            />
            <Text className="ml-2 text-base font-bold text-gray-900">
              Gluvia AI
            </Text>
          </View>
          {!isOnline ? (
            <View className="flex-row items-center rounded-full bg-amber-100 px-3 py-1.5">
              <WifiOff size={13} color="#b45309" />
              <Text className="ml-1.5 text-xs font-semibold text-amber-700">
                <T>Offline</T>
              </Text>
            </View>
          ) : null}
        </View>

        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
            <AlertTriangle size={28} color="#d97706" />
          </View>

          <Text className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900">
            <T>Maintenance in progress</T>
          </Text>
          <Text className="mt-3 text-center text-sm leading-6 text-gray-600">
            {translatedMessage ||
              maintenanceMessage ||
              t(
                "Gluvia AI is temporarily unavailable while we make improvements. Please check again soon."
              )}
          </Text>

          <View className="mt-6 w-full rounded-2xl border border-gray-100 bg-white p-4">
            <Text className="text-sm font-semibold text-gray-900">
              <T>What this means</T>
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-500">
              <T>
                App features are paused until maintenance ends. Your saved data
                remains protected, and syncing will resume automatically when
                service is restored.
              </T>
            </Text>
          </View>
        </View>

        <View>
          <Pressable
            onPress={checkStatus}
            disabled={!isOnline || isChecking}
            className={`h-[52px] flex-row items-center justify-center rounded-2xl px-5 py-4 ${
              isOnline ? "bg-primary" : "bg-gray-200"
            } ${isChecking ? "opacity-80" : ""}`}
          >
            {isChecking ? (
              <AppLoader size="sm" color="#ffffff" />
            ) : (
              <RefreshCw size={17} color={isOnline ? "#ffffff" : "#9ca3af"} />
            )}
            <Text
              className={`ml-2 text-sm font-semibold ${
                isOnline ? "text-white" : "text-gray-400"
              }`}
            >
              <T>{isChecking ? "Checking status..." : "Check status"}</T>
            </Text>
          </Pressable>
          <Text className="mt-3 text-center text-xs leading-5 text-gray-400">
            <T>You will not be able to access the app until maintenance is finished.</T>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
