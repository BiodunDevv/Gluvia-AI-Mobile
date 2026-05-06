import {
  LogGlucoseModal,
  MealSummaryModal,
  SearchFoodModal,
} from "@/components/modals";
import { AppLoader, AppScreenHeader } from "@/components/ui";
import { T, useTranslation } from "@/hooks/use-translation";
import { api } from "@/lib/api";
import {
  Food,
  generateMealRecommendation,
  getCurrentMealType,
  getGICategory,
  getMealTypeInfo,
  getTimeContextMessage,
  MealRecommendation,
  MealType,
  RecommendedFood,
  RuleTemplate,
} from "@/lib/meal-recommendation";
import { saveMealToHistory } from "@/lib/offline-db";
import { useAuthStore } from "@/store/auth-store";
import {
  MealLogFood,
  useSyncStore,
} from "@/store/sync-store";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Coffee,
  Cookie,
  ListChecks,
  Moon,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeOut, SlideInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_CONFIG: Record<
  MealType,
  { icon: any; color: string; bgColor: string }
> = {
  breakfast: { icon: Coffee, color: "#f59e0b", bgColor: "bg-amber-50" },
  lunch: { icon: Sun, color: "#10b981", bgColor: "bg-emerald-50" },
  dinner: { icon: Moon, color: "#8b5cf6", bgColor: "bg-purple-50" },
  snack: { icon: Cookie, color: "#ec4899", bgColor: "bg-pink-50" },
};

type InsightState = {
  explanation: string;
  source: "groq" | "fallback";
};

function handleBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.dismiss();
  }
}

function MealTypeControl({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (mealType: MealType) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="border-b border-gray-200 bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-2"
      >
        {MEAL_TYPES.map((type) => {
          const active = value === type;
          const info = getMealTypeInfo(type);
          const config = MEAL_CONFIG[type];
          const Icon = config.icon;

          return (
            <Pressable
              key={type}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(type);
              }}
              className={`mr-2 flex-row items-center rounded-xl border px-3 py-2 ${
                active ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
              }`}
            >
              <Icon size={16} color={active ? "#1447e6" : config.color} />
              <Text
                className={`ml-2 text-sm font-medium ${
                  active ? "text-primary" : "text-gray-700"
                }`}
              >
                {t(info.title)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FoodRow({
  food,
  selected,
  onPress,
}: {
  food: RecommendedFood;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const gi = getGICategory(food.nutrients.gi);

  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 rounded-xl border bg-white p-3 ${
        selected ? "border-primary" : "border-gray-200"
      }`}
    >
      <View className="flex-row">
        <View className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
          {food.imageUrl && !imageError ? (
            <Image
              source={{ uri: food.imageUrl }}
              style={{ width: 64, height: 64 }}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Utensils size={22} color="#9ca3af" />
            </View>
          )}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                {food.localName}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>
                {t(food.suggestedPortion.name)} - {food.suggestedPortion.grams}g
              </Text>
            </View>
            <View
              className={`h-6 w-6 items-center justify-center rounded-full ${
                selected ? "bg-primary" : "bg-gray-100"
              }`}
            >
              {selected ? (
                <Check size={14} color="#ffffff" />
              ) : (
                <Plus size={14} color="#6b7280" />
              )}
            </View>
          </View>

          <View className="mt-2 flex-row items-center">
            <Text className="mr-3 text-xs text-gray-600">
              {Math.round(
                (food.nutrients.calories * food.suggestedPortion.grams) / 100
              )}{" "}
              <T>cal</T>
            </Text>
            <Text className="mr-3 text-xs text-gray-600">
              {Math.round(food.suggestedPortion.carbs_g * 10) / 10}g <T>carbs</T>
            </Text>
            <Text className="text-xs font-medium" style={{ color: gi.color }}>
              GI {food.nutrients.gi ?? "?"}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function RecommendationGroup({
  title,
  foods,
  selectedFoods,
  onToggleFood,
  defaultOpen = false,
}: {
  title: string;
  foods: RecommendedFood[];
  selectedFoods: RecommendedFood[];
  onToggleFood: (food: RecommendedFood) => void;
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  if (foods.length === 0) return null;

  return (
    <View className="mb-3 rounded-xl border border-gray-200 bg-white">
      <Pressable
        onPress={() => setOpen((current) => !current)}
        className="flex-row items-center justify-between px-3 py-3"
      >
        <View className="flex-row items-center">
          <Text className="text-base font-semibold text-gray-900">
            {t(title)}
          </Text>
          <Text className="ml-2 text-xs text-gray-500">{foods.length}</Text>
        </View>
        <ChevronDown
          size={18}
          color="#6b7280"
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {open ? (
        <View className="border-t border-gray-100 px-3 pt-3">
          {foods.map((food) => (
            <FoodRow
              key={food._id}
              food={food}
              selected={selectedFoods.some((item) => item._id === food._id)}
              onPress={() => onToggleFood(food)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function renderFoodCardForSearch(
  food: RecommendedFood,
  selected: boolean,
  onSelect: (food: RecommendedFood) => void
) {
  return <FoodRow food={food} selected={selected} onPress={() => onSelect(food)} />;
}

export default function MealRecommendationScreen() {
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    foods,
    rules,
    isSyncing: foodsLoading,
    isUploading,
    lastGlucoseReading,
    getAggregations,
    checkAndApplyUpdates,
    logMeal: syncLogMeal,
    mealLogs,
    isOnline,
  } = useSyncStore();
  const rulesLoading = false;

  const initialMealType = (params.mealType as MealType) || getCurrentMealType();
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [selectedFoods, setSelectedFoods] = useState<RecommendedFood[]>([]);
  const [recommendation, setRecommendation] = useState<MealRecommendation | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showGlucoseModal, setShowGlucoseModal] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [insight, setInsight] = useState<InsightState | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [variationSeed, setVariationSeed] = useState(0);

  const mealInfo = getMealTypeInfo(mealType);
  const mealSubtitle = useMemo(
    () => t(getTimeContextMessage(mealType)),
    [mealType, t]
  );
  const mealConfig = MEAL_CONFIG[mealType];
  const lastGlucoseValue = lastGlucoseReading?.valueMgDl;

  const userContext = useMemo(
    () => ({
      profile: user?.profile,
      lastGlucose: lastGlucoseValue,
      todaysMeals: mealLogs.slice(0, 10).map((meal) => ({
        mealType: meal.mealType,
        carbs: meal.calculatedTotals?.carbs || 0,
      })),
    }),
    [lastGlucoseValue, mealLogs, user?.profile]
  );

  const selectedTotals = useMemo(
    () =>
      selectedFoods.reduce(
        (total, food) => ({
          calories:
            total.calories +
            Math.round(
              (food.nutrients.calories * food.suggestedPortion.grams) / 100
            ),
          carbs: total.carbs + food.suggestedPortion.carbs_g,
          protein:
            total.protein +
            Math.round(
              (food.nutrients.protein_g * food.suggestedPortion.grams) / 100
            ),
          fat:
            total.fat +
            Math.round(
              (food.nutrients.fat_g * food.suggestedPortion.grams) / 100
            ),
        }),
        { calories: 0, carbs: 0, protein: 0, fat: 0 }
      ),
    [selectedFoods]
  );

  useEffect(() => {
    if (params.mealType) {
      setMealType(params.mealType as MealType);
    }
  }, [params.mealType]);

  useEffect(() => {
    // Ensure foods/rules are loaded and up to date from the server
    if (foods.length === 0 || rules.length === 0) {
      checkAndApplyUpdates().catch(() => {});
    }
  }, [checkAndApplyUpdates, foods.length, rules.length]);

  useEffect(() => {
    if (!lastGlucoseReading) {
      getAggregations({ page: 1, limit: 200 }).catch(() => {});
    }
  }, [getAggregations, lastGlucoseReading]);

  useEffect(() => {
    if (foods.length === 0 || rules.length === 0) return;

    const nextRecommendation = generateMealRecommendation(
      foods as Food[],
      rules as RuleTemplate[],
      userContext,
      mealType,
      { variationSeed }
    );

    setRecommendation(nextRecommendation);
    setInsight(null);
    setShowInsight(false);
  }, [foods, mealType, rules, userContext, variationSeed]);

  useEffect(() => {
    const loadInsight = async () => {
      if (!showInsight || !recommendation) return;

      const explanationFoods = [
        ...recommendation.mainDishes.slice(0, 1),
        ...recommendation.proteins.slice(0, 1),
        ...recommendation.sideDishes.slice(0, 1),
      ];

      if (!isOnline || explanationFoods.length === 0) {
        setInsight({
          explanation:
            recommendation.tips?.[0] ||
            t("This meal is selected from your profile, glucose context, and the current meal type."),
          source: "fallback",
        });
        return;
      }

      setIsLoadingInsight(true);
      try {
        const response = await api.post("/reports/recommendations/explain", {
          mealType,
          selectedFoods: explanationFoods,
          maxCarbsAllowed: recommendation.maxCarbsAllowed,
          lastGlucose: lastGlucoseValue,
          alerts: recommendation.alerts,
          tips: recommendation.tips,
          profile: user?.profile,
        });

        setInsight(response.data?.data || null);
      } catch {
        setInsight({
          explanation:
            recommendation.tips?.[0] ||
            t("This meal is selected from your profile, glucose context, and the current meal type."),
          source: "fallback",
        });
      } finally {
        setIsLoadingInsight(false);
      }
    };

    loadInsight();
  }, [isOnline, lastGlucoseValue, mealType, recommendation, showInsight, t, user?.profile]);

  const toggleFood = useCallback((food: RecommendedFood) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedFoods((current) =>
      current.some((item) => item._id === food._id)
        ? current.filter((item) => item._id !== food._id)
        : [...current, food]
    );
  }, []);

  const refreshRecommendations = async () => {
    setRefreshing(true);
    await Promise.all([
      checkAndApplyUpdates(),
      getAggregations({ page: 1, limit: 200 }, { force: true }),
    ]).catch(() => {});
    setVariationSeed((seed) => seed + 1);
    setRefreshing(false);
  };

  const handleLogMeal = async () => {
    if (selectedFoods.length === 0 || !user?._id) return;

    setIsLoggingMeal(true);
    try {
      const mealLogFoods: MealLogFood[] = selectedFoods.map((food) => ({
        foodId: food._id,
        portionSize: food.suggestedPortion.name,
        quantity: 1,
        localName: food.localName,
        canonicalName: food.canonicalName,
        category: food.category,
      }));

      const timestamp = new Date().toISOString();

      // syncLogMeal handles: offline save → upload → optimistic update → force-refresh
      await syncLogMeal(
        {
          timestamp,
          mealType,
          foods: mealLogFoods,
          totalCalories: selectedTotals.calories,
          totalCarbs: selectedTotals.carbs,
          totalProtein: selectedTotals.protein,
          totalFat: selectedTotals.fat,
        },
        user._id
      );

      // Also save locally for the Recent Meals card (offline-db)
      await saveMealToHistory({
        userId: user._id,
        mealType,
        foodIds: selectedFoods.map((food) => food.localName || food._id),
        totalCalories: selectedTotals.calories,
        totalCarbs: selectedTotals.carbs,
        totalProtein: selectedTotals.protein,
        totalFat: selectedTotals.fat,
        createdAt: timestamp,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setSelectedFoods([]);
      setShowSummary(false);
      Alert.alert(t("Meal logged"), t("Would you like to log your glucose reading?"), [
        { text: t("Later"), style: "cancel" },
        { text: t("Log Glucose"), onPress: () => setShowGlucoseModal(true) },
      ]);
    } catch (error) {
      console.error("Failed to log meal:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(t("Meal not logged"), t("Please try again."));
    } finally {
      setIsLoggingMeal(false);
    }
  };

  const isLoading = foodsLoading || rulesLoading;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <AppScreenHeader
        title={t("Build Meal")}
        subtitle={mealSubtitle}
        onBack={handleBack}
        rightSlot={
          <View className="flex-row">
            <Pressable
              onPress={refreshRecommendations}
              className="mr-2 h-10 w-10 items-center justify-center rounded-xl bg-white"
            >
              <RefreshCcw size={18} color="#374151" />
            </Pressable>
            <Pressable
              onPress={() => setShowSearch(true)}
              className="h-10 w-10 items-center justify-center rounded-xl bg-primary"
            >
              <Search size={18} color="#ffffff" />
            </Pressable>
          </View>
        }
      />

      <MealTypeControl
        value={mealType}
        onChange={(nextType) => {
          setMealType(nextType);
          setSelectedFoods([]);
        }}
      />

      {isLoading && !recommendation ? (
        <View className="flex-1 items-center justify-center">
          <AppLoader size="lg" color="#1447e6" />
          <Text className="mt-4 text-sm text-gray-500">
            <T>Loading foods...</T>
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: selectedFoods.length > 0 ? 132 : 28 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshRecommendations} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="border-b border-gray-200 bg-white px-4 py-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-semibold text-gray-900">
                  {t(mealInfo.title)}
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  <T>Target</T> {mealInfo.carbRange.min}-{mealInfo.carbRange.max}g <T>carbs</T>
                </Text>
              </View>
              {lastGlucoseReading ? (
                <View className="items-end">
                  <Text className="text-xs text-gray-500">
                    <T>Last glucose</T>
                  </Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {lastGlucoseReading.valueMgDl} {lastGlucoseReading.unit}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowGlucoseModal(true)}
                  className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
                >
                  <Text className="text-xs font-medium text-primary">
                    <T>Log glucose</T>
                  </Text>
                </Pressable>
              )}
            </View>

            {selectedFoods.length > 0 ? (
              <View className="mt-4 flex-row rounded-xl border border-primary/10 bg-primary/5 p-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">
                    <T>Selected</T>
                  </Text>
                  <Text className="text-base font-semibold text-primary">
                    {selectedFoods.length} <T>items</T>
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">
                    <T>Carbs</T>
                  </Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {Math.round(selectedTotals.carbs * 10) / 10}g
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">
                    <T>Calories</T>
                  </Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {selectedTotals.calories}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {recommendation?.alerts?.length ? (
            <View className="px-4 pt-4">
              {recommendation.alerts.slice(0, 2).map((alert, index) => (
                <View
                  key={`${alert.message}-${index}`}
                  className="mb-2 flex-row rounded-xl border border-amber-200 bg-amber-50 p-3"
                >
                  <AlertCircle size={18} color="#d97706" />
                  <Text className="ml-2 flex-1 text-sm leading-5 text-amber-800">
                    {t(alert.message)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="px-4 pt-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <ListChecks size={18} color="#1447e6" />
                <Text className="ml-2 text-lg font-semibold text-gray-900">
                  <T>Recommended foods</T>
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setSelectedFoods([]);
                  setVariationSeed((seed) => seed + 1);
                }}
                className="h-9 w-9 items-center justify-center rounded-lg bg-gray-100"
              >
                <RefreshCcw size={16} color="#374151" />
              </Pressable>
            </View>

            {recommendation ? (
              <>
                <RecommendationGroup
                  title="Main dishes"
                  foods={recommendation.mainDishes}
                  selectedFoods={selectedFoods}
                  onToggleFood={toggleFood}
                  defaultOpen
                />
                <RecommendationGroup
                  title="Proteins"
                  foods={recommendation.proteins}
                  selectedFoods={selectedFoods}
                  onToggleFood={toggleFood}
                />
                <RecommendationGroup
                  title="Vegetables and sides"
                  foods={recommendation.sideDishes}
                  selectedFoods={selectedFoods}
                  onToggleFood={toggleFood}
                />
                {mealType === "snack" ? (
                  <RecommendationGroup
                    title="Snacks"
                    foods={recommendation.snacks}
                    selectedFoods={selectedFoods}
                    onToggleFood={toggleFood}
                  />
                ) : null}
              </>
            ) : null}
          </View>

          <View className="px-4 pt-2">
            <View className="rounded-xl border border-gray-200 bg-white">
              <Pressable
                onPress={() => setShowInsight((current) => !current)}
                className="flex-row items-center justify-between px-3 py-3"
              >
                <View className="flex-row items-center">
                  <Sparkles size={17} color="#1447e6" />
                  <Text className="ml-2 text-sm font-semibold text-gray-900">
                    <T>Recommendation insight</T>
                  </Text>
                </View>
                <ChevronRight
                  size={18}
                  color="#6b7280"
                  style={{ transform: [{ rotate: showInsight ? "90deg" : "0deg" }] }}
                />
              </Pressable>

              {showInsight ? (
                <View className="border-t border-gray-100 px-3 py-3">
                  {isLoadingInsight ? (
                    <View className="flex-row items-center">
                      <AppLoader size="sm" color="#1447e6" />
                      <Text className="ml-2 text-sm text-gray-500">
                        <T>Preparing insight...</T>
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm leading-6 text-gray-700">
                      {insight?.explanation ||
                        t("Open this after choosing a food to understand the recommendation.")}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}

      {selectedFoods.length > 0 ? (
        <Animated.View
          entering={SlideInUp.duration(180)}
          exiting={FadeOut.duration(120)}
          className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 pb-8 pt-3"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-gray-500">
                <T>Meal draft</T>
              </Text>
              <Text className="text-base font-semibold text-gray-900">
                {Math.round(selectedTotals.carbs * 10) / 10}g <T>carbs</T> -{" "}
                {selectedTotals.calories} <T>cal</T>
              </Text>
            </View>
            <Pressable
              onPress={() => setShowSummary(true)}
              className="flex-row items-center rounded-xl bg-primary px-4 py-3"
            >
              <Check size={17} color="#ffffff" />
              <Text className="ml-2 font-semibold text-white">
                <T>Review</T>
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <SearchFoodModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        foods={foods as Food[]}
        rules={rules as RuleTemplate[]}
        userContext={userContext}
        mealType={mealType}
        selectedFoods={selectedFoods}
        onSelectFood={toggleFood}
        renderFoodCard={renderFoodCardForSearch}
      />

      <MealSummaryModal
        visible={showSummary}
        onClose={() => setShowSummary(false)}
        selectedFoods={selectedFoods}
        mealType={mealType}
        mealConfig={mealConfig}
        onConfirm={handleLogMeal}
        isLoading={isLoggingMeal || isUploading}
      />

      <LogGlucoseModal
        visible={showGlucoseModal}
        onClose={() => setShowGlucoseModal(false)}
        onSuccess={() => getAggregations({ page: 1, limit: 200 }, { force: true }).catch(() => {})}
      />
    </SafeAreaView>
  );
}
