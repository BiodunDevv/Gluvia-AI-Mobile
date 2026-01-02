import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function getDeviceId(): Promise<string> {
  // Try to get existing device ID from secure storage
  let deviceId = await SecureStore.getItemAsync("deviceId");

  if (!deviceId) {
    // Generate a unique device ID
    const deviceInfo = [
      Device.brand,
      Device.modelName,
      Device.osName,
      Device.osVersion,
      Platform.OS,
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 15),
    ]
      .filter(Boolean)
      .join("-");

    deviceId = `${Platform.OS}-${deviceInfo}`;

    // Store for future use
    await SecureStore.setItemAsync("deviceId", deviceId);
  }

  return deviceId;
}
