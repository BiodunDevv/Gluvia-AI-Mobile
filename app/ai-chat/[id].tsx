import { T, useTranslation } from "@/hooks/use-translation";
import { useChatStore, type ChatMessage } from "@/store/chat-store";
import { useSyncStore } from "@/store/sync-store";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  MessageCircle,
  Send,
  User,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function renderFormattedMessage(content: string, isAssistant: boolean) {
  const textColorClass = isAssistant ? "text-gray-900" : "text-white";
  const blocks = String(content || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return null;
  }

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const isList =
      lines.length > 1 &&
      lines.every((line) => /^([-•]|\d+\.)\s+/.test(line));

    if (isList) {
      return (
        <View key={`block-${blockIndex}`} className={blockIndex > 0 ? "mt-3" : ""}>
          {lines.map((line, lineIndex) => {
            const match = line.match(/^((?:[-•]|\d+\.))\s+(.*)$/);
            const marker = match?.[1] || "-";
            const body = match?.[2] || line;

            return (
              <View
                key={`line-${lineIndex}`}
                className={`flex-row ${lineIndex > 0 ? "mt-2" : ""}`}
              >
                <Text
                  className={`mr-2 text-[15px] font-semibold leading-7 ${textColorClass}`}
                >
                  {marker}
                </Text>
                <Text
                  className={`flex-1 text-[15px] leading-7 ${textColorClass}`}
                >
                  {body}
                </Text>
              </View>
            );
          })}
        </View>
      );
    }

    return (
      <Text
        key={`block-${blockIndex}`}
        className={`text-[15px] leading-7 ${textColorClass} ${blockIndex > 0 ? "mt-3" : ""}`}
      >
        {block}
      </Text>
    );
  });
}

function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
}) {
  const isAssistant = message.role === "assistant";
  const isStreaming = Boolean(message.metadata?.streaming);
  const isFailed = message.status === "failed";
  const messageTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View className={`mb-6 ${isAssistant ? "items-start" : "items-end"}`}>
      <View className={`mb-2 flex-row items-center ${isAssistant ? "" : "flex-row-reverse"}`}>
        {isAssistant ? (
          <Image
            source={require("@/assets/images/logo.png")}
            className="h-5 w-5"
            resizeMode="contain"
          />
        ) : (
          <View className="h-7 w-7 items-center justify-center rounded-full bg-gray-100">
            <User size={14} color="#374151" />
          </View>
        )}
        <Text className="mx-2 text-xs font-medium text-gray-500">
          {isAssistant ? "Gluvia AI" : "You"}
        </Text>
      </View>

      <View
        className={`max-w-[90%] ${
          isAssistant
            ? "rounded-[24px] border border-gray-200 bg-gray-50 px-4 py-3"
            : "rounded-[26px] bg-primary px-4 py-3"
        }`}
      >
        {isStreaming && !message.content ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#1447e6" />
            <Text className="text-sm text-gray-500">
              <T>Thinking...</T>
            </Text>
          </View>
        ) : (
          <View>{renderFormattedMessage(message.content, isAssistant)}</View>
        )}
      </View>

      {message.metadata?.safeFallbackUsed ? (
        <Text className="mt-1 text-xs text-amber-600">
          <T>Safe fallback response</T>
        </Text>
      ) : null}

      <View className={`mt-1 flex-row items-center ${isAssistant ? "" : "justify-end"}`}>
        <Text className="text-[11px] text-gray-400">{messageTime}</Text>
        {isFailed && message.role === "user" && onRetry ? (
          <Pressable onPress={() => onRetry(message)} className="ml-2">
            <Text className="text-[11px] font-medium text-red-500">
              <T>Retry</T>
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function AIConversationScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isOnline = useSyncStore((state) => state.isOnline);
  const {
    currentConversation,
    messages,
    isLoading,
    isSending,
    isStreaming,
    error,
    startNewConversation,
    openConversation,
    sendMessage,
    retryMessage,
  } = useChatStore();

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState("");
  const lastHapticMessageRef = useRef<string | null>(null);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const isNewConversation = id === "new";

  const headerTitle = useMemo(() => {
    if (!currentConversation?.title || isNewConversation) {
      return t("New chat");
    }
    return currentConversation.title;
  }, [currentConversation?.title, isNewConversation, t]);

  useEffect(() => {
    if (!id) {
      return;
    }

    if (id === "new") {
      startNewConversation().catch(() => {});
    } else {
      openConversation(id).catch(() => {});
    }
  }, [id, openConversation, startNewConversation]);

  useFocusEffect(
    useCallback(() => {
      if (currentConversation?.id && currentConversation.id !== "new") {
        return;
      }

      if (id && id !== "new") {
        openConversation(id).catch(() => {});
      }
    }, [currentConversation?.id, id, openConversation])
  );

  useEffect(() => {
    const latestAssistantMessage = [...messages]
      .reverse()
      .find((item) => item.role === "assistant" && item.content.trim().length > 0);

    if (!latestAssistantMessage) {
      return;
    }

    if (lastHapticMessageRef.current === latestAssistantMessage.id) {
      return;
    }

    lastHapticMessageRef.current = latestAssistantMessage.id;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !isOnline || isSending) {
      return;
    }

    setInput("");
    Haptics.selectionAsync().catch(() => {});
    const result = await sendMessage(trimmed);
    if (result.conversationId && id !== result.conversationId) {
      router.replace(`/ai-chat/${result.conversationId}` as any);
    }
    listRef.current?.scrollToEnd({ animated: true });
  }, [id, input, isOnline, isSending, sendMessage]);

  const handleRetry = useCallback(
    async (message: ChatMessage) => {
      if (!message.content.trim() || isSending || isStreaming || !isOnline) {
        return;
      }

      setRetryingMessageId(message.id);
      const result = await retryMessage(message.id);
      if (result.conversationId && id !== result.conversationId) {
        router.replace(`/ai-chat/${result.conversationId}` as any);
      }
      setRetryingMessageId(null);
    },
    [id, isOnline, isSending, isStreaming, retryMessage]
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full"
            >
              <ChevronLeft size={22} color="#111827" />
            </Pressable>
            <View className="flex-1 px-3">
              <Text
                className="text-center text-[16px] font-semibold text-gray-900"
                numberOfLines={1}
              >
                {headerTitle}
              </Text>
              <Text className="mt-0.5 text-center text-xs text-gray-500">
                <T>Gluvia AI</T>
              </Text>
            </View>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-50">
              <MessageCircle size={16} color="#1447e6" />
            </View>
          </View>
        </View>

        {error ? (
          <View className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-sm font-semibold text-red-700">
              <T>Chat unavailable right now</T>
            </Text>
            <Text className="mt-1 text-sm leading-6 text-red-600">{error}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View className="flex-1 px-4 pt-5">
            <View className="rounded-2xl border border-gray-100 bg-white px-4 py-5">
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#1447e6" />
                <Text className="ml-3 text-sm text-gray-500">
                  <T>Loading conversation...</T>
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              !isLoading ? (
                <View className="rounded-[28px] border border-gray-100 bg-white p-5">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <MessageCircle size={22} color="#1447e6" />
                  </View>
                  <Text className="mt-4 text-xl font-bold text-gray-900">
                    <T>Start the conversation</T>
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-gray-600">
                    <T>
                      Ask about diabetes, foods, glucose trends, food substitutions,
                      or your Gluvia profile.
                    </T>
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                onRetry={item.id === retryingMessageId ? undefined : handleRetry}
              />
            )}
          />
        )}

        <View className="border-t border-gray-100 bg-white px-4 py-3">
          <View className="flex-row items-end">
            <View className="mr-3 flex-1 rounded-[28px] border border-gray-200 bg-gray-50 px-4 py-3">
              <TextInput
                multiline
                value={input}
                onChangeText={setInput}
                placeholder={t("Ask about diabetes, meals, foods, or your profile")}
                placeholderTextColor="#9ca3af"
                className="max-h-28 text-[15px] leading-6 text-gray-900"
                editable={!isSending && !isStreaming && isOnline}
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || isSending || isStreaming || !isOnline}
              className={`h-12 w-12 items-center justify-center rounded-full ${
                !input.trim() || isSending || isStreaming || !isOnline
                  ? "bg-gray-200"
                  : "bg-primary"
              }`}
            >
              <Send
                size={18}
                color={
                  !input.trim() || isSending || isStreaming || !isOnline
                    ? "#9ca3af"
                    : "#ffffff"
                }
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
