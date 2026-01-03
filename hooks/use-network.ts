/**
 * Network Utility Hook
 *
 * Provides network status detection and offline-aware utilities
 * for the entire application.
 */

import { useSyncStore } from "@/store/sync-store";
import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

/**
 * Hook to monitor network connectivity
 */
export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: "unknown",
  });
  const setOnlineStatus = useSyncStore((state) => state.setOnlineStatus);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      const isOnline =
        (state.isConnected && state.isInternetReachable !== false) ?? false;
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
      setOnlineStatus(isOnline);
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline =
        (state.isConnected && state.isInternetReachable !== false) ?? false;
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
      setOnlineStatus(isOnline);
    });

    return () => unsubscribe();
  }, [setOnlineStatus]);

  const isOnline =
    networkState.isConnected && networkState.isInternetReachable !== false;

  return {
    ...networkState,
    isOnline,
  };
}

/**
 * Hook to check if online before performing an action
 */
export function useOnlineAction() {
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return (state.isConnected && state.isInternetReachable !== false) ?? false;
  }, []);

  const requireOnline = useCallback(
    async (
      action: () => Promise<void>,
      offlineMessage?: string
    ): Promise<boolean> => {
      const isOnline = await checkConnection();

      if (!isOnline) {
        Alert.alert(
          "No Internet Connection",
          offlineMessage ||
            "This action requires an internet connection. Please turn on mobile data or connect to Wi-Fi and try again.",
          [{ text: "OK" }]
        );
        return false;
      }

      try {
        await action();
        return true;
      } catch (error: any) {
        // Check if error is network-related
        if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
          Alert.alert(
            "Connection Lost",
            "Lost internet connection while performing action. Please check your connection and try again.",
            [{ text: "OK" }]
          );
          return false;
        }
        throw error;
      }
    },
    [checkConnection]
  );

  return {
    checkConnection,
    requireOnline,
  };
}

/**
 * Show offline alert
 */
export function showOfflineAlert(customMessage?: string) {
  Alert.alert(
    "You're Offline",
    customMessage ||
      "This feature requires an internet connection. Please turn on mobile data or connect to Wi-Fi.",
    [{ text: "OK" }]
  );
}

/**
 * Show login required online alert
 */
export function showLoginOnlineRequired() {
  Alert.alert(
    "Online Login Required",
    "This account hasn't been used on this device before. Please connect to the internet to log in for the first time.\n\nOnce logged in, you can use the app offline.",
    [{ text: "OK" }]
  );
}
