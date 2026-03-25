import { T, useTranslation } from "@/hooks/use-translation";
import { translateDynamicText } from "@/lib/translator";
import { useNotificationStore } from "@/store/notification-store";
import { useSyncStore } from "@/store/sync-store";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertCircle,
  ArrowLeft,
  BellRing,
  CalendarDays,
  ChevronRight,
  X,
} from "lucide-react-native";

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.dismiss();
};

const INTERNAL_NOTIFICATION_KEYS = ["route", "notificationId", "screen"];

export default function NotificationDetailsPage() {
  const { language } = useTranslation();
  const isOnline = useSyncStore((state) => state.isOnline);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, current, isLoading, fetchNotification, markAsRead } =
    useNotificationStore();
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [translatedDetails, setTranslatedDetails] = useState<
    Record<string, string>
  >({});

  const cachedNotification = useMemo(() => {
    if (!id) {
      return null;
    }

    return items.find((item) => item._id === id) || null;
  }, [id, items]);

  const notification =
    current && current._id === id ? current : cachedNotification;

  useEffect(() => {
    if (!id) {
      return;
    }

    fetchNotification(id).catch(() => {});

    if (!(notification?.readAt || cachedNotification?.readAt)) {
      markAsRead(id).catch(() => {});
    }
  }, [cachedNotification?.readAt, fetchNotification, id, markAsRead]);

  const visibleDetails =
    notification?.data && typeof notification.data === "object"
      ? Object.entries(notification.data).filter(([key, value]) => {
          if (value === undefined || value === null || value === "") {
            return false;
          }

          return !INTERNAL_NOTIFICATION_KEYS.includes(key);
        })
      : [];

  useEffect(() => {
    let cancelled = false;

    const translateNotification = async () => {
      if (!notification || !isOnline || language === "english") {
        setTranslatedTitle(null);
        setTranslatedBody(null);
        setTranslatedDetails({});
        return;
      }

      const [title, body] = await Promise.all([
        translateDynamicText(notification.title, language),
        translateDynamicText(notification.body, language),
      ]);

      const translatedDetailEntries = await Promise.all(
        visibleDetails.map(async ([key, value]) => {
          if (typeof value !== "string") {
            return [key, String(value)] as const;
          }

          return [key, await translateDynamicText(value, language)] as const;
        })
      );

      if (!cancelled) {
        setTranslatedTitle(title);
        setTranslatedBody(body);
        setTranslatedDetails(Object.fromEntries(translatedDetailEntries));
      }
    };

    translateNotification().catch(() => {
      if (!cancelled) {
        setTranslatedTitle(null);
        setTranslatedBody(null);
        setTranslatedDetails({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, language, notification, visibleDetails]);

  const formatLabel = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^\w/, (char) => char.toUpperCase());

  if (isLoading && !notification) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#1447e6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="border-b border-gray-100 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <Text className="text-base font-semibold text-gray-900">
            <T>Notification</T>
          </Text>
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <X size={18} color="#374151" />
          </Pressable>
        </View>
      </View>

      {notification ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="overflow-hidden rounded-[28px] border border-gray-100 bg-white p-5">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <BellRing size={24} color="#1447e6" />
            </View>

            <Text className="mt-4 text-2xl font-bold text-gray-900">
              {translatedTitle || notification.title}
            </Text>

            <View className="mt-3 flex-row items-center">
              <CalendarDays size={14} color="#9ca3af" />
              <Text className="ml-2 text-xs text-gray-400">
                {new Date(notification.createdAt).toLocaleString()}
              </Text>
            </View>

            <Text className="mt-5 text-base leading-7 text-gray-700">
              {translatedBody || notification.body}
            </Text>

            {visibleDetails.length > 0 ? (
              <View className="mt-6 rounded-2xl bg-gray-50 p-4">
                <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <T>Details</T>
                </Text>
                <View className="mt-3">
                  {visibleDetails.map(([key, value]) => (
                    <View
                      key={key}
                      className="mb-3 border-b border-gray-200 pb-3 last:mb-0 last:border-b-0 last:pb-0"
                    >
                      <Text className="text-xs font-semibold text-gray-500">
                        {formatLabel(key)}
                      </Text>
                      <Text className="mt-1 text-sm leading-6 text-gray-700">
                        {translatedDetails[key] ||
                          (typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value))}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {isLoading ? (
              <View className="mt-5 flex-row items-center rounded-2xl bg-gray-50 px-4 py-3">
                <ActivityIndicator color="#1447e6" size="small" />
                <Text className="ml-3 text-sm text-gray-500">
                  <T>Refreshing notification details...</T>
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-sm rounded-[28px] border border-gray-100 bg-white p-6">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <AlertCircle size={24} color="#d97706" />
            </View>
            <Text className="mt-4 text-xl font-bold text-gray-900">
              <T>Notification unavailable</T>
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-600">
              <T>
                We could not load this notification right now. Go back and try
                again.
              </T>
            </Text>
            <Pressable
              onPress={handleBack}
              className="mt-5 flex-row items-center justify-center rounded-2xl bg-primary px-4 py-3"
            >
              <Text className="text-sm font-semibold text-white">
                <T>Back to notifications</T>
              </Text>
              <ChevronRight size={16} color="#ffffff" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
