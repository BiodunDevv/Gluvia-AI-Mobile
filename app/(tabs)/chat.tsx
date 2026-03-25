/**
 * Meal Recommendation Hub
 *
 * Main screen for meal recommendations with time-based suggestions,
 * meal type selection, and quick access to food recommendations.
 */

import { AppScreenHeader, TodayStatsCard } from "@/components/ui";
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
  Lightbulb,
  Moon,
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
      className={`mb-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 ${disabled ? "opacity-50" : ""}`}
    >
      <View className="flex-row items-center">
        <View
          className="h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: config.color + "20" }}
        >
          <Icon size={22} color={config.color} />
        </View>

        <View className="flex-1 ml-4">
          <View className="flex-row items-center">
            <Text className="text-base font-bold text-gray-800">
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
          <Text className="mt-0.5 text-xs text-gray-500">
            {config.description}
          </Text>
          <View className="flex-row items-center mt-2">
            <Zap size={12} color="#f59e0b" />
            <Text className="ml-1 text-xs text-gray-500">
              {info.carbRange.min}-{info.carbRange.max}g target
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
    <View className="flex-row items-center border-b border-gray-100 py-3">
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
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
      className="mx-4 mt-4 overflow-hidden rounded-3xl bg-primary p-5"
    >
      {/* Background Pattern */}
      <View className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
      <View className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8" />

      {/* Icon */}
      <View className="mb-4 items-center">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
            {isSyncComplete ? (
              <Animated.View entering={ZoomIn}>
                <CheckCircle size={24} color="#22c55e" />
              </Animated.View>
            ) : (
              <Database size={24} color="#1447e6" />
            )}
          </View>
        </View>
      </View>

      {/* Title & Description */}
      <Text className="mb-2 text-center text-xl font-bold text-white">
        {isSyncComplete ? "You're All Set!" : "Welcome to Gluvia AI"}
      </Text>
      <Text className="mb-5 text-center leading-5 text-white/80">
        {isSyncComplete
          ? "Your data is ready. You can now get personalized meal recommendations."
          : "Download our Nigerian food database and smart rules for personalized meal recommendations."}
      </Text>

      {/* Features */}
      <View className="mb-5 rounded-2xl bg-white/10 p-4">
        <View className="mb-3 flex-row items-center">
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
          className={`flex-row items-center justify-center rounded-2xl py-3.5 ${
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
        <View>
          <AppScreenHeader
            title="Meals"
            rightSlot={
              isDataSynced ? (
                <Pressable
                  onPress={checkForUpdates}
                  disabled={isUpdating}
                  className="flex-row items-center rounded-xl bg-primary/10 px-3 py-2"
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
              ) : null
            }
          />

          {isDataSynced && (
            <Animated.View
              entering={FadeIn}
              className="mx-4 rounded-2xl border border-gray-100 bg-white p-4"
            >
              <Text className="text-sm font-semibold text-gray-900">
                {greeting}
              </Text>
              <View className="mt-3 flex-row flex-wrap">
                <View className="mb-2 mr-2 rounded-full bg-primary/10 px-3 py-1.5">
                  <Text className="text-xs font-medium text-primary">
                    {todaysTotals.meals} meals today
                  </Text>
                </View>
                <View className="mb-2 mr-2 rounded-full bg-green-50 px-3 py-1.5">
                  <Text className="text-xs font-medium text-green-700">
                    {totalFoodsCount} foods ready
                  </Text>
                </View>
                <View className="mb-2 rounded-full bg-amber-50 px-3 py-1.5">
                  <Text className="text-xs font-medium text-amber-700">
                    {Math.round(todaysTotals.carbs)}g carbs today
                  </Text>
                </View>
              </View>
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
            <View className="mt-2 px-4">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-800">
                  Get Recommendations
                </Text>
                <View className="flex-row items-center rounded-full bg-green-50 px-3 py-1.5">
                  <Leaf size={14} color="#22c55e" />
                  <Text className="ml-1.5 text-xs font-medium text-green-700">
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
              <View className="mt-5 px-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <History size={18} color="#6b7280" />
                    <Text className="ml-2 text-lg font-bold text-gray-800">
                      Today's Meals
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">
                    {todaysMeals.length} logged
                  </Text>
                </View>

                <View className="rounded-2xl bg-white p-4">
                  {todaysMeals.slice(0, 5).map((meal) => (
                    <RecentMealItem key={meal.id} meal={meal} />
                  ))}
                </View>
              </View>
            )}

            <View className="mt-5 px-4">
              <Animated.View
                entering={FadeInUp.delay(400)}
                className="rounded-2xl bg-blue-50 p-4"
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Lightbulb size={18} color="#1447e6" />
                    <Text className="ml-2 font-semibold text-primary">
                      Quick Tips
                    </Text>
                  </View>
                  <View className="flex-row items-center rounded-full bg-green-100 px-2.5 py-1">
                    <CheckCircle size={14} color="#15803d" />
                    <Text className="ml-1.5 text-xs font-medium text-green-700">
                      Offline ready
                    </Text>
                  </View>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  Keep portions steady, pair carbs with protein, and use the
                  meal cards above to log the next best option quickly.
                </Text>
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
