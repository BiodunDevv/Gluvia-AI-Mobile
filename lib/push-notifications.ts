import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushRegistrationResult {
  token: string | null;
  platform: "ios" | "android" | "web" | "unknown";
  granted: boolean;
}

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId ||
  undefined;

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  const platform =
    Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web"
      ? Platform.OS
      : "unknown";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1447e6",
    });
  }

  if (!Device.isDevice) {
    return { token: null, platform, granted: false };
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;

  if (existingPermissions.status !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return { token: null, platform, granted: false };
  }

  const projectId = getProjectId();
  const pushToken = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  return {
    token: pushToken.data || null,
    platform,
    granted: true,
  };
}
