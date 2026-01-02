import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import {
  Activity,
  Apple,
  ChevronRight,
  Moon,
  Sun,
  TrendingUp,
  Utensils,
} from "lucide-react-native";
import { useEffect } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { user, getProfile, isLoading } = useAuthStore();

  useEffect(() => {
    getProfile();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: Sun };
    if (hour < 18) return { text: "Good afternoon", icon: Sun };
    return { text: "Good evening", icon: Moon };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const quickActions = [
    {
      id: "log-meal",
      title: "Log Meal",
      icon: Utensils,
      color: "#10b981",
      bgColor: "bg-emerald-50",
    },
    {
      id: "log-glucose",
      title: "Log Glucose",
      icon: Activity,
      color: "#f59e0b",
      bgColor: "bg-amber-50",
    },
    {
      id: "food-search",
      title: "Food Search",
      icon: Apple,
      color: "#ef4444",
      bgColor: "bg-red-50",
    },
    {
      id: "insights",
      title: "Insights",
      icon: TrendingUp,
      color: "#1447e6",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={getProfile} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <GreetingIcon size={16} color="#f59e0b" />
                <Text className="text-sm text-gray-500 ml-1.5">
                  {greeting.text}
                </Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {user?.name?.split(" ")[0] || "Welcome"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile" as Href)}
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                <Image
                  source={require("@/assets/images/logo.png")}
                  className="w-8 h-8"
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                className={`w-[48%] ${action.bgColor} rounded-2xl p-4 mb-3`}
                activeOpacity={0.7}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                  style={{ backgroundColor: `${action.color}20` }}
                >
                  <action.icon size={22} color={action.color} />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Summary Card */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Today's Summary
          </Text>
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 items-center">
                <Text className="text-3xl font-bold text-primary">--</Text>
                <Text className="text-xs text-gray-500 mt-1">Calories</Text>
              </View>
              <View className="w-px bg-gray-100" />
              <View className="flex-1 items-center">
                <Text className="text-3xl font-bold text-emerald-500">--</Text>
                <Text className="text-xs text-gray-500 mt-1">Meals</Text>
              </View>
              <View className="w-px bg-gray-100" />
              <View className="flex-1 items-center">
                <Text className="text-3xl font-bold text-amber-500">--</Text>
                <Text className="text-xs text-gray-500 mt-1">Avg Glucose</Text>
              </View>
            </View>
            <TouchableOpacity
              className="flex-row items-center justify-center py-3 bg-gray-50 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium text-gray-600">
                View detailed summary
              </Text>
              <ChevronRight size={16} color="#71717b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Status Card */}
        {user?.profile?.allergies && user.profile.allergies.length > 0 && (
          <View className="px-6 mb-6">
            <View className="bg-red-50 rounded-2xl p-5 border border-red-100">
              <Text className="text-sm font-medium text-red-600 mb-2">
                ⚠️ Known Allergies
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {user.profile.allergies.map((allergy, index) => (
                  <View
                    key={index}
                    className="px-3 py-1.5 bg-white rounded-full border border-red-200"
                  >
                    <Text className="text-sm text-red-700">{allergy}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Tips Card */}
        <View className="px-6">
          <View className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5">
            <Text className="text-sm font-semibold text-emerald-700 mb-2">
              💡 Daily Tip
            </Text>
            <Text className="text-sm text-gray-600 leading-5">
              Eating meals at consistent times each day can help maintain stable
              blood sugar levels. Try to space your meals 4-5 hours apart.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
