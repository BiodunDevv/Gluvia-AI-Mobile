import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import {
  ArrowRight,
  Heart,
  LogIn,
  LogOut,
  Sparkles,
  TrendingUp,
  WifiOff,
} from "lucide-react-native";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CurrentUserScreen() {
  const { user, checkAuth, isAuthenticated, isLoading, isOffline, logout } =
    useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const handleContinueToDashboard = () => {
    router.replace("/(tabs)" as Href);
  };

  const handleSignIn = () => {
    router.replace("/(auth)/login" as Href);
  };

  const handleSignUp = () => {
    router.replace("/(auth)/register" as Href);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login" as Href);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="items-center">
          <View className="w-20 h-20 rounded-2xl bg-primary/10 items-center justify-center mb-6">
            <Image
              source={require("@/assets/images/logo.png")}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </View>
          <ActivityIndicator size="large" color="#1447e6" />
          <Text className="text-gray-400 mt-4 text-sm">
            Checking your session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "health_worker":
        return {
          label: "Health Worker",
          color: "bg-green-500/20",
          text: "text-green-100",
        };
      case "user":
        return {
          label: "Patient",
          color: "bg-blue-500/20",
          text: "text-blue-100",
        };
      default:
        return { label: "Member", color: "bg-white/20", text: "text-white" };
    }
  };

  if (isAuthenticated && user) {
    const roleBadge = getRoleBadge(user.role);

    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6">
            {/* Header */}
            <View className="flex-row items-center justify-between pt-4 pb-8">
              <View className="flex-row items-center">
                <Image
                  source={require("@/assets/images/logo.png")}
                  className="w-9 h-9"
                  resizeMode="contain"
                />
                <Text className="text-xl font-bold text-gray-900 ml-2.5">
                  Gluvia
                </Text>
              </View>
              {isOffline && (
                <View className="flex-row items-center px-3 py-1.5 bg-amber-50 rounded-full">
                  <WifiOff size={14} color="#d97706" />
                  <Text className="text-xs font-medium text-amber-700 ml-1.5">
                    Offline
                  </Text>
                </View>
              )}
            </View>

            {/* Welcome Message */}
            <View className="mb-6">
              <Text className="text-[28px] font-bold text-gray-900 tracking-tight mb-2">
                Welcome back,
              </Text>
              <Text className="text-[28px] font-bold text-primary tracking-tight">
                {user.name?.split(" ")[0] || "there"}!
              </Text>
            </View>

            {/* User Card */}
            <View className="bg-primary rounded-3xl p-6 mb-8 shadow-lg overflow-hidden">
              {/* Background Pattern */}
              <View className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -mr-20 -mt-20" />
              <View className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 -ml-16 -mb-16" />

              <View className="flex-row items-center relative">
                <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center border-2 border-white/30">
                  <Text className="text-2xl font-bold text-white">
                    {user.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?"}
                  </Text>
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-xl font-bold text-white mb-1">
                    {user.name || "User"}
                  </Text>
                  <Text className="text-sm text-white/70">{user.email}</Text>
                </View>
              </View>

              {/* Role Badge */}
              <View className="mt-4">
                <View
                  className={`self-start px-3 py-1.5 rounded-full ${roleBadge.color}`}
                >
                  <Text className={`text-xs font-semibold ${roleBadge.text}`}>
                    {roleBadge.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Quick Actions
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-gray-50 rounded-2xl p-4 items-center"
                  activeOpacity={0.7}
                  onPress={handleContinueToDashboard}
                >
                  <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-3">
                    <Heart size={22} color="#1447e6" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-900">
                    Dashboard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-gray-50 rounded-2xl p-4 items-center"
                  activeOpacity={0.7}
                >
                  <View className="w-12 h-12 rounded-xl bg-emerald-100 items-center justify-center mb-3">
                    <TrendingUp size={22} color="#10b981" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-900">
                    Progress
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-gray-50 rounded-2xl p-4 items-center"
                  activeOpacity={0.7}
                >
                  <View className="w-12 h-12 rounded-xl bg-amber-100 items-center justify-center mb-3">
                    <Sparkles size={22} color="#f59e0b" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-900">
                    AI Tips
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Continue Button */}
            <View className="mt-auto pb-8">
              <TouchableOpacity
                className="h-14 bg-primary rounded-2xl items-center justify-center flex-row shadow-sm mb-3"
                onPress={handleContinueToDashboard}
                activeOpacity={0.8}
              >
                <Text className="text-white text-base font-semibold mr-2">
                  Continue to Dashboard
                </Text>
                <ArrowRight size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-14 bg-gray-100 rounded-2xl items-center justify-center flex-row"
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <LogOut size={20} color="#374151" />
                <Text className="text-gray-700 text-base font-semibold ml-2">
                  Log Out
                </Text>
              </TouchableOpacity>

              <Text className="text-center text-xs text-gray-400 mt-4">
                Ready to continue your health journey?
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Not authenticated - show auth options
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center pt-4 pb-8">
          <Image
            source={require("@/assets/images/logo.png")}
            className="w-9 h-9"
            resizeMode="contain"
          />
          <Text className="text-xl font-bold text-gray-900 ml-2.5">Gluvia</Text>
        </View>

        {/* Hero Section */}
        <View className="flex-1 justify-center">
          <View className="items-center mb-12">
            <View className="w-28 h-28 rounded-3xl bg-primary/10 items-center justify-center mb-6">
              <Image
                source={require("@/assets/images/logo.png")}
                className="w-16 h-16"
                resizeMode="contain"
              />
            </View>
            <Text className="text-[32px] font-bold text-gray-900 tracking-tight mb-2 text-center">
              Your AI Health
            </Text>
            <Text className="text-[32px] font-bold text-primary tracking-tight mb-4 text-center">
              Companion
            </Text>
            <Text className="text-base text-gray-500 text-center leading-6 px-4">
              Manage your diabetes with personalized meal guidance, powered by
              AI
            </Text>
          </View>

          {/* Features */}
          <View className="mb-8">
            <FeatureItem
              icon={Heart}
              iconColor="#ef4444"
              iconBg="#fee2e2"
              title="Track Your Health"
              description="Monitor meals and glucose levels"
            />
            <FeatureItem
              icon={TrendingUp}
              iconColor="#10b981"
              iconBg="#d1fae5"
              title="Smart Insights"
              description="AI-powered recommendations"
            />
            <FeatureItem
              icon={LogIn}
              iconColor="#1447e6"
              iconBg="#dbeafe"
              title="Works Offline"
              description="Access anywhere, sync when connected"
            />
          </View>
        </View>

        {/* Auth Buttons */}
        <View className="pb-8">
          <TouchableOpacity
            className="h-14 bg-primary rounded-2xl items-center justify-center mb-3 shadow-sm"
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-semibold">Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="h-14 bg-gray-100 rounded-2xl items-center justify-center"
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text className="text-gray-700 text-base font-semibold">
              Create Account
            </Text>
          </TouchableOpacity>

          <Text className="text-center text-xs text-gray-400 mt-6 leading-5">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row items-center mb-5">
      <View
        className="w-11 h-11 rounded-xl items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={22} color={iconColor} />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-[15px] font-semibold text-gray-900 mb-0.5">
          {title}
        </Text>
        <Text className="text-sm text-gray-500">{description}</Text>
      </View>
    </View>
  );
}
