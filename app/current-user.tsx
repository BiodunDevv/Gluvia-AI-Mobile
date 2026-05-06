import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import { isProfileComplete } from "@/lib/profile-completion";
import { T, useTranslation } from "@/hooks/use-translation";
import { LegalModal } from "@/components/auth";
import { AppLoader } from "@/components/ui";
import { Href, router } from "expo-router";
import {
  ArrowRight,
  Globe2,
  Heart,
  LogIn,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CurrentUserScreen() {
  const { user, checkAuth, isAuthenticated, isLoading, logout } =
    useAuthStore();
  const { language, languages } = useTranslation();
  const isOnline = useSyncStore((state) => state.isOnline);
  const showOffline = !isOnline;
  const [isCheckingSession, setIsCheckingSession] = useState(
    !isAuthenticated && !user,
  );
  const [legalModal, setLegalModal] = useState<{
    visible: boolean;
    type: "terms" | "privacy";
  }>({ visible: false, type: "terms" });

  useEffect(() => {
    if (isAuthenticated && user) {
      setIsCheckingSession(false);
      return;
    }

    let mounted = true;

    checkAuth()
      .catch(() => false)
      .finally(() => {
        if (mounted) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [checkAuth, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    router.replace(
      (isProfileComplete(user) ? "/(tabs)" : "/complete-profile") as Href,
    );
  }, [isAuthenticated, user]);

  const handleContinueToDashboard = () => {
    router.replace(
      (isProfileComplete(user) ? "/(tabs)" : "/complete-profile") as Href,
    );
  };

  const handleSignIn = () => {
    router.replace("/(auth)/login" as Href);
  };

  const handleSignUp = () => {
    router.replace("/(auth)/register" as Href);
  };

  const handleLanguage = () => {
    router.push("/language" as Href);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login" as Href);
  };

  const handleRequestDeletion = () => {
    Linking.openURL("https://gluvia.vercel.app/delete-account");
  };

  const languageCode =
    languages
      .find((item) => item.value === language)
      ?.label.slice(0, 2)
      .toUpperCase() || "EN";

  if (isLoading || isCheckingSession || (isAuthenticated && user)) {
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
          <AppLoader size="lg" color="#1447e6" />
          <Text className="text-gray-400 mt-4 text-sm">
            <T>Opening your dashboard...</T>
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "user":
        return {
          label: "Member",
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
              <View className="flex-row items-center gap-2">
                {showOffline ? (
                  <View className="flex-row items-center px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full gap-1.5">
                    <WifiOff size={13} color="#b45309" />
                    <Text className="text-xs font-semibold text-amber-800">
                      <T>Offline</T>
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full gap-1.5">
                    <Wifi size={13} color="#059669" />
                    <Text className="text-xs font-semibold text-emerald-700">
                      <T>Online</T>
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                  onPress={handleLanguage}
                  activeOpacity={0.8}
                >
                  <Globe2 size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Welcome Message */}
            <View className="mb-6">
              <Text className="text-[28px] font-bold text-gray-900 tracking-tight mb-2">
                <T>Welcome back</T>,
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
                <T>Quick Actions</T>
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
                    <T>Dashboard</T>
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
                    <T>Progress</T>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-gray-50 rounded-2xl p-4 items-center"
                  activeOpacity={0.7}
                >
                  <View className="w-12 h-12 rounded-xl bg-amber-100 items-center justify-center mb-3">
                    <MessageCircle size={22} color="#f59e0b" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-900">
                    <T>AI Tips</T>
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
                  {isProfileComplete(user) ? (
                    <T>Continue to Dashboard</T>
                  ) : (
                    <T>Complete Profile</T>
                  )}
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
                  <T>Log Out</T>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 rounded-2xl items-center justify-center flex-row mt-2"
                onPress={handleRequestDeletion}
                activeOpacity={0.7}
              >
                <Trash2 size={15} color="#ef4444" />
                <Text className="text-red-500 text-sm font-medium ml-1.5">
                  <T>Request Account Deletion</T>
                </Text>
              </TouchableOpacity>

              <Text className="text-center text-xs text-gray-400 mt-4">
                {isProfileComplete(user) ? (
                  <T>Ready to continue your health journey?</T>
                ) : (
                  <T>Finish your profile to unlock safe recommendations.</T>
                )}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Not authenticated - show auth options
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="flex-1 px-6">
        <View className="flex-row items-center justify-between pb-5 pt-3">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Image
                source={require("@/assets/images/logo.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
            </View>
            <Text className="ml-2.5 text-lg font-bold tracking-tight text-gray-900">
              Gluvia
            </Text>
          </View>
          <TouchableOpacity
            className="h-10 flex-row items-center justify-center rounded-full border border-gray-200 bg-white px-3"
            onPress={handleLanguage}
            activeOpacity={0.8}
          >
            <Globe2 size={18} color="#374151" />
            <Text className="ml-1.5 text-xs font-semibold text-gray-700">
              {languageCode}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="pt-8">
            <View className="mb-8 h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
              <Image
                source={require("@/assets/images/logo.png")}
                className="h-10 w-10"
                resizeMode="contain"
              />
            </View>

            <Text className="text-[34px] font-bold leading-[40px] tracking-tight text-gray-950">
              <T>Health guidance that fits your day.</T>
            </Text>
            <Text className="mt-4 text-base leading-6 text-gray-500">
              <T>
                Track meals, glucose, and personal AI guidance in one calm place.
              </T>
            </Text>

            <View className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-4">
              <FeatureItem
                icon={Heart}
                iconColor="#1447e6"
                iconBg="#eff6ff"
                title="Daily health logging"
                description="Keep food and glucose records easy to review"
              />
              <FeatureItem
                icon={ShieldCheck}
                iconColor="#059669"
                iconBg="#ecfdf5"
                title="Private by design"
                description="Control language, account access, and deletion"
              />
              <FeatureItem
                icon={MessageCircle}
                iconColor="#7c3aed"
                iconBg="#f5f3ff"
                title="Personal AI support"
                description="Use your logs for smarter, safer guidance"
              />
            </View>
          </View>

          <View className="pb-2">
            <TouchableOpacity
              className="mb-3 h-14 flex-row items-center justify-center rounded-2xl bg-primary shadow-sm"
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <LogIn size={19} color="#fff" />
              <Text className="ml-2 text-base font-semibold text-white">
                <T>Sign in</T>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="h-14 items-center justify-center rounded-2xl border border-gray-200 bg-white"
              onPress={handleSignUp}
              activeOpacity={0.8}
            >
              <Text className="text-base font-semibold text-gray-900">
                <T>Create account</T>
              </Text>
            </TouchableOpacity>

            <Text className="mt-5 px-2 text-center text-xs leading-5 text-gray-400">
              <T>By continuing, you agree to our</T>{" "}
              <Text
                className="font-semibold text-primary"
                onPress={() => setLegalModal({ visible: true, type: "terms" })}
              >
                <T>Terms</T>
              </Text>{" "}
              <T>and</T>{" "}
              <Text
                className="font-semibold text-primary"
                onPress={() =>
                  setLegalModal({ visible: true, type: "privacy" })
                }
              >
                <T>Privacy Policy</T>
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>
      <LegalModal
        visible={legalModal.visible}
        type={legalModal.type}
        onClose={() =>
          setLegalModal((current) => ({ ...current, visible: false }))
        }
      />
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
          <T>{title}</T>
        </Text>
        <Text className="text-sm text-gray-500">
          <T>{description}</T>
        </Text>
      </View>
    </View>
  );
}
