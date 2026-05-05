/**
 * Meal Summary Modal
 *
 * Modal for reviewing selected foods before logging a meal.
 * Shows nutrition summary, carb status, and selected food list.
 * Slides in from bottom with smooth animations.
 */

import {
  getMealTypeInfo,
  MealType,
  RecommendedFood,
} from "@/lib/meal-recommendation";
import { AppLoader } from "@/components/ui";
import { Image } from "expo-image";
import {
  AlertCircle,
  Check,
  Dumbbell,
  Flame,
  Utensils,
  Wheat,
  X,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export interface MealSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  selectedFoods: RecommendedFood[];
  mealType: MealType;
  mealConfig: {
    icon: any;
    color: string;
    bgColor?: string;
  };
  onConfirm: () => void;
  isLoading: boolean;
}

export function MealSummaryModal({
  visible,
  onClose,
  selectedFoods,
  mealType,
  mealConfig,
  onConfirm,
  isLoading,
}: MealSummaryModalProps) {
  const info = getMealTypeInfo(mealType);
  const Icon = mealConfig.icon;

  const totals = useMemo(() => {
    return selectedFoods.reduce(
      (acc, food) => ({
        calories:
          acc.calories +
          Math.round(
            (food.nutrients.calories * food.suggestedPortion.grams) / 100
          ),
        carbs: acc.carbs + food.suggestedPortion.carbs_g,
        protein:
          acc.protein +
          Math.round(
            (food.nutrients.protein_g * food.suggestedPortion.grams) / 100
          ),
        fat:
          acc.fat +
          Math.round(
            (food.nutrients.fat_g * food.suggestedPortion.grams) / 100
          ),
        fiber:
          acc.fiber +
          Math.round(
            (food.nutrients.fibre_g * food.suggestedPortion.grams) / 100
          ),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 }
    );
  }, [selectedFoods]);

  const carbStatus = useMemo(() => {
    if (totals.carbs <= info.carbRange.max * 0.7)
      return { color: "#22c55e", label: "Excellent", icon: Check };
    if (totals.carbs <= info.carbRange.max)
      return { color: "#84cc16", label: "Good", icon: Check };
    if (totals.carbs <= info.carbRange.max * 1.2)
      return { color: "#f59e0b", label: "Slightly High", icon: AlertCircle };
    return { color: "#ef4444", label: "Too High", icon: AlertCircle };
  }, [totals.carbs, info.carbRange.max]);
  const CarbStatusIcon = carbStatus.icon;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable className="flex-1" onPress={onClose} />

        {/* Modal Content */}
        <Animated.View
         
          className="bg-white rounded-t-3xl max-h-[85%]"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          }}
        >
          <SafeAreaView edges={["bottom"]}>
            {/* Handle Bar */}
            <View className="items-center py-3">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>

            {/* Header */}
            <View className="flex-row items-center border-b border-gray-100 pb-4 px-5 md:px-8">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{ backgroundColor: mealConfig.color + "20" }}
              >
                <Icon size={24} color={mealConfig.color} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xl font-bold text-gray-800">
                  {info.title} Summary
                </Text>
                <Text className="text-gray-500 text-sm">
                  {selectedFoods.length} item
                  {selectedFoods.length !== 1 ? "s" : ""} selected
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-5 md:px-8 pt-4 pb-2"
              className="max-h-96"
            >
              {/* Status Badge */}
              <View className="items-center mb-4">
                <View
                  className="px-4 py-2 rounded-full flex-row items-center"
                  style={{ backgroundColor: carbStatus.color + "15" }}
                >
                  <CarbStatusIcon
                    size={18}
                    color={carbStatus.color}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className="font-semibold"
                    style={{ color: carbStatus.color }}
                  >
                    {carbStatus.label} Carb Balance
                  </Text>
                </View>
              </View>

              {/* Nutrition Summary Cards */}
              <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between mb-4">
                  <View className="items-center flex-1">
                    <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center mb-2">
                      <Flame size={22} color="#f97316" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-800">
                      {totals.calories}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Calories
                    </Text>
                  </View>
                  <View className="items-center flex-1">
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: carbStatus.color + "20" }}
                    >
                      <Wheat size={22} color={carbStatus.color} />
                    </View>
                    <Text
                      className="text-2xl font-bold"
                      style={{ color: carbStatus.color }}
                    >
                      {Math.round(totals.carbs * 10) / 10}g
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Carbs</Text>
                  </View>
                  <View className="items-center flex-1">
                    <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mb-2">
                      <Dumbbell size={22} color="#2563eb" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-800">
                      {totals.protein}g
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Protein
                    </Text>
                  </View>
                </View>

                {/* Carb Progress Bar */}
                <View className="pt-4 border-t border-gray-200">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-gray-600 font-medium">
                      Carb Target
                    </Text>
                    <Text className="text-sm font-semibold text-gray-700">
                      {Math.round(totals.carbs)}g / {info.carbRange.max}g
                    </Text>
                  </View>
                  <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: carbStatus.color,
                        width: `${Math.min(
                          (totals.carbs / info.carbRange.max) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Additional Nutrients */}
              <View className="flex-row mb-4">
                <View className="flex-1 bg-green-50 rounded-xl p-3 mr-2">
                  <Text className="text-green-800 font-medium text-sm">
                    🥬 Fiber
                  </Text>
                  <Text className="text-green-700 font-bold text-lg mt-1">
                    {totals.fiber}g
                  </Text>
                </View>
                <View className="flex-1 bg-yellow-50 rounded-xl p-3 ml-2">
                  <Text className="text-yellow-800 font-medium text-sm">
                    🧈 Fat
                  </Text>
                  <Text className="text-yellow-700 font-bold text-lg mt-1">
                    {totals.fat}g
                  </Text>
                </View>
              </View>

              {/* Selected Foods List */}
              <View className="mb-2">
                <Text className="font-semibold text-gray-700 mb-3">
                  Selected Foods
                </Text>
                {selectedFoods.map((food, index) => (
                  <View
                    key={food._id}
                    className={`flex-row items-center py-3 ${
                      index < selectedFoods.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center overflow-hidden">
                      {food.imageUrl ? (
                        <Image
                          source={{ uri: food.imageUrl }}
                          className="w-12 h-12"
                          contentFit="cover"
                        />
                      ) : (
                        <Utensils size={18} color="#9ca3af" />
                      )}
                    </View>
                    <View className="flex-1 ml-3">
                      <Text
                        className="text-gray-800 font-medium text-base"
                        numberOfLines={1}
                      >
                        {food.localName}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {food.suggestedPortion.name} (
                        {food.suggestedPortion.grams}g) •{" "}
                        {food.suggestedPortion.carbs_g}g carbs
                      </Text>
                    </View>
                    <View className="bg-primary/10 px-2.5 py-1.5 rounded-lg">
                      <Text className="text-primary text-xs font-semibold">
                        {Math.round(
                          (food.nutrients.calories *
                            food.suggestedPortion.grams) /
                            100
                        )}{" "}
                        cal
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Actions */}
            <View className="flex-row pt-4 pb-2 border-t border-gray-100 px-5 md:px-8">
              <Pressable
                onPress={onClose}
                className="flex-1 mr-2 py-4 rounded-xl bg-gray-100 items-center active:bg-gray-200"
              >
                <Text className="font-semibold text-gray-600">Edit Meal</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={isLoading}
                className={`ml-2 py-4 rounded-xl items-center flex-row justify-center flex-[2] ${
                  isLoading
                    ? "bg-primary/70"
                    : "bg-primary active:bg-primary/90"
                }`}
              >
                {isLoading ? (
                  <AppLoader color="#ffffff" size="sm" />
                ) : (
                  <>
                    <Check size={18} color="white" />
                    <Text className="font-semibold text-white ml-2">
                      Log Meal
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
