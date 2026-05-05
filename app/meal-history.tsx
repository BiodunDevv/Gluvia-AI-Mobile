import { AppLoader } from "@/components/ui";
import { api } from "@/lib/api";
import { getPendingMealLogs } from "@/lib/offline-db";
import { T } from "@/hooks/use-translation";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import type {
  AggregatedGlucoseLog,
  AggregatedMealLog,
} from "@/store/sync-store";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Coffee,
  Cookie,
  Droplets,
  Moon,
  RefreshCw,
  ScrollText,
  Sun,
  TrendingDown,
  TrendingUp,
  Utensils,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

type LogsTab = "meals" | "glucose";
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type MealGroup = {
  key: string;
  label: string;
  meals: AggregatedMealLog[];
  totalCalories: number;
  totalCarbs: number;
};

type GlucoseGroup = {
  key: string;
  label: string;
  readings: AggregatedGlucoseLog[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MEAL_ICONS: Record<string, { icon: any; color: string; bgColor: string }> = {
  breakfast: { icon: Coffee, color: "#f59e0b", bgColor: "#fef3c7" },
  lunch: { icon: Sun, color: "#10b981", bgColor: "#d1fae5" },
  dinner: { icon: Moon, color: "#6366f1", bgColor: "#e0e7ff" },
  snack: { icon: Cookie, color: "#ec4899", bgColor: "#fce7f3" },
};

function formatDayLabel(dateString: string) {
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

function getGlucoseStatus(value: number) {
  if (value < 70)
    return { label: "Low", textColor: "#dc2626", bgColor: "#fef2f2", Icon: TrendingDown };
  if (value <= 140)
    return { label: "In Range", textColor: "#059669", bgColor: "#ecfdf5", Icon: Activity };
  return { label: "High", textColor: "#d97706", bgColor: "#fffbeb", Icon: TrendingUp };
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function UserLogsScreen() {
  const user = useAuthStore((s) => s.user);
  const isOnline = useSyncStore((s) => s.isOnline);

  // Local state — data fetched directly from endpoint
  const [mealLogs, setMealLogs] = useState<AggregatedMealLog[]>([]);
  const [glucoseLogs, setGlucoseLogs] = useState<AggregatedGlucoseLog[]>([]);
  const [activeTab, setActiveTab] = useState<LogsTab>("meals");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Prevent concurrent fetches
  const fetchingRef = useRef(false);

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      if (!silent) setIsLoading(true);
      setFetchError(null);

      if (!isOnline) {
        // Offline — fall back to what the sync-store has in memory from last fetch
        const snap = useSyncStore.getState();
        const pendingMeals = user?._id
          ? await getPendingMealLogs(user._id).catch(() => [])
          : [];
        const pendingAggregated = pendingMeals.map((meal) => ({
          _id: meal.clientGeneratedId,
          userId: meal.userId,
          mealType: meal.mealType as AggregatedMealLog["mealType"],
          entries: meal.foods.map((food) => ({
            foodId: {
              _id: food.foodId,
              localName: food.localName || food.canonicalName || "Food item",
              category: food.category || "Food",
            },
            portionName: food.portionSize,
            portionSize: food.portionSize,
            grams: 0,
            quantity: food.quantity,
            carbs_g: 0,
          })),
          calculatedTotals: {
            calories: 0,
            carbs: 0,
            protein: 0,
            fibre: 0,
          },
          timestamp: meal.timestamp,
          clientGeneratedId: meal.clientGeneratedId,
          notes: meal.notes,
          createdAt: meal.createdAt,
          updatedAt: meal.createdAt,
        }));
        setMealLogs([...pendingAggregated, ...snap.mealLogs]);
        setGlucoseLogs(snap.glucoseLogs);
        setIsLoading(false);
        fetchingRef.current = false;
        return;
      }

      try {
        const response = await api.get("/sync/aggregations", {
          params: { page: 1, limit: 200 },
        });
        const resultData = response.data?.data || response.data;
        const meals: AggregatedMealLog[] = resultData?.mealLogs || [];
        const glucose: AggregatedGlucoseLog[] = resultData?.glucoseLogs || [];

        const pendingMeals = user?._id
          ? await getPendingMealLogs(user._id).catch(() => [])
          : [];
        const pendingAggregated = pendingMeals.map((meal) => ({
          _id: meal.clientGeneratedId,
          userId: meal.userId,
          mealType: meal.mealType as AggregatedMealLog["mealType"],
          entries: meal.foods.map((food) => ({
            foodId: {
              _id: food.foodId,
              localName: food.localName || food.canonicalName || "Food item",
              category: food.category || "Food",
            },
            portionName: food.portionSize,
            portionSize: food.portionSize,
            grams: 0,
            quantity: food.quantity,
            carbs_g: 0,
          })),
          calculatedTotals: {
            calories: 0,
            carbs: 0,
            protein: 0,
            fibre: 0,
          },
          timestamp: meal.timestamp,
          clientGeneratedId: meal.clientGeneratedId,
          notes: meal.notes,
          createdAt: meal.createdAt,
          updatedAt: meal.createdAt,
        }));

        setMealLogs(
          [...pendingAggregated, ...meals].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
        setGlucoseLogs(
          glucose.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );

        // Keep sync-store in sync so other screens (dashboard) benefit
        useSyncStore.setState({
          mealLogs: meals,
          glucoseLogs: glucose,
          aggregationsLoadedOnce: true,
        });
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to load logs";
        setFetchError(msg);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    },
    [isOnline, user?._id]
  );

  // Fetch fresh from endpoint every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await fetchLogs(true).catch(() => {});
    setRefreshing(false);
  };

  // ─── Grouping ─────────────────────────────────────────────────────────────

  const groupedMeals = useMemo(() => {
    const groups = new Map<string, MealGroup>();
    for (const meal of mealLogs) {
      const key = new Date(meal.timestamp).toDateString();
      const existing = groups.get(key) || {
        key,
        label: formatDayLabel(meal.timestamp),
        meals: [],
        totalCalories: 0,
        totalCarbs: 0,
      };
      existing.meals.push(meal);
      existing.totalCalories += meal.calculatedTotals?.calories || 0;
      existing.totalCarbs += meal.calculatedTotals?.carbs || 0;
      groups.set(key, existing);
    }
    return [...groups.values()].sort(
      (a, b) => new Date(b.key).getTime() - new Date(a.key).getTime()
    );
  }, [mealLogs]);

  const groupedGlucose = useMemo(() => {
    const groups = new Map<string, GlucoseGroup>();
    for (const reading of glucoseLogs) {
      const key = new Date(reading.timestamp).toDateString();
      const existing = groups.get(key) || {
        key,
        label: formatDayLabel(reading.timestamp),
        readings: [],
      };
      existing.readings.push(reading);
      groups.set(key, existing);
    }
    return [...groups.values()].sort(
      (a, b) => new Date(b.key).getTime() - new Date(a.key).getTime()
    );
  }, [glucoseLogs]);

  const totals = useMemo(() => {
    const mealCalories = mealLogs.reduce(
      (s, m) => s + (m.calculatedTotals?.calories || 0),
      0
    );
    const mealCarbs = mealLogs.reduce(
      (s, m) => s + (m.calculatedTotals?.carbs || 0),
      0
    );
    return {
      meals: mealLogs.length,
      mealCalories,
      mealCarbs,
      glucose: glucoseLogs.length,
    };
  }, [glucoseLogs, mealLogs]);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderMealGroup = ({ item }: { item: MealGroup }) => {
    return (
      <View className="mb-5">
        <View className="flex-row items-center justify-between px-4 py-2">
          <View className="flex-row items-center">
            <Calendar size={15} color="#6b7280" />
            <Text className="ml-2 text-sm font-semibold text-gray-800">
              {item.label}
            </Text>
          </View>
          <Text className="text-xs text-gray-400">
            {Math.round(item.totalCalories)} cal · {Math.round(item.totalCarbs)}g carbs
          </Text>
        </View>

        {item.meals.map((meal, index) => {
          const cfg = MEAL_ICONS[meal.mealType as MealType] || MEAL_ICONS.snack;
          const Icon = cfg.icon;

          return (
            <Animated.View
              key={meal._id || meal.clientGeneratedId || `${item.key}-${index}`}
              entering={FadeInDown.delay(index * 40).springify()}
              className="mx-4 mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <View className="flex-row items-start">
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: cfg.bgColor }}
                >
                  <Icon size={22} color={cfg.color} />
                </View>

                <View className="ml-3 flex-1">
                  {/* Header row */}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold capitalize text-gray-900">
                      {meal.mealType}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {new Date(meal.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  {/* Food names summary */}
                  {(meal.entries || []).length > 0 && (
                    <Text
                      className="mt-0.5 text-sm text-gray-500"
                      numberOfLines={2}
                    >
                      {meal.entries
                        .map((e) => e.foodId?.localName)
                        .filter(Boolean)
                        .join(", ") ||
                        `${meal.entries.length} item${meal.entries.length !== 1 ? "s" : ""}`}
                    </Text>
                  )}

                  {/* Macro pills */}
                  <View className="mt-2 flex-row flex-wrap gap-x-3">
                    <Text className="text-xs font-semibold text-primary">
                      {Math.round(meal.calculatedTotals?.calories || 0)} kcal
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {Math.round(meal.calculatedTotals?.carbs || 0)}g carbs
                    </Text>
                    {(meal.calculatedTotals?.protein || 0) > 0 && (
                      <Text className="text-xs text-gray-500">
                        {Math.round(meal.calculatedTotals.protein)}g protein
                      </Text>
                    )}
                  </View>

                  {/* Per-item breakdown */}
                  {(meal.entries || []).length > 0 && (
                    <View className="mt-3 gap-1.5">
                      {meal.entries.map((entry, ei) => {
                        const name = entry.foodId?.localName;
                        if (!name) return null;
                        return (
                          <View
                            key={`${meal._id}-entry-${ei}`}
                            className="flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                          >
                            <Text
                              className="flex-1 pr-2 text-sm font-medium text-gray-800"
                              numberOfLines={1}
                            >
                              {name}
                            </Text>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-xs text-gray-400">
                                {entry.portionName ||
                                  entry.portionSize ||
                                  "1 serving"}
                              </Text>
                              <Text className="text-xs font-semibold text-gray-600">
                                ×{entry.quantity || 1}
                              </Text>
                              {(entry.carbs_g || 0) > 0 && (
                                <Text className="text-xs font-semibold text-primary">
                                  {Math.round(entry.carbs_g)}g
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderGlucoseGroup = ({ item }: { item: GlucoseGroup }) => (
    <View className="mb-5">
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center">
          <Calendar size={15} color="#6b7280" />
          <Text className="ml-2 text-sm font-semibold text-gray-800">
            {item.label}
          </Text>
        </View>
        <Text className="text-xs text-gray-400">
          {item.readings.length} reading{item.readings.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {item.readings.map((reading, index) => {
        const status = getGlucoseStatus(reading.valueMgDl);
        const StatusIcon = status.Icon;

        return (
          <Animated.View
            key={reading._id || reading.clientGeneratedId || `${item.key}-${index}`}
            entering={FadeInDown.delay(index * 40).springify()}
            className="mx-4 mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <View className="flex-row items-start">
              <View
                className="h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: status.bgColor }}
              >
                <Droplets size={20} color={status.textColor} />
              </View>

              <View className="ml-3 flex-1">
                <View className="flex-row items-start justify-between">
                  <View>
                    <Text className="text-xl font-bold text-gray-900">
                      {reading.valueMgDl}{" "}
                      <Text className="text-sm font-medium text-gray-400">
                        mg/dL
                      </Text>
                    </Text>
                    <Text className="mt-0.5 text-sm capitalize text-gray-500">
                      {(reading.type || "random").replace(/_/g, " ")}
                    </Text>
                  </View>

                  <View
                    className="flex-row items-center rounded-full px-2.5 py-1"
                    style={{ backgroundColor: status.bgColor }}
                  >
                    <StatusIcon size={12} color={status.textColor} />
                    <Text
                      className="ml-1 text-xs font-bold"
                      style={{ color: status.textColor }}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <Text className="mt-2 text-xs text-gray-400">
                  {new Date(reading.timestamp).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>

                {reading.symptoms && reading.symptoms.length > 0 && (
                  <Text className="mt-2 text-xs text-gray-500">
                    Symptoms: {reading.symptoms.join(", ")}
                  </Text>
                )}

                {reading.notes ? (
                  <View className="mt-3 rounded-xl bg-gray-50 px-3 py-2">
                    <Text className="text-xs leading-5 text-gray-600">
                      {reading.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );

  // ─── Empty / error / offline states ──────────────────────────────────────

  const activeMealData = activeTab === "meals" ? groupedMeals : [];
  const activeGlucoseData = activeTab === "glucose" ? groupedGlucose : [];

  const offlineBanner = !isOnline ? (
    <View className="mx-4 mb-4 flex-row items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <WifiOff size={16} color="#b45309" />
      <Text className="flex-1 text-xs font-medium leading-5 text-amber-800">
        <T>You are offline. Showing the last cached data. Pull to refresh when back online.</T>
      </Text>
    </View>
  ) : null;

  const errorBanner = fetchError ? (
    <View className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <Text className="text-xs font-medium text-red-700">{fetchError}</Text>
      <TouchableOpacity
        onPress={() => fetchLogs()}
        className="mt-2 flex-row items-center gap-1"
      >
        <RefreshCw size={13} color="#dc2626" />
        <Text className="text-xs font-semibold text-red-600">
          <T>Try again</T>
        </Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const emptyState = (
    <View className="items-center px-6 py-20">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        {activeTab === "meals" ? (
          <Utensils size={34} color="#9ca3af" />
        ) : (
          <Droplets size={34} color="#9ca3af" />
        )}
      </View>
      <Text className="text-lg font-semibold text-gray-800">
        <T>{activeTab === "meals" ? "No meals logged yet" : "No glucose readings yet"}</T>
      </Text>
      <Text className="mt-2 text-center text-sm leading-6 text-gray-500">
        <T>
          {activeTab === "meals"
            ? "Once you log meals, they will appear here with calories, carbs, and food details."
            : "Once you log a reading, you will see the value, type, time, and any notes here."}
        </T>
      </Text>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.dismiss())}
          activeOpacity={0.7}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary/10"
        >
          <ArrowLeft size={20} color="#1447e6" />
        </TouchableOpacity>

        <View className="flex-1 px-4">
          <View className="flex-row items-center justify-center">
            <ScrollText size={18} color="#1447e6" />
            <Text className="ml-2 text-center text-lg font-bold text-primary">
              <T>Your Logs</T>
            </Text>
          </View>
          <Text className="text-center text-xs text-gray-400">
            <T>Meals and glucose history</T>
          </Text>
        </View>

        <View className="min-w-10 items-end">
          {!isOnline && (
            <View className="rounded-full bg-amber-100 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-amber-700">
                <T>Offline</T>
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="px-4 pb-3">
        <View className="rounded-2xl border border-gray-200 bg-white p-1">
          <View className="flex-row">
            {(["meals", "glucose"] as LogsTab[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setActiveTab(tab);
                  }}
                  className={`flex-1 rounded-xl px-4 py-3 ${
                    active ? "bg-primary" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-bold ${
                      active ? "text-white" : "text-gray-500"
                    }`}
                  >
                    <T>{tab === "meals" ? "Meals" : "Glucose"}</T>
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Summary card */}
      <View className="px-4 pb-4">
        <View className="rounded-2xl border border-gray-100 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                <T>{activeTab === "meals" ? "Total meals" : "Total readings"}</T>
              </Text>
              <Text className="mt-1 text-2xl font-bold text-primary">
                {activeTab === "meals" ? totals.meals : totals.glucose}
              </Text>
            </View>

            {activeTab === "meals" ? (
              <View className="items-end">
                <Text className="text-sm font-semibold text-gray-700">
                  {Math.round(totals.mealCalories)} cal
                </Text>
                <Text className="mt-0.5 text-sm text-gray-400">
                  {Math.round(totals.mealCarbs)}g carbs
                </Text>
              </View>
            ) : (
              <View className="items-end">
                <Text className="text-sm font-semibold text-gray-700">
                  {glucoseLogs[0]?.valueMgDl ?? "--"} mg/dL
                </Text>
                <Text className="mt-0.5 text-sm text-gray-400">
                  {glucoseLogs[0]
                    ? new Date(glucoseLogs[0].timestamp).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : "No readings"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {isLoading && mealLogs.length === 0 && glucoseLogs.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <AppLoader size="lg" color="#1447e6" />
          <Text className="mt-4 text-sm text-gray-400">
            <T>Loading your logs...</T>
          </Text>
        </View>
      ) : (
        <>
          {activeTab === "meals" ? (
            <FlatList
              data={activeMealData}
              keyExtractor={(item) => item.key}
              renderItem={renderMealGroup}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListHeaderComponent={
                <>
                  {offlineBanner}
                  {errorBanner}
                </>
              }
              ListEmptyComponent={
                <ScrollView
                  contentContainerStyle={{ flexGrow: 1 }}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor="#1447e6"
                    />
                  }
                >
                  {offlineBanner}
                  {errorBanner}
                  {emptyState}
                </ScrollView>
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#1447e6"
                />
              }
            />
          ) : (
            <FlatList
              data={activeGlucoseData}
              keyExtractor={(item) => item.key}
              renderItem={renderGlucoseGroup}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListHeaderComponent={
                <>
                  {offlineBanner}
                  {errorBanner}
                </>
              }
              ListEmptyComponent={
                <ScrollView
                  contentContainerStyle={{ flexGrow: 1 }}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor="#1447e6"
                    />
                  }
                >
                  {offlineBanner}
                  {errorBanner}
                  {emptyState}
                </ScrollView>
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#1447e6"
                />
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
