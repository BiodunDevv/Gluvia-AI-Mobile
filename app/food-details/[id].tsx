import { AppLoader } from "@/components/ui";
import { T, useTranslation } from "@/hooks/use-translation";
import { Food, useFoodStore } from "@/store/food-store";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function GIBadge({ gi }: { gi: number | null }) {
  const { t } = useTranslation();

  if (gi === null) {
    return (
      <View className="rounded-full bg-gray-100 px-3 py-1.5">
        <Text className="text-xs font-medium text-gray-500">
          <T>GI: N/A</T>
        </Text>
      </View>
    );
  }

  const config =
    gi >= 70
      ? { bg: "bg-red-100", text: "text-red-700", label: t("High") }
      : gi >= 55
        ? { bg: "bg-yellow-100", text: "text-yellow-700", label: t("Medium") }
        : { bg: "bg-green-100", text: "text-green-700", label: t("Low") };

  return (
    <View className={`rounded-full px-3 py-1.5 ${config.bg}`}>
      <Text className={`text-xs font-medium ${config.text}`}>
        GI: {gi} ({config.label})
      </Text>
    </View>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;

  return (
    <View className="rounded-full bg-primary/10 px-3 py-1.5">
      <Text className="text-xs font-medium text-primary">
        <T>{category}</T>
      </Text>
    </View>
  );
}

function FoodImage({
  imageUrl,
  category,
}: {
  imageUrl?: string;
  category?: string;
}) {
  const [hasError, setHasError] = useState(false);

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
  const iconName = iconMap[category || ""] || "restaurant-outline";

  if (!imageUrl || hasError) {
    return (
      <View className="mb-5 h-48 w-full items-center justify-center rounded-2xl bg-gray-100">
        <Ionicons name={iconName as any} size={52} color="#9ca3af" />
      </View>
    );
  }

  return (
    <View className="mb-5 h-48 w-full overflow-hidden rounded-2xl bg-gray-100">
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

function NutritionCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <View className="mb-4 w-1/2">
      <Text className="mb-1 text-xs text-gray-500">
        <T>{label}</T>
      </Text>
      <Text className="text-xl font-bold text-gray-900">
        {value}
        {unit ? (
          <Text className="text-sm font-normal text-gray-400"> {unit}</Text>
        ) : null}
      </Text>
    </View>
  );
}

export default function FoodDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const getFoodById = useFoodStore((state) => state.getFoodById);
  const currentFood = useFoodStore((state) => state.currentFood);
  const isLoading = useFoodStore((state) => state.isLoading);
  const [food, setFood] = useState<Food | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setFood(null);
      return;
    }

    getFoodById(String(id)).then((result) => {
      if (!cancelled) {
        setFood(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [getFoodById, id]);

  const activeFood = food || (currentFood?._id === id ? currentFood : null);
  const gi = activeFood?.nutrients.gi ?? null;
  const giLabel = useMemo(() => {
    if (gi === null) return t("Glycemic index not available");
    if (gi < 55) return t("Low GI - Good for blood sugar control");
    if (gi < 70) return t("Medium GI - Eat in moderation");
    return t("High GI - Limit portions and pair with protein");
  }, [gi, t]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="flex-row items-center border-b border-gray-100 bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-gray-900">
          <T>Food details</T>
        </Text>
      </View>

      {isLoading && !activeFood ? (
        <View className="flex-1 items-center justify-center px-6">
          <AppLoader size="lg" color="#1447e6" />
          <Text className="mt-3 text-sm text-gray-500">
            <T>Loading food details...</T>
          </Text>
        </View>
      ) : !activeFood ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Ionicons name="restaurant-outline" size={28} color="#9ca3af" />
          </View>
          <Text className="text-base font-bold text-gray-900">
            <T>Food unavailable</T>
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
            <T>We could not load this food right now. Go back and try again.</T>
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-4 pb-8"
        >
          <FoodImage
            imageUrl={activeFood.imageUrl}
            category={activeFood.category}
          />

          <Text className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
            {activeFood.localName}
          </Text>
          {activeFood.canonicalName &&
          activeFood.canonicalName !== activeFood.localName ? (
            <Text className="mb-3 text-sm text-gray-500">
              <T>Also known as</T>: {activeFood.canonicalName}
            </Text>
          ) : null}

          <View className="mb-6 flex-row flex-wrap gap-2">
            <GIBadge gi={activeFood.nutrients.gi} />
            <CategoryBadge category={activeFood.category} />
            {activeFood.affordability ? (
              <View className="rounded-full bg-blue-100 px-3 py-1.5">
                <Text className="text-xs font-medium capitalize text-blue-700">
                  <T>{activeFood.affordability}</T> <T>cost</T>
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mb-3 text-lg font-bold text-gray-900">
            <T>Nutrition per 100g</T>
          </Text>
          <View className="mb-5 rounded-2xl border border-gray-100 bg-white p-4">
            <View className="flex-row flex-wrap">
              <NutritionCell
                label="Calories"
                value={activeFood.nutrients.calories}
                unit="kcal"
              />
              <NutritionCell
                label="Carbohydrates"
                value={activeFood.nutrients.carbs_g}
                unit="g"
              />
              <NutritionCell
                label="Protein"
                value={activeFood.nutrients.protein_g}
                unit="g"
              />
              <NutritionCell
                label="Fat"
                value={activeFood.nutrients.fat_g}
                unit="g"
              />
              <NutritionCell
                label="Fiber"
                value={activeFood.nutrients.fibre_g}
                unit="g"
              />
              <NutritionCell
                label="Glycemic Index"
                value={activeFood.nutrients.gi ?? t("N/A")}
              />
            </View>
          </View>

          <View className="mb-5 rounded-2xl border border-gray-100 bg-white p-4">
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
              <Text className="ml-2.5 flex-1 text-sm font-medium leading-5 text-gray-700">
                {giLabel}
              </Text>
            </View>
          </View>

          {activeFood.portionSizes?.length ? (
            <>
              <Text className="mb-3 text-lg font-bold text-gray-900">
                <T>Portion sizes</T>
              </Text>
              <View className="mb-5 rounded-2xl border border-gray-100 bg-white p-4">
                {activeFood.portionSizes.map((portion, index) => (
                  <View
                    key={`${portion.name}-${index}`}
                    className={`flex-row justify-between py-3 ${
                      index < activeFood.portionSizes.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <Text className="text-sm font-medium capitalize text-gray-700">
                      <T>{portion.name}</T>
                    </Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {portion.grams}g
                      {portion.carbs_g !== undefined ? (
                        <Text className="font-normal text-gray-500">
                          {" "}
                          ({portion.carbs_g}g <T>carbs</T>)
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {activeFood.tags?.length ? (
            <>
              <Text className="mb-3 text-lg font-bold text-gray-900">
                <T>Tags</T>
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {activeFood.tags.map((tag, index) => (
                  <View
                    key={`${tag}-${index}`}
                    className="rounded-full bg-primary/10 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-primary">
                      <T>{tag}</T>
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
