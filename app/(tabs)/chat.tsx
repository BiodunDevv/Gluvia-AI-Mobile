import { AppLoader, AppScreenHeader, TodayStatsCard } from "@/components/ui";
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
import { useSyncStore } from "@/store/sync-store";
import * as Haptics from "expo-haptics";
import { Href, router, useFocusEffect } from "expo-router";
import {
  ArrowDownCircle,
  CheckCircle,
  ChevronRight,
  Coffee,
  Cookie,
  Database,
  History,
  Moon,
  ScrollText,
  WifiOff,
  Sun,
  Utensils,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_CONFIG: Record<MealType, { icon: any; color: string }> = {
  breakfast: { icon: Coffee, color: "#f59e0b" },
  lunch: { icon: Sun, color: "#10b981" },
  dinner: { icon: Moon, color: "#8b5cf6" },
  snack: { icon: Cookie, color: "#ec4899" },
};

function MealPlanRow({
  type,
  recommended,
  onPress,
}: {
  type: MealType;
  recommended: boolean;
  onPress: () => void;
}) {
  const info = getMealTypeInfo(type);
  const config = MEAL_CONFIG[type];
  const Icon = config.icon;

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-3"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${config.color}18` }}
      >
        <Icon size={19} color={config.color} />
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="text-base font-semibold text-gray-900">
            {info.title}
          </Text>
          {recommended ? (
            <View className="ml-2 rounded-md bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-medium text-primary">Now</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-xs text-gray-500">
          {info.carbRange.min}-{info.carbRange.max}g carb target
        </Text>
      </View>
      <ChevronRight size={18} color="#9ca3af" />
    </Pressable>
  );
}

function RecentMealRow({ meal }: { meal: MealHistoryEntry }) {
  const config = MEAL_CONFIG[meal.mealType];
  const Icon = config.icon;

  return (
    <View className="flex-row items-center border-b border-gray-100 py-3 last:border-b-0">
      <View
        className="h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${config.color}18` }}
      >
        <Icon size={17} color={config.color} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-gray-900">
          {getMealTypeInfo(meal.mealType).title}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-500">
          {Math.round(meal.totalCarbs || 0)}g carbs -{" "}
          {Math.round(meal.totalCalories || 0)} cal
        </Text>
      </View>
      <Text className="text-xs text-gray-400">
        {new Date(meal.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
}

export default function MealRecommendationHub() {
  const { user } = useAuthStore();
  const {
    getFullSync,
    checkAndApplyUpdates,
    getAggregations,
    foods: syncedFoods,
    rules: syncedRules,
    mealStats,
    isFetchingAggregations,
    isOnline,
  } = useSyncStore();
  // Alias for readability — foods/rules always come from sync-store
  const foods = syncedFoods;
  const rules = syncedRules;

  const [todaysMeals, setTodaysMeals] = useState<MealHistoryEntry[]>([]);
  const [isDataReady, setIsDataReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentMealType = getCurrentMealType();
  const totalFoodsCount = foods.length;

  const checkDataReady = useCallback(async () => {
    try {
      const cachedFoods = await getCachedFoodsCount();
      const cachedRules = await getCachedRulesCount();
      const hasStoreData = foods.length > 0 && rules.length > 0;
      const ready = hasStoreData || (cachedFoods > 0 && cachedRules > 0);
      setIsDataReady(ready);
      return ready;
    } finally {
      setIsChecking(false);
    }
  }, [foods.length, rules.length]);

  const loadTodaysMeals = useCallback(async () => {
    if (!user?._id) {
      setTodaysMeals([]);
      return;
    }

    const meals = await getTodaysMeals(user._id);
    setTodaysMeals(meals);
  }, [user?._id]);

  const fetchTodayStats = useCallback(async () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    await getAggregations({
      from: from.toISOString(),
      to: new Date().toISOString(),
      limit: 100,
    }).catch(() => {});
  }, [getAggregations]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      checkAndApplyUpdates(),
      loadTodaysMeals(),
      fetchTodayStats(),
      checkDataReady(),
    ]).catch(() => {});
    setRefreshing(false);
  }, [checkAndApplyUpdates, checkDataReady, fetchTodayStats, loadTodaysMeals]);

  useFocusEffect(
    useCallback(() => {
      checkDataReady();
      loadTodaysMeals();
      fetchTodayStats();
    }, [checkDataReady, fetchTodayStats, loadTodaysMeals])
  );

  const totals = useMemo(
    () => ({
      meals: mealStats?.totalMeals || todaysMeals.length || 0,
      carbs:
        mealStats?.totalCarbs ||
        todaysMeals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0),
      calories:
        mealStats?.totalCalories ||
        todaysMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0),
    }),
    [mealStats?.totalCalories, mealStats?.totalCarbs, mealStats?.totalMeals, todaysMeals]
  );

  const syncData = async () => {
    if (!isOnline) {
      Alert.alert(
        "You're offline",
        "Connect to the internet to download meal data."
      );
      return;
    }
    setIsSyncing(true);
    try {
      await getFullSync();
      setIsDataReady(true);
      await fetchTodayStats();
    } catch {
      Alert.alert("Sync failed", "Please check your internet connection and try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateData = async () => {
    if (!isOnline) {
      Alert.alert("You're offline", "Connect to the internet to check for updates.");
      return;
    }
    setIsUpdating(true);
    try {
      const result = await checkAndApplyUpdates();
      if (result.hasChanges) {
        await fetchTodayStats();
      }
    } catch {
      Alert.alert("Update failed", "Please check your internet connection and try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openMealBuilder = (type: MealType) => {
    if (!isDataReady) {
      if (!isOnline) {
        Alert.alert(
          "No meal data available offline",
          "You need to download meal data at least once while connected. Connect to the internet to get started."
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
      return;
    }
    router.push({
      pathname: "/meal-recommendation",
      params: { mealType: type },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <AppScreenHeader
        title="Meals"
        subtitle={getTimeContextMessage(currentMealType)}
        rightSlot={
          isDataReady ? (
            <View className="flex-row">
              <Pressable
                onPress={() => router.push("/meal-history" as Href)}
                className="mr-2 h-10 w-10 items-center justify-center rounded-xl bg-white"
              >
                <ScrollText size={18} color="#1447e6" />
              </Pressable>
              <Pressable
                onPress={updateData}
                disabled={isUpdating || !isOnline}
                className={`h-10 w-10 items-center justify-center rounded-xl ${
                  isOnline ? "bg-primary/10" : "bg-gray-100"
                }`}
              >
                {isUpdating ? (
                  <AppLoader size="sm" color="#1447e6" />
                ) : (
                  <ArrowDownCircle size={18} color={isOnline ? "#1447e6" : "#9ca3af"} />
                )}
              </Pressable>
            </View>
          ) : null
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isChecking ? (
          <View className="items-center py-20">
            <AppLoader size="lg" color="#1447e6" />
            <Text className="mt-4 text-sm text-gray-500">Preparing meals...</Text>
          </View>
        ) : null}

        {!isChecking && !isDataReady ? (
          <View className="mx-4 rounded-xl border border-gray-200 bg-white p-4">
            {!isOnline ? (
              <View className="mb-4 flex-row items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                <WifiOff size={16} color="#b45309" />
                <Text className="flex-1 text-xs font-medium leading-5 text-amber-800">
                  You are offline. Connect to the internet to download meal data for the first time.
                </Text>
              </View>
            ) : null}
            <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
              <Database size={20} color="#1447e6" />
            </View>
            <Text className="mt-4 text-lg font-semibold text-gray-900">
              Prepare meal data
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-500">
              Download food data and rules once. Recommendations then work instantly from your device, even offline.
            </Text>
            <Pressable
              onPress={syncData}
              disabled={isSyncing || !isOnline}
              className={`mt-4 flex-row items-center justify-center rounded-xl px-4 py-3 ${
                isOnline ? "bg-primary" : "bg-gray-200"
              }`}
            >
              {isSyncing ? (
                <AppLoader size="sm" color="#ffffff" />
              ) : (
                <CheckCircle size={18} color={isOnline ? "#ffffff" : "#9ca3af"} />
              )}
              <Text className={`ml-2 font-semibold ${isOnline ? "text-white" : "text-gray-400"}`}>
                {isSyncing ? "Preparing..." : "Prepare data"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isDataReady ? (
          <>
            {!isOnline && (
              <View className="mx-4 mb-3 flex-row items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <WifiOff size={15} color="#b45309" />
                <Text className="flex-1 text-xs font-medium leading-5 text-amber-800">
                  Offline — recommendations use cached data. Logging meals will sync when you reconnect.
                </Text>
              </View>
            )}
            <View className="mx-4 rounded-xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-medium text-gray-500">
                    {"Today's meal plan"}
                  </Text>
                  <Text className="mt-1 text-xl font-semibold text-gray-900">
                    {getMealTypeInfo(currentMealType).title}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-medium text-primary">
                    {totalFoodsCount}
                  </Text>
                  <Text className="text-xs text-gray-500">foods ready</Text>
                </View>
              </View>
            </View>

            <TodayStatsCard
              totalCalories={totals.calories}
              totalCarbs={totals.carbs}
              mealsCount={totals.meals}
              isLoading={isFetchingAggregations && totals.meals === 0}
              showLogMealButton={false}
              animationDelay={80}
            />

            <View className="px-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-gray-900">
                  Plan next meal
                </Text>
                <Pressable
                  onPress={() => router.push("/meal-history" as Href)}
                  className="flex-row items-center rounded-lg bg-primary/10 px-3 py-2"
                >
                  <History size={15} color="#1447e6" />
                  <Text className="ml-1.5 text-xs font-medium text-primary">
                    Logs
                  </Text>
                </Pressable>
              </View>

              {MEAL_TYPES.map((type) => (
                <MealPlanRow
                  key={type}
                  type={type}
                  recommended={type === currentMealType}
                  onPress={() => openMealBuilder(type)}
                />
              ))}
            </View>

            {todaysMeals.length > 0 ? (
              <View className="mt-5 px-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-gray-900">
                    {"Today's logs"}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {todaysMeals.length} logged
                  </Text>
                </View>
                <View className="rounded-xl border border-gray-200 bg-white px-3">
                  {todaysMeals.slice(0, 5).map((meal) => (
                    <RecentMealRow key={meal.id} meal={meal} />
                  ))}
                </View>
              </View>
            ) : (
              <View className="mx-4 mt-5 rounded-xl border border-gray-200 bg-white p-4">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Utensils size={18} color="#6b7280" />
                </View>
                <Text className="mt-3 text-base font-semibold text-gray-900">
                  No meals logged today
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Choose a meal type above to build and log your next meal.
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
