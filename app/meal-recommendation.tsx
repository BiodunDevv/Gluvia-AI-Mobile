/**
 * Meal Recommendation Screen
 *
 * Professional interactive meal picker with time-based suggestions
 * and personalized food recommendations for diabetes management.
 */

import {
  LogGlucoseModal,
  MealSummaryModal,
  SearchFoodModal,
} from "@/components/modals";
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
  Search,
  Sparkles,
  Sun,
  Utensils,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
      className={`flex-1 mx-1 p-4 rounded-2xl items-center ${
        isActive ? "border-2 border-primary" : "border border-gray-200"
      }`}
      style={{
        backgroundColor: isActive ? config.color + "15" : "#fff",
      }}
    >
      <View
        className="w-12 h-12 rounded-xl items-center justify-center mb-2"
        style={{ backgroundColor: config.color + "20" }}
      >
        <Icon size={24} color={config.color} />
      </View>
      <Text
        className={`text-sm font-semibold ${
          isActive ? "text-gray-800" : "text-gray-600"
        }`}
      >
        {info.title}
      </Text>
      <Text className="text-xs text-gray-400 mt-0.5">
        {info.carbRange.min}-{info.carbRange.max}g carbs
      </Text>
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
}: {
  title: string;
  foods: RecommendedFood[];
  selectedFoods: RecommendedFood[];
  onSelectFood: (food: RecommendedFood) => void;
  icon: any;
  iconColor: string;
}) {
  const [expanded, setExpanded] = useState(true);

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

// Render FoodCard for SearchModal (extracted for reuse)
function renderFoodCardForSearch(
  food: RecommendedFood,
  isSelected: boolean,
  onSelect: (food: RecommendedFood) => void
) {
  return <FoodCard food={food} onSelect={onSelect} isSelected={isSelected} />;
}

// Fisher-Yates shuffle for randomizing arrays
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Main Screen Component
export default function MealRecommendationScreen() {
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { user } = useAuthStore();
  const { foods, fetchFoods, isLoading: foodsLoading } = useFoodStore();
  const { rules, fetchRules, isLoading: rulesLoading } = useRuleStore();
  const { uploadMealLogs, isUploading, lastGlucoseReading, getAggregations } =
    useSyncStore();

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
      todaysMeals: [],
    }),
    [user?.profile, lastGlucoseValue]
  );

  // Fetch aggregations on mount only if we don't have glucose data
  useEffect(() => {
    if (!lastGlucoseReading) {
      getAggregations({ limit: 10 }).catch(() => {});
    }
  }, []);

  // Generate recommendations when data changes - shuffle for variety
  useEffect(() => {
    if (foods.length > 0 && rules.length > 0) {
      const rec = generateMealRecommendation(
        shuffleArray(foods as Food[]),
        rules as RuleTemplate[],
        userContext,
        selectedMealType
      );
      // Shuffle the recommended foods for variety
      if (rec) {
        rec.mainDishes = shuffleArray(rec.mainDishes);
        rec.sideDishes = shuffleArray(rec.sideDishes);
        rec.proteins = shuffleArray(rec.proteins);
        rec.snacks = shuffleArray(rec.snacks);
      }
      setRecommendation(rec);
    }
  }, [foods, rules, userContext, selectedMealType]);

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
        "Meal Logged! 🎉",
        "Would you like to log your glucose reading now?",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Log Glucose",
            onPress: () => setShowGlucoseModal(true),
          },
        ]
      );
    } catch (error) {
      console.error("Failed to log meal:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to log meal. Please try again.");
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
    setRefreshing(false);
  };

  const isLoading = foodsLoading || rulesLoading;
  const config = MEAL_CONFIG[selectedMealType];
  const mealInfo = getMealTypeInfo(selectedMealType);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>

          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-gray-800">
              Meal Recommendations
            </Text>
            <Text className="text-xs text-gray-500">
              {getTimeContextMessage(selectedMealType).slice(0, 40)}...
            </Text>
          </View>

          <Pressable
            onPress={() => setShowSearch(true)}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Search size={20} color="#374151" />
          </Pressable>
        </View>
      </View>

      {isLoading && !recommendation ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1447e6" />
          <Text className="text-gray-500 mt-4">Loading recommendations...</Text>
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
              What meal are you planning?
            </Text>
            <View className="flex-row">
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
            </View>
          </View>

          {/* Time-based Suggestion Banner */}
          {selectedMealType === getCurrentMealType() && (
            <Animated.View
              entering={FadeIn}
              className="mx-4 mb-4 p-4 rounded-2xl"
              style={{ backgroundColor: config.color + "15" }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: config.color + "30" }}
                >
                  <Clock size={20} color={config.color} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-semibold text-gray-800">
                    Perfect timing for {mealInfo.title.toLowerCase()}!
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    Aim for {mealInfo.carbRange.min}-{mealInfo.carbRange.max}g
                    of carbs
                  </Text>
                </View>
                <Sparkles size={18} color={config.color} />
              </View>
            </Animated.View>
          )}

          {/* Last Glucose Reading Banner */}
          {lastGlucoseReading && (
            <Animated.View
              entering={FadeInUp.delay(100)}
              className="mx-4 mb-4 p-4 rounded-2xl bg-white border border-gray-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor:
                        lastGlucoseReading.valueMgDl >= 70 &&
                        lastGlucoseReading.valueMgDl <= 180
                          ? "#10b98120"
                          : lastGlucoseReading.valueMgDl < 70
                            ? "#ef444420"
                            : "#f59e0b20",
                    }}
                  >
                    <Activity
                      size={20}
                      color={
                        lastGlucoseReading.valueMgDl >= 70 &&
                        lastGlucoseReading.valueMgDl <= 180
                          ? "#10b981"
                          : lastGlucoseReading.valueMgDl < 70
                            ? "#ef4444"
                            : "#f59e0b"
                      }
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-gray-500">
                      Last Glucose Reading
                    </Text>
                    <Text className="text-lg font-bold text-gray-800">
                      {lastGlucoseReading.valueMgDl} {lastGlucoseReading.unit}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {new Date(lastGlucoseReading.timestamp).toLocaleString(
                        [],
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setShowGlucoseModal(true)}
                  className="bg-primary/10 px-3 py-2 rounded-xl flex-row items-center"
                >
                  <Plus size={14} color="#1447e6" />
                  <Text className="text-primary font-medium text-sm ml-1">
                    Log New
                  </Text>
                </Pressable>
              </View>
              {lastGlucoseReading.valueMgDl > 180 && (
                <View className="mt-3 p-2 bg-amber-50 rounded-lg">
                  <Text className="text-xs text-amber-700">
                    ⚠️ Based on your last reading of{" "}
                    {lastGlucoseReading.valueMgDl} mg/dL, we recommend keeping
                    carbs below {mealInfo.carbRange.min}g for this meal.
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* No Glucose Reading - Prompt to Log */}
          {!lastGlucoseReading && (
            <Pressable
              onPress={() => setShowGlucoseModal(true)}
              className="mx-4 mb-4 p-4 rounded-2xl bg-blue-50 border border-blue-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center">
                  <Activity size={20} color="#1447e6" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-semibold text-gray-800">
                    Log your glucose reading
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    Get personalized recommendations based on your levels
                  </Text>
                </View>
                <Plus size={20} color="#1447e6" />
              </View>
            </Pressable>
          )}

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
                {alert.message}
              </Text>
            </Animated.View>
          ))}

          {/* Food Recommendations */}
          <View className="px-4">
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
            {recommendation?.tips && recommendation.tips.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(300)}
                className="mt-4 p-4 bg-blue-50 rounded-2xl"
              >
                <View className="flex-row items-center mb-2">
                  <Info size={16} color="#1447e6" />
                  <Text className="font-semibold text-primary ml-2">Tips</Text>
                </View>
                {recommendation.tips.map((tip, idx) => (
                  <Text key={idx} className="text-sm text-gray-700 mb-1">
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
                {Math.round(
                  selectedFoods.reduce(
                    (sum, f) => sum + f.suggestedPortion.carbs_g,
                    0
                  ) * 10
                ) / 10}
                g carbs
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
