import { ProfileFieldRow, ProfileHeader } from "@/components/profile";
import { AppLoader, Button } from "@/components/ui";
import { T, useTranslation } from "@/hooks/use-translation";
import { formatHeight } from "@/lib/height";
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
  BriefcaseBusiness,
  CloudOff,
  Download,
  ExternalLink,
  Globe,
  HeartPulse,
  Languages,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Ruler,
  Scale,
  ShieldCheck,
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

const DIABETES_LABELS: Record<string, string> = {
  type1: "Type 1 diabetes",
  type2: "Type 2 diabetes",
  prediabetes: "Prediabetes",
  unknown: "Not sure",
};

const ACTIVITY_LABELS: Record<string, string> = {
  low: "Light activity",
  moderate: "Moderate activity",
  high: "High activity",
};

const INCOME_LABELS: Record<string, string> = {
  low: "Budget-conscious",
  middle: "Moderate budget",
  high: "Flexible budget",
};

const FIELD_LABELS: Record<string, string> = {
  diabetesType: "Diabetes type",
  age: "Age",
  sex: "Sex",
  heightCm: "Height",
  weightKg: "Weight",
  activityLevel: "Activity level",
  incomeBracket: "Food budget preference",
  language: "Language",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
        <T>{title}</T>
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  onPress,
  tone = "default",
  disabled,
  loading,
}: {
  icon: any;
  title: string;
  description: string;
  onPress: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const danger = tone === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-2xl border bg-white px-4 py-4 ${
        danger ? "border-red-100" : "border-gray-100"
      } ${disabled || loading ? "opacity-50" : ""}`}
    >
      <View className="flex-row items-center">
        <View
          className={`mr-3 h-11 w-11 items-center justify-center rounded-xl ${
            danger ? "bg-red-50" : "bg-primary/10"
          }`}
        >
          {loading ? (
            <AppLoader size="sm" color={danger ? "#ef4444" : "#1447e6"} />
          ) : (
            <Icon size={20} color={danger ? "#ef4444" : "#1447e6"} />
          )}
        </View>
        <View className="flex-1">
          <Text
            className={`text-sm font-semibold ${
              danger ? "text-red-600" : "text-gray-900"
            }`}
          >
            <T>{title}</T>
          </Text>
          <Text className="mt-1 text-xs leading-5 text-gray-500">
            <T>{description}</T>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const {
    user,
    getProfile,
    logout,
    deleteAccount,
    uploadPhoto,
  } = useAuthStore();
  const { settings: appSettings, fetchSettings } = useAppSettingsStore();
  const { language, languages, t } = useTranslation();
  const {
    clientVersion,
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

  useFocusEffect(
    useCallback(() => {
      getProfile().catch(() => {});
      fetchSettings().catch(() => {});
    }, [fetchSettings, getProfile])
  );

  const profileReady = isProfileComplete(user);
  const missingFields = getMissingProfileFields(user);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await getProfile();
      await fetchSettings();
    } catch {}
    setRefreshing(false);
  };

  const formatSyncDate = (value?: string | null) => {
    if (!value) return "Never";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePhotoUpload = async () => {
    Alert.alert(t("Update profile photo"), t("Choose an option"), [
      {
        text: t("Take photo"),
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (permission.status !== "granted") {
            Alert.alert(t("Permission required"), t("Camera permission is required."));
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri);
            await getProfile();
          }
        },
      },
      {
        text: t("Choose from library"),
        onPress: async () => {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (permission.status !== "granted") {
            Alert.alert(
              t("Permission required"),
              t("Photo library permission is required.")
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
            await uploadPhoto(result.assets[0].uri);
            await getProfile();
          }
        },
      },
      { text: t("Cancel"), style: "cancel" },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t("Sign out"), t("Are you sure you want to sign out?"), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Sign out"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login" as Href);
        },
      },
    ]);
  };

  const handleRequestDeletion = async () => {
    const url = "https://gluvia.vercel.app/delete-account";
    if (!isOnline) {
      Alert.alert(t("Internet required"), t("Connect to open the deletion request."));
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

  const handleDeleteAccount = () => {
    if (!isOnline) {
      Alert.alert(t("Internet required"), t("Connect to delete your account."));
      return;
    }

    Alert.alert(
      t("Delete account"),
      t("This permanently deletes your account and associated data."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
              router.replace("/(auth)/login" as Href);
            } catch (error: any) {
              Alert.alert(t("Error"), error.message || t("Failed to delete account."));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenSupportForm = async () => {
    const link = appSettings?.googleFormLink?.trim();
    if (!link) {
      Alert.alert(t("Form unavailable"), t("Support form is not configured yet."));
      return;
    }
    if (!isOnline) {
      Alert.alert(t("Internet required"), t("Connect to open the support form."));
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
      Alert.alert(t("Phone unavailable"), t("Support phone is not configured yet."));
      return;
    }
    await Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  };

  const handleCheckUpdates = async () => {
    if (!isOnline) {
      Alert.alert(t("Internet required"), t("Connect to check for updates."));
      return;
    }
    setIsCheckingUpdates(true);
    try {
      const result = await checkAndApplyUpdates();
      Alert.alert(
        result.hasChanges ? t("Updates applied") : t("Up to date"),
        result.hasChanges
          ? `${result.foodsUpdated} ${t("foods")} ${t("and")} ${result.rulesUpdated} ${t("rules updated")}.`
          : t("Your local data is already current.")
      );
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleForceSync = async () => {
    if (!isOnline) {
      Alert.alert(t("Internet required"), t("Connect to sync data."));
      return;
    }
    setIsForceSyncing(true);
    try {
      const result = await getFullSync();
      Alert.alert(
        t("Sync complete"),
        `${t("Synced")} ${result.foods.length} ${t("foods")} ${t("and")} ${result.rules.length} ${t("rules")}.`
      );
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      t("Clear cached data"),
      t("This removes cached foods, rules, and pending logs from this device."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Clear"),
          style: "destructive",
          onPress: async () => {
            setIsClearingData(true);
            try {
              await clearAllDataAndReset();
            } finally {
              setIsClearingData(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
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
        <ProfileHeader
          user={user}
          showEditButton
          onPhotoPress={handlePhotoUpload}
        />

        <View className="mb-4 flex-row gap-3">
          <Button
            onPress={() => router.push("/edit-profile" as Href)}
            className="flex-1"
          >
            {profileReady ? t("Edit profile") : t("Complete profile")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-white"
            onPress={() => router.push("/language" as Href)}
          >
            <T>Language</T>
          </Button>
        </View>

        <Animated.View entering={FadeIn.delay(50)}>
          <View
            className={`mb-5 rounded-3xl border p-5 ${
              profileReady
                ? "border-emerald-100 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <View className="flex-row items-start">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-white/80">
                <ShieldCheck
                  size={22}
                  color={profileReady ? "#059669" : "#b45309"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  <T>
                    {profileReady
                      ? "Profile ready"
                      : "Finish your profile setup"}
                  </T>
                </Text>
                <Text className="mt-1 text-sm leading-6 text-gray-700">
                  {profileReady
                    ? t("Your profile details are ready for safer recommendations.")
                    : `${t("Missing")}: ${missingFields
                        .map((field) => t(FIELD_LABELS[field] || field))
                        .join(", ")}.`}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Section title="Profile summary">
          <ProfileFieldRow
            icon={Mail}
            label="Email"
            value={user?.email || "Not set"}
          />
          <ProfileFieldRow
            icon={Phone}
            label="Phone"
            value={user?.phone || "Not set"}
          />
          <ProfileFieldRow
            icon={HeartPulse}
            label="Diabetes type"
            value={DIABETES_LABELS[user?.profile?.diabetesType || ""] || "Not set"}
          />
          <ProfileFieldRow
            icon={Activity}
            label="Activity level"
            value={ACTIVITY_LABELS[user?.profile?.activityLevel || ""] || "Not set"}
          />
          <ProfileFieldRow
            icon={Ruler}
            label="Height"
            value={formatHeight(user?.profile?.heightCm)}
          />
          <ProfileFieldRow
            icon={Scale}
            label="Weight"
            value={
              user?.profile?.weightKg ? `${user.profile.weightKg} kg` : "Not set"
            }
          />
          <ProfileFieldRow
            icon={BriefcaseBusiness}
            label="Food budget preference"
            value={INCOME_LABELS[user?.profile?.incomeBracket || ""] || "Not set"}
          />
          <ProfileFieldRow
            icon={Globe}
            label="Language"
            value={
              languages.find(
                (item) => item.value === (user?.profile?.language || language)
              )?.label || "Not set"
            }
          />
        </Section>

        {user?.profile?.allergies?.length ? (
          <Section title="Allergies">
            <View className="flex-row flex-wrap gap-2 rounded-2xl border border-red-100 bg-red-50 p-4">
              {user.profile.allergies.map((allergy, index) => (
                <View
                  key={`${allergy}-${index}`}
                  className="rounded-full border border-red-100 bg-white px-3 py-2"
                >
                  <Text className="text-sm font-medium text-red-700">
                    {allergy}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Support">
          <ActionRow
            icon={Phone}
            title="Call support"
            description="Use the support phone configured by the admin."
            onPress={handleCallSupport}
          />
          <ActionRow
            icon={ExternalLink}
            title="Open support form"
            description="Send a review, question, or suggestion."
            onPress={handleOpenSupportForm}
          />
          <ActionRow
            icon={Languages}
            title="Language"
            description="Change the app language used across Gluvia."
            onPress={() => router.push("/language" as Href)}
          />
        </Section>

        <Section title="Data and sync">
          <View
            className={`flex-row items-center rounded-2xl border px-4 py-3 ${
              isOnline
                ? "border-emerald-100 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            {isOnline ? (
              <Wifi size={18} color="#059669" />
            ) : (
              <WifiOff size={18} color="#b45309" />
            )}
            <Text
              className={`ml-2 text-sm font-semibold ${
                isOnline ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              <T>{isOnline ? "Online" : "Offline"}</T>
            </Text>
            <Text className="ml-auto text-xs text-gray-500">
              <T>Last sync</T>: {formatSyncDate(lastSyncAt)}
            </Text>
          </View>

          <View className="rounded-2xl border border-gray-100 bg-white p-4">
            <View className="flex-row">
              <View className="flex-1">
                <Text className="text-xs text-gray-400">
                  <T>Foods</T>
                </Text>
                <Text className="mt-1 text-lg font-bold text-gray-900">
                  {foods.length}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-400">
                  <T>Rules</T>
                </Text>
                <Text className="mt-1 text-lg font-bold text-gray-900">
                  {rules.length}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-400">
                  <T>Version</T>
                </Text>
                <Text className="mt-1 text-lg font-bold text-gray-900">
                  {clientVersion || 0}
                </Text>
              </View>
            </View>
          </View>

          <ActionRow
            icon={ArrowDownCircle}
            title="Check updates"
            description="Find new foods and guidance rules."
            onPress={handleCheckUpdates}
            disabled={!isOnline || isSyncing || clientVersion === 0}
            loading={isCheckingUpdates}
          />
          <ActionRow
            icon={Download}
            title="Full sync"
            description="Re-download foods and rules from the server."
            onPress={handleForceSync}
            disabled={!isOnline || isSyncing}
            loading={isForceSyncing}
          />
          <ActionRow
            icon={CloudOff}
            title="Clear cached data"
            description="Remove local cached data and start fresh."
            onPress={handleClearCache}
            disabled={isSyncing}
            loading={isClearingData}
          />
        </Section>

        <Section title="Account">
          <ActionRow
            icon={ExternalLink}
            title="Request account deletion"
            description="Open the verified web request page."
            onPress={handleRequestDeletion}
            tone="danger"
            disabled={!isOnline}
          />
          <ActionRow
            icon={AlertTriangle}
            title="Delete account now"
            description="Permanently delete this account from the app."
            onPress={handleDeleteAccount}
            tone="danger"
            disabled={!isOnline}
            loading={isDeleting}
          />
          <ActionRow
            icon={LogOut}
            title="Sign out"
            description="Leave this device signed out of Gluvia."
            onPress={handleLogout}
            tone="danger"
          />
        </Section>

        <View className="items-center pb-2">
          <RefreshCw size={15} color="#9ca3af" />
          <Text className="mt-2 text-xs text-gray-400">Gluvia v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
