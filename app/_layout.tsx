import NetInfo from "@react-native-community/netinfo";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Href, Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";
import "../global.css";

import { api } from "@/lib/api";
import { isProfileComplete } from "@/lib/profile-completion";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { useSyncStore } from "@/store/sync-store";
import { useTranslationStore } from "@/store/translation-store";
import * as Notifications from "expo-notifications";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const initializeClientVersion = useSyncStore(
    (state) => state.initializeClientVersion,
  );
  const initializeFromCache = useSyncStore(
    (state) => state.initializeFromCache,
  );
  const setOnlineStatus = useSyncStore((state) => state.setOnlineStatus);
  const syncPendingLogs = useSyncStore((state) => state.syncPendingLogs);
  const checkAndApplyUpdates = useSyncStore(
    (state) => state.checkAndApplyUpdates,
  );
  const getAggregations = useSyncStore((state) => state.getAggregations);
  const invalidateAggregations = useSyncStore(
    (state) => state.invalidateAggregations,
  );
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCheckedAuth = useAuthStore((state) => state.hasCheckedAuth);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const maintenanceMessage = useAuthStore((state) => state.maintenanceMessage);
  const isOnline = useSyncStore((state) => state.isOnline);
  const setMaintenanceMessage = useAuthStore(
    (state) => state.setMaintenanceMessage,
  );
  const fetchNotifications = useNotificationStore(
    (state) => state.fetchNotifications,
  );
  const initializeLanguage = useTranslationStore(
    (state) => state.initializeLanguage,
  );

  // Initialize client version, cached data, and network monitoring on app start
  useEffect(() => {
    const initialize = async () => {
      await initializeClientVersion();
      await initializeFromCache();
      await checkAuth();
      await initializeLanguage(useAuthStore.getState().user?.profile?.language);

      // Get initial network state
      const netState = await NetInfo.fetch();
      setOnlineStatus(
        (netState.isConnected && netState.isInternetReachable !== false) ??
          false,
      );

      try {
        const response = await api.get("/health");
        const isMaintenanceEnabled = Boolean(response.data?.maintenanceMode);
        const message =
          response.data?.maintenanceMessage ||
          "Gluvia AI is temporarily unavailable for maintenance.";
        await setMaintenanceMessage(isMaintenanceEnabled ? message : null);
      } catch {
        // Keep any previously stored maintenance message if health cannot be read.
      }
    };
    initialize();

    // Subscribe to network changes — auto-sync when coming back online.
    // wasOnline starts as false so the first "connected" event from the
    // listener doesn't fire a spurious reconnect sync on cold start.
    let wasOnline = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowOnline =
        (state.isConnected && state.isInternetReachable !== false) ?? false;
      setOnlineStatus(nowOnline);

      if (nowOnline && !wasOnline) {
        // Device just reconnected — flush pending logs and refresh data
        const authState = useAuthStore.getState();
        const userId = authState.user?._id;
        const hasSession = Boolean(
          authState.hasCheckedAuth &&
            authState.isAuthenticated &&
            authState.token &&
            userId,
        );

        if (hasSession && userId) {
          syncPendingLogs(userId).catch(() => {});
          checkAndApplyUpdates().catch(() => {});
          invalidateAggregations();
          getAggregations({ page: 1, limit: 200 }, { force: true }).catch(
            () => {},
          );
        }
      }
      wasOnline = nowOnline;
    });

    return () => unsubscribe();
  }, [
    checkAndApplyUpdates,
    checkAuth,
    getAggregations,
    initializeClientVersion,
    initializeFromCache,
    initializeLanguage,
    invalidateAggregations,
    setMaintenanceMessage,
    setOnlineStatus,
    syncPendingLogs,
  ]);

  useEffect(() => {
    initializeLanguage(user?.profile?.language).catch(() => {});
  }, [initializeLanguage, user?.profile?.language]);

  useEffect(() => {
    // Wait for both isAuthenticated AND the token to be set in state
    // to avoid firing before the token is readable by the API interceptor
    if (
      !hasCheckedAuth ||
      !isAuthenticated ||
      !token ||
      maintenanceMessage ||
      !isOnline
    ) {
      return;
    }

    fetchNotifications(undefined, { silent: true }).catch(() => {});
  }, [
    fetchNotifications,
    hasCheckedAuth,
    isAuthenticated,
    isOnline,
    maintenanceMessage,
    token,
  ]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const route =
          response.notification.request.content.data?.route ||
          (response.notification.request.content.data?.notificationId
            ? `/notifications/${response.notification.request.content.data.notificationId}`
            : "/notifications");

        if (
          typeof route === "string" &&
          !useAuthStore.getState().maintenanceMessage &&
          useSyncStore.getState().isOnline
        ) {
          router.push(route as Href);
          fetchNotifications(undefined, { silent: true, force: true }).catch(
            () => {},
          );
        }
      },
    );

    return () => subscription.remove();
  }, [fetchNotifications]);

  useEffect(() => {
    const isAuthPath =
      pathname?.startsWith("/(auth)") ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password";
    const isPublicPath =
      pathname === "/current-user" ||
      pathname === "/" ||
      pathname === "/onboarding";
    const isMaintenancePath = pathname === "/maintenance";
    const isProfileGatePath =
      pathname === "/complete-profile" || pathname === "/edit-profile";
    const profileComplete = isProfileComplete(user);

    if (maintenanceMessage && !isMaintenancePath) {
      router.replace("/maintenance" as Href);
      return;
    }

    if (!maintenanceMessage && isMaintenancePath) {
      router.replace(
        (isAuthenticated
          ? profileComplete
            ? "/(tabs)"
            : "/complete-profile"
          : "/current-user") as Href,
      );
      return;
    }

    if (
      isAuthenticated &&
      !maintenanceMessage &&
      isOnline &&
      !profileComplete &&
      !isAuthPath &&
      !isPublicPath &&
      !isProfileGatePath
    ) {
      router.replace("/complete-profile" as Href);
    }
  }, [isAuthenticated, isOnline, maintenanceMessage, pathname, user]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "android" ? "fade" : "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="current-user" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="maintenance"
          options={{
            gestureEnabled: false,
            animation: "fade",
          }}
        />
        <Stack.Screen name="complete-profile" />
        <Stack.Screen name="meal-recommendation" />
        <Stack.Screen name="meal-history" />
        <Stack.Screen
          name="food-details/[id]"
          options={{
            presentation: Platform.OS === "android" ? "card" : "modal",
            animation: Platform.OS === "android" ? "fade" : "slide_from_bottom",
          }}
        />
        <Stack.Screen name="ai-chat/[id]" />
        <Stack.Screen
          name="edit-profile"
          options={{
            presentation: Platform.OS === "android" ? "card" : "modal",
            animation: Platform.OS === "android" ? "fade" : "slide_from_bottom",
          }}
        />
        <Stack.Screen name="notifications" />
        <Stack.Screen
          name="notifications/[id]"
          options={{
            presentation: Platform.OS === "android" ? "card" : "modal",
            animation: Platform.OS === "android" ? "fade" : "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="language"
          options={{
            presentation: Platform.OS === "android" ? "card" : "modal",
            animation: Platform.OS === "android" ? "fade" : "slide_from_bottom",
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
