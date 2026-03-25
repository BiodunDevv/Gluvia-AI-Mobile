import { AppScreenHeader } from "@/components/ui";
import {
  LogGlucoseModal,
  MealSummaryModal,
  SearchFoodModal,
} from "@/components/modals";
import { T, useTranslation } from "@/hooks/use-translation";
import { translateDynamicText } from "@/lib/translator";
import api from "@/lib/api";
import {
  Food,
  generateMealRecommendation,
  getCurrentMealType,
  getGICategory,
  getMealTypeInfo,
  getScoreLabel,
  getTimeContextMessage,
  MealRecommendation,
  MealType,
  RecommendedFood,
  RuleTemplate,
} from "@/lib/meal-recommendation";
import { saveMealToHistory } from "@/lib/offline-db";
import { useAuthStore } from "@/store/auth-store";
import { useFoodStore } from "@/store/food-store";
import { useRuleStore } from "@/store/rule-store";
import {
  generateClientId,
  MealLog,
  MealLogFood,
  useSyncStore,
} from "@/store/sync-store";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  Cookie,
  Flame,
  Info,
  Leaf,
  Moon,
  Plus,
  RefreshCcw,
  Search,
  Sun,
  Target,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.dismiss();
  }
};

// Meal type icons and colors
const MEAL_CONFIG: Record<
  MealType,
  {
    icon: any;
    color: string;
    bgColor: string;
    gradient: string[];
  }
> = {
  breakfast: {
    icon: Coffee,
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    gradient: ["#fef3c7", "#fde68a"],
  },
  lunch: {
    icon: Sun,
    color: "#10b981",
    bgColor: "bg-emerald-50",
    gradient: ["#d1fae5", "#a7f3d0"],
  },
  dinner: {
    icon: Moon,
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    gradient: ["#ede9fe", "#ddd6fe"],
  },
  snack: {
    icon: Cookie,
    color: "#ec4899",
    bgColor: "bg-pink-50",
    gradient: ["#fce7f3", "#fbcfe8"],
  },
};

// Food Card Component
function FoodCard({
  food,
  onSelect,
  isSelected,
}: {
  food: RecommendedFood;
  onSelect: (food: RecommendedFood) => void;
  isSelected: boolean;
}) {
  const scoreInfo = getScoreLabel(food.score);
  const giInfo = getGICategory(food.nutrients.gi);
  const [imageError, setImageError] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(food);
        }}
        className={`bg-white rounded-2xl mb-3 overflow-hidden border-2 ${
          isSelected ? "border-primary" : "border-transparent"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }}
      >
        <View className="flex-row p-4">
          {/* Food Image or Placeholder */}
          <View className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden">
            {food.imageUrl && !imageError ? (
              <Image
                source={{ uri: food.imageUrl }}
                style={{ width: 80, height: 80 }}
                contentFit="cover"
                transition={200}
                onError={() => setImageError(true)}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-gray-100">
                <Utensils size={28} color="#9ca3af" />
              </View>
            )}
          </View>

          {/* Food Info */}
          <View className="flex-1 ml-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text
                  className="font-bold text-gray-800 text-base"
                  numberOfLines={1}
                >
                  {food.localName}
                </Text>
                {food.canonicalName &&
                  food.canonicalName !== food.localName && (
                    <Text className="text-xs text-gray-500" numberOfLines={1}>
                      {food.canonicalName}
                    </Text>
                  )}
              </View>

              {/* Score Badge */}
              <View
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: scoreInfo.color + "20" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: scoreInfo.color }}
                >
                  {food.score}
                </Text>
              </View>
            </View>

            {/* Nutrients Row */}
            <View className="flex-row items-center mt-2 flex-wrap">
              <View className="flex-row items-center mr-3">
                <Flame size={12} color="#ef4444" />
                <Text className="text-xs text-gray-600 ml-1">
                  {food.nutrients.calories} kcal
                </Text>
              </View>
              <View className="flex-row items-center mr-3">
                <Zap size={12} color="#f59e0b" />
                <Text className="text-xs text-gray-600 ml-1">
                  {food.suggestedPortion.carbs_g}g carbs
                </Text>
              </View>
              <View
                className="px-1.5 py-0.5 rounded"
                style={{ backgroundColor: giInfo.color + "20" }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: giInfo.color }}
                >
                  GI: {food.nutrients.gi ?? "?"}
                </Text>
              </View>
            </View>

            {/* Suggested Portion */}
            <Text className="text-xs text-gray-500 mt-1">
              Suggested: {food.suggestedPortion.name} (
              {food.suggestedPortion.grams}g)
            </Text>
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary items-center justify-center">
              <Check size={14} color="white" strokeWidth={3} />
            </View>
          )}
        </View>

        {/* Reasons & Alerts */}
        {(food.reasons.length > 0 || food.alerts.length > 0) && (
          <View className="px-4 pb-3 pt-0">
            {/* Positive reasons */}
            {food.reasons.slice(0, 2).map((reason, idx) => (
              <View
                key={idx}
                className="flex-row items-start mt-1.5 bg-green-50 rounded-lg px-2 py-1.5"
              >
                <Leaf size={12} color="#22c55e" style={{ marginTop: 1 }} />
                <Text
                  className="text-xs text-green-700 ml-1.5 flex-1"
                  numberOfLines={2}
                >
                  {reason}
                </Text>
              </View>
            ))}

            {/* Alerts - show critical/high severity alerts prominently */}
            {food.alerts
              .filter((a) => a.severity !== "low")
              .slice(0, 2)
              .map((alert, idx) => {
                const isCritical =
                  alert.severity === "critical" || alert.severity === "high";
                return (
                  <View
                    key={idx}
                    className={`flex-row items-start mt-1.5 rounded-lg px-2 py-1.5 ${
                      isCritical ? "bg-red-50" : "bg-amber-50"
                    }`}
                  >
                    <AlertTriangle
                      size={12}
                      color={isCritical ? "#ef4444" : "#f59e0b"}
                      style={{ marginTop: 1 }}
                    />
                    <Text
                      className={`text-xs ml-1.5 flex-1 ${
                        isCritical ? "text-red-700" : "text-amber-700"
                      }`}
                      numberOfLines={2}
                    >
                      {alert.message}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Meal Type Selector Button
function MealTypeButton({
  type,
  isActive,
  onPress,
}: {
  type: MealType;
  isActive: boolean;
  onPress: () => void;
}) {
  const config = MEAL_CONFIG[type];
  const info = getMealTypeInfo(type);
  const Icon = config.icon;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      className={`mr-3 rounded-2xl border px-4 py-3 ${
        isActive ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
      }`}
    >
      <View className="flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: config.color + "20" }}
        >
          <Icon size={20} color={config.color} />
        </View>
        <View className="ml-3">
          <Text
            className={`text-sm font-semibold ${
              isActive ? "text-gray-900" : "text-gray-700"
            }`}
          >
            {info.title}
          </Text>
          <Text className="text-xs text-gray-500">
            {info.carbRange.min}-{info.carbRange.max}g
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// Category Section Component
function CategorySection({
  title,
  foods,
  selectedFoods,
  onSelectFood,
  icon: Icon,
  iconColor,
  defaultExpanded = false,
}: {
  title: string;
  foods: RecommendedFood[];
  selectedFoods: RecommendedFood[];
  onSelectFood: (food: RecommendedFood) => void;
  icon: any;
  iconColor: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (foods.length === 0) return null;

  return (
    <Animated.View entering={FadeInUp.delay(200).springify()} className="mb-4">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-2"
      >
        <View className="flex-row items-center">
          <View
            className="w-8 h-8 rounded-lg items-center justify-center mr-2"
            style={{ backgroundColor: iconColor + "20" }}
          >
            <Icon size={18} color={iconColor} />
          </View>
          <Text className="text-lg font-bold text-gray-800">{title}</Text>
          <View className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full">
            <Text className="text-xs text-gray-500">{foods.length}</Text>
          </View>
        </View>
        <ChevronRight
          size={20}
          color="#9ca3af"
          style={{
            transform: [{ rotate: expanded ? "90deg" : "0deg" }],
          }}
        />
      </Pressable>

      {expanded && (
        <View className="mt-2">
          {foods.map((food) => (
            <FoodCard
              key={food._id}
              food={food}
              onSelect={onSelectFood}
              isSelected={selectedFoods.some((f) => f._id === food._id)}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function CompactMetric({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <View className="min-w-[108px] flex-1 rounded-2xl bg-gray-50 p-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={16} color={color} />
      </View>
      <Text className="mt-2 text-xs font-medium text-gray-500">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

// Render FoodCard for SearchModal (extracted for reuse)
function renderFoodCardForSearch(
  food: RecommendedFood,
  isSelected: boolean,
  onSelect: (food: RecommendedFood) => void
) {
  return <FoodCard food={food} onSelect={onSelect} isSelected={isSelected} />;
}

interface RecommendationExplanation {
  explanation: string;
  source: "groq" | "fallback";
  safeFallbackUsed: boolean;
}

// Main Screen Component
export default function MealRecommendationScreen() {
  const { t, language } = useTranslation();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { user } = useAuthStore();
  const { foods, fetchFoods, isLoading: foodsLoading } = useFoodStore();
  const { rules, fetchRules, isLoading: rulesLoading } = useRuleStore();
  const {
    uploadMealLogs,
    isUploading,
    lastGlucoseReading,
    getAggregations,
    mealLogs,
    isOnline,
  } = useSyncStore();

  // Use mealType from params if provided, otherwise use current time-based meal
  const initialMealType = (params.mealType as MealType) || getCurrentMealType();

  const [selectedMealType, setSelectedMealType] =
    useState<MealType>(initialMealType);
  const [selectedFoods, setSelectedFoods] = useState<RecommendedFood[]>([]);
  const [recommendation, setRecommendation] =
    useState<MealRecommendation | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showGlucoseModal, setShowGlucoseModal] = useState(false);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [variationSeed, setVariationSeed] = useState(0);
  const [recommendationExplanation, setRecommendationExplanation] =
    useState<RecommendationExplanation | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [translatedExplanation, setTranslatedExplanation] = useState<
    string | null
  >(null);
  const [translatedTimeContext, setTranslatedTimeContext] = useState<
    string | null
  >(null);
  const [translatedPreviousMealText, setTranslatedPreviousMealText] = useState<
    string | null
  >(null);
  const [translatedAlerts, setTranslatedAlerts] = useState<string[]>([]);
  const config = MEAL_CONFIG[selectedMealType];
  const mealInfo = getMealTypeInfo(selectedMealType);

  // Update meal type when params change
  useEffect(() => {
    if (params.mealType) {
      setSelectedMealType(params.mealType as MealType);
    }
  }, [params.mealType]);

  // Get last glucose value for user context (using valueMgDl from AggregatedGlucoseLog)
  const lastGlucoseValue = lastGlucoseReading?.valueMgDl;

  // User context for recommendations - includes last glucose
  const userContext = useMemo(
    () => ({
      profile: user?.profile,
      lastGlucose: lastGlucoseValue,
      todaysMeals: mealLogs
        .slice(0, 10)
        .map((meal) => ({
          mealType: meal.mealType,
          carbs: meal.calculatedTotals?.carbs || 0,
        })),
    }),
    [user?.profile, lastGlucoseValue, mealLogs]
  );
  const previousMeal = useMemo(() => {
    const sortedMeals = [...mealLogs].sort(
      (left, right) =>
        new Date(right.timestamp || right.createdAt).getTime() -
        new Date(left.timestamp || left.createdAt).getTime()
    );

    return sortedMeals.find((meal) => meal.mealType !== selectedMealType) || null;
  }, [mealLogs, selectedMealType]);
  const todaysCarbs = useMemo(
    () =>
      mealLogs.reduce(
        (sum, meal) => sum + (meal.calculatedTotals?.carbs || 0),
        0
      ),
    [mealLogs]
  );
  const constraintItems = useMemo(() => {
    const profile = user?.profile;

    return [
      {
        label: "Carb target",
        value: recommendation
          ? `${Math.round(recommendation.maxCarbsAllowed)}g ceiling`
          : `${mealInfo.carbRange.min}-${mealInfo.carbRange.max}g`,
        icon: Target,
        color: "#1447e6",
      },
      {
        label: "Budget lens",
        value:
          profile?.incomeBracket === "low"
            ? "Budget-first foods"
            : profile?.incomeBracket === "high"
              ? "Best-fit variety"
              : "Balanced cost",
        icon: Wallet,
        color: "#8b5cf6",
      },
      {
        label: "Daily carbs used",
        value: `${Math.round(todaysCarbs)}g today`,
        icon: Zap,
        color: "#f59e0b",
      },
    ];
  }, [
    recommendation,
    todaysCarbs,
    user?.profile,
  ]);
  const selectedCarbs = useMemo(
    () =>
      Math.round(
        selectedFoods.reduce((sum, food) => sum + food.suggestedPortion.carbs_g, 0) *
          10
      ) / 10,
    [selectedFoods]
  );
  const compactTips = useMemo(
    () => recommendation?.tips?.slice(0, 2) || [],
    [recommendation?.tips]
  );
  const glucoseTone = useMemo(() => {
    if (!lastGlucoseReading) {
      return null;
    }

    if (lastGlucoseReading.valueMgDl < 70) {
      return {
        bg: "#fef2f2",
        text: "#b91c1c",
        border: "#fecaca",
        message: `Last reading was ${lastGlucoseReading.valueMgDl} ${lastGlucoseReading.unit}. Choose a balanced meal and monitor closely.`,
      };
    }

    if (lastGlucoseReading.valueMgDl > 180) {
      return {
        bg: "#fffbeb",
        text: "#b45309",
        border: "#fde68a",
        message: `Last reading was ${lastGlucoseReading.valueMgDl} ${lastGlucoseReading.unit}. Keep this meal lighter on carbs.`,
      };
    }

    return {
      bg: "#ecfdf5",
      text: "#047857",
      border: "#a7f3d0",
      message: `Last reading was ${lastGlucoseReading.valueMgDl} ${lastGlucoseReading.unit}. Your current plan can stay balanced.`,
    };
  }, [lastGlucoseReading]);

  // Fetch aggregations on mount only if we don't have glucose data
  useEffect(() => {
    if (!lastGlucoseReading) {
      getAggregations({ limit: 10 }).catch(() => {});
    }
  }, []);

  // Generate recommendations when data changes
  useEffect(() => {
    if (foods.length > 0 && rules.length > 0) {
      const rec = generateMealRecommendation(
        foods as Food[],
        rules as RuleTemplate[],
        userContext,
        selectedMealType,
        { variationSeed }
      );
      setRecommendation(rec);
    }
  }, [foods, rules, userContext, selectedMealType, variationSeed]);

  // Load data on mount
  useEffect(() => {
    if (foods.length === 0) fetchFoods({ limit: 100 });
    if (rules.length === 0) fetchRules();
  }, []);

  // Handle food selection
  const handleSelectFood = useCallback((food: RecommendedFood) => {
    setSelectedFoods((prev) => {
      const exists = prev.some((f) => f._id === food._id);
      if (exists) {
        return prev.filter((f) => f._id !== food._id);
      }
      return [...prev, food];
    });
  }, []);

  // Handle meal logging - Upload to server via sync store
  const handleLogMeal = async () => {
    if (selectedFoods.length === 0 || !user?._id) return;

    setIsLoggingMeal(true);
    try {
      // Calculate totals
      const totals = selectedFoods.reduce(
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
        }),
        { calories: 0, carbs: 0, protein: 0, fat: 0 }
      );

      // Create meal log for server upload
      const mealLogFoods: MealLogFood[] = selectedFoods.map((food) => ({
        foodId: food._id,
        portionSize: food.suggestedPortion.name,
        quantity: 1,
      }));

      const mealLog: MealLog = {
        clientGeneratedId: generateClientId("meal"),
        timestamp: new Date().toISOString(),
        mealType: selectedMealType,
        foods: mealLogFoods,
        totalCalories: totals.calories,
        totalCarbs: totals.carbs,
        totalProtein: totals.protein,
        totalFat: totals.fat,
      };

      // Upload to server using dedicated endpoint
      await uploadMealLogs([mealLog]);

      // Also save to local history for offline access
      await saveMealToHistory({
        userId: user._id,
        mealType: selectedMealType,
        foodIds: selectedFoods.map((f) => f._id),
        totalCalories: totals.calories,
        totalCarbs: totals.carbs,
        totalProtein: totals.protein,
        totalFat: totals.fat,
        createdAt: new Date().toISOString(),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh aggregations
      try {
        await getAggregations({ limit: 10 });
      } catch {}

      // Reset selection
      setSelectedFoods([]);
      setShowSummary(false);

      // Ask if user wants to log glucose
      Alert.alert(
        t("Meal Logged"),
        t("Would you like to log your glucose reading now?"),
        [
          { text: t("Later"), style: "cancel" },
          {
            text: t("Log Glucose"),
            onPress: () => setShowGlucoseModal(true),
          },
        ]
      );
    } catch (error) {
      console.error("Failed to log meal:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("Error"), t("Failed to log meal. Please try again."));
    } finally {
      setIsLoggingMeal(false);
    }
  };

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFoods({ limit: 100 }),
      fetchRules(),
      getAggregations({ limit: 10 }),
    ]);
    setVariationSeed((prev) => prev + 1);
    setRefreshing(false);
  };

  useEffect(() => {
    const fetchExplanation = async () => {
      if (!recommendation) {
        setRecommendationExplanation(null);
        return;
      }

      const explanationFoods = [
        ...recommendation.mainDishes.slice(0, 1),
        ...recommendation.proteins.slice(0, 1),
        ...recommendation.sideDishes.slice(0, 1),
        ...(selectedMealType === "snack"
          ? recommendation.snacks.slice(0, 1)
          : []),
      ];

      if (explanationFoods.length === 0) {
        setRecommendationExplanation(null);
        return;
      }

      if (!isOnline) {
        setRecommendationExplanation(null);
        return;
      }

      setIsLoadingExplanation(true);
      try {
        const response = await api.post("/reports/recommendations/explain", {
          mealType: selectedMealType,
          selectedFoods: explanationFoods,
          maxCarbsAllowed: recommendation.maxCarbsAllowed,
          lastGlucose: lastGlucoseValue,
          alerts: recommendation.alerts,
          tips: recommendation.tips,
          profile: user?.profile,
        });

        setRecommendationExplanation(response.data?.data || null);
      } catch {
        setRecommendationExplanation({
          explanation:
            recommendation.tips?.[0] ||
            "This recommendation is based on your glucose context, meal type, and the best available diabetes-friendly foods.",
          source: "fallback",
          safeFallbackUsed: true,
        });
      } finally {
        setIsLoadingExplanation(false);
      }
    };

    fetchExplanation();
  }, [recommendation, selectedMealType, user?.profile, lastGlucoseValue, isOnline]);

  useEffect(() => {
    let cancelled = false;

    const translateDynamicRecommendationText = async () => {
      if (!isOnline || language === "english") {
        setTranslatedExplanation(null);
        setTranslatedTimeContext(null);
        setTranslatedPreviousMealText(null);
        setTranslatedAlerts([]);
        return;
      }

      const timeContext =
        recommendation?.timeContext || getTimeContextMessage(selectedMealType);
      const previousMealText = previousMeal
        ? `Your last logged ${previousMeal.mealType} included about ${Math.round(
            previousMeal.calculatedTotals?.carbs || 0
          )}g of carbs. This recommendation adjusts the next meal toward a steadier balance instead of repeating the same pattern.`
        : null;

      const [timeContextText, explanationText, previousMealTranslated] =
        await Promise.all([
          translateDynamicText(timeContext, language),
          recommendationExplanation?.explanation
            ? translateDynamicText(recommendationExplanation.explanation, language)
            : Promise.resolve(null),
          previousMealText
            ? translateDynamicText(previousMealText, language)
            : Promise.resolve(null),
        ]);

      const alertTexts = recommendation?.alerts?.length
        ? await Promise.all(
            recommendation.alerts.map((alert) =>
              translateDynamicText(alert.message, language)
            )
          )
        : [];

      if (!cancelled) {
        setTranslatedTimeContext(timeContextText);
        setTranslatedExplanation(explanationText);
        setTranslatedPreviousMealText(previousMealTranslated);
        setTranslatedAlerts(alertTexts);
      }
    };

    translateDynamicRecommendationText().catch(() => {
      if (!cancelled) {
        setTranslatedExplanation(null);
        setTranslatedTimeContext(null);
        setTranslatedPreviousMealText(null);
        setTranslatedAlerts([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    isOnline,
    language,
    previousMeal,
    recommendation?.alerts,
    recommendation?.timeContext,
    recommendationExplanation?.explanation,
    selectedMealType,
  ]);

  const isLoading = foodsLoading || rulesLoading;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="border-b border-gray-100">
        <AppScreenHeader
          title="Meal Recommendation"
          onBack={handleBack}
          rightSlot={
            <View className="flex-row">
              <Pressable
                onPress={() => {
                  setSelectedFoods([]);
                  setVariationSeed((prev) => prev + 1);
                }}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <RefreshCcw size={18} color="#374151" />
              </Pressable>
              <Pressable
                onPress={() => setShowSearch(true)}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Search size={20} color="#374151" />
              </Pressable>
            </View>
          }
        />
      </View>

      {isLoading && !recommendation ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1447e6" />
          <Text className="text-gray-500 mt-4">
            <T>Loading recommendations...</T>
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Meal Type Selector */}
          <View className="px-4 py-4">
            <Text className="text-sm font-semibold text-gray-600 mb-3">
              <T>What meal are you planning?</T>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
                (type) => (
                  <MealTypeButton
                    key={type}
                    type={type}
                    isActive={selectedMealType === type}
                    onPress={() => {
                      setSelectedMealType(type);
                      setSelectedFoods([]);
                    }}
                  />
                )
              )}
            </ScrollView>
          </View>

          <Animated.View
            entering={FadeInUp.delay(100)}
            className="mx-4 mb-4 rounded-3xl border border-gray-100 bg-white p-4"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">
                  <T>Meal Snapshot</T>
                </Text>
                <Text className="mt-1 text-lg font-bold text-gray-900">
                  {mealInfo.title}
                </Text>
                <Text className="mt-1 text-sm leading-6 text-gray-600">
                  {translatedTimeContext ||
                    recommendation?.timeContext ||
                    mealInfo.description}
                </Text>
              </View>
              <View className="flex-row">
                <Pressable
                  onPress={() => setShowGlucoseModal(true)}
                  className="mr-2 h-10 w-10 items-center justify-center rounded-2xl bg-gray-100"
                >
                  <Activity size={18} color="#374151" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedFoods([]);
                    setVariationSeed((prev) => prev + 1);
                  }}
                  className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10"
                >
                  <RefreshCcw size={18} color="#1447e6" />
                </Pressable>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-3">
              {constraintItems.map((item) => {
                const Icon = item.icon;

                return (
                  <CompactMetric
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    icon={Icon}
                    color={item.color}
                  />
                );
              })}
            </View>

            {lastGlucoseReading ? (
              <View
                className="mt-4 rounded-2xl border px-3 py-3"
                style={{
                  backgroundColor: glucoseTone?.bg || "#f9fafb",
                  borderColor: glucoseTone?.border || "#e5e7eb",
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-xs font-semibold uppercase tracking-[1px]"
                      style={{ color: glucoseTone?.text || "#374151" }}
                    >
                      <T>Last Glucose Reading</T>
                    </Text>
                    <Text className="mt-1 text-sm font-semibold text-gray-900">
                      {lastGlucoseReading.valueMgDl} {lastGlucoseReading.unit}
                    </Text>
                    <Text className="mt-1 text-xs leading-5 text-gray-600">
                      {glucoseTone?.message}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {new Date(lastGlucoseReading.timestamp).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowGlucoseModal(true)}
                className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3"
              >
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Activity size={18} color="#1447e6" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-gray-900">
                      <T>Log your glucose reading</T>
                    </Text>
                    <Text className="mt-1 text-xs text-gray-600">
                      <T>Get more accurate meal guidance for this moment</T>
                    </Text>
                  </View>
                  <Plus size={18} color="#1447e6" />
                </View>
              </Pressable>
            )}

            {previousMeal ? (
              <View className="mt-4 rounded-2xl bg-emerald-50 px-3 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-emerald-700">
                  <T>Previous Meal Effect</T>
                </Text>
                <Text className="mt-1 text-sm leading-6 text-gray-700">
                  {translatedPreviousMealText ||
                    `Your last logged ${
                      previousMeal.mealType
                    } included about ${Math.round(
                      previousMeal.calculatedTotals?.carbs || 0
                    )}g of carbs. This plan shifts the next meal toward a steadier balance.`}
                </Text>
              </View>
            ) : null}

            {recommendationExplanation ? (
              <View className="mt-4 rounded-2xl bg-gray-50 px-3 py-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Info size={15} color="#1447e6" />
                    <Text className="ml-2 text-sm font-semibold text-gray-900">
                      <T>Recommendation Insight</T>
                    </Text>
                  </View>
                  <Text className="text-[11px] font-medium text-primary">
                    {recommendationExplanation.source === "groq"
                      ? t("AI Explained")
                      : t("Safe Fallback")}
                  </Text>
                </View>
                {isLoadingExplanation ? (
                  <Text className="text-sm text-gray-500">
                    <T>Preparing explanation...</T>
                  </Text>
                ) : (
                  <Text className="text-sm leading-6 text-gray-700">
                    {translatedExplanation ||
                      recommendationExplanation.explanation}
                  </Text>
                )}
              </View>
            ) : null}
          </Animated.View>

          {/* Alerts */}
          {recommendation?.alerts.map((alert, idx) => (
            <Animated.View
              key={idx}
              entering={FadeInDown.delay(idx * 100)}
              className="mx-4 mb-3 p-4 rounded-xl flex-row items-center"
              style={{
                backgroundColor:
                  alert.severity === "critical" ? "#fef2f2" : "#fffbeb",
              }}
            >
              <AlertTriangle
                size={20}
                color={alert.severity === "critical" ? "#ef4444" : "#f59e0b"}
              />
              <Text
                className="flex-1 ml-3 text-sm"
                style={{
                  color: alert.severity === "critical" ? "#dc2626" : "#d97706",
                }}
              >
                {translatedAlerts[idx] || alert.message}
              </Text>
            </Animated.View>
          ))}

          {/* Food Recommendations */}
          <View className="px-4">
            <Pressable
              onPress={() => {
                setSelectedFoods([]);
                setVariationSeed((prev) => prev + 1);
              }}
              className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                  <RefreshCcw size={17} color="#4f46e5" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-gray-800">
                    <T>Show a fresh mix</T>
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-600">
                    <T>
                      Rotate through other high-quality options for this meal
                    </T>
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#4f46e5" />
            </Pressable>

            {/* Main Dishes */}
            {recommendation && (
              <>
                <CategorySection
                  title="Main Dishes"
                  foods={recommendation.mainDishes}
                  selectedFoods={selectedFoods}
                  onSelectFood={handleSelectFood}
                  icon={Utensils}
                  iconColor="#1447e6"
                  defaultExpanded
                />

                <CategorySection
                  title="Proteins"
                  foods={recommendation.proteins}
                  selectedFoods={selectedFoods}
                  onSelectFood={handleSelectFood}
                  icon={Zap}
                  iconColor="#ef4444"
                />

                <CategorySection
                  title="Vegetables & Sides"
                  foods={recommendation.sideDishes}
                  selectedFoods={selectedFoods}
                  onSelectFood={handleSelectFood}
                  icon={Leaf}
                  iconColor="#22c55e"
                />

                {selectedMealType === "snack" && (
                  <CategorySection
                    title="Snacks"
                    foods={recommendation.snacks}
                    selectedFoods={selectedFoods}
                    onSelectFood={handleSelectFood}
                    icon={Cookie}
                    iconColor="#ec4899"
                  />
                )}
              </>
            )}

            {/* Tips */}
            {compactTips.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(300)}
                className="mt-2 rounded-2xl bg-blue-50 p-4"
              >
                <View className="flex-row items-center mb-2">
                  <Info size={16} color="#1447e6" />
                  <Text className="ml-2 font-semibold text-primary">
                    <T>Tips</T>
                  </Text>
                </View>
                {compactTips.map((tip, idx) => (
                  <Text key={idx} className="mb-1 text-sm text-gray-700">
                    • {tip}
                  </Text>
                ))}
              </Animated.View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Bar */}
      {selectedFoods.length > 0 && (
        <Animated.View
          entering={SlideInRight}
          exiting={FadeOut}
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pb-8 pt-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-500">
                {selectedFoods.length} item
                {selectedFoods.length !== 1 ? "s" : ""} selected
              </Text>
              <Text className="text-lg font-bold text-gray-800">
                {selectedCarbs}g carbs
              </Text>
            </View>

            <Pressable
              onPress={() => setShowSummary(true)}
              className="bg-primary px-6 py-3 rounded-xl flex-row items-center"
            >
              <Check size={18} color="white" />
              <Text className="font-semibold text-white ml-2">Review Meal</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Search Modal */}
      <SearchFoodModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        foods={foods as Food[]}
        rules={rules as RuleTemplate[]}
        userContext={userContext}
        mealType={selectedMealType}
        selectedFoods={selectedFoods}
        onSelectFood={handleSelectFood}
        renderFoodCard={renderFoodCardForSearch}
      />

      {/* Summary Modal */}
      <MealSummaryModal
        visible={showSummary}
        onClose={() => setShowSummary(false)}
        selectedFoods={selectedFoods}
        mealType={selectedMealType}
        mealConfig={MEAL_CONFIG[selectedMealType]}
        onConfirm={handleLogMeal}
        isLoading={isLoggingMeal || isUploading}
      />

      {/* Glucose Log Modal */}
      <LogGlucoseModal
        visible={showGlucoseModal}
        onClose={() => setShowGlucoseModal(false)}
        onSuccess={() => {
          // Refresh aggregations after logging glucose
          getAggregations({ limit: 10 }).catch(() => {});
        }}
      />
    </SafeAreaView>
  );
}
