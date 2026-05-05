import { AllergiesSection, ProfileHeader } from "@/components/profile";
import { AppLoader, Button } from "@/components/ui";
import { InfoRow } from "@/components/ui/info-row";
import { SectionCard, SectionHeader } from "@/components/ui/section";
import { T, useTranslation } from "@/hooks/use-translation";
import {
  getMissingProfileFields,
  isProfileComplete,
} from "@/lib/profile-completion";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Href, router } from "expo-router";
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  CloudOff,
  DollarSign,
  Download,
  ExternalLink,
  Globe,
  Heart,
  LogOut,
  Mail,
  Phone,
  Ruler,
  Scale,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";

const DIABETES_TYPES = [
  { value: "type1", label: "Type 1" },
  { value: "type2", label: "Type 2" },
  { value: "prediabetes", label: "Prediabetes" },
  { value: "unknown", label: "Unknown" },
];

const ACTIVITY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

const INCOME_BRACKETS = [
  { value: "low", label: "Low" },
  { value: "middle", label: "Middle" },
  { value: "high", label: "High" },
];

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function CompactInfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-[47%] flex-1 rounded-2xl border border-gray-100 bg-white px-4 py-4">
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
        <Icon size={18} color="#1447e6" />
      </View>
      <Text className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-semibold leading-6 text-gray-900">
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const {
    user,
    getProfile,
    logout,
    deleteAccount,
    uploadPhoto,
    isLoading,
  } = useAuthStore();
  const { settings: appSettings, fetchSettings } = useAppSettingsStore();
  const { language, languages, t } = useTranslation();
  const {
    clientVersion,
    serverVersion,
    lastSyncAt,
    foods,
    rules,
    isSyncing,
    isOnline,
    getFullSync,
    checkAndApplyUpdates,
    clearAllDataAndReset,
  } = useSyncStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh profile when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      getProfile().catch(() => {});
      fetchSettings().catch(() => {});
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await getProfile();
    } catch {}
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login" as Href);
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    router.push("/edit-profile" as Href);
  };

  const handleChangeLanguage = async () => {
    router.push("/language" as Href);
  };

  const handlePhotoUpload = async () => {
    Alert.alert("Update Profile Photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission Required",
              "Camera permission is required to take photos."
            );
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            try {
              await uploadPhoto(result.assets[0].uri);
              await getProfile(); // Refresh profile to show new image
              Alert.alert("Success", "Profile photo updated successfully!");
            } catch (error: any) {
              Alert.alert(
                "Upload Failed",
                error.message || "Failed to upload photo"
              );
            }
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission Required",
              "Photo library permission is required to select photos."
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            try {
              await uploadPhoto(result.assets[0].uri);
              await getProfile(); // Refresh profile to show new image
              Alert.alert("Success", "Profile photo updated successfully!");
            } catch (error: any) {
              Alert.alert(
                "Upload Failed",
                error.message || "Failed to upload photo"
              );
            }
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDeleteAccount = () => {
    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "You need an internet connection to delete your account. Please connect to Wi-Fi or enable mobile data.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Deletion",
              "This will permanently delete your account and all associated data.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await deleteAccount();
                      router.replace("/(auth)/login" as Href);
                    } catch (error: any) {
                      Alert.alert(
                        "Error",
                        error.message || "Failed to delete account"
                      );
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleRequestAccountDeletion = async () => {
    const url = "https://gluvia.vercel.app/delete-account";

    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "You need an internet connection to open the account deletion request page."
      );
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
    } catch {
      await Linking.openURL(url);
    }
  };

  const handleOpenSupportForm = async () => {
    const link = appSettings?.googleFormLink?.trim();

    if (!link) {
      Alert.alert(
        "Form unavailable",
        "The admin has not configured a Google Form link yet."
      );
      return;
    }

    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "You need an internet connection to open the form."
      );
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(link, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
    } catch {
      await Linking.openURL(link);
    }
  };

  const handleCallSupport = async () => {
    const phone = appSettings?.supportPhone?.trim();

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "The admin has not configured a support phone number yet."
      );
      return;
    }

    const telUrl = `tel:${phone.replace(/\s+/g, "")}`;
    const canOpen = await Linking.canOpenURL(telUrl);

    if (!canOpen) {
      Alert.alert("Call unavailable", "This device cannot place calls.");
      return;
    }

    await Linking.openURL(telUrl);
  };

  const handleForceSync = async () => {
    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "You need an internet connection to sync data. Please connect to Wi-Fi or enable mobile data.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Force Sync",
      "This will download all foods and rules data from the server. This may take a moment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync Now",
          onPress: async () => {
            setIsForceSyncing(true);
            try {
              const result = await getFullSync();
              Alert.alert(
                "Sync Complete",
                `Successfully synced ${result.foods.length} foods and ${result.rules.length} rules.\n\nServer Version: ${result.serverVersion}`
              );
            } catch (error: any) {
              Alert.alert(
                "Sync Failed",
                error.message || "Failed to sync data. Please try again."
              );
            } finally {
              setIsForceSyncing(false);
            }
          },
        },
      ]
    );
  };

  const handleCheckUpdates = async () => {
    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "You need an internet connection to check for updates. Please connect to Wi-Fi or enable mobile data.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsCheckingUpdates(true);
    try {
      const result = await checkAndApplyUpdates();
      if (result.hasChanges) {
        Alert.alert(
          "Updates Applied",
          `Found and applied updates:\n• ${result.foodsUpdated} foods updated\n• ${result.rulesUpdated} rules updated`
        );
      } else {
        Alert.alert("Up to Date", "Your data is already up to date!");
      }
    } catch (error: any) {
      Alert.alert(
        "Check Failed",
        error.message || "Failed to check for updates. Please try again."
      );
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Cached Data",
      "This will remove all cached foods, rules, and pending logs. You will need to sync again to use the app.\n\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            setIsClearingData(true);
            try {
              await clearAllDataAndReset();
              Alert.alert(
                "Data Cleared",
                "All cached data has been cleared. Please sync to download fresh data."
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to clear data. Please try again."
              );
            } finally {
              setIsClearingData(false);
            }
          },
        },
      ]
    );
  };

  const formatSyncDate = (dateString?: string | null) => {
    if (!dateString) return t("Never");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t("N/A");
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const getLabelForValue = (
    options: { value: string; label: string }[],
    value?: string
  ) => {
    if (!value) return t("Not set");
    return t(options.find((opt) => opt.value === value)?.label || value);
  };

  const missingFields = getMissingProfileFields(user);
  const profileReady = isProfileComplete(user);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        className="flex-1 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1447e6"]}
            tintColor="#1447e6"
          />
        }
      >
        <View className="px-4 pt-5">
          <ProfileHeader
            user={user}
            showEditButton
            onPhotoPress={handlePhotoUpload}
          />

          <View className="mb-4 flex-row gap-3">
            <Button onPress={handleEditProfile} className="flex-1">
              {profileReady ? t("Edit Profile") : t("Complete Profile")}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onPress={handleChangeLanguage}
            >
              <T>Language</T>
            </Button>
          </View>
        </View>

        <Animated.View entering={FadeIn.delay(60)} className="mb-4 px-4">
          <View
            className={`rounded-3xl border p-5 ${
              profileReady
                ? "border-emerald-100 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className={`text-sm font-semibold uppercase tracking-wider ${
                    profileReady ? "text-emerald-700" : "text-amber-800"
                  }`}
                >
                  {t("Profile Status")}
                </Text>
                <Text className="mt-2 text-lg font-bold text-gray-900">
                  {profileReady
                    ? t("Your health profile is ready")
                    : t("Required details still missing")}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-gray-700">
                  {profileReady
                    ? t(
                        "Your dashboard and recommendations now have the profile details they need."
                      )
                    : `${t("Missing")}: ${missingFields
                        .map((field) =>
                          field
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^\w/, (char) => char.toUpperCase())
                        )
                        .join(", ")}.`}
                </Text>
              </View>
              <View className="rounded-full bg-white/80 px-3 py-1.5">
                <Text className="text-xs font-semibold text-gray-700">
                  {user?.role === "admin" ? t("Admin") : t("Patient")}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View className="mb-4 px-4">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            <T>Profile Snapshot</T>
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <CompactInfoCard
              icon={Mail}
              label={t("Email")}
              value={user?.email || t("Not set")}
            />
            <CompactInfoCard
              icon={Phone}
              label={t("Phone")}
              value={user?.phone || t("Not set")}
            />
            <CompactInfoCard
              icon={Heart}
              label={t("Diabetes Type")}
              value={getLabelForValue(DIABETES_TYPES, user?.profile?.diabetesType)}
            />
            <CompactInfoCard
              icon={Activity}
              label={t("Activity Level")}
              value={getLabelForValue(ACTIVITY_LEVELS, user?.profile?.activityLevel)}
            />
            <CompactInfoCard
              icon={Scale}
              label={t("Weight")}
              value={
                user?.profile?.weightKg
                  ? `${user.profile.weightKg} kg`
                  : t("Not set")
              }
            />
            <CompactInfoCard
              icon={Ruler}
              label={t("Height")}
              value={
                user?.profile?.heightCm
                  ? `${user.profile.heightCm} cm`
                  : t("Not set")
              }
            />
            <CompactInfoCard
              icon={DollarSign}
              label={t("Income Bracket")}
              value={getLabelForValue(
                INCOME_BRACKETS,
                user?.profile?.incomeBracket
              )}
            />
            <CompactInfoCard
              icon={Globe}
              label={t("Language")}
              value={
                languages.find(
                  (item) => item.value === (user?.profile?.language || language)
                )?.label || user?.profile?.language || t("Not set")
              }
            />
          </View>
        </View>

        <AllergiesSection allergies={user?.profile?.allergies} />

        <View className="mb-4 px-4">
          <SectionHeader title={t("Help & Forms")} />
          <View className="mt-3 flex-row gap-3">
            <Pressable
              onPress={handleCallSupport}
              className="flex-1 rounded-2xl border border-gray-100 bg-white px-4 py-4"
            >
              <View className="items-center">
                <View className="mb-3 h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <Phone size={20} color="#10b981" />
                </View>
                <Text className="text-sm font-semibold text-gray-900">
                  <T>Call Support</T>
                </Text>
                <Text className="mt-1 text-center text-xs text-gray-500">
                  <T>Use the support phone configured by admin</T>
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleOpenSupportForm}
              className="flex-1 rounded-2xl border border-gray-100 bg-white px-4 py-4"
            >
              <View className="items-center">
                <View className="mb-3 h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <ExternalLink size={20} color="#1447e6" />
                </View>
                <Text className="text-sm font-semibold text-gray-900">
                  <T>Open Form</T>
                </Text>
                <Text className="mt-1 text-center text-xs text-gray-500">
                  <T>Send a review or suggestion inside the app</T>
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Data & Sync Section */}
        <View className="mb-4 px-4">
          <SectionHeader title={t("Data & Sync")} />

          {/* Network Status Banner */}
          <Animated.View entering={FadeIn} className="mb-3">
            <View
              className={`flex-row items-center px-4 py-3 rounded-xl ${
                isOnline ? "bg-green-50" : "bg-amber-50"
              }`}
            >
              {isOnline ? (
                <Wifi size={18} color="#22c55e" />
              ) : (
                <WifiOff size={18} color="#f59e0b" />
              )}
              <Text
                className={`ml-2 text-sm font-medium ${
                  isOnline ? "text-green-700" : "text-amber-700"
                }`}
              >
                {isOnline ? t("Connected to Internet") : t("Offline Mode")}
              </Text>
            </View>
          </Animated.View>

          {/* Sync Status Card */}
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3">
            <View className="p-4 bg-gray-50">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <View
                    className={`w-3 h-3 rounded-full mr-2 ${
                      clientVersion > 0 ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <Text className="text-base font-semibold text-gray-800">
                    {clientVersion > 0 ? "Data Synced" : "Sync Required"}
                    
                  </Text>
                </View>
                <Text className="text-xs text-gray-500">
                  v{clientVersion || 0}
                </Text>
              </View>
            </View>
            <View className="p-4">
              <View className="flex-row justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 mb-1">
                    <T>Last Sync</T>
                  </Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {formatSyncDate(lastSyncAt)}
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-xs text-gray-400 mb-1">
                    <T>Foods</T>
                  </Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {foods.length}
                  </Text>
                </View>
                <View className="flex-1 items-end">
                  <Text className="text-xs text-gray-400 mb-1">
                    <T>Rules</T>
                  </Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {rules.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons Grid */}
          <View className="flex-row gap-3 mb-3">
            {/* Check Updates Button */}
            <Pressable
              onPress={handleCheckUpdates}
              disabled={
                isCheckingUpdates ||
                isSyncing ||
                clientVersion === 0 ||
                !isOnline
              }
              className={`flex-1 bg-white rounded-2xl border border-gray-100 p-4 ${
                isCheckingUpdates ||
                isSyncing ||
                clientVersion === 0 ||
                !isOnline
                  ? "opacity-50"
                  : ""
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="items-center">
                <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mb-3">
                  {isCheckingUpdates ? (
                    <AppLoader size="sm" color="#1447e6" />
                  ) : (
                    <ArrowDownCircle size={24} color="#1447e6" />
                  )}
                </View>
                  <Text className="text-sm font-semibold text-gray-800 text-center">
                    <T>Check Updates</T>
                  </Text>
                  <Text className="text-xs text-gray-400 text-center mt-1">
                    <T>Find new data</T>
                  </Text>
              </View>
            </Pressable>

            {/* Force Sync Button */}
            <Pressable
              onPress={handleForceSync}
              disabled={isForceSyncing || isSyncing || !isOnline}
              className={`flex-1 bg-white rounded-2xl border border-gray-100 p-4 ${
                isForceSyncing || isSyncing || !isOnline ? "opacity-50" : ""
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="items-center">
                <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center mb-3">
                  {isForceSyncing ? (
                    <AppLoader size="sm" color="#f59e0b" />
                  ) : (
                    <Download size={24} color="#f59e0b" />
                  )}
                </View>
                  <Text className="text-sm font-semibold text-gray-800 text-center">
                    <T>Force Sync</T>
                  </Text>
                  <Text className="text-xs text-gray-400 text-center mt-1">
                    <T>Re-download all</T>
                  </Text>
              </View>
            </Pressable>
          </View>

          {/* Clear Cache Button */}
          <Pressable
            onPress={handleClearAllData}
            disabled={isClearingData || isSyncing}
            className={`bg-white rounded-2xl border border-gray-100 p-4 ${
              isClearingData || isSyncing ? "opacity-50" : ""
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center mr-3">
                  {isClearingData ? (
                    <AppLoader size="sm" color="#6b7280" />
                  ) : (
                    <CloudOff size={20} color="#6b7280" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700">
                    <T>Clear Cached Data</T>
                  </Text>
                  <Text className="text-xs text-gray-400">
                    <T>Remove all local data and start fresh</T>
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Account Info */}
        <View className="mb-4 px-4">
          <View className="bg-gray-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500 text-center">
              <T>Member since</T> {formatDate(user?.createdAt)}
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <View className="mb-3 px-4">
          <Pressable
            onPress={handleLogout}
            className="bg-red-50 rounded-2xl p-4 flex-row items-center justify-center"
          >
            <LogOut size={20} color="#ef4444" />
            <Text className="text-red-500 font-semibold ml-2">
              <T>Sign Out</T>
            </Text>
          </Pressable>
        </View>

        {/* Delete Account Section */}
        <View className="mb-6 gap-3 px-4">
          <Pressable
            onPress={handleRequestAccountDeletion}
            className="rounded-2xl border border-red-100 bg-red-50 p-4"
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white">
                <ExternalLink size={18} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-red-600">
                  <T>Request account deletion</T>
                </Text>
                <Text className="mt-1 text-xs leading-5 text-red-400">
                  <T>Open the verified web request form for Google Play account deletion.</T>
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            className="flex-row items-center justify-center py-3"
          >
            {isDeleting ? (
              <AppLoader size="sm" color="#9ca3af" />
            ) : (
              <>
                <AlertTriangle size={16} color="#9ca3af" />
                <Text className="text-gray-400 text-sm ml-2">
                  <T>Delete Account</T>
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* App Version */}
        <View className="px-4 pb-6">
          <Text className="text-center text-xs text-gray-400">
            Gluvia v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
