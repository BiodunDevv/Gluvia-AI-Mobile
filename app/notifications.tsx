import { T, useTranslation } from "@/hooks/use-translation";
import { translateDynamicText } from "@/lib/translator";
import { useNotificationStore } from "@/store/notification-store";
import { useSyncStore } from "@/store/sync-store";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  RefreshCcw,
  ShieldAlert,
  Utensils,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.dismiss();
  }
};

export default function NotificationsPage() {
  const { language } = useTranslation();
  const isOnline = useSyncStore((state) => state.isOnline);
  const {
    items,
    meta,
    isLoading,
    isLoadingMore,
    fetchNotifications,
    markAsRead,
  } = useNotificationStore();
  const [translatedItems, setTranslatedItems] = useState<
    Record<string, { title: string; body: string }>
  >({});

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(undefined, { silent: items.length > 0 }).catch(
        () => {}
      );
    }, [fetchNotifications, items.length])
  );

  const getNotificationAccent = (type: string) => {
    switch (type) {
      case "admin":
        return {
          icon: ShieldAlert,
          bg: "bg-violet-50 border-violet-100",
          iconBg: "#ede9fe",
          iconColor: "#7c3aed",
        };
      case "meal":
        return {
          icon: Utensils,
          bg: "bg-emerald-50 border-emerald-100",
          iconBg: "#d1fae5",
          iconColor: "#059669",
        };
      default:
        return {
          icon: Bell,
          bg: "bg-blue-50 border-blue-100",
          iconBg: "#dbeafe",
          iconColor: "#2563eb",
        };
    }
  };

  useEffect(() => {
    let cancelled = false;

    const translateItems = async () => {
      if (!isOnline || language === "english" || items.length === 0) {
        setTranslatedItems({});
        return;
      }

      const entries = await Promise.all(
        items.map(async (item) => {
          const [title, body] = await Promise.all([
            translateDynamicText(item.title, language),
            translateDynamicText(item.body, language),
          ]);

          return [item._id, { title, body }] as const;
        })
      );

      if (!cancelled) {
        setTranslatedItems(Object.fromEntries(entries));
      }
    };

    translateItems().catch(() => {
      if (!cancelled) {
        setTranslatedItems({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, items, language]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-white items-center justify-center"
        >
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text className="text-lg font-bold text-gray-900">
            <T>Notifications</T>
          </Text>
          <Text className="text-xs text-gray-500">
            {meta?.unreadCount || 0} <T>unread</T>
          </Text>
        </View>
        <Pressable
          onPress={() =>
            fetchNotifications(undefined, { force: true }).catch(() => {})
          }
          className="w-10 h-10 rounded-full bg-white items-center justify-center"
        >
          <RefreshCcw size={18} color="#374151" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1447e6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() =>
                fetchNotifications(undefined, { force: true }).catch(() => {})
              }
            />
          }
        >
          <View className="mb-4 rounded-3xl bg-white p-5 border border-gray-100">
            <Text className="text-base font-semibold text-gray-900">
              <T>Stay in sync</T>
            </Text>
            <Text className="mt-1 text-sm leading-6 text-gray-600">
              <T>
                Admin updates, meal activity alerts, glucose reminders, and app
                notices appear here. Open any item to see the full detail.
              </T>
            </Text>
          </View>

          {items.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Bell size={28} color="#9ca3af" />
              <Text className="mt-3 text-base font-semibold text-gray-800">
                <T>No notifications yet</T>
              </Text>
              <Text className="mt-1 text-sm text-gray-500 text-center">
                <T>
                  Admin updates, app reminders, and activity alerts will appear here.
                </T>
              </Text>
            </View>
          ) : (
            items.map((item) => (
              (() => {
                const accent = getNotificationAccent(item.type);
                const Icon = accent.icon;

                return (
                  <Pressable
                    key={item._id}
                    onPress={async () => {
                      if (!item.readAt) {
                        await markAsRead(item._id);
                      }
                      router.push(`/notifications/${item._id}`);
                    }}
                    className={`mb-3 rounded-3xl p-4 border ${
                      item.readAt ? "bg-white border-gray-100" : accent.bg
                    }`}
                  >
                    <View className="flex-row items-start">
                      <View
                        className="mr-3 h-12 w-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: accent.iconBg }}
                      >
                        <Icon size={20} color={accent.iconColor} />
                      </View>
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-semibold text-gray-900">
                            {translatedItems[item._id]?.title || item.title}
                          </Text>
                          {!item.readAt && (
                            <View className="rounded-full bg-primary/10 px-2 py-1">
                              <Text className="text-[10px] font-semibold text-primary">
                                <T>New</T>
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          className="mt-1 text-sm text-gray-600"
                          numberOfLines={2}
                        >
                          {translatedItems[item._id]?.body || item.body}
                        </Text>
                        <Text className="mt-2 text-xs text-gray-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="#9ca3af" />
                    </View>
                  </Pressable>
                );
              })()
            ))
          )}

          {meta && meta.page < meta.totalPages ? (
            <Pressable
              onPress={() =>
                fetchNotifications(
                  { page: meta.page + 1, limit: meta.limit },
                  { append: true }
                ).catch(() => {})
              }
              disabled={isLoadingMore}
              className={`mt-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 ${
                isLoadingMore ? "opacity-70" : ""
              }`}
            >
              <View className="flex-row items-center justify-center">
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color="#1447e6" />
                ) : null}
                <Text className="ml-2 text-sm font-semibold text-gray-700">
                  {isLoadingMore ? (
                    <T>Loading more notifications...</T>
                  ) : (
                    <T>Load more notifications</T>
                  )}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
