import { Food, useFoodStore } from "@/store/food-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// GI badge component
const GIBadge = ({
  gi,
  size = "small",
}: {
  gi: number | null;
  size?: "small" | "large";
}) => {
  const isLarge = size === "large";

  if (gi === null) {
    return (
      <View
        className={`bg-gray-100 ${isLarge ? "px-3 py-1" : "px-2 py-0.5"} rounded-full`}
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
      className={`${bgColor} ${isLarge ? "px-3 py-1" : "px-2 py-0.5"} rounded-full`}
    >
      <Text
        className={`${isLarge ? "text-xs" : "text-[10px]"} ${textColor} font-medium`}
      >
        GI: {gi} ({label})
      </Text>
    </View>
  );
};

// Category badge component
const CategoryBadge = ({
  category,
  size = "small",
}: {
  category?: string;
  size?: "small" | "large";
}) => {
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
      className={`${colors.bg} ${isLarge ? "px-3 py-1" : "px-2 py-0.5"} rounded-full`}
    >
      <Text
        className={`${isLarge ? "text-xs" : "text-[10px]"} ${colors.text} font-medium`}
      >
        {category}
      </Text>
    </View>
  );
};

// Food image component with fallback
const FoodImage = ({
  imageUrl,
  size = "small",
  category,
}: {
  imageUrl?: string;
  size?: "small" | "large";
  category?: string;
}) => {
  const [hasError, setHasError] = useState(false);
  const isLarge = size === "large";

  const containerClass = isLarge
    ? "w-full h-48 rounded-xl mb-4"
    : "w-16 h-16 rounded-lg";

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
      <View
        className={`${containerClass} bg-gray-100 items-center justify-center`}
      >
        <Ionicons
          name={getPlaceholderIcon() as any}
          size={isLarge ? 48 : 24}
          color="#9ca3af"
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      className={containerClass}
      contentFit="cover"
      transition={200}
      onError={() => setHasError(true)}
    />
  );
};

// Food card component
const FoodCard = ({
  food,
  onPress,
}: {
  food: Food;
  onPress: (food: Food) => void;
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(food);
      }}
      activeOpacity={0.7}
      className="bg-white mx-4 mb-3 rounded-xl p-3 shadow-sm border border-gray-100"
    >
      <View className="flex-row">
        {/* Food image */}
        <FoodImage
          imageUrl={food.imageUrl}
          category={food.category}
          size="small"
        />

        <View className="flex-1 ml-3">
          {/* Food name */}
          <Text
            className="text-base font-semibold text-gray-900"
            numberOfLines={1}
          >
            {food.localName}
          </Text>
          {food.canonicalName && food.canonicalName !== food.localName && (
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {food.canonicalName}
            </Text>
          )}

          {/* Badges */}
          <View className="flex-row flex-wrap gap-1 mt-1.5 mb-2">
            <GIBadge gi={food.nutrients.gi} />
            <CategoryBadge category={food.category} />
          </View>

          {/* Quick nutrition */}
          <View className="flex-row">
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold text-gray-700">
                {food.nutrients.calories}
              </Text>{" "}
              cal
            </Text>
            <Text className="text-xs text-gray-300 mx-1.5">•</Text>
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold text-gray-700">
                {food.nutrients.carbs_g}g
              </Text>{" "}
              carbs
            </Text>
            <Text className="text-xs text-gray-300 mx-1.5">•</Text>
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold text-gray-700">
                {food.nutrients.protein_g}g
              </Text>{" "}
              protein
            </Text>
          </View>
        </View>

        <View className="justify-center ml-2">
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Food detail modal
const FoodDetailModal = ({
  food,
  visible,
  onClose,
}: {
  food: Food | null;
  visible: boolean;
  onClose: () => void;
}) => {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="p-2 -ml-2"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Food Details
          </Text>
          <View className="w-8" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 py-4">
            {/* Food image */}
            <FoodImage
              imageUrl={food.imageUrl}
              category={food.category}
              size="large"
            />

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
            <View className="flex-row flex-wrap gap-2 mb-5">
              <GIBadge gi={food.nutrients.gi} size="large" />
              <CategoryBadge category={food.category} size="large" />
              {food.affordability && (
                <View className="bg-blue-100 px-3 py-1 rounded-full">
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
                  <Text className="text-xs text-gray-500 mb-0.5">Calories</Text>
                  <Text className="text-xl font-bold text-gray-900">
                    {food.nutrients.calories}
                    <Text className="text-sm font-normal text-gray-400">
                      {" "}
                      kcal
                    </Text>
                  </Text>
                </View>
                <View className="w-1/2 mb-4">
                  <Text className="text-xs text-gray-500 mb-0.5">
                    Carbohydrates
                  </Text>
                  <Text className="text-xl font-bold text-gray-900">
                    {food.nutrients.carbs_g}
                    <Text className="text-sm font-normal text-gray-400">
                      {" "}
                      g
                    </Text>
                  </Text>
                </View>
                <View className="w-1/2 mb-4">
                  <Text className="text-xs text-gray-500 mb-0.5">Protein</Text>
                  <Text className="text-xl font-bold text-gray-900">
                    {food.nutrients.protein_g}
                    <Text className="text-sm font-normal text-gray-400">
                      {" "}
                      g
                    </Text>
                  </Text>
                </View>
                <View className="w-1/2 mb-4">
                  <Text className="text-xs text-gray-500 mb-0.5">Fat</Text>
                  <Text className="text-xl font-bold text-gray-900">
                    {food.nutrients.fat_g}
                    <Text className="text-sm font-normal text-gray-400">
                      {" "}
                      g
                    </Text>
                  </Text>
                </View>
                <View className="w-1/2">
                  <Text className="text-xs text-gray-500 mb-0.5">Fiber</Text>
                  <Text className="text-xl font-bold text-gray-900">
                    {food.nutrients.fibre_g}
                    <Text className="text-sm font-normal text-gray-400">
                      {" "}
                      g
                    </Text>
                  </Text>
                </View>
                <View className="w-1/2">
                  <Text className="text-xs text-gray-500 mb-0.5">
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
                  size={20}
                  color={
                    gi === null
                      ? "#6b7280"
                      : gi < 55
                        ? "#16a34a"
                        : gi < 70
                          ? "#ca8a04"
                          : "#dc2626"
                  }
                  style={{ marginTop: 2 }}
                />
                <Text
                  className={`ml-2 text-sm font-medium flex-1 ${
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
                      className={`flex-row justify-between py-2.5 ${
                        index < food.portionSizes.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      }`}
                    >
                      <Text className="text-sm text-gray-700 capitalize">
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
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  Tags
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
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
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Filter options
const CATEGORIES = [
  "All",
  "Grains",
  "Proteins",
  "Vegetables",
  "Fruits",
  "Soups",
  "Beverages",
  "Snacks",
  "Swallow",
];

const GI_FILTERS = [
  { label: "All GI", value: undefined },
  { label: "Low GI (<55)", value: 55 },
  { label: "Medium GI (<70)", value: 70 },
];

export default function FoodsScreen() {
  const { foods, isLoading, isOffline, fetchFoods, pagination } =
    useFoodStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGI, setSelectedGI] = useState<number | undefined>(undefined);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Initial load
  useEffect(() => {
    loadFoods(1, true);
  }, []);

  // Reload when filters change
  useEffect(() => {
    setCurrentPage(1);
    loadFoods(1, true);
  }, [selectedCategory, selectedGI, appliedSearch]);

  const loadFoods = useCallback(
    async (page: number = 1, reset: boolean = false) => {
      if (reset) {
        setCurrentPage(1);
      }

      await fetchFoods({
        page,
        limit: 20,
        search: appliedSearch || undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        maxGI: selectedGI,
      });
    },
    [appliedSearch, selectedCategory, selectedGI, fetchFoods]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentPage(1);
    await loadFoods(1, true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [loadFoods]);

  const handleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppliedSearch(searchQuery);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setAppliedSearch("");
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (
      !pagination ||
      currentPage >= pagination.totalPages ||
      isLoadingMore ||
      isLoading
    ) {
      return;
    }

    setIsLoadingMore(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    // Pass true to append new foods to existing list
    await fetchFoods(
      {
        page: nextPage,
        limit: 20,
        search: appliedSearch || undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        maxGI: selectedGI,
      },
      true
    );

    setIsLoadingMore(false);
  }, [
    pagination,
    currentPage,
    isLoadingMore,
    isLoading,
    appliedSearch,
    selectedCategory,
    selectedGI,
    fetchFoods,
  ]);

  const handleFoodPress = useCallback((food: Food) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFood(food);
    setDetailModalVisible(true);
  }, []);

  const handleCategorySelect = useCallback((category: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(category);
  }, []);

  const handleGISelect = useCallback((value: number | undefined) => {
    Haptics.selectionAsync();
    setSelectedGI(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchQuery("");
    setAppliedSearch("");
    setSelectedCategory("All");
    setSelectedGI(undefined);
  }, []);

  const hasActiveFilters =
    selectedCategory !== "All" || selectedGI !== undefined || appliedSearch;
  const activeFilterCount =
    (selectedCategory !== "All" ? 1 : 0) +
    (selectedGI !== undefined ? 1 : 0) +
    (appliedSearch ? 1 : 0);

  const renderHeader = () => (
    <View className="px-4 pb-4">
      {/* Search bar with button */}
      <View className="flex-row items-center mb-3">
        <View className="flex-1 flex-row items-center bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-gray-900 text-base"
            placeholder="Search foods..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} className="p-1">
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSearch}
          className="ml-2 bg-primary px-4 py-3 rounded-xl shadow-sm"
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Active search indicator */}
      {appliedSearch && (
        <View className="flex-row items-center bg-primary/10 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={14} color="#1447e6" />
          <Text
            className="flex-1 ml-2 text-sm text-primary font-medium"
            numberOfLines={1}
          >
            Results for "{appliedSearch}"
          </Text>
          <TouchableOpacity onPress={handleClearSearch}>
            <Ionicons name="close" size={18} color="#1447e6" />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter toggle */}
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          setShowFilters(!showFilters);
        }}
        className="flex-row items-center justify-between bg-white rounded-xl px-4 py-3 mb-3 shadow-sm border border-gray-100"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <Ionicons name="options-outline" size={18} color="#1447e6" />
          <Text className="ml-2 text-gray-700 font-medium">Filters</Text>
          {activeFilterCount > 0 && (
            <View className="bg-primary ml-2 w-5 h-5 rounded-full items-center justify-center">
              <Text className="text-[10px] text-white font-bold">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </View>
        <Ionicons
          name={showFilters ? "chevron-up" : "chevron-down"}
          size={18}
          color="#6b7280"
        />
      </TouchableOpacity>

      {/* Filters panel */}
      {showFilters && (
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
          {/* Categories */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-700">
              Category
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={handleClearFilters}>
                <Text className="text-xs text-primary font-medium">
                  Clear all
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4 -mx-1"
          >
            <View className="flex-row gap-2 px-1">
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => handleCategorySelect(category)}
                  className={`px-4 py-2 rounded-full ${
                    selectedCategory === category ? "bg-primary" : "bg-gray-100"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedCategory === category
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* GI Filter */}
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Glycemic Index
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {GI_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.label}
                onPress={() => handleGISelect(filter.value)}
                className={`px-4 py-2 rounded-full ${
                  selectedGI === filter.value ? "bg-primary" : "bg-gray-100"
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedGI === filter.value ? "text-white" : "text-gray-700"
                  }`}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results summary */}
      <View className="flex-row items-center justify-between bg-gray-100/50 rounded-lg px-3 py-2">
        <View className="flex-row items-center">
          {isOffline && (
            <View className="flex-row items-center mr-2 bg-amber-100 px-2 py-0.5 rounded-full">
              <Ionicons name="cloud-offline" size={12} color="#d97706" />
              <Text className="text-[10px] text-amber-700 font-medium ml-1">
                Offline
              </Text>
            </View>
          )}
          <Text className="text-sm text-gray-600">
            <Text className="font-semibold">
              {pagination?.total || foods.length}
            </Text>{" "}
            food{(pagination?.total || foods.length) !== 1 ? "s" : ""}
          </Text>
        </View>
        {pagination && pagination.totalPages > 1 && (
          <Text className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </Text>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const hasMorePages = currentPage < pagination.totalPages;

    return (
      <View className="px-4 py-4 mb-20">
        {/* Page indicator */}
        <View className="flex-row items-center justify-center mb-3">
          <Text className="text-sm text-gray-500">
            Showing{" "}
            <Text className="font-semibold text-gray-700">{foods.length}</Text>{" "}
            of{" "}
            <Text className="font-semibold text-gray-700">
              {pagination.total}
            </Text>{" "}
            foods
          </Text>
        </View>

        {/* Load more button */}
        {hasMorePages && (
          <TouchableOpacity
            onPress={handleLoadMore}
            disabled={isLoadingMore}
            className={`flex-row items-center justify-center py-3.5 rounded-xl ${
              isLoadingMore ? "bg-gray-100" : "bg-primary"
            }`}
            activeOpacity={0.7}
          >
            {isLoadingMore ? (
              <>
                <ActivityIndicator size="small" color="#1447e6" />
                <Text className="ml-2 text-primary font-semibold">
                  Loading...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <Text className="ml-2 text-white font-semibold">
                  Load More Foods
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Pagination dots */}
        {pagination.totalPages > 1 && pagination.totalPages <= 10 && (
          <View className="flex-row items-center justify-center mt-4 gap-1.5">
            {Array.from({ length: pagination.totalPages }).map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index < currentPage ? "bg-primary" : "bg-gray-300"
                }`}
              />
            ))}
          </View>
        )}

        {/* Progress bar for many pages */}
        {pagination.totalPages > 10 && (
          <View className="mt-4">
            <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{
                  width: `${(currentPage / pagination.totalPages) * 100}%`,
                }}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View className="items-center justify-center py-20 px-6">
      <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
        <Ionicons name="nutrition-outline" size={48} color="#9ca3af" />
      </View>
      <Text className="text-lg font-semibold text-gray-700 mb-2">
        No foods found
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6">
        {hasActiveFilters
          ? "Try adjusting your search or filters to find what you're looking for"
          : "Foods will appear here once loaded"}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity
          onPress={handleClearFilters}
          className="bg-primary px-6 py-3 rounded-full"
          activeOpacity={0.7}
        >
          <Text className="text-white font-semibold">Clear All Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-gray-50">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Foods</Text>
            <Text className="text-sm text-gray-500 mt-0.5">
              Nigerian foods & nutrition
            </Text>
          </View>
          {isOffline && (
            <View className="bg-amber-100 px-3 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="cloud-offline" size={14} color="#d97706" />
              <Text className="text-xs text-amber-700 font-medium ml-1.5">
                Offline Mode
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Food list */}
      <FlatList
        data={foods}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <FoodCard food={item} onPress={handleFoodPress} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#1447e6"]}
            tintColor="#1447e6"
          />
        }
      />

      {/* Loading overlay */}
      {isLoading && foods.length === 0 && (
        <View className="absolute inset-0 items-center justify-center bg-gray-50">
          <View className="bg-white p-6 rounded-2xl shadow-lg items-center">
            <ActivityIndicator size="large" color="#1447e6" />
            <Text className="text-gray-600 mt-3 font-medium">
              Loading foods...
            </Text>
            {isOffline && (
              <Text className="text-xs text-amber-600 mt-1">
                Using offline data
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Food detail modal */}
      <FoodDetailModal
        food={selectedFood}
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedFood(null);
        }}
      />
    </SafeAreaView>
  );
}
