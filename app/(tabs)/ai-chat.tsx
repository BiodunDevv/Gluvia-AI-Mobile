import { T, useTranslation } from "@/hooks/use-translation";
import { useChatStore } from "@/store/chat-store";
import { useSyncStore } from "@/store/sync-store";
import { AppLoader, AppScreenHeader } from "@/components/ui";
import { Href, router } from "expo-router";
import {
  ArrowDownCircle,
  ArrowRight,
  MessageCircle,
  MessageSquarePlus,
  Trash2,
  WifiOff,
} from "lucide-react-native";
import { useEffect } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  TextInput,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";

function formatConversationTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function AIChatHomeScreen() {
  const { t } = useTranslation();
  const isOnline = useSyncStore((state) => state.isOnline);
  const isDataSynced = useSyncStore((state) => state.clientVersion > 0);
  const isUpdating = useSyncStore((state) => state.isSyncing);
  const checkAndApplyUpdates = useSyncStore(
    (state) => state.checkAndApplyUpdates,
  );
  const {
    conversations,
    isLoading,
    error,
    loadConversations,
    deleteConversation,
    clearAllConversations,
  } = useChatStore();
  const [query, setQuery] = useState("");
  const [deletingConversationId, setDeletingConversationId] = useState<
    string | null
  >(null);

  const totalMessages = conversations.reduce(
    (sum, item) => sum + (item.messageCount || 0),
    0,
  );
  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((item) =>
      `${item.title} ${item.lastMessage || ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [conversations, query]);

  useEffect(() => {
    if (isOnline) {
      loadConversations().catch(() => {});
    }
  }, [isOnline, loadConversations]);

  const handleNewChat = async () => {
    if (!isOnline) {
      return;
    }
    router.push("/ai-chat/new" as Href);
  };

  const handleDeleteConversation = (conversationId: string) => {
    Alert.alert(
      t("Delete conversation"),
      t("This removes the selected conversation from this device."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            setDeletingConversationId(conversationId);
            try {
              await deleteConversation(conversationId);
            } finally {
              setDeletingConversationId((current) =>
                current === conversationId ? null : current,
              );
            }
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      t("Clear conversations"),
      t("This removes every saved AI chat on this device and starts fresh."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Clear all"),
          style: "destructive",
          onPress: async () => {
            await clearAllConversations();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      <FlatList
        data={isOnline ? filteredConversations : []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadConversations().catch(() => {})}
            tintColor="#1447e6"
          />
        }
        ListHeaderComponent={
          <>
            <AppScreenHeader
              title={t("AI Chat")}
              subtitle={t("Personalized diabetes guidance, questions, and food support")}
            />

            {!isOnline ? (
              <View className="mx-4 mt-2 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-5">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/80">
                  <WifiOff size={22} color="#b45309" />
                </View>
                <Text className="mt-4 text-lg font-bold text-amber-900">
                  <T>AI chat needs internet access</T>
                </Text>
                <Text className="mt-2 text-sm leading-6 text-amber-800">
                  <T>
                    Connect to Wi-Fi or mobile data to start or reopen AI
                    conversations. This feature is available only while you are
                    online.
                  </T>
                </Text>
              </View>
            ) : null}

            {isOnline ? (
              <View className="mt-4 flex-row gap-3 px-4">
                <Pressable
                  onPress={handleNewChat}
                  className="flex-1 rounded-2xl bg-primary px-4 py-4"
                >
                  <View className="flex-row items-center justify-center">
                    <MessageSquarePlus size={18} color="#ffffff" />
                    <Text className="ml-2 text-sm font-semibold text-white">
                      <T>Start New Chat</T>
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={handleClearAll}
                  disabled={conversations.length === 0}
                  className={`flex-1 rounded-2xl border px-4 py-4 ${
                    conversations.length > 0
                      ? "border-red-100 bg-red-50"
                      : "border-gray-200 bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      conversations.length > 0
                        ? "text-red-600"
                        : "text-gray-400"
                    }`}
                  >
                    <T>Clear All</T>
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {isOnline ? (
              <View className="mt-4 px-4">
                <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t("Search conversations")}
                    placeholderTextColor="#9ca3af"
                    className="text-sm text-gray-900"
                  />
                </View>
              </View>
            ) : null}

            <View className="mt-6 px-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-gray-900">
                  <T>Your Conversations</T>
                </Text>
                <View className="rounded-full bg-gray-100 px-3 py-1.5">
                  <Text className="text-xs font-medium text-gray-600">
                    {conversations.length} <T>saved</T>
                  </Text>
                </View>
              </View>

              {isOnline && isLoading ? (
                <View className="rounded-2xl border border-gray-100 bg-white px-4 py-5">
                  <View className="flex-row items-center">
                    <AppLoader size="sm" color="#1447e6" />
                    <Text className="ml-3 text-sm text-gray-500">
                      <T>Loading conversations...</T>
                    </Text>
                  </View>
                </View>
              ) : null}

              {isOnline && error ? (
                <View className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                  <Text className="text-sm font-semibold text-red-700">
                    <T>Chat unavailable right now</T>
                  </Text>
                  <Text className="mt-1 text-sm leading-6 text-red-600">
                    {error}
                  </Text>
                  <Pressable
                    onPress={() => loadConversations()}
                    className="mt-3 self-start rounded-full bg-white px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-red-600">
                      <T>Retry</T>
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {isOnline && !isLoading && conversations.length === 0 ? (
                <View className="rounded-[28px] border border-gray-100 bg-white p-5">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <MessageCircle size={22} color="#1447e6" />
                  </View>
                  <Text className="mt-4 text-xl font-bold text-gray-900">
                    <T>No conversations yet</T>
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-gray-600">
                    <T>
                      Start your first chat to ask Gluvia AI about diabetes,
                      meals, food swaps, your profile, or glucose trends.
                    </T>
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          isOnline && !isLoading && query.trim().length > 0 ? (
            <View className="px-4">
              <View className="rounded-2xl border border-gray-100 bg-white p-5">
                <Text className="text-base font-semibold text-gray-900">
                  <T>No matching conversations</T>
                </Text>
                <Text className="mt-2 text-sm leading-6 text-gray-600">
                  <T>
                    Try a different title or keyword from your earlier chats.
                  </T>
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="px-4">
            <View className="mb-3 rounded-[28px] border border-gray-100 bg-white p-4">
              <View className="flex-row items-start justify-between">
                <Pressable
                  android_ripple={{
                    color: "rgba(20,71,230,0.08)",
                    borderless: false,
                  }}
                  onPress={() => router.push(`/ai-chat/${item.id}` as Href)}
                  className="flex-1 pr-3"
                >
                  <View className="mb-2 flex-row items-center">
                    <View className="mr-2 h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
                      <Image
                        source={require("@/assets/images/logo.png")}
                        className="h-4 w-4"
                        resizeMode="contain"
                      />
                    </View>
                    <Text
                      className="flex-1 text-base font-semibold text-gray-900"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text className="ml-3 text-xs text-gray-400">
                      {formatConversationTime(item.updatedAt)}
                    </Text>
                  </View>
                  <Text
                    className="mt-1 text-sm leading-6 text-gray-600"
                    numberOfLines={2}
                  >
                    {item.lastMessage || t("Open this conversation")}
                  </Text>
                </Pressable>
                <View className="items-end gap-2">
                  <Pressable
                    onPress={() => router.push(`/ai-chat/${item.id}` as Href)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-primary/10"
                  >
                    <ArrowRight size={16} color="#1447e6" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteConversation(item.id)}
                    disabled={deletingConversationId === item.id}
                    className="h-10 w-10 items-center justify-center rounded-full bg-red-50"
                  >
                    {deletingConversationId === item.id ? (
                      <AppLoader size="sm" color="#dc2626" />
                    ) : (
                      <Trash2 size={16} color="#dc2626" />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 28 }}
      />
    </SafeAreaView>
  );
}
