import NetInfo from "@react-native-community/netinfo";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSyncStore } from "@/store/sync-store";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initializeClientVersion = useSyncStore(
    (state) => state.initializeClientVersion
  );
  const initializeFromCache = useSyncStore(
    (state) => state.initializeFromCache
  );
  const setOnlineStatus = useSyncStore((state) => state.setOnlineStatus);

  // Initialize client version, cached data, and network monitoring on app start
  useEffect(() => {
    const initialize = async () => {
      await initializeClientVersion();
      await initializeFromCache();

      // Get initial network state
      const netState = await NetInfo.fetch();
      setOnlineStatus(
        (netState.isConnected && netState.isInternetReachable !== false) ??
          false
      );
    };
    initialize();

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnlineStatus(
        (state.isConnected && state.isInternetReachable !== false) ?? false
      );
    });

    return () => unsubscribe();
  }, [initializeClientVersion, initializeFromCache, setOnlineStatus]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="current-user" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
