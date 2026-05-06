import { LogGlucoseModal } from "@/components/modals";
import { AppLoader, RecentMealsCard, TodayStatsCard } from "@/components/ui";
import { getTodaysMeals, type MealHistoryEntry } from "@/lib/offline-db";
import { T, useTranslation } from "@/hooks/use-translation";
import { getMissingProfileFields } from "@/lib/profile-completion";
import { translateDynamicText } from "@/lib/translator";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import {
  useAggregationSnapshot,
  useGlucoseStats,
  useNetworkOffline,
  useSyncStore,
} from "@/store/sync-store";
import { Href, router, useFocusEffect } from "expo-router";
import {
  Activity,
  AlertCircle,
  Apple,
  Bell,
  Bot,
  Droplets,
  Lightbulb,
  ScrollText,
  Moon,
  Plus,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Smart Daily Tip Component
function SmartDailyTip({
  user,
  isOffline,
  lastGlucose,
  mealsCount,
  unreadCount,
  animationDelay = 100,
}: {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  isOffline: boolean;
  lastGlucose?: number;
  mealsCount: number;
  unreadCount: number;
  animationDelay?: number;
}) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const missingFields = getMissingProfileFields(user);

  // Generate smart tip based on context
  const getTip = useCallback(() => {
    if (isOffline) {
      return {
        type: "offline" as const,
        icon: WifiOff,
        title: t("Offline mode active"),
        message: t(
          "You can still review cached foods, past logs, and saved data. Sync when you are back online to refresh recommendations and notifications."
        ),
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
        textColor: "text-slate-800",
        iconColor: "#475569",
      };
    }

    if (missingFields.length > 0) {
      return {
        type: "profile" as const,
        icon: Activity,
        title: t("Complete your health profile"),
        message: t(
          "Add your missing health and lifestyle details so Gluvia can tailor meal guidance, safer suggestions, and more accurate daily insights."
        ),
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-800",
        iconColor: "#2563eb",
      };
    }

    if (unreadCount > 0) {
      return {
        type: "notification" as const,
        icon: Bell,
        title: t("You have new updates"),
        message:
          unreadCount === 1
            ? t(
                "There is one new notification waiting for you. Open it to stay current with activity, reminders, or admin updates."
              )
            : t(
                "You have unread notifications. Review them to stay current with account, meal, and system updates."
              ),
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-200",
        textColor: "text-indigo-800",
        iconColor: "#4f46e5",
      };
    }

    // High glucose tips
    if (lastGlucose && lastGlucose > 180) {
      return {
        type: "warning" as const,
        icon: AlertCircle,
        title: t("High Glucose Alert"),
        message: t(
          "Your glucose is quite high. Consider drinking water, taking a 15-minute walk, or checking your medication. If it stays elevated, consult your healthcare provider."
        ),
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-800",
        iconColor: "#f59e0b",
      };
    }

    if (lastGlucose && lastGlucose > 140) {
      return {
        type: "elevated" as const,
        icon: TrendingUp,
        title: t("Glucose Elevated"),
        message: t(
          "Your glucose is elevated. A short 10-15 minute walk can help bring it down naturally. Choose low GI foods for your next meal."
        ),
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        textColor: "text-orange-800",
        iconColor: "#f97316",
      };
    }

    // Low glucose tips
    if (lastGlucose && lastGlucose < 70) {
      return {
        type: "low" as const,
        icon: TrendingDown,
        title: t("Low Glucose Alert"),
        message: t(
          "Your glucose is low! Have 15-20g of fast-acting carbs like fruit juice, glucose tablets, or 3-4 glucose candies. Recheck in 15 minutes."
        ),
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-800",
        iconColor: "#ef4444",
      };
    }

    // Time-based meal tips
    if (hour >= 6 && hour < 10 && mealsCount === 0) {
      return {
        type: "meal" as const,
        icon: Sun,
        title: t("Good Morning!"),
        message: t(
          "Start your day with a balanced breakfast including protein and fiber to maintain steady glucose levels throughout the morning."
        ),
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-800",
        iconColor: "#3b82f6",
      };
    }

    if (hour >= 12 && hour < 14 && mealsCount < 2) {
      return {
        type: "meal" as const,
        icon: Sun,
        title: t("Lunch Time"),
        message: t(
          "It's a good time for lunch. Include vegetables and lean protein. Avoid heavy carbs to prevent afternoon energy dips."
        ),
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        textColor: "text-emerald-800",
        iconColor: "#10b981",
      };
    }

    if (hour >= 18 && hour < 20 && mealsCount < 3) {
      return {
        type: "meal" as const,
        icon: Moon,
        title: t("Dinner Time"),
        message: t(
          "Keep dinner light and balanced. Eating at least 2-3 hours before bed helps maintain stable overnight glucose levels."
        ),
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        textColor: "text-purple-800",
        iconColor: "#8b5cf6",
      };
    }

    // Normal glucose tip
    if (lastGlucose && lastGlucose >= 70 && lastGlucose <= 100) {
      return {
        type: "success" as const,
        icon: Target,
        title: t("Great Control!"),
        message: t(
          "Your glucose is in the normal range. Keep up the good work! Maintain your healthy eating habits and regular activity."
        ),
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-800",
        iconColor: "#22c55e",
      };
    }

    if (!lastGlucose && mealsCount === 0) {
      return {
        type: "starter" as const,
        icon: Plus,
        title: t("Build your first health pattern"),
        message: t(
          "Start by logging a glucose reading and your next meal. Once Gluvia has both, your dashboard and recommendations become much more useful."
        ),
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-100",
        textColor: "text-emerald-800",
        iconColor: "#10b981",
      };
    }

    if (user?.profile?.incomeBracket === "low") {
      return {
        type: "budget" as const,
        icon: Apple,
        title: t("Budget-friendly planning"),
        message: t(
          "Focus on filling, lower-cost staples like beans, vegetables, eggs, and steady-carb portions to keep meals affordable and balanced."
        ),
        bgColor: "bg-amber-50",
        borderColor: "border-amber-100",
        textColor: "text-amber-800",
        iconColor: "#d97706",
      };
    }

    return {
      type: "default" as const,
      icon: Lightbulb,
      title: t("Steady habits win"),
      message: t(
        "Keep meals balanced, log readings consistently, and review your recent foods. The most useful diabetes insight comes from stable habits over time."
      ),
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      textColor: "text-emerald-800",
      iconColor: "#10b981",
    };
  }, [
    hour,
    isOffline,
    lastGlucose,
    mealsCount,
    missingFields.length,
    t,
    unreadCount,
    user?.profile?.incomeBracket,
  ]);

  const tip = useMemo(() => getTip(), [getTip]);
  const TipIcon = tip.icon;

  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay)}
      className="px-6 mb-4"
    >
      <View
        className={`${tip.bgColor} rounded-2xl p-4 border ${tip.borderColor}`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        }}
      >
        <View className="flex-row items-start">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: tip.iconColor + "20" }}
          >
            <Lightbulb size={20} color={tip.iconColor} />
          </View>
          <View className="flex-1">
            <View className="mb-1 flex-row items-center">
              <TipIcon
                size={16}
                color={tip.iconColor}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-base font-semibold"
                style={{ color: tip.iconColor }}
              >
                {tip.title}
              </Text>
            </View>
            <Text className={`text-sm leading-5 ${tip.textColor}`}>
              {tip.message}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function formatLocalDayLabel(dateString: string) {
  const date = new Date(dateString);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const key = date.toDateString();

  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const { t, language } = useTranslation();
  const {
    user,
    getProfile,
    isLoading,
    maintenanceMessage,
    dismissMaintenance,
  } = useAuthStore();
  const {
    getAggregations,
    isFetchingAggregations,
    aggregationsLoadedOnce,
    aggregationsInvalidatedAt,
    mealLogs,
  } = useSyncStore();
  const isOnline = useSyncStore((state) => state.isOnline);
  const { meta, fetchNotifications } = useNotificationStore();
  const glucoseStats = useGlucoseStats();
  const isNetworkOffline = useNetworkOffline();
  const [showGlucoseModal, setShowGlucoseModal] = useState(false);
  const [translatedMaintenanceMessage, setTranslatedMaintenanceMessage] =
    useState<string | null>(null);
  const [todaysMealsFromHistory, setTodaysMealsFromHistory] = useState<
    MealHistoryEntry[]
  >([]);

  const homeFeedFilters = useMemo(
    () => ({
      page: 1,
      limit: 200,
    }),
    []
  );
  const homeFeedSnapshot = useAggregationSnapshot(homeFeedFilters);

  const loadDashboard = useCallback(async (force = false) => {
    await getProfile();
    await fetchNotifications();
    await getAggregations(homeFeedFilters, {
      force: isOnline ? true : force,
      ttlMs: 120000,
    });
  }, [
    fetchNotifications,
    getAggregations,
    getProfile,
    homeFeedFilters,
    isOnline,
  ]);

  const loadTodaysMealsFromHistory = useCallback(async () => {
    if (!user?._id) {
      setTodaysMealsFromHistory([]);
      return;
    }

    try {
      const meals = await getTodaysMeals(user._id);
      setTodaysMealsFromHistory(meals);
    } catch (error) {
      console.error("Failed to load today's meals from local history:", error);
    }
  }, [user?._id]);

  useEffect(() => {
    loadDashboard().catch(() => {});
  }, [loadDashboard]);

  useEffect(() => {
    loadTodaysMealsFromHistory().catch(() => {});
  }, [loadTodaysMealsFromHistory]);

  useFocusEffect(
    useCallback(() => {
      const needsRefresh =
        !homeFeedSnapshot ||
        homeFeedSnapshot.fetchedAt < aggregationsInvalidatedAt;

      if (needsRefresh) {
        loadDashboard().catch(() => {});
      }
      loadTodaysMealsFromHistory().catch(() => {});
    }, [
      aggregationsInvalidatedAt,
      homeFeedSnapshot,
      loadDashboard,
      loadTodaysMealsFromHistory,
    ])
  );

  useEffect(() => {
    let cancelled = false;

    const translateMaintenance = async () => {
      if (!maintenanceMessage || !isOnline || language === "english") {
        setTranslatedMaintenanceMessage(null);
        return;
      }

      const translated = await translateDynamicText(
        maintenanceMessage,
        language
      );

      if (!cancelled) {
        setTranslatedMaintenanceMessage(translated);
      }
    };

    translateMaintenance().catch(() => {
      if (!cancelled) {
        setTranslatedMaintenanceMessage(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, language, maintenanceMessage]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12)
      return { text: t("Good morning"), icon: Sun, color: "#f59e0b" };
    if (hour < 18)
      return { text: t("Good afternoon"), icon: Sun, color: "#f59e0b" };
    return { text: t("Good evening"), icon: Moon, color: "#6366f1" };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const getGlucoseStatus = (value: number) => {
    if (value < 70)
      return {
        label: t("Low"),
        color: "#ef4444",
        bg: "bg-red-50",
        icon: TrendingDown,
      };
    if (value <= 100)
      return {
        label: t("Normal"),
        color: "#10b981",
        bg: "bg-emerald-50",
        icon: Target,
      };
    if (value <= 125)
      return {
        label: t("Elevated"),
        color: "#f59e0b",
        bg: "bg-amber-50",
        icon: TrendingUp,
      };
    return {
      label: t("High"),
      color: "#ef4444",
      bg: "bg-red-50",
      icon: AlertCircle,
    };
  };

  const quickActions = [
    {
      id: "log-meal",
      title: t("Log Meal"),
      subtitle: t("Track what you eat"),
      icon: Utensils,
      color: "#10b981",
      bgColor: "bg-emerald-50",
      route: "/meal-recommendation",
    },
    {
      id: "log-glucose",
      title: t("Log Glucose"),
      subtitle: t("Record your levels"),
      icon: Droplets,
      color: "#f59e0b",
      bgColor: "bg-amber-50",
      action: () => setShowGlucoseModal(true),
    },
    {
      id: "food-search",
      title: t("Food Search"),
      subtitle: t("Find nutrition info"),
      icon: Apple,
      color: "#ef4444",
      bgColor: "bg-red-50",
      route: "/(tabs)/foods",
    },
    {
      id: "ai-chat",
      title: t("AI Chat"),
      subtitle: t("Ask about diabetes"),
      icon: Bot,
      color: "#1447e6",
      bgColor: "bg-blue-50",
      route: "/(tabs)/ai-chat",
    },
  ];

  const todayMeals = useMemo(() => {
    const snapshotMeals = [
      ...(homeFeedSnapshot?.mealLogs || []),
      ...mealLogs,
    ].filter(
      (meal, index, array) =>
        array.findIndex(
          (candidate) =>
            (candidate._id || candidate.clientGeneratedId) ===
            (meal._id || meal.clientGeneratedId)
        ) === index
    );
    const normalizedHistoryMeals = todaysMealsFromHistory.map((meal) => ({
      _id: `history-${meal.id}`,
      userId: user?._id || "",
      mealType: meal.mealType,
      entries: (meal.foodIds || []).map((foodId, index) => ({
        foodId: {
          _id: typeof foodId === "string" ? foodId : `history-food-${index}`,
          localName:
            typeof foodId === "string" ? foodId.replace(/_/g, " ") : "Meal item",
          category: "Food",
        },
        portionName: "Logged food",
        portionSize: "Logged food",
        grams: 0,
        quantity: 1,
        carbs_g: 0,
      })),
      calculatedTotals: {
        calories: meal.totalCalories || 0,
        carbs: meal.totalCarbs || 0,
        protein: meal.totalProtein || 0,
        fibre: 0,
      },
      timestamp: meal.createdAt,
      clientGeneratedId: `history-${meal.id}`,
      notes: meal.notes,
      createdAt: meal.createdAt,
      updatedAt: meal.createdAt,
    }));

    const allMeals = [...snapshotMeals, ...normalizedHistoryMeals].filter(
      (meal, index, array) =>
        array.findIndex(
          (candidate) =>
            (candidate._id || candidate.clientGeneratedId) ===
            (meal._id || meal.clientGeneratedId)
        ) === index
    );

    return allMeals
      .filter((meal) => {
        return formatLocalDayLabel(meal.timestamp) === "Today";
      })
      .sort(
        (left, right) =>
          new Date(right.timestamp || right.createdAt).getTime() -
          new Date(left.timestamp || left.createdAt).getTime()
      );
  }, [homeFeedSnapshot?.mealLogs, mealLogs, todaysMealsFromHistory, user?._id]);

  const totalCaloriesToday =
    todayMeals.reduce(
      (sum, meal) => sum + (meal.calculatedTotals?.calories || 0),
      0
    );
  const totalCarbsToday =
    todayMeals.reduce(
      (sum, meal) => sum + (meal.calculatedTotals?.carbs || 0),
      0
    );
  const latestGlucoseReading = homeFeedSnapshot?.lastGlucoseReading;
  const latestGlucoseStats = homeFeedSnapshot?.glucoseStats || glucoseStats;
  const isInitialDashboardLoad =
    (isLoading || isFetchingAggregations) &&
    !homeFeedSnapshot &&
    !aggregationsLoadedOnce;

  const recentFoods = useMemo(() => {
    const sortedMeals = [...todayMeals].sort(
      (left, right) =>
        new Date(right.timestamp || right.createdAt).getTime() -
        new Date(left.timestamp || left.createdAt).getTime()
    );
    const uniqueFoods = new Map<
      string,
      { key: string; name: string; category: string; carbs: number }
    >();

    for (const meal of sortedMeals) {
      for (const entry of meal.entries || []) {
        const foodId = entry.foodId?._id || entry.foodId;
        const key = String(foodId || entry.portionName || meal._id);

        if (uniqueFoods.has(key)) {
          continue;
        }

        uniqueFoods.set(key, {
          key,
          name: entry.foodId?.localName || entry.portionName || "Meal item",
          category: entry.foodId?.category || "Food",
          carbs: entry.carbs_g || 0,
        });

        if (uniqueFoods.size >= 6) {
          return Array.from(uniqueFoods.values());
        }
      }
    }

    return Array.from(uniqueFoods.values());
  }, [todayMeals]);

  const handleRefresh = async () => {
    await Promise.all([loadDashboard(true), loadTodaysMealsFromHistory()]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isFetchingAggregations}
            onRefresh={handleRefresh}
          />
        }
      >
        {maintenanceMessage && (
          <Animated.View entering={FadeInDown} className="px-6 pt-4">
            <Pressable
              onPress={dismissMaintenance}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <Text className="text-sm font-semibold text-amber-800">
                <T>Maintenance Mode</T>
              </Text>
              <Text className="mt-1 text-sm text-amber-700">
                {translatedMaintenanceMessage || maintenanceMessage}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Header */}
        <Animated.View entering={FadeIn} className="px-6 pt-4 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <GreetingIcon size={16} color={greeting.color} />
                <Text className="text-sm text-gray-500 ml-1.5">
                  {greeting.text}
                </Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {user?.name?.split(" ")[0] || <T>Welcome</T>}
              </Text>
            </View>

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => router.push("/meal-history" as Href)}
                activeOpacity={0.7}
                className="mr-3"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white">
                  <ScrollText size={20} color="#1447e6" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/notifications" as Href)}
                activeOpacity={0.7}
                className="mr-3"
              >
                <View className="w-12 h-12 rounded-full bg-white items-center justify-center border border-gray-200">
                  <Bell size={20} color="#374151" />
                  {(meta?.unreadCount || 0) > 0 && (
                    <View className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 items-center justify-center px-1">
                      <Text className="text-[10px] font-bold text-white">
                        {meta?.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(tabs)/profile" as Href)}
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                  <Image
                    source={require("@/assets/images/logo.png")}
                    className="w-8 h-8"
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Smart Daily Tip - Right After Header */}
        <SmartDailyTip
          user={user}
          isOffline={isNetworkOffline}
          lastGlucose={latestGlucoseReading?.valueMgDl}
          mealsCount={todayMeals.length}
          unreadCount={meta?.unreadCount || 0}
          animationDelay={50}
        />

        {/* Glucose Status Card - Main Focus */}
        <Animated.View entering={FadeInUp.delay(150)} className="px-6 mb-6">
          {isInitialDashboardLoad ? (
            <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <View className="items-center justify-center p-8">
                <AppLoader size="lg" color="#1447e6" />
                <Text className="mt-4 text-sm text-gray-500">
                  <T>Loading your latest reading...</T>
                </Text>
              </View>
            </View>
          ) : latestGlucoseReading ? (
            <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-sm font-medium text-gray-500">
                    <T>Latest Glucose Reading</T>
                  </Text>
                  <View
                    className={`px-2 py-1 rounded-full ${
                      getGlucoseStatus(latestGlucoseReading.valueMgDl).bg
                    }`}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: getGlucoseStatus(latestGlucoseReading.valueMgDl)
                          .color,
                      }}
                    >
                      {getGlucoseStatus(latestGlucoseReading.valueMgDl).label}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-end mb-2">
                  <Text className="text-5xl font-bold text-gray-900">
                    {latestGlucoseReading.valueMgDl}
                  </Text>
                  <Text className="text-lg text-gray-400 ml-2 mb-2">mg/dL</Text>
                </View>

                <Text className="text-xs text-gray-400 mb-4">
                  {new Date(latestGlucoseReading.timestamp).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {latestGlucoseReading.type && (
                    <Text> • {t(latestGlucoseReading.type.replace(/_/g, " "))}</Text>
                  )}
                </Text>

                {/* Mini Stats Row */}
                <View className="flex-row bg-gray-50 rounded-2xl p-3">
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-gray-800">
                      {latestGlucoseStats?.average || "--"}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      <T>Recent Avg</T>
                    </Text>
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-emerald-600">
                      {latestGlucoseStats?.inRangePercent !== undefined
                        ? `${latestGlucoseStats.inRangePercent}%`
                        : "--"}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      <T>In Range</T>
                    </Text>
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-gray-800">
                      {latestGlucoseStats?.count || "--"}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      <T>Recent Readings</T>
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => setShowGlucoseModal(true)}
                className="flex-row items-center justify-center py-4 bg-primary/5 border-t border-gray-100"
              >
                <Plus size={18} color="#1447e6" />
                <Text className="text-primary font-semibold ml-2">
                  <T>Log New Reading</T>
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowGlucoseModal(true)}
              className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6"
              style={{
                shadowColor: "#1447e6",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-gray-900 text-sm mb-1">
                    <T>Start Tracking</T>
                  </Text>
                  <Text className="text-gray-900 text-xl font-bold mb-2">
                    <T>Log Your First Glucose Reading</T>
                  </Text>
                  <Text className="text-gray-700 text-sm">
                    <T>
                      Get personalized insights and meal recommendations based
                      on your glucose levels
                    </T>
                  </Text>
                </View>
                <View className="w-14 h-14 rounded-2xl bg-gray-200/20 items-center justify-center ml-4">
                  <Activity size={28} color="gray" />
                </View>
              </View>
              <View className="mt-4 flex-row items-center">
                <View className="bg-white/20 rounded-full px-4 py-2 flex-row items-center">
                  <Plus size={16} color="gray" />
                  <Text className="text-gray-900 font-semibold ml-1">
                    <T>Add Reading</T>
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        </Animated.View>

        {/* Today's Summary */}
        <TodayStatsCard
          totalCalories={totalCaloriesToday}
          totalCarbs={totalCarbsToday}
          mealsCount={todayMeals.length}
          isLoading={isInitialDashboardLoad}
          showLogMealButton={true}
          animationDelay={200}
        />

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(300)} className="px-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            <T>Quick Actions</T>
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {quickActions.map((action, index) => (
              <Animated.View
                key={action.id}
                entering={FadeInDown.delay(350 + index * 50)}
                className="w-[48%] mb-3"
              >
                <TouchableOpacity
                  className={`${action.bgColor} rounded-2xl p-4`}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (action.action) {
                      action.action();
                    } else if (action.route) {
                      router.push(action.route as Href);
                    }
                  }}
                >
                  <View
                    className="w-11 h-11 rounded-xl items-center justify-center mb-3"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon size={22} color={action.color} />
                  </View>
                  <Text className="text-base font-semibold text-gray-900">
                    {action.title}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {action.subtitle}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Recent Meals - Using Reusable Component */}
        <RecentMealsCard
          meals={todayMeals}
          maxItems={3}
          showSeeAll={true}
          animationDelay={450}
        />

        {recentFoods.length > 0 && (
          <Animated.View entering={FadeInUp.delay(475)} className="px-6 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              <T>Recent Foods</T>
            </Text>
            <View className="bg-white rounded-2xl p-4 border border-gray-100">
              {recentFoods.map((item) => (
                <View
                  key={item.key}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-gray-900">
                      {item.name}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      <T>{item.category}</T>
                    </Text>
                  </View>
                  <Text className="text-xs font-medium text-gray-600">
                    {Math.round(item.carbs * 10) / 10}g <T>carbs</T>
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Health Status Card */}
        {user?.profile?.allergies && user.profile.allergies.length > 0 && (
          <Animated.View entering={FadeInUp.delay(500)} className="px-6 mb-6">
            <View className="bg-red-50 rounded-2xl p-5 border border-red-100">
              <Text className="text-sm font-medium text-red-600 mb-2">
                <T>Known Allergies</T>
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {user.profile.allergies.map((allergy, index) => (
                  <View
                    key={index}
                    className="px-3 py-1.5 bg-white rounded-full border border-red-200"
                  >
                    <Text className="text-sm text-red-700">{allergy}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Glucose Modal */}
      <LogGlucoseModal
        visible={showGlucoseModal}
        onClose={() => setShowGlucoseModal(false)}
        onSuccess={() => {
          loadDashboard(true).catch(() => {});
        }}
      />
    </SafeAreaView>
  );
}
