import { LogGlucoseModal } from "@/components/modals";
import { RecentMealsCard, TodayStatsCard } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import {
  useGlucoseStats,
  useLastGlucoseValue,
  useMealStats,
  useSyncStore,
} from "@/store/sync-store";
import { Href, router } from "expo-router";
import {
  Activity,
  AlertCircle,
  Apple,
  Droplets,
  Lightbulb,
  Moon,
  Plus,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
  Zap,
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
  lastGlucose,
  mealsCount,
  animationDelay = 100,
}: {
  lastGlucose?: number;
  mealsCount: number;
  animationDelay?: number;
}) {
  const hour = new Date().getHours();

  // Generate smart tip based on context
  const getTip = useCallback(() => {
    // High glucose tips
    if (lastGlucose && lastGlucose > 180) {
      return {
        type: "warning" as const,
        emoji: "⚠️",
        title: "High Glucose Alert",
        message:
          "Your glucose is quite high. Consider drinking water, taking a 15-minute walk, or checking your medication. If it stays elevated, consult your healthcare provider.",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-800",
        iconColor: "#f59e0b",
      };
    }

    if (lastGlucose && lastGlucose > 140) {
      return {
        type: "elevated" as const,
        emoji: "📈",
        title: "Glucose Elevated",
        message:
          "Your glucose is elevated. A short 10-15 minute walk can help bring it down naturally. Choose low GI foods for your next meal.",
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
        emoji: "🔴",
        title: "Low Glucose Alert",
        message:
          "Your glucose is low! Have 15-20g of fast-acting carbs like fruit juice, glucose tablets, or 3-4 glucose candies. Recheck in 15 minutes.",
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
        emoji: "🌅",
        title: "Good Morning!",
        message:
          "Start your day with a balanced breakfast including protein and fiber to maintain steady glucose levels throughout the morning.",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-800",
        iconColor: "#3b82f6",
      };
    }

    if (hour >= 12 && hour < 14 && mealsCount < 2) {
      return {
        type: "meal" as const,
        emoji: "☀️",
        title: "Lunch Time",
        message:
          "It's a good time for lunch. Include vegetables and lean protein. Avoid heavy carbs to prevent afternoon energy dips.",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        textColor: "text-emerald-800",
        iconColor: "#10b981",
      };
    }

    if (hour >= 18 && hour < 20 && mealsCount < 3) {
      return {
        type: "meal" as const,
        emoji: "🌙",
        title: "Dinner Time",
        message:
          "Keep dinner light and balanced. Eating at least 2-3 hours before bed helps maintain stable overnight glucose levels.",
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
        emoji: "✅",
        title: "Great Control!",
        message:
          "Your glucose is in the normal range. Keep up the good work! Maintain your healthy eating habits and regular activity.",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-800",
        iconColor: "#22c55e",
      };
    }

    // Default tips
    const defaultTips = [
      {
        emoji: "💧",
        title: "Stay Hydrated",
        message:
          "Drinking plenty of water helps your kidneys flush out excess glucose. Aim for 8 glasses throughout the day.",
      },
      {
        emoji: "🚶",
        title: "Move More",
        message:
          "Regular physical activity helps your muscles use glucose more efficiently. Even a short walk after meals can help.",
      },
      {
        emoji: "🥗",
        title: "Fiber is Your Friend",
        message:
          "High-fiber foods slow glucose absorption. Include vegetables, legumes, and whole grains in your meals.",
      },
      {
        emoji: "⏰",
        title: "Timing Matters",
        message:
          "Eating meals at consistent times each day helps maintain stable blood sugar levels. Try to space meals 4-5 hours apart.",
      },
    ];

    const randomTip =
      defaultTips[Math.floor(Math.random() * defaultTips.length)];
    return {
      type: "default" as const,
      ...randomTip,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      textColor: "text-emerald-800",
      iconColor: "#10b981",
    };
  }, [lastGlucose, mealsCount, hour]);

  const tip = useMemo(() => getTip(), [getTip]);

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
            <View className="flex-row items-center mb-1">
              <Text
                className="text-base font-semibold mr-2"
                style={{ color: tip.iconColor }}
              >
                {tip.emoji} {tip.title}
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

export default function HomeScreen() {
  const { user, getProfile, isLoading } = useAuthStore();
  const {
    getAggregations,
    isFetchingAggregations,
    lastGlucoseReading,
    mealLogs,
  } = useSyncStore();
  const lastGlucose = useLastGlucoseValue();
  const glucoseStats = useGlucoseStats();
  const mealStats = useMealStats();
  const [showGlucoseModal, setShowGlucoseModal] = useState(false);

  useEffect(() => {
    getProfile();
    // Fetch aggregations for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    getAggregations({
      from: today.toISOString(),
      to: new Date().toISOString(),
    });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: Sun, color: "#f59e0b" };
    if (hour < 18)
      return { text: "Good afternoon", icon: Sun, color: "#f59e0b" };
    return { text: "Good evening", icon: Moon, color: "#6366f1" };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const getGlucoseStatus = (value: number) => {
    if (value < 70)
      return {
        label: "Low",
        color: "#ef4444",
        bg: "bg-red-50",
        icon: TrendingDown,
      };
    if (value <= 100)
      return {
        label: "Normal",
        color: "#10b981",
        bg: "bg-emerald-50",
        icon: Target,
      };
    if (value <= 125)
      return {
        label: "Elevated",
        color: "#f59e0b",
        bg: "bg-amber-50",
        icon: TrendingUp,
      };
    return {
      label: "High",
      color: "#ef4444",
      bg: "bg-red-50",
      icon: AlertCircle,
    };
  };

  const quickActions = [
    {
      id: "log-meal",
      title: "Log Meal",
      subtitle: "Track what you eat",
      icon: Utensils,
      color: "#10b981",
      bgColor: "bg-emerald-50",
      route: "/meal-recommendation",
    },
    {
      id: "log-glucose",
      title: "Log Glucose",
      subtitle: "Record your levels",
      icon: Droplets,
      color: "#f59e0b",
      bgColor: "bg-amber-50",
      action: () => setShowGlucoseModal(true),
    },
    {
      id: "food-search",
      title: "Food Search",
      subtitle: "Find nutrition info",
      icon: Apple,
      color: "#ef4444",
      bgColor: "bg-red-50",
      route: "/(tabs)/foods",
    },
    {
      id: "chat",
      title: "Ask AI",
      subtitle: "Get health advice",
      icon: Zap,
      color: "#1447e6",
      bgColor: "bg-blue-50",
      route: "/(tabs)/chat",
    },
  ];

  const todayMeals = mealLogs.filter((log) => {
    const logDate = new Date(log.timestamp);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  // Use calculatedTotals from API response
  const totalCaloriesToday = todayMeals.reduce(
    (sum, meal) => sum + (meal.calculatedTotals?.calories || 0),
    0
  );
  const totalCarbsToday = todayMeals.reduce(
    (sum, meal) => sum + (meal.calculatedTotals?.carbs || 0),
    0
  );

  const handleRefresh = async () => {
    await getProfile();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await getAggregations({
      from: today.toISOString(),
      to: new Date().toISOString(),
    });
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
                {user?.name?.split(" ")[0] || "Welcome"}
              </Text>
            </View>

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
        </Animated.View>

        {/* Smart Daily Tip - Right After Header */}
        <SmartDailyTip
          lastGlucose={lastGlucoseReading?.valueMgDl}
          mealsCount={todayMeals.length}
          animationDelay={50}
        />

        {/* Glucose Status Card - Main Focus */}
        <Animated.View entering={FadeInUp.delay(150)} className="px-6 mb-6">
          {isFetchingAggregations && !lastGlucoseReading ? (
            /* Skeleton Loading State */
            <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="h-4 w-36 bg-gray-200 rounded-full animate-pulse" />
                  <View className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                </View>

                <View className="flex-row items-end mb-2">
                  <View className="h-12 w-24 bg-gray-200 rounded-lg animate-pulse" />
                  <View className="h-5 w-12 bg-gray-200 rounded ml-2 mb-2 animate-pulse" />
                </View>

                <View className="h-3 w-44 bg-gray-200 rounded-full mb-4 animate-pulse" />

                {/* Mini Stats Row Skeleton */}
                <View className="flex-row bg-gray-50 rounded-2xl p-3">
                  <View className="flex-1 items-center">
                    <View className="h-6 w-10 bg-gray-200 rounded mb-1 animate-pulse" />
                    <View className="h-3 w-12 bg-gray-200 rounded-full animate-pulse" />
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="flex-1 items-center">
                    <View className="h-6 w-10 bg-gray-200 rounded mb-1 animate-pulse" />
                    <View className="h-3 w-12 bg-gray-200 rounded-full animate-pulse" />
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="flex-1 items-center">
                    <View className="h-6 w-10 bg-gray-200 rounded mb-1 animate-pulse" />
                    <View className="h-3 w-12 bg-gray-200 rounded-full animate-pulse" />
                  </View>
                </View>
              </View>

              <View className="flex-row items-center justify-center py-4 bg-gray-50 border-t border-gray-100">
                <View className="h-5 w-32 bg-gray-200 rounded-full animate-pulse" />
              </View>
            </View>
          ) : lastGlucoseReading ? (
            <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-sm font-medium text-gray-500">
                    Latest Glucose Reading
                  </Text>
                  <View
                    className={`px-2 py-1 rounded-full ${
                      getGlucoseStatus(lastGlucoseReading.valueMgDl).bg
                    }`}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: getGlucoseStatus(lastGlucoseReading.valueMgDl)
                          .color,
                      }}
                    >
                      {getGlucoseStatus(lastGlucoseReading.valueMgDl).label}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-end mb-2">
                  <Text className="text-5xl font-bold text-gray-900">
                    {lastGlucoseReading.valueMgDl}
                  </Text>
                  <Text className="text-lg text-gray-400 ml-2 mb-2">mg/dL</Text>
                </View>

                <Text className="text-xs text-gray-400 mb-4">
                  {new Date(lastGlucoseReading.timestamp).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {lastGlucoseReading.type && (
                    <Text> • {lastGlucoseReading.type.replace(/_/g, " ")}</Text>
                  )}
                </Text>

                {/* Mini Stats Row */}
                <View className="flex-row bg-gray-50 rounded-2xl p-3">
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-gray-800">
                      {glucoseStats?.average || "--"}
                    </Text>
                    <Text className="text-xs text-gray-500">Avg (7d)</Text>
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-emerald-600">
                      {glucoseStats?.inRangePercent
                        ? `${glucoseStats.inRangePercent}%`
                        : "--"}
                    </Text>
                    <Text className="text-xs text-gray-500">In Range</Text>
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-gray-800">
                      {glucoseStats?.count || "--"}
                    </Text>
                    <Text className="text-xs text-gray-500">Readings</Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => setShowGlucoseModal(true)}
                className="flex-row items-center justify-center py-4 bg-primary/5 border-t border-gray-100"
              >
                <Plus size={18} color="#1447e6" />
                <Text className="text-primary font-semibold ml-2">
                  Log New Reading
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
                    Start Tracking
                  </Text>
                  <Text className="text-gray-900 text-xl font-bold mb-2">
                    Log Your First Glucose Reading
                  </Text>
                  <Text className="text-gray-700 text-sm">
                    Get personalized insights and meal recommendations based on
                    your glucose levels
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
                    Add Reading
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
          isLoading={isFetchingAggregations && todayMeals.length === 0}
          showLogMealButton={true}
          animationDelay={200}
        />

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(300)} className="px-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Quick Actions
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

        {/* Health Status Card */}
        {user?.profile?.allergies && user.profile.allergies.length > 0 && (
          <Animated.View entering={FadeInUp.delay(500)} className="px-6 mb-6">
            <View className="bg-red-50 rounded-2xl p-5 border border-red-100">
              <Text className="text-sm font-medium text-red-600 mb-2">
                ⚠️ Known Allergies
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
          // Refresh data after logging glucose
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          getAggregations({
            from: today.toISOString(),
            to: new Date().toISOString(),
          });
        }}
      />
    </SafeAreaView>
  );
}
