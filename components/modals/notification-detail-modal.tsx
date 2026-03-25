import { AppNotification } from "@/store/notification-store";
import { BellRing, CalendarDays, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface NotificationDetailModalProps {
  visible: boolean;
  notification: AppNotification | null;
  onClose: () => void;
}

const INTERNAL_KEYS = new Set(["route", "notificationId"]);

const formatLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());

export function NotificationDetailModal({
  visible,
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const visibleDetails =
    notification?.data && typeof notification.data === "object"
      ? Object.entries(notification.data).filter(([key, value]) => {
          if (value === undefined || value === null || value === "") {
            return false;
          }

          return !INTERNAL_KEYS.has(key);
        })
      : [];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black/40" edges={["top", "bottom"]}>
        <Pressable className="flex-1 px-5 py-8" onPress={onClose}>
          <Pressable
            className="mt-auto max-h-[85%] overflow-hidden rounded-[28px] bg-white"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4">
              <Text className="text-lg font-bold text-gray-900">
                Notification
              </Text>
              <Pressable
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <X size={18} color="#374151" />
              </Pressable>
            </View>

            {notification ? (
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
              >
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <BellRing size={24} color="#1447e6" />
                </View>
                <Text className="mt-4 text-xl font-bold text-gray-900">
                  {notification.title}
                </Text>
                <View className="mt-3 flex-row items-center">
                  <CalendarDays size={14} color="#9ca3af" />
                  <Text className="ml-2 text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </Text>
                </View>
                <Text className="mt-5 text-base leading-7 text-gray-700">
                  {notification.body}
                </Text>

                {visibleDetails.length > 0 && (
                  <View className="mt-5 rounded-2xl bg-gray-50 p-4">
                    <Text className="text-xs font-semibold text-gray-500">
                      Details
                    </Text>
                    <View className="mt-2">
                      {visibleDetails.map(([key, value]) => (
                        <View
                          key={key}
                          className="mb-3 border-b border-gray-200 pb-3 last:mb-0 last:border-b-0 last:pb-0"
                        >
                          <Text className="text-xs font-semibold text-gray-500">
                            {formatLabel(key)}
                          </Text>
                          <Text className="mt-1 text-sm text-gray-700">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View className="px-5 py-8">
                <Text className="text-sm text-gray-500">
                  Notification details are unavailable right now.
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
