/**
 * Today's Stats Card Component
 *
 * A reusable component that displays today's nutrition summary
 * with calories, carbs, and meals count. Includes skeleton loading state.
 */

import { Href, router } from "expo-router";
import { Apple, Flame, Plus, Utensils } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

export interface TodayStatsCardProps {
  totalCalories: number;
  totalCarbs: number;
  mealsCount: number;
  isLoading?: boolean;
  showLogMealButton?: boolean;
  animationDelay?: number;
}

// Skeleton Loading Component
function StatSkeleton() {
  return (
    <View className="flex-1 items-center py-2">
      <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-2">
        <View className="w-6 h-6 bg-gray-200 rounded-full" />
      </View>
      <View className="h-8 w-12 bg-gray-200 rounded-lg mb-1" />
      <View className="h-3 w-14 bg-gray-100 rounded-full" />
    </View>
  );
}

export function TodayStatsCard({
  totalCalories,
  totalCarbs,
  mealsCount,
  isLoading = false,
  showLogMealButton = true,
  animationDelay = 200,
}: TodayStatsCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay)}
      className="px-6 mb-6"
    >
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        Today's Nutrition
      </Text>
      <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        {isLoading ? (
          // Skeleton Loading State
          <Animated.View entering={FadeIn} className="flex-row">
            <StatSkeleton />
            <View className="w-px bg-gray-100" />
            <StatSkeleton />
            <View className="w-px bg-gray-100" />
            <StatSkeleton />
          </Animated.View>
        ) : (
          // Actual Data
          <View className="flex-row">
            <View className="flex-1 items-center py-2">
              <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mb-2">
                <Flame size={24} color="#f97316" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {totalCalories || "--"}
              </Text>
              <Text className="text-xs text-gray-500">Calories</Text>
            </View>
            <View className="w-px bg-gray-100" />
            <View className="flex-1 items-center py-2">
              <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center mb-2">
                <Apple size={24} color="#a855f7" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {totalCarbs ? `${Math.round(totalCarbs)}g` : "--"}
              </Text>
              <Text className="text-xs text-gray-500">Carbs</Text>
            </View>
            <View className="w-px bg-gray-100" />
            <View className="flex-1 items-center py-2">
              <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2">
                <Utensils size={24} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {mealsCount || "--"}
              </Text>
              <Text className="text-xs text-gray-500">Meals</Text>
            </View>
          </View>
        )}

        {showLogMealButton && mealsCount === 0 && !isLoading && (
          <Pressable
            onPress={() => router.push("/meal-recommendation" as Href)}
            className="mt-4 flex-row items-center justify-center py-3 bg-emerald-50 rounded-xl"
          >
            <Plus size={16} color="#10b981" />
            <Text className="text-emerald-600 font-semibold ml-2">
              Log Your First Meal
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
