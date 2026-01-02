import { Dropdown } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import { ChatMessage, useChatStore } from "@/store/chat-store";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Send,
  Sparkles,
  Utensils,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Typing indicator component with animated dots
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = (dot: Animated.Value) => ({
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View className="flex-row items-center bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 self-start mb-3">
      <View className="flex-row items-center space-x-1">
        <Animated.View
          style={dotStyle(dot1)}
          className="w-2 h-2 bg-primary rounded-full mr-1"
        />
        <Animated.View
          style={dotStyle(dot2)}
          className="w-2 h-2 bg-primary rounded-full mr-1"
        />
        <Animated.View
          style={dotStyle(dot3)}
          className="w-2 h-2 bg-primary rounded-full"
        />
      </View>
      <Text className="text-gray-500 text-sm ml-2">Gluvia is thinking...</Text>
    </View>
  );
}

// Streaming text component with haptic feedback like ChatGPT
function StreamingText({
  text,
  onComplete,
}: {
  text: string;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const hapticCounterRef = useRef(0);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    hapticCounterRef.current = 0;

    // Clean text - remove any markdown ** symbols and clean up formatting
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n");

    let index = 0;
    const intervalId = setInterval(() => {
      if (index < cleanText.length) {
        setDisplayedText(cleanText.slice(0, index + 1));
        index++;

        // Light haptic every 8 characters for subtle feedback like ChatGPT
        hapticCounterRef.current++;
        if (hapticCounterRef.current % 8 === 0) {
          Haptics.selectionAsync();
        }
      } else {
        clearInterval(intervalId);
        setIsComplete(true);
        // Soft haptic on completion
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onComplete?.();
      }
    }, 8); // Speed of streaming (8ms per character for smooth feel)

    return () => clearInterval(intervalId);
  }, [text]);

  return (
    <Text className="text-base text-gray-800" style={{ lineHeight: 24 }}>
      {displayedText}
      {!isComplete && <Text className="text-primary animate-pulse">│</Text>}
    </Text>
  );
}

// Format time for messages
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Meal type options for dropdown
const MEAL_TYPES = [
  { value: "breakfast", label: "🌅 Breakfast" },
  { value: "lunch", label: "☀️ Lunch" },
  { value: "dinner", label: "🌙 Dinner" },
  { value: "snack", label: "🍎 Snack" },
];

export default function CurrentChatScreen() {
  const { conversationId, isNew } = useLocalSearchParams<{
    conversationId: string;
    isNew?: string;
  }>();
  const { user } = useAuthStore();
  const {
    currentConversation,
    messages,
    isSending,
    selectConversation,
    sendMessage,
    getMealRecommendation,
    createConversation,
  } = useChatStore();

  const [inputText, setInputText] = useState("");
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [hasMessages, setHasMessages] = useState(false);
  const [actualConversationId, setActualConversationId] = useState<
    string | null
  >(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Copy to clipboard with ChatGPT-style feedback (icon changes to checkmark)
  const handleCopyMessage = useCallback(
    async (messageId: string, content: string) => {
      const cleanContent = content.replace(/\*\*/g, "").replace(/\\n/g, "\n");

      await Clipboard.setStringAsync(cleanContent);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show checkmark for 2 seconds
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    },
    []
  );

  // Load conversation on mount - handle temp conversations
  useEffect(() => {
    if (conversationId) {
      if (isNew === "true" || conversationId.startsWith("temp_")) {
        // New conversation - don't load anything yet
        setActualConversationId(null);
        setHasMessages(false);
      } else {
        selectConversation(conversationId);
        setActualConversationId(conversationId);
        setHasMessages(true);
      }
    }
  }, [conversationId, isNew]);

  // Handle back button - don't save empty conversations
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleGoBack();
        return true;
      }
    );
    return () => backHandler.remove();
  }, [hasMessages]);

  const handleGoBack = useCallback(() => {
    // If no messages were sent, just go back without saving
    // The conversation was never created in the store
    router.back();
  }, []);

  // Create real conversation on first message
  const ensureConversation = useCallback(async () => {
    if (!actualConversationId) {
      const newConv = await createConversation();
      setActualConversationId(newConv.id);
      selectConversation(newConv.id);
      return newConv.id;
    }
    return actualConversationId;
  }, [actualConversationId, createConversation, selectConversation]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText("");

    // Haptic on send
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Ensure conversation exists before sending
    await ensureConversation();
    setHasMessages(true);

    const result = await sendMessage(text);

    // Set streaming for the new assistant message
    if (result) {
      setStreamingMessageId(result.id);
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, isSending, sendMessage, ensureConversation]);

  const handleQuickAction = async (message: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Ensure conversation exists before sending
    await ensureConversation();
    setHasMessages(true);

    const result = await sendMessage(message);
    if (result) {
      setStreamingMessageId(result.id);
    }
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleMealRecommendation = async () => {
    setShowMealPicker(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Ensure conversation exists before sending
    await ensureConversation();
    setHasMessages(true);

    const budgetMap: Record<string, "low" | "medium" | "high"> = {
      low: "low",
      middle: "medium",
      high: "high",
    };

    const result = await getMealRecommendation({
      mealType: selectedMealType as "breakfast" | "lunch" | "dinner" | "snack",
      preferences: {
        budget: budgetMap[user?.profile?.incomeBracket || "middle"] || "medium",
      },
    });

    if (result) {
      setStreamingMessageId(result.id);
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isUser = item.role === "user";
    const isLatestAssistant =
      !isUser &&
      index === messages.length - 1 &&
      item.id === streamingMessageId;

    // Clean content - remove markdown ** symbols and fix escaped newlines
    const cleanContent = item.content
      .replace(/\*\*/g, "")
      .replace(/\\n/g, "\n");

    return (
      <View className={`mb-4 ${isUser ? "items-end" : "items-start"}`}>
        {/* Avatar and name for assistant messages */}
        {!isUser && (
          <View className="flex-row items-center mb-2">
            <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
              <Sparkles size={14} color="white" />
            </View>
            <Text className="text-xs text-gray-500 ml-2 font-medium">
              Gluvia AI
            </Text>
          </View>
        )}

        <View
          className={`max-w-[90%] rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary rounded-br-sm"
              : "bg-gray-50 border border-gray-100 rounded-bl-sm"
          }`}
        >
          {isLatestAssistant ? (
            <StreamingText
              text={cleanContent}
              onComplete={() => setStreamingMessageId(null)}
            />
          ) : (
            <Text
              className={`text-base ${isUser ? "text-white" : "text-gray-800"}`}
              style={{ lineHeight: 24 }}
              selectable={true}
            >
              {cleanContent}
            </Text>
          )}
        </View>

        {/* Copy button for AI messages - ChatGPT style */}
        {!isUser && !isLatestAssistant && (
          <View className="flex-row items-center mt-1.5 ml-1">
            <Pressable
              onPress={() => handleCopyMessage(item.id, item.content)}
              className="flex-row items-center px-2 py-1 rounded-md"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {copiedMessageId === item.id ? (
                <>
                  <Check size={14} color="#22c55e" />
                  <Text className="text-xs text-green-500 ml-1 font-medium">
                    Copied
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={14} color="#9ca3af" />
                  <Text className="text-xs text-gray-400 ml-1">Copy</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Meal recommendations cards - only show after streaming completes */}
        {!isUser &&
          !isLatestAssistant &&
          item.metadata?.recommendations?.map((rec, recIndex) => (
            <View
              key={recIndex}
              className="mt-3 w-[90%] bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-gray-800 text-base flex-1 mr-2">
                  {rec.mealName}
                </Text>
                <View className="bg-primary/10 px-3 py-1 rounded-full">
                  <Text className="text-primary font-semibold text-sm">
                    {rec.suitabilityScore}/100
                  </Text>
                </View>
              </View>

              <Text className="text-gray-600 text-sm mt-2 leading-5">
                {rec.explanation}
              </Text>

              {/* Foods list */}
              <View className="mt-3 bg-gray-50 rounded-lg p-3">
                <Text className="text-xs text-gray-500 uppercase font-semibold mb-2">
                  Recommended Foods
                </Text>
                {rec.foods.map((food, foodIndex) => (
                  <View
                    key={foodIndex}
                    className="flex-row items-center py-1.5"
                  >
                    <View className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                    <Text className="text-gray-700 text-sm flex-1">
                      {food.localName}
                    </Text>
                    <Text className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {food.portion}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Nutrition summary */}
              <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
                <View className="items-center flex-1">
                  <Text className="text-primary font-bold text-lg">
                    {rec.totalNutrition.calories}
                  </Text>
                  <Text className="text-xs text-gray-500">cal</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-orange-500 font-bold text-lg">
                    {rec.totalNutrition.carbs}g
                  </Text>
                  <Text className="text-xs text-gray-500">carbs</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-green-500 font-bold text-lg">
                    {rec.totalNutrition.protein}g
                  </Text>
                  <Text className="text-xs text-gray-500">protein</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-yellow-500 font-bold text-lg">
                    {rec.totalNutrition.fat}g
                  </Text>
                  <Text className="text-xs text-gray-500">fat</Text>
                </View>
              </View>
            </View>
          ))}

        {/* Warnings - only show after streaming completes */}
        {!isUser &&
          !isLatestAssistant &&
          item.metadata?.warnings?.map((warning, warnIndex) => (
            <View
              key={warnIndex}
              className="mt-3 w-[90%] bg-amber-50 rounded-lg p-3 flex-row items-start border border-amber-100"
            >
              <Ionicons
                name="warning"
                size={16}
                color="#d97706"
                style={{ marginTop: 2 }}
              />
              <Text className="text-amber-800 text-sm ml-2 flex-1 leading-5">
                {warning}
              </Text>
            </View>
          ))}

        {/* Timestamp */}
        <Text className="text-xs text-gray-400 mt-1.5 mx-2">
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <ArrowLeft size={20} color="#374151" />
        </Pressable>

        <View className="flex-1 items-center mx-4">
          <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>
            {currentConversation?.title || "Gluvia AI"}
          </Text>
          {isSending && (
            <Text className="text-xs text-primary font-medium">
              Generating...
            </Text>
          )}
        </View>

        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
          <Sparkles size={20} color="#1447e6" />
        </View>
      </View>

      {/* Messages Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 24,
            }}
          >
            {/* Welcome Message */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Sparkles size={36} color="#1447e6" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 text-center">
                Hello, {user?.name?.split(" ")[0] || "there"}! 👋
              </Text>
              <Text className="text-gray-500 text-center mt-2 text-base">
                I'm your AI nutrition assistant for diabetes management.
              </Text>
            </View>

            {/* Quick Actions */}
            <Text className="text-sm font-semibold text-gray-400 uppercase mb-3">
              Quick Actions
            </Text>

            <View className="gap-3">
              <Pressable
                onPress={() => setShowMealPicker(true)}
                className="flex-row items-center bg-primary/5 p-4 rounded-2xl border border-primary/10"
              >
                <View className="w-12 h-12 rounded-xl bg-primary items-center justify-center">
                  <Utensils size={24} color="white" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-800 text-base">
                    Get Meal Recommendation
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    Personalized meals for your health
                  </Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </Pressable>

              <Pressable
                onPress={() =>
                  handleQuickAction("What are the best low-GI Nigerian foods?")
                }
                className="flex-row items-center bg-green-50 p-4 rounded-2xl border border-green-100"
              >
                <View className="w-12 h-12 rounded-xl bg-green-500 items-center justify-center">
                  <Ionicons name="leaf" size={24} color="white" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-800 text-base">
                    Low-GI Food Guide
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    Diabetes-friendly options
                  </Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </Pressable>

              <Pressable
                onPress={() =>
                  handleQuickAction("Give me tips for managing blood sugar")
                }
                className="flex-row items-center bg-amber-50 p-4 rounded-2xl border border-amber-100"
              >
                <View className="w-12 h-12 rounded-xl bg-amber-500 items-center justify-center">
                  <Zap size={24} color="white" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-800 text-base">
                    Blood Sugar Tips
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    Practical advice for daily life
                  </Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isSending ? <TypingIndicator /> : null}
          />
        )}

        {/* Input Area */}
        <View className="px-4 py-3 border-t border-gray-100 bg-white">
          <View className="flex-row items-end">
            <Pressable
              onPress={() => setShowMealPicker(true)}
              className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center mr-3"
            >
              <Utensils size={20} color="#1447e6" />
            </Pressable>

            <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 min-h-[44px] max-h-32">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about meals, foods..."
                placeholderTextColor="#9ca3af"
                multiline
                className="text-base text-gray-800"
                editable={!isSending}
                style={{ maxHeight: 100 }}
                onSubmitEditing={handleSend}
              />
            </View>

            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              className={`w-11 h-11 rounded-xl items-center justify-center ml-3 ${
                inputText.trim() && !isSending ? "bg-primary" : "bg-gray-200"
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#1447e6" />
              ) : (
                <Send
                  size={20}
                  color={inputText.trim() ? "white" : "#9ca3af"}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Meal Type Picker Modal */}
      <Modal
        visible={showMealPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMealPicker(false)}
      >
        <View className="flex-1 bg-black/50">
          <Pressable
            className="flex-1"
            onPress={() => setShowMealPicker(false)}
          />
          <View className="bg-white rounded-t-3xl">
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 bg-gray-300 rounded-full" />
            </View>

            <View className="px-6 pt-2 pb-6">
              <Text className="text-xl font-bold text-gray-800 mb-2">
                Get Meal Recommendation
              </Text>
              <Text className="text-gray-500 mb-6">
                Select the meal type you're planning for
              </Text>

              {/* Meal Type Dropdown */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-600 mb-3">
                  Meal Type
                </Text>
                <Dropdown
                  options={MEAL_TYPES}
                  value={selectedMealType}
                  onChange={setSelectedMealType}
                  placeholder="Select meal type"
                  icon={<Utensils size={18} color="#6b7280" />}
                />
              </View>

              {/* Visual meal options grid */}
              <View className="flex-row flex-wrap gap-3 mb-6">
                {[
                  { type: "breakfast", emoji: "🌅", label: "Breakfast" },
                  { type: "lunch", emoji: "☀️", label: "Lunch" },
                  { type: "dinner", emoji: "🌙", label: "Dinner" },
                  { type: "snack", emoji: "🍎", label: "Snack" },
                ].map((meal) => (
                  <Pressable
                    key={meal.type}
                    onPress={() => setSelectedMealType(meal.type)}
                    className={`flex-1 min-w-[45%] p-4 rounded-xl border-2 items-center ${
                      selectedMealType === meal.type
                        ? "bg-primary/10 border-primary"
                        : "bg-gray-50 border-transparent"
                    }`}
                  >
                    <Text className="text-3xl mb-2">{meal.emoji}</Text>
                    <Text
                      className={`font-semibold ${
                        selectedMealType === meal.type
                          ? "text-primary"
                          : "text-gray-700"
                      }`}
                    >
                      {meal.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleMealRecommendation}
                disabled={isSending}
                className={`w-full py-4 rounded-xl flex-row items-center justify-center ${
                  isSending ? "bg-primary/70" : "bg-primary"
                }`}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Sparkles size={20} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      Get Recommendations
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
