import { useAuthStore } from "@/store/auth-store";
import { Conversation, useChatStore } from "@/store/chat-store";
import { useFoodStore } from "@/store/food-store";
import { useRuleStore } from "@/store/rule-store";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  CheckCircle,
  Clock,
  Download,
  MessageCircle,
  MessageSquarePlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

// Format date to "2nd January 2026" style
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${ordinal(day)} ${month} ${year}`;
}

// Get relative time
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export default function ChatListScreen() {
  const { user } = useAuthStore();
  const {
    conversations,
    isLoading,
    isDataSynced,
    loadConversations,
    createConversation,
    deleteConversation,
    checkDataSynced,
  } = useChatStore();

  const { fetchFoods } = useFoodStore();
  const { fetchRules } = useRuleStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncRequired, setShowSyncRequired] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Swipeable refs for managing swipe gestures
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
  const openSwipeableRef = useRef<string | null>(null);

  // Close any open swipeable
  const closeOpenSwipeable = useCallback(() => {
    if (openSwipeableRef.current) {
      const ref = swipeableRefs.current.get(openSwipeableRef.current);
      if (ref) ref.close();
      openSwipeableRef.current = null;
    }
  }, []);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Load conversations and ensure minimum 2 second delay for smooth UX
    const [,] = await Promise.all([
      loadConversations(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);

    setIsRefreshing(false);
  }, [loadConversations]);

  // Check if data is synced on mount
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const synced = await checkDataSynced();
        if (!synced) {
          setShowSyncRequired(true);
        }
        loadConversations();
      };
      init();
    }, [])
  );

  // Sync data for offline use
  const syncDataForOffline = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([fetchFoods({ limit: 200 }), fetchRules()]);

      const synced = await checkDataSynced();
      if (synced) {
        setShowSyncRequired(false);
        Alert.alert(
          "✅ Sync Complete!",
          "Your Gluvia AI is now ready to work offline. You can get meal recommendations anytime, anywhere!",
          [{ text: "Let's Go!", style: "default" }]
        );
      }
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert(
        "Sync Failed",
        "Please check your internet connection and try again."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNewChat = async () => {
    if (!isDataSynced) {
      setShowSyncRequired(true);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeOpenSwipeable();

    // Create a temporary conversation ID - won't be saved until first message
    const tempId = `temp_${Date.now()}`;
    router.push({
      pathname: "/current-chat",
      params: { conversationId: tempId, isNew: "true" },
    });
  };

  const handleSelectConversation = async (id: string) => {
    await Haptics.selectionAsync();
    closeOpenSwipeable();
    router.push({
      pathname: "/current-chat",
      params: { conversationId: id },
    });
  };

  const handleDeleteConversation = async (id: string, title: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete "${title || "this conversation"}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            const ref = swipeableRefs.current.get(id);
            if (ref) ref.close();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            deleteConversation(id);
          },
        },
      ]
    );
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render right swipe actions (delete)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    conversationId: string,
    title: string
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.8],
      extrapolate: "clamp",
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={{ opacity, transform: [{ scale }] }}
        className="justify-center items-center px-3"
      >
        <Pressable
          onPress={() => handleDeleteConversation(conversationId, title)}
          className="bg-red-500 rounded-2xl p-4 items-center justify-center"
          style={{ width: 80, height: "85%" }}
        >
          <Trash2 size={22} color="white" />
          <Text className="text-white text-xs mt-1 font-medium">Delete</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Swipeable
      ref={(ref) => {
        swipeableRefs.current.set(item.id, ref);
      }}
      renderRightActions={(progress, dragX) =>
        renderRightActions(progress, dragX, item.id, item.title)
      }
      rightThreshold={80}
      overshootRight={false}
      friction={2}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Close other open swipeables
        if (openSwipeableRef.current && openSwipeableRef.current !== item.id) {
          const ref = swipeableRefs.current.get(openSwipeableRef.current);
          if (ref) ref.close();
        }
        openSwipeableRef.current = item.id;
      }}
    >
      <Pressable
        onPress={() => handleSelectConversation(item.id)}
        className="flex-row items-center bg-white p-4 mx-4 mb-3 rounded-2xl border border-gray-100"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
          <MessageCircle size={22} color="#1447e6" />
        </View>

        <View className="flex-1 ml-4">
          <Text
            className="font-semibold text-gray-800 text-base"
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.lastMessage && (
            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
              {item.lastMessage.replace(/\n/g, " ").substring(0, 80)}
              {item.lastMessage.length > 80 ? "..." : ""}
            </Text>
          )}
          <View className="flex-row items-center mt-2">
            <Clock size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400 ml-1.5">
              {getRelativeTime(item.updatedAt)}
            </Text>
            <View className="w-1 h-1 bg-gray-300 rounded-full mx-2" />
            <Text className="text-xs text-gray-400">
              {item.messageCount} messages
            </Text>
          </View>
        </View>

        <View className="ml-2">
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </Pressable>
    </Swipeable>
  );

  // Sync Required Screen
  if (showSyncRequired && !isDataSynced) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-6">
            <Download size={48} color="#1447e6" />
          </View>

          <Text className="text-2xl font-bold text-gray-800 text-center mb-3">
            One-Time Setup Required
          </Text>

          <Text className="text-gray-500 text-center text-base leading-6 mb-8">
            To provide you with personalized offline meal recommendations, I
            need to download the Nigerian food database and dietary rules. This
            only takes a moment!
          </Text>

          <View className="w-full bg-gray-50 rounded-2xl p-5 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <CheckCircle size={18} color="#22c55e" />
              </View>
              <Text className="ml-3 text-gray-700 flex-1">
                84+ Nigerian foods with nutrition data
              </Text>
            </View>
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <CheckCircle size={18} color="#22c55e" />
              </View>
              <Text className="ml-3 text-gray-700 flex-1">
                Smart dietary rules for diabetes
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <CheckCircle size={18} color="#22c55e" />
              </View>
              <Text className="ml-3 text-gray-700 flex-1">
                Works 100% offline after sync
              </Text>
            </View>
          </View>

          <Pressable
            onPress={syncDataForOffline}
            disabled={isSyncing}
            className={`w-full py-4 rounded-2xl flex-row items-center justify-center ${
              isSyncing ? "bg-primary/70" : "bg-primary"
            }`}
          >
            {isSyncing ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-semibold text-base ml-3">
                  Syncing Data...
                </Text>
              </>
            ) : (
              <>
                <Download size={20} color="white" />
                <Text className="text-white font-semibold text-base ml-3">
                  Download & Sync Now
                </Text>
              </>
            )}
          </Pressable>

          <Text className="text-gray-400 text-sm mt-4 text-center">
            Requires internet connection • ~2MB download
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                Conversations
              </Text>
              <Text className="text-gray-500 text-sm mt-0.5">
                {conversations.length}{" "}
                {conversations.length === 1 ? "chat" : "chats"}
              </Text>
            </View>
            <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
              <Sparkles size={24} color="white" />
            </View>
          </View>

          {/* Search Bar */}
          {conversations.length > 0 && (
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
              <Search size={20} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search conversations..."
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-3 text-base text-gray-800"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Swipe hint for new users */}
        {conversations.length > 0 && conversations.length <= 3 && (
          <View className="mx-4 mt-3 px-4 py-2 rounded-lg flex-row items-center bg-primary/5">
            <Ionicons name="arrow-back" size={16} color="#1447e6" />
            <Text className="text-xs ml-2 text-primary">
              Swipe left on a chat to delete
            </Text>
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1447e6" />
            <Text className="text-gray-500 mt-4">Loading conversations...</Text>
          </View>
        ) : conversations.length === 0 ? (
          // Empty State
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-28 h-28 rounded-full bg-primary/10 items-center justify-center mb-6">
              <MessageSquarePlus size={56} color="#1447e6" />
            </View>

            <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
              No Conversations Yet
            </Text>
            <Text className="text-gray-500 text-center text-base leading-6 mb-8">
              Start a new conversation with Gluvia AI to get personalized meal
              recommendations and nutrition advice.
            </Text>

            <Pressable
              onPress={handleNewChat}
              className="flex-row items-center bg-primary px-8 py-4 rounded-2xl"
              style={{
                shadowColor: "#1447e6",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Plus size={22} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Start New Chat
              </Text>
            </Pressable>

            <View className="flex-row items-center mt-6 bg-green-50 px-4 py-3 rounded-xl">
              <Ionicons name="leaf" size={20} color="#22c55e" />
              <Text className="text-green-700 text-sm ml-2 flex-1">
                100% Offline • Your data stays on your device
              </Text>
            </View>
          </View>
        ) : (
          // Conversations List
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
            onScrollBeginDrag={closeOpenSwipeable}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#1447e6"
                colors={["#1447e6"]}
                progressBackgroundColor="white"
              />
            }
            ListEmptyComponent={
              searchQuery ? (
                <View className="items-center py-12">
                  <Search size={48} color="#d1d5db" />
                  <Text className="text-gray-400 mt-4 text-center">
                    No conversations found for "{searchQuery}"
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Floating Action Button */}
        {conversations.length > 0 && (
          <Pressable
            onPress={handleNewChat}
            className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-primary items-center justify-center"
            style={{
              shadowColor: "#1447e6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Plus size={28} color="white" />
          </Pressable>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
