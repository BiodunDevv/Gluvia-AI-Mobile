/**
 * Recent Meals Card Component
 *
 * A reusable component to display recent meal logs with
 * meal type icons, timestamps, and navigation to meal history.
 */

import { Href, router } from "expo-router";
import { T, useTranslation } from "@/hooks/use-translation";
import { Coffee, Cookie, Moon, Sun } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

// Meal type configuration
const MEAL_ICONS = {
  breakfast: { icon: Coffee, color: "#f59e0b", bgColor: "#fef3c7" },
  lunch: { icon: Sun, color: "#10b981", bgColor: "#d1fae5" },
  dinner: { icon: Moon, color: "#6366f1", bgColor: "#e0e7ff" },
  snack: { icon: Cookie, color: "#ec4899", bgColor: "#fce7f3" },
};

export interface MealLogItem {
  _id?: string;
  clientGeneratedId?: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  timestamp: string;
  entries?: any[];
  calculatedTotals?: {
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  };
}

export interface RecentMealsCardProps {
  meals: MealLogItem[];
  maxItems?: number;
  showSeeAll?: boolean;
  animationDelay?: number;
  title?: string;
}

function MealItem({ meal, isLast }: { meal: MealLogItem; isLast: boolean }) {
  const mealConfig = MEAL_ICONS[meal.mealType] || MEAL_ICONS.snack;
  const Icon = mealConfig.icon;
  const { t } = useTranslation();

  return (
    <View
      className={`p-4 flex-row items-center ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: mealConfig.bgColor }}
      >
        <Icon size={18} color={mealConfig.color} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-gray-900 capitalize">
          {t(meal.mealType)}
        </Text>
        <Text className="text-xs text-gray-500">
          {meal.entries?.length || 0} <T>items</T> •{" "}
          {Math.round(meal.calculatedTotals?.calories || 0)} <T>cal</T>
        </Text>
      </View>
      <Text className="text-xs text-gray-400">
        {new Date(meal.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
}

export function RecentMealsCard({
  meals,
  maxItems = 3,
  showSeeAll = true,
  animationDelay = 400,
  title = "Recent Meals",
}: RecentMealsCardProps) {
  if (meals.length === 0) return null;

  const displayedMeals = meals.slice(0, maxItems);

  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay)}
      className="px-6 mb-6"
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        {showSeeAll && (
          <TouchableOpacity
            onPress={() => router.push("/meal-history" as Href)}
            activeOpacity={0.7}
          >
            <Text className="text-sm text-primary font-medium">
              <T>See All</T>
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {displayedMeals.map((meal, index) => (
          <MealItem
            key={meal.clientGeneratedId || meal._id || index}
            meal={meal}
            isLast={index === displayedMeals.length - 1}
          />
        ))}
      </View>
    </Animated.View>
  );
}
