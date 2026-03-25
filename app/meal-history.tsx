/**
 * Meal History Screen
 *
 * Displays all logged meals with filtering, grouping by date,
 * and detailed nutrition information.
 */

import { useSyncStore } from "@/store/sync-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Coffee,
  Cookie,
  Filter,
  Flame,
  Moon,
  Sun,
  Zap,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.dismiss();
  }
};

// Meal type configuration
const MEAL_ICONS = {
  breakfast: { icon: Coffee, color: "#f59e0b", bgColor: "#fef3c7" },
  lunch: { icon: Sun, color: "#10b981", bgColor: "#d1fae5" },
  dinner: { icon: Moon, color: "#6366f1", bgColor: "#e0e7ff" },
  snack: { icon: Cookie, color: "#ec4899", bgColor: "#fce7f3" },
};

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type FilterType = "all" | MealType;

interface GroupedMeals {
  date: string;
  dateLabel: string;
  meals: any[];
  totalCalories: number;
  totalCarbs: number;
}

export default function MealHistoryScreen() {
  const { mealLogs, getAggregations, isFetchingAggregations } = useSyncStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch aggregations on focus
  useFocusEffect(
    useCallback(() => {
      getAggregations({ limit: 100 }).catch(() => {});
    }, [getAggregations])
  );

  // Group meals by date and apply filter
  const groupedMeals = useMemo(() => {
    const filtered =
      filter === "all"
        ? mealLogs
        : mealLogs.filter((meal) => meal.mealType === filter);

    const groups: Record<string, GroupedMeals> = {};

    filtered.forEach((meal) => {
      const date = new Date(meal.timestamp);
      const dateKey = date.toDateString();
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      let dateLabel = date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      if (dateKey === today) {
        dateLabel = "Today";
      } else if (dateKey === yesterday) {
        dateLabel = "Yesterday";
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          dateLabel,
          meals: [],
          totalCalories: 0,
          totalCarbs: 0,
        };
      }

      groups[dateKey].meals.push(meal);
      groups[dateKey].totalCalories += meal.calculatedTotals?.calories || 0;
      groups[dateKey].totalCarbs += meal.calculatedTotals?.carbs || 0;
    });

    // Sort by date (newest first)
    return Object.values(groups).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [mealLogs, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await getAggregations({ limit: 100 });
    setRefreshing(false);
  };

  const handleFilterSelect = (newFilter: FilterType) => {
    Haptics.selectionAsync();
    setFilter(newFilter);
    setShowFilters(false);
  };

  const totalStats = useMemo(() => {
    return mealLogs.reduce(
      (acc, meal) => ({
        meals: acc.meals + 1,
        calories: acc.calories + (meal.calculatedTotals?.calories || 0),
        carbs: acc.carbs + (meal.calculatedTotals?.carbs || 0),
      }),
      { meals: 0, calories: 0, carbs: 0 }
    );
  }, [mealLogs]);

  const renderMealItem = ({
    item: meal,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    const mealConfig =
      MEAL_ICONS[meal.mealType as MealType] || MEAL_ICONS.snack;
    const Icon = mealConfig.icon;

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          className="bg-white mx-4 mb-3 p-4 rounded-2xl border border-gray-100"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
          }}
        >
          <View className="flex-row items-center">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: mealConfig.bgColor }}
            >
              <Icon size={22} color={mealConfig.color} />
            </View>

            <View className="flex-1 ml-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-gray-900 capitalize text-base">
                  {meal.mealType}
                </Text>
                <Text className="text-xs text-gray-400">
                  {new Date(meal.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              <View className="flex-row items-center mt-2">
                <View className="flex-row items-center mr-4">
                  <Flame size={14} color="#ef4444" />
                  <Text className="text-sm text-gray-600 ml-1">
                    {Math.round(meal.calculatedTotals?.calories || 0)} cal
                  </Text>
                </View>
                <View className="flex-row items-center mr-4">
                  <Zap size={14} color="#f59e0b" />
                  <Text className="text-sm text-gray-600 ml-1">
                    {Math.round(meal.calculatedTotals?.carbs || 0)}g carbs
                  </Text>
                </View>
              </View>

              {/* Food items */}
              {meal.entries && meal.entries.length > 0 && (
                <View className="mt-2 flex-row flex-wrap">
                  {meal.entries.slice(0, 3).map((entry: any, idx: number) => (
                    <View
                      key={idx}
                      className="bg-gray-100 px-2 py-1 rounded-lg mr-1 mb-1"
                    >
                      <Text className="text-xs text-gray-600">
                        {entry.foodId?.localName || "Unknown"}
                      </Text>
                    </View>
                  ))}
                  {meal.entries.length > 3 && (
                    <View className="bg-gray-100 px-2 py-1 rounded-lg">
                      <Text className="text-xs text-gray-500">
                        +{meal.entries.length - 3} more
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderDateGroup = ({ item: group }: { item: GroupedMeals }) => (
    <View className="mb-4">
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center">
          <Calendar size={16} color="#6b7280" />
          <Text className="text-sm font-semibold text-gray-700 ml-2">
            {group.dateLabel}
          </Text>
        </View>
        <View className="flex-row items-center bg-gray-100 px-3 py-1 rounded-full">
          <Text className="text-xs text-gray-600">
            {Math.round(group.totalCalories)} cal •{" "}
            {Math.round(group.totalCarbs)}g carbs
          </Text>
        </View>
      </View>
      {group.meals.map((meal, index) => (
        <View key={meal._id || meal.clientGeneratedId || `meal-${index}`}>
          {renderMealItem({ item: meal, index })}
        </View>
      ))}
    </View>
  );

  const filterOptions: { label: string; value: FilterType; icon: any }[] = [
    { label: "All Meals", value: "all", icon: null },
    { label: "Breakfast", value: "breakfast", icon: Coffee },
    { label: "Lunch", value: "lunch", icon: Sun },
    { label: "Dinner", value: "dinner", icon: Moon },
    { label: "Snack", value: "snack", icon: Cookie },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <View className="flex-1 ml-3">
            <Text className="text-xl font-bold text-gray-900">
              Meal History
            </Text>
            <Text className="text-xs text-gray-500">
              {totalStats.meals} meals • {Math.round(totalStats.calories)} total
              cal
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFilters(!showFilters);
            }}
            className={`px-3 py-2 rounded-xl flex-row items-center ${
              filter !== "all" ? "bg-primary" : "bg-gray-100"
            }`}
          >
            <Filter size={16} color={filter !== "all" ? "white" : "#6b7280"} />
            <ChevronDown
              size={14}
              color={filter !== "all" ? "white" : "#6b7280"}
              style={{ marginLeft: 4 }}
            />
          </Pressable>
        </View>
      </View>

      {/* Filter Dropdown */}
      {showFilters && (
        <Animated.View
          entering={FadeIn}
          className="absolute top-24 right-4 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }}
        >
          {filterOptions.map((option) => {
            const isSelected = filter === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleFilterSelect(option.value)}
                className={`flex-row items-center px-4 py-3 ${
                  isSelected ? "bg-primary/10" : ""
                }`}
              >
                {option.icon ? (
                  <option.icon
                    size={18}
                    color={isSelected ? "#1447e6" : "#6b7280"}
                  />
                ) : (
                  <Ionicons
                    name="apps"
                    size={18}
                    color={isSelected ? "#1447e6" : "#6b7280"}
                  />
                )}
                <Text
                  className={`ml-3 ${
                    isSelected ? "text-primary font-semibold" : "text-gray-700"
                  }`}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color="#1447e6"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Content */}
      <FlatList
        data={groupedMeals}
        keyExtractor={(item) => item.date}
        renderItem={renderDateGroup}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isFetchingAggregations}
            onRefresh={handleRefresh}
            tintColor="#1447e6"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="restaurant-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-lg font-semibold text-gray-700 mb-2">
              No Meals Logged
            </Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              Start logging your meals to track your nutrition and get
              personalized recommendations.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/meal-recommendation")}
              className="mt-6 bg-primary px-6 py-3 rounded-full"
            >
              <Text className="text-white font-semibold">
                Log Your First Meal
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}
