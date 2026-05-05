import axios from "axios";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://172.20.10.4:5000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    // Skip if the caller already set an explicit Authorization header
    if (config.headers.Authorization) {
      return config;
    }

    // Primary: read from SecureStore (persisted across app restarts)
    let token = await SecureStore.getItemAsync("authToken");

    // Fallback: read from Zustand in-memory state (covers the window right after
    // login before SecureStore propagates the newly-written value)
    if (!token) {
      const { useAuthStore } = await import("@/store/auth-store");
      token = useAuthStore.getState().token;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// URLs that are allowed to return 401 without triggering a forced logout
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register"];

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 503) {
      const code = error.response?.data?.error?.code;
      if (code === "MAINTENANCE_MODE") {
        await AsyncStorage.setItem(
          "@maintenance_message",
          error.response?.data?.error?.message ||
            "The app is temporarily unavailable for maintenance."
        );
      }
    }

    if (error.response?.status === 401) {
      const requestUrl: string = error.config?.url || "";
      const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) =>
        requestUrl.includes(ep)
      );

      if (!isAuthEndpoint) {
        // Token expired or invalid — wipe storage AND in-memory auth state
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("user");
        await SecureStore.deleteItemAsync("expiresAt");

        // Lazily import to avoid circular dependency
        const { useAuthStore } = await import("@/store/auth-store");
        useAuthStore.setState({
          user: null,
          token: null,
          expiresAt: null,
          isAuthenticated: false,
          isOffline: false,
          error: null,
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
