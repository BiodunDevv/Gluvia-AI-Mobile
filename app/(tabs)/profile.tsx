import { AllergiesSection, ProfileHeader } from "@/components/profile";
import { Button, InfoRow, SectionCard, SectionHeader } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Href, router } from "expo-router";
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  CloudOff,
  DollarSign,
  Download,
  Globe,
  Heart,
  LogOut,
  Mail,
  Phone,
  Ruler,
  Scale,
  User as UserIcon,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

export default function ProfileScreen() {
  const { user, getProfile, logout, deleteAccount, uploadPhoto, isLoading } =
    useAuthStore();
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
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const getLabelForValue = (
    options: { value: string; label: string }[],
    value?: string
  ) => {
    if (!value) return "Not set";
    return options.find((opt) => opt.value === value)?.label || value;
  };

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
        {/* Profile Header */}
        <View className="px-6 pt-6">
          <ProfileHeader
            user={user}
            showEditButton
            onPhotoPress={handlePhotoUpload}
          />

          {/* Edit Profile Button */}
          <Button onPress={handleEditProfile} className="mb-6">
            Edit Profile
          </Button>
        </View>

        {/* Personal Info Section */}
        <View className="px-6 mb-4">
          <SectionHeader title="Personal Information" />
          <SectionCard>
            <InfoRow
              icon={Mail}
              label="Email"
              value={user?.email || "Not set"}
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={user?.phone || "Not set"}
            />
            <InfoRow
              icon={Users}
              label="Age"
              value={
                user?.profile?.age ? `${user.profile.age} years` : "Not set"
              }
            />
            <InfoRow
              icon={UserIcon}
              label="Sex"
              value={getLabelForValue(SEX_OPTIONS, user?.profile?.sex)}
              showDivider={false}
            />
          </SectionCard>
        </View>

        {/* Health Info Section */}
        <View className="px-6 mb-4">
          <SectionHeader title="Health Information" />
          <SectionCard>
            <InfoRow
              icon={Ruler}
              label="Height"
              value={
                user?.profile?.heightCm
                  ? `${user.profile.heightCm} cm`
                  : "Not set"
              }
            />
            <InfoRow
              icon={Scale}
              label="Weight"
              value={
                user?.profile?.weightKg
                  ? `${user.profile.weightKg} kg`
                  : "Not set"
              }
            />
            <InfoRow
              icon={Heart}
              label="Diabetes Type"
              value={getLabelForValue(
                DIABETES_TYPES,
                user?.profile?.diabetesType
              )}
            />
            <InfoRow
              icon={Activity}
              label="Activity Level"
              value={getLabelForValue(
                ACTIVITY_LEVELS,
                user?.profile?.activityLevel
              )}
              showDivider={false}
            />
          </SectionCard>
        </View>

        {/* Allergies Section */}
        <AllergiesSection allergies={user?.profile?.allergies} />

        {/* Preferences Section */}
        <View className="px-6 mb-4">
          <SectionHeader title="Preferences" />
          <SectionCard>
            <InfoRow
              icon={DollarSign}
              label="Income Bracket"
              value={getLabelForValue(
                INCOME_BRACKETS,
                user?.profile?.incomeBracket
              )}
            />
            <InfoRow
              icon={Globe}
              label="Language"
              value={user?.profile?.language || "Not set"}
              showDivider={false}
            />
          </SectionCard>
        </View>

        {/* Data & Sync Section */}
        <View className="px-6 mb-4">
          <SectionHeader title="Data & Sync" />

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
                {isOnline ? "Connected to Internet" : "Offline Mode"}
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
                  <Text className="text-xs text-gray-400 mb-1">Last Sync</Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {formatSyncDate(lastSyncAt)}
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-xs text-gray-400 mb-1">Foods</Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {foods.length}
                  </Text>
                </View>
                <View className="flex-1 items-end">
                  <Text className="text-xs text-gray-400 mb-1">Rules</Text>
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
                    <ActivityIndicator size="small" color="#1447e6" />
                  ) : (
                    <ArrowDownCircle size={24} color="#1447e6" />
                  )}
                </View>
                <Text className="text-sm font-semibold text-gray-800 text-center">
                  Check Updates
                </Text>
                <Text className="text-xs text-gray-400 text-center mt-1">
                  Find new data
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
                    <ActivityIndicator size="small" color="#f59e0b" />
                  ) : (
                    <Download size={24} color="#f59e0b" />
                  )}
                </View>
                <Text className="text-sm font-semibold text-gray-800 text-center">
                  Force Sync
                </Text>
                <Text className="text-xs text-gray-400 text-center mt-1">
                  Re-download all
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
                    <ActivityIndicator size="small" color="#6b7280" />
                  ) : (
                    <CloudOff size={20} color="#6b7280" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700">
                    Clear Cached Data
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Remove all local data and start fresh
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Account Info */}
        <View className="px-6 mb-4">
          <View className="bg-gray-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500 text-center">
              Member since {formatDate(user?.createdAt)}
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <View className="px-6 mb-3">
          <Pressable
            onPress={handleLogout}
            className="bg-red-50 rounded-2xl p-4 flex-row items-center justify-center"
          >
            <LogOut size={20} color="#ef4444" />
            <Text className="text-red-500 font-semibold ml-2">Sign Out</Text>
          </Pressable>
        </View>

        {/* Delete Account Section */}
        <View className="px-6 mb-6">
          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            className="flex-row items-center justify-center py-3"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#9ca3af" />
            ) : (
              <>
                <AlertTriangle size={16} color="#9ca3af" />
                <Text className="text-gray-400 text-sm ml-2">
                  Delete Account
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* App Version */}
        <View className="px-6 pb-6">
          <Text className="text-center text-xs text-gray-400">
            Gluvia v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
