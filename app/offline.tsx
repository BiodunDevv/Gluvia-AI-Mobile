import { AppLoader } from "@/components/ui";
import { T } from "@/hooks/use-translation";
import { useSyncStore } from "@/store/sync-store";
import NetInfo from "@react-native-community/netinfo";
import { Image } from "expo-image";
import { router } from "expo-router";
import { RefreshCw, WifiOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OfflineScreen() {
  const isOnline = useSyncStore((state) => state.isOnline);
  const setOnlineStatus = useSyncStore((state) => state.setOnlineStatus);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      const nextOnline =
        (state.isConnected && state.isInternetReachable !== false) ?? false;
      setOnlineStatus(nextOnline);

      if (nextOnline) {
        router.replace("/current-user");
      }
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
          <View className="flex-row items-center rounded-full bg-amber-100 px-3 py-1.5">
            <WifiOff size={13} color="#b45309" />
            <Text className="ml-1.5 text-xs font-semibold text-amber-700">
              <T>Offline</T>
            </Text>
          </View>
        </View>

        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
            <WifiOff size={28} color="#d97706" />
          </View>

          <Text className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900">
            <T>No internet connection</T>
          </Text>
          <Text className="mt-3 text-center text-sm leading-6 text-gray-600">
            <T>
              Gluvia AI needs an active connection to keep your account, logs,
              recommendations, and safety checks current. Reconnect to continue.
            </T>
          </Text>

          <View className="mt-6 w-full rounded-2xl border border-gray-100 bg-white p-4">
            <Text className="text-sm font-semibold text-gray-900">
              <T>Access is paused</T>
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-500">
              <T>
                You cannot browse the app while offline. Any pending activity
                will sync after your connection is restored.
              </T>
            </Text>
          </View>
        </View>

        <View>
          <Pressable
            onPress={checkConnection}
            disabled={isChecking}
            className={`h-[52px] flex-row items-center justify-center rounded-2xl bg-primary px-5 py-4 ${
              isChecking ? "opacity-80" : ""
            }`}
          >
            {isChecking ? (
              <AppLoader size="sm" color="#ffffff" />
            ) : (
              <RefreshCw size={17} color="#ffffff" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">
              <T>{isChecking ? "Checking connection..." : "Try again"}</T>
            </Text>
          </Pressable>
          <Text className="mt-3 text-center text-xs leading-5 text-gray-400">
            <T>{isOnline ? "Connection restored." : "Connect to Wi-Fi or mobile data to continue."}</T>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
