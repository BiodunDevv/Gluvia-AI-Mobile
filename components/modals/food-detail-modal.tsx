/**
 * Food Detail Modal
 *
 * Professional modal for displaying detailed food information
 * including nutrition facts, GI interpretation, and portion sizes.
 */

import { Food } from "@/store/food-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface FoodDetailModalProps {
  food: Food | null;
  visible: boolean;
  onClose: () => void;
}

// GI badge component
function GIBadge({
  gi,
  size = "small",
}: {
  gi: number | null;
  size?: "small" | "large";
}) {
  const isLarge = size === "large";

  if (gi === null) {
    return (
      <View
        className={`bg-gray-100 ${isLarge ? "px-3 py-1.5" : "px-2 py-0.5"} rounded-full`}
      >
        <Text
          className={`${isLarge ? "text-xs" : "text-[10px]"} text-gray-500 font-medium`}
        >
          GI: N/A
        </Text>
      </View>
    );
  }

  let bgColor = "bg-green-100";
  let textColor = "text-green-700";
  let label = "Low";

  if (gi >= 70) {
    bgColor = "bg-red-100";
    textColor = "text-red-700";
    label = "High";
  } else if (gi >= 55) {
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-700";
    label = "Medium";
  }

  return (
    <View
      className={`${bgColor} ${isLarge ? "px-3 py-1.5" : "px-2 py-0.5"} rounded-full`}
    >
      <Text
        className={`${isLarge ? "text-xs" : "text-[10px]"} ${textColor} font-medium`}
      >
        GI: {gi} ({label})
      </Text>
    </View>
  );
}

// Category badge component
function CategoryBadge({
  category,
  size = "small",
}: {
  category?: string;
  size?: "small" | "large";
}) {
  if (!category) return null;
  const isLarge = size === "large";

  const categoryColors: Record<string, { bg: string; text: string }> = {
    Grains: { bg: "bg-amber-100", text: "text-amber-700" },
    Proteins: { bg: "bg-red-100", text: "text-red-700" },
    Vegetables: { bg: "bg-green-100", text: "text-green-700" },
    Fruits: { bg: "bg-purple-100", text: "text-purple-700" },
    Soups: { bg: "bg-orange-100", text: "text-orange-700" },
    Beverages: { bg: "bg-blue-100", text: "text-blue-700" },
    Snacks: { bg: "bg-pink-100", text: "text-pink-700" },
    Swallow: { bg: "bg-yellow-100", text: "text-yellow-700" },
    default: { bg: "bg-gray-100", text: "text-gray-700" },
  };

  const colors = categoryColors[category] || categoryColors.default;

  return (
    <View
      className={`${colors.bg} ${isLarge ? "px-3 py-1.5" : "px-2 py-0.5"} rounded-full`}
    >
      <Text
        className={`${isLarge ? "text-xs" : "text-[10px]"} ${colors.text} font-medium`}
      >
        {category}
      </Text>
    </View>
  );
}

// Food image component with fallback
function FoodImage({
  imageUrl,
  category,
}: {
  imageUrl?: string;
  category?: string;
}) {
  const [hasError, setHasError] = useState(false);

  // Placeholder icon based on category
  const getPlaceholderIcon = () => {
    const iconMap: Record<string, string> = {
      Grains: "leaf",
      Proteins: "fish",
      Vegetables: "nutrition",
      Fruits: "nutrition",
      Soups: "water",
      Beverages: "cafe",
      Snacks: "pizza",
      Swallow: "restaurant",
    };
    return iconMap[category || ""] || "restaurant-outline";
  };

  if (!imageUrl || hasError) {
    return (
      <View className="w-full h-48 rounded-2xl bg-gray-100 items-center justify-center mb-4">
        <Ionicons
          name={getPlaceholderIcon() as any}
          size={56}
          color="#9ca3af"
        />
      </View>
    );
  }

  return (
    <View className="w-full h-48 rounded-2xl mb-4 overflow-hidden">
      <Image
        source={{ uri: imageUrl }}
        style={{ width: "100%", height: 192 }}
        contentFit="cover"
        transition={200}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

export function FoodDetailModal({
  food,
  visible,
  onClose,
}: FoodDetailModalProps) {
  if (!food) return null;

  const gi = food.nutrients.gi;
  const giLabel =
    gi === null
      ? "Glycemic index not available"
      : gi < 55
        ? "Low GI - Good for blood sugar control ✅"
        : gi < 70
          ? "Medium GI - Eat in moderation ⚠️"
          : "High GI - Limit portions and pair with protein ⚠️";

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-100 px-5 md:px-8 py-3">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#374151" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">
            Food Details
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 md:px-8 pt-4 pb-8"
        >
          {/* Food image */}
          <FoodImage imageUrl={food.imageUrl} category={food.category} />

          {/* Food name */}
          <Text className="text-2xl font-bold text-gray-900 mb-1">
            {food.localName}
          </Text>
          {food.canonicalName && food.canonicalName !== food.localName && (
            <Text className="text-sm text-gray-500 mb-3">
              Also known as: {food.canonicalName}
            </Text>
          )}

          {/* Badges */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            <GIBadge gi={food.nutrients.gi} size="large" />
            <CategoryBadge category={food.category} size="large" />
            {food.affordability && (
              <View className="bg-blue-100 px-3 py-1.5 rounded-full">
                <Text className="text-xs text-blue-700 font-medium capitalize">
                  {food.affordability} cost
                </Text>
              </View>
            )}
          </View>

          {/* Nutrition info */}
          <Text className="text-lg font-bold text-gray-900 mb-3">
            Nutrition per 100g
          </Text>
          <View className="bg-gray-50 rounded-2xl p-4 mb-5">
            <View className="flex-row flex-wrap">
              <View className="w-1/2 mb-4">
                <Text className="text-xs text-gray-500 mb-1">Calories</Text>
                <Text className="text-xl font-bold text-gray-900">
                  {food.nutrients.calories}
                  <Text className="text-sm font-normal text-gray-400">
                    {" "}
                    kcal
                  </Text>
                </Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-xs text-gray-500 mb-1">
                  Carbohydrates
                </Text>
                <Text className="text-xl font-bold text-gray-900">
                  {food.nutrients.carbs_g}
                  <Text className="text-sm font-normal text-gray-400"> g</Text>
                </Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-xs text-gray-500 mb-1">Protein</Text>
                <Text className="text-xl font-bold text-gray-900">
                  {food.nutrients.protein_g}
                  <Text className="text-sm font-normal text-gray-400"> g</Text>
                </Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-xs text-gray-500 mb-1">Fat</Text>
                <Text className="text-xl font-bold text-gray-900">
                  {food.nutrients.fat_g}
                  <Text className="text-sm font-normal text-gray-400"> g</Text>
                </Text>
              </View>
              <View className="w-1/2">
                <Text className="text-xs text-gray-500 mb-1">Fiber</Text>
                <Text className="text-xl font-bold text-gray-900">
                  {food.nutrients.fibre_g}
                  <Text className="text-sm font-normal text-gray-400"> g</Text>
                </Text>
              </View>
              <View className="w-1/2">
                <Text className="text-xs text-gray-500 mb-1">
                  Glycemic Index
                </Text>
                <Text className="text-xl font-bold text-gray-900">
                  {food.nutrients.gi ?? "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* GI Interpretation */}
          <View
            className={`rounded-2xl p-4 mb-5 ${
              gi === null
                ? "bg-gray-50"
                : gi < 55
                  ? "bg-green-50"
                  : gi < 70
                    ? "bg-yellow-50"
                    : "bg-red-50"
            }`}
          >
            <View className="flex-row items-start">
              <Ionicons
                name={
                  gi === null
                    ? "help-circle"
                    : gi < 55
                      ? "checkmark-circle"
                      : "warning"
                }
                size={22}
                color={
                  gi === null
                    ? "#6b7280"
                    : gi < 55
                      ? "#16a34a"
                      : gi < 70
                        ? "#ca8a04"
                        : "#dc2626"
                }
                style={{ marginTop: 1 }}
              />
              <Text
                className={`ml-2.5 text-sm font-medium flex-1 leading-5 ${
                  gi === null
                    ? "text-gray-700"
                    : gi < 55
                      ? "text-green-700"
                      : gi < 70
                        ? "text-yellow-700"
                        : "text-red-700"
                }`}
              >
                {giLabel}
              </Text>
            </View>
          </View>

          {/* Portion sizes */}
          {food.portionSizes && food.portionSizes.length > 0 && (
            <>
              <Text className="text-lg font-bold text-gray-900 mb-3">
                Portion Sizes
              </Text>
              <View className="bg-gray-50 rounded-2xl p-4 mb-5">
                {food.portionSizes.map((portion, index) => (
                  <View
                    key={index}
                    className={`flex-row justify-between py-3 ${
                      index < food.portionSizes.length - 1
                        ? "border-b border-gray-200"
                        : ""
                    }`}
                  >
                    <Text className="text-sm text-gray-700 capitalize font-medium">
                      {portion.name}
                    </Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {portion.grams}g
                      {portion.carbs_g !== undefined && (
                        <Text className="font-normal text-gray-500">
                          {" "}
                          ({portion.carbs_g}g carbs)
                        </Text>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Tags */}
          {food.tags && food.tags.length > 0 && (
            <>
              <Text className="text-lg font-bold text-gray-900 mb-3">Tags</Text>
              <View className="flex-row flex-wrap gap-2">
                {food.tags.map((tag, index) => (
                  <View
                    key={index}
                    className="bg-primary/10 px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-xs text-primary font-medium">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
