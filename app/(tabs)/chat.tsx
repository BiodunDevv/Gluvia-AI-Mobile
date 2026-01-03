/**
 * Meal Recommendation Hub
 *
 * Main screen for meal recommendations with time-based suggestions,
 * meal type selection, and quick access to food recommendations.
 */

import { TodayStatsCard } from "@/components/ui";
import {
  getCurrentMealType,
  getMealTypeInfo,
  getTimeContextMessage,
  MealType,
} from "@/lib/meal-recommendation";
import {
  getCachedFoodsCount,
  getCachedRulesCount,
  getTodaysMeals,
  MealHistoryEntry,
} from "@/lib/offline-db";
import { useAuthStore } from "@/store/auth-store";
import { useFoodStore } from "@/store/food-store";
import { useRuleStore } from "@/store/rule-store";
import { useSyncStore } from "@/store/sync-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowDownCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Coffee,
  Cookie,
  Database,
  Download,
  History,
  Leaf,
  Moon,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Meal type configuration
const MEAL_CONFIG: Record<
  MealType,
  {
    icon: any;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  breakfast: {
    icon: Coffee,
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    description: "Start your day with a balanced meal",
  },
  lunch: {
    icon: Sun,
    color: "#10b981",
    bgColor: "bg-emerald-50",
    description: "Energize your afternoon",
  },
  dinner: {
    icon: Moon,
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    description: "Light and nutritious evening meal",
  },
  snack: {
    icon: Cookie,
    color: "#ec4899",
    bgColor: "bg-pink-50",
    description: "Smart choices between meals",
  },
};

// Meal Type Card for Selection
function MealTypeCard({
  type,
  isRecommended,
  onPress,
  disabled,
}: {
  type: MealType;
  isRecommended: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const config = MEAL_CONFIG[type];
  const info = getMealTypeInfo(type);
  const Icon = config.icon;

  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }
      }}
      disabled={disabled}
      className={`bg-white rounded-2xl p-4 mb-3 border border-gray-100 ${disabled ? "opacity-50" : ""}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="w-14 h-14 rounded-xl items-center justify-center"
          style={{ backgroundColor: config.color + "20" }}
        >
          <Icon size={28} color={config.color} />
        </View>

        <View className="flex-1 ml-4">
          <View className="flex-row items-center">
            <Text className="text-lg font-bold text-gray-800">
              {info.title}
            </Text>
            {isRecommended && (
              <View className="ml-2 px-2 py-0.5 bg-primary/10 rounded-full flex-row items-center">
                <Clock size={10} color="#1447e6" />
                <Text className="text-xs font-medium text-primary ml-1">
                  Now
                </Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-500 mt-0.5">
            {config.description}
          </Text>
          <View className="flex-row items-center mt-2">
            <Zap size={12} color="#f59e0b" />
            <Text className="text-xs text-gray-500 ml-1">
              {info.carbRange.min}-{info.carbRange.max}g carbs recommended
            </Text>
          </View>
        </View>

        <ChevronRight size={20} color="#9ca3af" />
      </View>
    </Pressable>
  );
}

// Recent Meal Item
function RecentMealItem({ meal }: { meal: MealHistoryEntry }) {
  const config = MEAL_CONFIG[meal.mealType];
  const Icon = config.icon;
  const time = new Date(meal.createdAt);
  const timeStr = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View className="flex-row items-center py-3 border-b border-gray-100">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: config.color + "15" }}
      >
        <Icon size={18} color={config.color} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-medium text-gray-800">
          {getMealTypeInfo(meal.mealType).title}
        </Text>
        <Text className="text-xs text-gray-500">
          {meal.foodIds.length} items • {Math.round(meal.totalCarbs || 0)}g
          carbs
        </Text>
      </View>
      <Text className="text-xs text-gray-400">{timeStr}</Text>
    </View>
  );
}

// Sync Required Section Component
function SyncRequiredSection({
  isSyncing,
  onSync,
  syncProgress,
}: {
  isSyncing: boolean;
  onSync: () => void;
  syncProgress: { foods: boolean; rules: boolean };
}) {
  const isSyncComplete = syncProgress.foods && syncProgress.rules;

  return (
    <Animated.View
      entering={FadeInDown.delay(200)}
      className="mx-6 mt-4 bg-primary rounded-3xl p-6 overflow-hidden"
    >
      {/* Background Pattern */}
      <View className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
      <View className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8" />

      {/* Icon */}
      <View className="items-center mb-4">
        <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-white items-center justify-center">
            {isSyncComplete ? (
              <Animated.View entering={ZoomIn}>
                <CheckCircle size={32} color="#22c55e" />
              </Animated.View>
            ) : (
              <Sparkles size={32} color="#1447e6" />
            )}
          </View>
        </View>
      </View>

      {/* Title & Description */}
      <Text className="text-2xl font-bold text-white text-center mb-2">
        {isSyncComplete ? "You're All Set!" : "Welcome to Gluvia AI"}
      </Text>
      <Text className="text-white/80 text-center mb-6 leading-5">
        {isSyncComplete
          ? "Your data is ready. You can now get personalized meal recommendations."
          : "Download our Nigerian food database and smart rules for personalized meal recommendations."}
      </Text>

      {/* Features */}
      <View className="bg-white/10 rounded-2xl p-4 mb-6">
        <View className="flex-row items-center mb-3">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${syncProgress.foods ? "bg-green-500/30" : "bg-white/20"}`}
          >
            {syncProgress.foods ? (
              <CheckCircle size={16} color="#22c55e" />
            ) : (
              <Database size={16} color="white" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white font-medium">
              Nigerian Food Database
            </Text>
            <Text className="text-white/60 text-xs">
              100+ local foods with nutritional info
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${syncProgress.rules ? "bg-green-500/30" : "bg-white/20"}`}
          >
            {syncProgress.rules ? (
              <CheckCircle size={16} color="#22c55e" />
            ) : (
              <Zap size={16} color="white" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white font-medium">
              AI Recommendation Rules
            </Text>
            <Text className="text-white/60 text-xs">
              Smart rules for diabetes management
            </Text>
          </View>
        </View>
      </View>

      {/* Sync Button */}
      {!isSyncComplete && (
        <Pressable
          onPress={onSync}
          disabled={isSyncing}
          className={`py-4 rounded-2xl items-center justify-center flex-row ${
            isSyncing ? "bg-white/50" : "bg-white"
          }`}
        >
          {isSyncing ? (
            <>
              <ActivityIndicator color="#1447e6" size="small" />
              <Text className="text-primary font-bold text-base ml-3">
                Downloading Data...
              </Text>
            </>
          ) : (
            <>
              <Download size={20} color="#1447e6" />
              <Text className="text-primary font-bold text-base ml-2">
                Download & Get Started
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Sync Progress */}
      {isSyncing && !isSyncComplete && (
        <Animated.View entering={FadeIn} className="mt-4 items-center">
          <Text className="text-white/70 text-sm text-center">
            Please wait while we prepare your personalized experience...
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function MealRecommendationHub() {
  const { user } = useAuthStore();
  const { foods, fetchFoods, isLoading: foodsLoading } = useFoodStore();
  const { rules, fetchRules, isLoading: rulesLoading } = useRuleStore();
  const {
    getFullSync,
    checkAndApplyUpdates,
    getAggregations,
    foods: syncedFoods,
    rules: syncedRules,
    mealStats,
    isFetchingAggregations,
  } = useSyncStore();

  const [todaysMeals, setTodaysMeals] = useState<MealHistoryEntry[]>([]);
  const [isDataSynced, setIsDataSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    foods: false,
    rules: false,
  });
  const [isCheckingCache, setIsCheckingCache] = useState(true);

  const lastKnownFoodCount = useRef<number>(0);

  const currentMealType = getCurrentMealType();
  const greeting = getTimeContextMessage(currentMealType);

  // Get total foods count
  const totalFoodsCount = syncedFoods.length || foods.length;

  // Check if data is synced
  const checkDataSynced = useCallback(async () => {
    try {
      const cachedFoodsCount = await getCachedFoodsCount();
      const cachedRulesCount = await getCachedRulesCount();

      const hasFoodsInStore = foods.length > 0 || syncedFoods.length > 0;
      const hasRulesInStore = rules.length > 0 || syncedRules.length > 0;

      const hasCachedData = cachedFoodsCount > 0 && cachedRulesCount > 0;
      const hasStoreData = hasFoodsInStore && hasRulesInStore;
      const synced = hasCachedData || hasStoreData;

      setIsDataSynced(synced);

      if (cachedFoodsCount > 0) {
        lastKnownFoodCount.current = cachedFoodsCount;
      }

      // If synced, also update sync progress UI
      if (synced) {
        setSyncProgress({ foods: true, rules: true });
      }

      return synced;
    } catch (error) {
      console.error("Error checking data sync status:", error);
      return false;
    } finally {
      setIsCheckingCache(false);
    }
  }, [foods.length, rules.length, syncedFoods.length, syncedRules.length]);

  // Load today's meals
  const loadTodaysMeals = useCallback(async () => {
    if (user?._id) {
      const meals = await getTodaysMeals(user._id);
      setTodaysMeals(meals);
    }
  }, [user?._id]);

  // Fetch aggregations for stats
  const fetchAggregations = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await getAggregations({
        from: today.toISOString(),
        to: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching aggregations:", error);
    }
  }, [getAggregations]);

  // Full sync for first-time users
  const syncDataForOffline = async () => {
    setIsSyncing(true);
    setSyncProgress({ foods: false, rules: false });

    try {
      const result = await getFullSync();

      setSyncProgress({ foods: true, rules: true });
      lastKnownFoodCount.current = result.foods?.length || 0;
      setIsDataSynced(true);

      // Fetch aggregations after sync
      await fetchAggregations();

      // Small delay for smooth UI
      setTimeout(() => {
        setIsSyncing(false);
      }, 500);
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert(
        "Sync Failed",
        "Please check your internet connection and try again."
      );
      setIsSyncing(false);
      setSyncProgress({ foods: false, rules: false });
    }
  };

  // Delta update for existing users
  const checkForUpdates = async () => {
    setIsUpdating(true);

    try {
      const result = await checkAndApplyUpdates();

      if (result.hasChanges) {
        Alert.alert(
          "Updates Applied",
          `Updated ${result.foodsUpdated} foods and ${result.rulesUpdated} rules.`
        );
        // Refresh aggregations after update
        await fetchAggregations();
      } else {
        Alert.alert("Up to Date", "You have the latest data.");
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert(
        "Update Failed",
        "Please check your internet connection and try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle meal type selection
  const handleSelectMealType = (type: MealType) => {
    if (!isDataSynced) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    router.push({
      pathname: "/meal-recommendation",
      params: { mealType: type },
    });
  };

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFoods({ limit: 100 }),
      fetchRules(),
      loadTodaysMeals(),
      fetchAggregations(),
    ]);
    await checkDataSynced();
    setRefreshing(false);
  };

  // Load data on mount
  useFocusEffect(
    useCallback(() => {
      checkDataSynced();
      loadTodaysMeals();
    }, [checkDataSynced, loadTodaysMeals])
  );

  // Fetch aggregations when data is synced
  useFocusEffect(
    useCallback(() => {
      if (isDataSynced) {
        fetchAggregations();
      }
    }, [isDataSynced, fetchAggregations])
  );

  // Calculate stats from aggregations or local data
  const todaysTotals = {
    meals: mealStats?.totalMeals || todaysMeals.length || 0,
    carbs:
      mealStats?.totalCarbs ||
      todaysMeals.reduce((acc, m) => acc + (m.totalCarbs || 0), 0),
    calories:
      mealStats?.totalCalories ||
      todaysMeals.reduce((acc, m) => acc + (m.totalCalories || 0), 0),
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1447e6"
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Sparkles size={16} color="#1447e6" />
                <Text className="text-sm text-primary font-medium ml-1.5">
                  Gluvia AI
                </Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800 mt-1">
                Meal Recommendations
              </Text>
            </View>

            {/* Update Button - Only show if data is synced */}
            {isDataSynced && (
              <Pressable
                onPress={checkForUpdates}
                disabled={isUpdating}
                className="flex-row items-center px-3 py-2 bg-primary/10 rounded-xl"
              >
                {isUpdating ? (
                  <ActivityIndicator color="#1447e6" size="small" />
                ) : (
                  <ArrowDownCircle size={16} color="#1447e6" />
                )}
                <Text className="text-primary text-xs font-medium ml-1.5">
                  {isUpdating ? "Updating..." : "Update"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Greeting Banner - Only when synced */}
          {isDataSynced && (
            <Animated.View
              entering={FadeIn}
              className="bg-gradient-to-r from-primary/10 to-blue-50 rounded-2xl py-2 mt-2"
            >
              <Text className="text-gray-700 leading-6">{greeting}</Text>
            </Animated.View>
          )}
        </View>

        {/* Show Sync Section if not synced */}
        {!isDataSynced && !isCheckingCache && (
          <SyncRequiredSection
            isSyncing={isSyncing}
            onSync={syncDataForOffline}
            syncProgress={syncProgress}
          />
        )}

        {/* Loading State */}
        {isCheckingCache && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#1447e6" />
            <Text className="text-gray-500 mt-4">Loading...</Text>
          </View>
        )}

        {/* Main Content - Only show when synced */}
        {isDataSynced && (
          <>
            {/* Today's Stats */}
            <TodayStatsCard
              totalCalories={todaysTotals.calories}
              totalCarbs={todaysTotals.carbs}
              mealsCount={todaysTotals.meals}
              isLoading={isFetchingAggregations}
              showLogMealButton={false}
              animationDelay={100}
            />

            {/* Meal Type Selection */}
            <View className="px-6 mt-2">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-800">
                  Get Recommendations
                </Text>
                <View className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full">
                  <Leaf size={14} color="#22c55e" />
                  <Text className="text-xs text-green-700 font-medium ml-1.5">
                    {totalFoodsCount} foods synced
                  </Text>
                </View>
              </View>

              {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
                (type) => (
                  <Animated.View
                    key={type}
                    entering={FadeInUp.delay(
                      ["breakfast", "lunch", "dinner", "snack"].indexOf(type) *
                        100
                    )}
                  >
                    <MealTypeCard
                      type={type}
                      isRecommended={type === currentMealType}
                      onPress={() => handleSelectMealType(type)}
                      disabled={!isDataSynced}
                    />
                  </Animated.View>
                )
              )}
            </View>

            {/* Recent Meals */}
            {todaysMeals.length > 0 && (
              <View className="px-6 mt-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <History size={18} color="#6b7280" />
                    <Text className="text-lg font-bold text-gray-800 ml-2">
                      Today's Meals
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">
                    {todaysMeals.length} logged
                  </Text>
                </View>

                <View className="bg-white rounded-2xl p-4">
                  {todaysMeals.slice(0, 5).map((meal) => (
                    <RecentMealItem key={meal.id} meal={meal} />
                  ))}
                </View>
              </View>
            )}

            {/* Quick Tips */}
            <View className="px-6 mt-6">
              <Animated.View
                entering={FadeInUp.delay(400)}
                className="bg-blue-50 rounded-2xl p-4"
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons name="bulb" size={18} color="#1447e6" />
                  <Text className="font-semibold text-primary ml-2">
                    Quick Tips
                  </Text>
                </View>
                <Text className="text-sm text-gray-700 leading-5">
                  • Aim for 3 balanced meals with 1-2 small snacks{"\n"}•
                  Include protein with each meal for stable blood sugar{"\n"}•
                  Choose low GI foods to avoid spikes
                </Text>
              </Animated.View>
            </View>

            {/* Offline Status */}
            <View className="px-6 mt-6">
              <View className="flex-row items-center justify-center py-3 bg-green-50 rounded-xl">
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text className="text-green-700 text-sm ml-2">
                  Ready for offline use • {totalFoodsCount} foods cached
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
