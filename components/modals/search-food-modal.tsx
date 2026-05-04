/**
 * Search Food Modal
 *
 * Modal for searching foods with debounced search,
 * professional UI, and smooth keyboard handling.
 */

import {
  Food,
  MealType,
  RecommendedFood,
  RuleTemplate,
  searchAndScoreFoods,
} from "@/lib/meal-recommendation";
import * as Haptics from "expo-haptics";
import { Search, Utensils, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface SearchFoodModalProps {
  visible: boolean;
  onClose: () => void;
  foods: Food[];
  rules: RuleTemplate[];
  userContext: any;
  mealType: MealType;
  selectedFoods: RecommendedFood[];
  onSelectFood: (food: RecommendedFood) => void;
  renderFoodCard: (
    food: RecommendedFood,
    isSelected: boolean,
    onSelect: (food: RecommendedFood) => void
  ) => React.ReactNode;
}

export function SearchFoodModal({
  visible,
  onClose,
  foods,
  rules,
  userContext,
  mealType,
  selectedFoods,
  onSelectFood,
  renderFoodCard,
}: SearchFoodModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<RecommendedFood[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Debounce search query to prevent excessive re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search on debounced query
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      const searchResults = searchAndScoreFoods(
        foods,
        rules,
        userContext,
        mealType,
        debouncedQuery
      );
      setResults(searchResults.slice(0, 20));
    } else {
      setResults([]);
    }
  }, [debouncedQuery, foods, rules, userContext, mealType]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setIsInputFocused(false);
    }
  }, [visible]);

  const handleClear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  const handleSelectFood = useCallback(
    (food: RecommendedFood) => {
      onSelectFood(food);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [onSelectFood]
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center bg-white border-b border-gray-100 px-4 md:px-6 py-3">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#374151" />
          </Pressable>
          <View className="flex-1 mx-3">
            <View
              className={`flex-row items-center rounded-xl px-3 py-2.5 ${
                isInputFocused
                  ? "bg-blue-50 border border-primary"
                  : "bg-gray-100"
              }`}
            >
              <Search
                size={18}
                color={isInputFocused ? "#1447e6" : "#9ca3af"}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Search foods..."
                className="flex-1 ml-2 text-base text-gray-800 py-0"
                placeholderTextColor="#9ca3af"
                returnKeyType="search"
                clearButtonMode="never"
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus={true}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={handleClear}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1"
                >
                  <X size={16} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Search Tips */}
        {query.length === 0 && (
          <View className="bg-blue-50 border-b border-blue-100 px-4 md:px-6 py-3">
            <Text className="text-blue-700 text-sm">
              {"💡 Try searching for \"rice\", \"beans\", \"egusi\", or any Nigerian"}
              food
            </Text>
          </View>
        )}

        {/* Results */}
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <View className="px-4 md:px-6">
              {renderFoodCard(
                item,
                selectedFoods.some((f) => f._id === item._id),
                handleSelectFood
              )}
            </View>
          )}
          contentContainerClassName="py-4 flex-grow"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              {query.length < 2 ? (
                <>
                  <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                    <Search size={36} color="#d1d5db" />
                  </View>
                  <Text className="text-gray-500 font-medium text-base">
                    Search for Foods
                  </Text>
                  <Text className="text-gray-400 mt-2 text-center px-8 leading-5">
                    Type at least 2 characters to search{"\n"}through our food
                    database
                  </Text>
                </>
              ) : debouncedQuery !== query ? (
                <View className="items-center">
                  <ActivityIndicator size="large" color="#1447e6" />
                  <Text className="text-gray-400 mt-4">Searching...</Text>
                </View>
              ) : (
                <>
                  <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                    <Utensils size={36} color="#d1d5db" />
                  </View>
                  <Text className="text-gray-500 font-medium text-base">
                    No Foods Found
                  </Text>
                  <Text className="text-gray-400 mt-2 text-center px-8 leading-5">
                    No foods match {query}.{"\n"}Try a different search term.
                  </Text>
                </>
              )}
            </View>
          }
        />

        {/* Results Count Footer */}
        {results.length > 0 && (
          <View className="bg-white border-t border-gray-100 px-4 md:px-6 py-2.5">
            <Text className="text-gray-500 text-sm text-center">
              Found {results.length} food{results.length !== 1 ? "s" : ""}{" "}
              matching {debouncedQuery}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
