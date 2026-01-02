import { AllergiesSection, ProfileHeader } from "@/components/profile";
import { Button, InfoRow, SectionCard, SectionHeader } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Href, router } from "expo-router";
import {
  Activity,
  DollarSign,
  Globe,
  Heart,
  LogOut,
  Mail,
  Phone,
  Ruler,
  Scale,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
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
  const [refreshing, setRefreshing] = useState(false);

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
              "Please type DELETE to confirm account deletion.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace("/(auth)/login" as Href);
                    } catch (error: any) {
                      Alert.alert(
                        "Error",
                        error.message || "Failed to delete account"
                      );
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
          <Button
            onPress={handleEditProfile}
            className="mb-6"
            loading={isLoading}
          >
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

        {/* Account Info */}
        <View className="px-6 ">
          <SectionCard className="p-4">
            <Text className="text-xs text-gray-400 text-center">
              Member since {formatDate(user?.createdAt)}
            </Text>
          </SectionCard>
        </View>

        {/* Sign Out Button */}
        <View className="px-6 py-4">
          <Button
            variant="secondary"
            onPress={handleLogout}
            icon={<LogOut size={20} color="#ef4444" />}
            iconPosition="left"
          >
            <Text className="text-red-500 font-semibold">Sign Out</Text>
          </Button>
        </View>

        {/* Delete Account Button */}
        <View className="px-6 pb-4">
          <Button
            variant="ghost"
            onPress={handleDeleteAccount}
            icon={<Trash2 size={18} color="#9ca3af" />}
            iconPosition="left"
          >
            <Text className="text-gray-400 text-sm">Delete Account</Text>
          </Button>
        </View>

        {/* App Version */}
        <View className="px-6">
          <Text className="text-center text-xs text-gray-400">
            Gluvia v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
