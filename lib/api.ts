import axios from "axios";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://172.20.10.6:5000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      // Token expired or invalid - clear storage
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("user");
    }
    return Promise.reject(error);
  }
);

export default api;
