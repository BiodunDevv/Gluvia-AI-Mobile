import { AppLoader } from "@/components/ui";
import { T, useTranslation } from "@/hooks/use-translation";
import { Food, useFoodStore } from "@/store/food-store";
import { useSyncStore } from "@/store/sync-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Fisher-Yates shuffle algorithm for randomizing foods
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

  // Use explicit dimensions for expo-image
  const dimensions = isLarge
    ? { width: "100%" as const, height: 192 }
    : { width: 64, height: 64 };

  const containerClass = isLarge
    ? "w-full h-48 rounded-xl mb-4 overflow-hidden"
    : "w-16 h-16 rounded-lg overflow-hidden";

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
    <View className={containerClass}>
      <Image
        source={{ uri: imageUrl }}
        style={dimensions}
        contentFit="cover"
        transition={200}
        onError={() => setHasError(true)}
      />
    </View>
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
      activeOpacity={0.8}
      className="mx-4 mb-3 rounded-2xl border border-gray-100 bg-white p-3.5"
    >
      <View className="flex-row">
        {/* Food image */}
        <FoodImage
          imageUrl={food.imageUrl}
          category={food.category}
          size="small"
        />

        <View className="ml-3 flex-1">
          {/* Food name */}
          <Text
            className="text-base font-bold text-gray-900"
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
          <View className="mb-2 mt-1.5 flex-row flex-wrap gap-1">
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
            <Text className="mx-1.5 text-xs text-gray-300">•</Text>
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold text-gray-700">
                {food.nutrients.carbs_g}g
              </Text>{" "}
              carbs
            </Text>
            <Text className="mx-1.5 text-xs text-gray-300">•</Text>
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold text-gray-700">
                {food.nutrients.protein_g}g
              </Text>{" "}
              protein
            </Text>
          </View>
        </View>

        <View className="ml-2 justify-center">
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Filter options
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
  const { t } = useTranslation();
  const { foods, isLoading, isOffline, fetchFoods, pagination } =
    useFoodStore();
  const isOnline = useSyncStore((state) => state.isOnline);
  const showOfflineBanner = !isOnline;
  const showCachedBanner = isOnline && isOffline;
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGI, setSelectedGI] = useState<number | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [shuffledFoods, setShuffledFoods] = useState<Food[]>([]);
  const searchInputRef = useRef<TextInput>(null);

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

  // Shuffle foods when they change
  useEffect(() => {
    if (foods.length > 0) {
      setShuffledFoods(shuffleArray(foods));
    } else {
      setShuffledFoods([]);
    }
  }, [foods]);

  // Initial load and reload when filters change
  useEffect(() => {
    setCurrentPage(1);
    loadFoods(1, true);
  }, [loadFoods]);

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
    router.push(`/food-details/${food._id}` as Href);
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

  // Memoized header content (without search bar to avoid focus issues)
  const ListHeader = useMemo(
    () => (
      <View className="px-4 pb-4">
        {/* Active search indicator */}
        {appliedSearch && (
          <View className="mb-3 flex-row items-center rounded-2xl border border-primary/10 bg-primary/10 px-3.5 py-2.5">
            <Ionicons name="search" size={14} color="#1447e6" />
            <Text
              className="ml-2 flex-1 text-sm font-semibold text-primary"
              numberOfLines={1}
            >
              Results for {appliedSearch}
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
          className="mb-3 flex-row items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <Ionicons name="options-outline" size={18} color="#1447e6" />
            <Text className="ml-2 text-sm font-semibold text-gray-800">
              <T>Filters</T>
            </Text>
            {activeFilterCount > 0 && (
              <View className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Text className="text-[10px] font-bold text-white">
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
          <View className="mb-3 rounded-2xl border border-gray-100 bg-white p-4">
            {/* Categories */}
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-700">
                <T>Category</T>
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={handleClearFilters}>
                  <Text className="text-xs font-semibold text-primary">
                    <T>Clear all</T>
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
                    className={`rounded-full px-4 py-2.5 ${
                      selectedCategory === category
                        ? "bg-primary"
                        : "bg-gray-100"
                    }`}
                    activeOpacity={0.8}
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
            <Text className="mb-2 text-sm font-semibold text-gray-700">
              <T>Glycemic Index</T>
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GI_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.label}
                  onPress={() => handleGISelect(filter.value)}
                  className={`rounded-full px-4 py-2.5 ${
                    selectedGI === filter.value ? "bg-primary" : "bg-gray-100"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedGI === filter.value
                        ? "text-white"
                        : "text-gray-700"
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
        <View className="flex-row items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
          <View className="flex-row items-center">
            {showCachedBanner && (
              <View className="mr-2 flex-row items-center rounded-full bg-amber-100 px-2 py-0.5">
                <Ionicons name="cloud-offline" size={12} color="#d97706" />
                <Text className="text-[10px] text-amber-700 font-medium ml-1">
                  <T>Cached</T>
                </Text>
              </View>
            )}
            <Text className="text-sm text-gray-600">
              <Text className="font-semibold">
                {pagination?.total || shuffledFoods.length}
              </Text>{" "}
              <T>
                {`food${(pagination?.total || shuffledFoods.length) !== 1 ? "s" : ""}`}
              </T>
            </Text>
          </View>
          {pagination && pagination.totalPages > 1 && (
            <Text className="text-xs text-gray-500">
              <T>Page</T> {pagination.page} <T>of</T> {pagination.totalPages}
            </Text>
          )}
        </View>
      </View>
    ),
    [
      appliedSearch,
      showFilters,
      selectedCategory,
      selectedGI,
      hasActiveFilters,
      activeFilterCount,
      showCachedBanner,
      pagination,
      shuffledFoods.length,
      handleClearSearch,
      handleClearFilters,
      handleCategorySelect,
      handleGISelect,
    ]
  );

  const renderFooter = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const hasMorePages = currentPage < pagination.totalPages;

    return (
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-center mb-3">
          <Text className="text-sm text-gray-500">
            <T>Showing</T>{" "}
            <Text className="font-semibold text-gray-700">
              {shuffledFoods.length}
            </Text>{" "}
            <T>of</T>{" "}
            <Text className="font-semibold text-gray-700">
              {pagination.total}
            </Text>{" "}
            <T>foods</T>
          </Text>
        </View>

        {hasMorePages && (
          <TouchableOpacity
            onPress={handleLoadMore}
            disabled={isLoadingMore}
            className={`flex-row items-center justify-center rounded-2xl py-3.5 ${
              isLoadingMore ? "bg-gray-100" : "bg-primary"
            }`}
            activeOpacity={0.7}
          >
            {isLoadingMore ? (
              <>
                <AppLoader size="sm" color="#1447e6" />
                <Text className="ml-2 text-primary font-semibold">
                  <T>Loading...</T>
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <Text className="ml-2 text-white font-semibold">
                  <T>Load More Foods</T>
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
    <View className="items-center justify-center px-6 py-20">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
        <Ionicons name="nutrition-outline" size={36} color="#1447e6" />
      </View>
      <Text className="mb-2 text-lg font-bold text-gray-900">
        {hasActiveFilters ? t("No foods found") : t("No Food Data Available")}
      </Text>
      <Text className="mb-6 text-center text-sm leading-5 text-gray-500">
        {hasActiveFilters
          ? t(
              "Try adjusting your search or filters to find what you're looking for"
            )
          : t("Go to Profile → Data & Sync to download food data")}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity
          onPress={handleClearFilters}
          className="rounded-2xl bg-primary px-5 py-3"
          activeOpacity={0.7}
        >
          <Text className="text-white font-semibold">
            <T>Clear All Filters</T>
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View className="bg-gray-50 px-5 pb-3 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <View className="mb-2 h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Ionicons name="restaurant-outline" size={20} color="#1447e6" />
            </View>
            <Text className="text-2xl font-bold tracking-tight text-gray-900">
              <T>Food library</T>
            </Text>
            <Text className="mt-0.5 text-sm text-gray-500">
              <T>Search foods, compare carbs, and review portions</T>
            </Text>
          </View>
          {showOfflineBanner && (
            <View className="flex-row items-center rounded-full bg-amber-100 px-3 py-1.5">
              <Ionicons name="cloud-offline" size={14} color="#d97706" />
              <Text className="ml-1.5 text-xs font-medium text-amber-700">
                <T>Offline Mode</T>
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Search bar - Outside FlatList to prevent focus issues */}
      <View className="bg-gray-50 px-4 pb-3">
        <View className="flex-row items-center">
          <View className="h-12 flex-1 flex-row items-center rounded-2xl border border-gray-100 bg-white px-3.5">
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              ref={searchInputRef}
              className="ml-2.5 flex-1 py-0 text-sm text-gray-900"
              placeholder={t("Search foods...")}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} className="p-1">
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            className="ml-2 h-12 w-12 items-center justify-center rounded-2xl bg-primary"
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Food list */}
      <FlatList
        data={shuffledFoods}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <FoodCard food={item} onPress={handleFoodPress} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            progressViewOffset={Platform.OS === "android" ? 20 : 0}
            colors={["#1447e6"]}
            tintColor="#1447e6"
          />
        }
      />

      {/* Loading overlay */}
      {isLoading && foods.length === 0 && (
        <View className="absolute inset-0 items-center justify-center bg-gray-50">
          <View className="items-center rounded-2xl border border-gray-100 bg-white p-6">
            <AppLoader size="lg" color="#1447e6" />
            <Text className="text-gray-600 mt-3 font-medium">
              <T>Loading foods...</T>
            </Text>
            {showCachedBanner && (
              <Text className="text-xs text-amber-600 mt-1">
                <T>Using cached data</T>
              </Text>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
