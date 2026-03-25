/**
 * Sync Required Modal
 *
 * Full-screen modal for syncing food data and rules.
 * Shows for first-time users OR when data has changed (increase/decrease).
 * Displays progress during sync and allows continuation when complete.
 */

import { Ionicons } from "@expo/vector-icons";
import {
  ArrowRight,
  CheckCircle,
  Database,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wifi,
  Zap,
} from "lucide-react-native";
import { useMemo } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  ZoomInEasyDown,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export interface SyncProgress {
  foods: boolean;
  rules: boolean;
}

export type SyncReason =
  | "first-time"
  | "data-increased"
  | "data-decreased"
  | "refresh";

export interface SyncRequiredModalProps {
  visible: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onContinue: () => void;
  onSkip?: () => void;
  syncProgress?: SyncProgress;
  foodCount: number;
  rulesCount?: number;
  previousFoodCount?: number;
  syncReason?: SyncReason;
  dismissible?: boolean;
}

export function SyncRequiredModal({
  visible,
  isSyncing,
  onSync,
  onContinue,
  onSkip,
  syncProgress,
  foodCount,
  rulesCount = 0,
  previousFoodCount = 0,
  syncReason = "first-time",
  dismissible = false,
}: SyncRequiredModalProps) {
  const isSyncComplete = syncProgress?.foods && syncProgress?.rules;

  // Calculate the data change
  const dataChange = useMemo(() => {
    if (previousFoodCount === 0) return null;
    const diff = foodCount - previousFoodCount;
    if (diff > 0) return { type: "increased" as const, count: diff };
    if (diff < 0) return { type: "decreased" as const, count: Math.abs(diff) };
    return null;
  }, [foodCount, previousFoodCount]);

  // Get appropriate messaging based on sync reason
  const content = useMemo(() => {
    if (isSyncComplete) {
      return {
        title: "You're All Set!",
        description: `We've loaded ${foodCount} foods and ${rulesCount} smart rules\nfor your personalized experience.`,
        icon: <Ionicons name="checkmark-circle" size={56} color="#22c55e" />,
      };
    }

    switch (syncReason) {
      case "data-increased":
        return {
          title: "New Foods Available",
          description: `${dataChange?.count || "New"} new foods have been added to our database.\nSync now to get the latest recommendations.`,
          icon: <TrendingUp size={48} color="#22c55e" />,
        };
      case "data-decreased":
        return {
          title: "Database Updated",
          description: `Some foods have been updated or removed.\nSync now to ensure accurate recommendations.`,
          icon: <TrendingDown size={48} color="#f59e0b" />,
        };
      case "refresh":
        return {
          title: "Refresh Available",
          description:
            "Get the latest foods and recommendations.\nThis only takes a moment.",
          icon: <RefreshCw size={48} color="#1447e6" />,
        };
      default:
        return {
          title: "Welcome to Gluvia AI",
          description:
            "Let's set up your personalized meal recommendations.\nThis only takes a moment.",
          icon: <Database size={48} color="#1447e6" />,
        };
    }
  }, [isSyncComplete, syncReason, dataChange, foodCount, rulesCount]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView className="flex-1 bg-primary">
        <View className="flex-1 justify-center items-center px-8 md:px-12">
          {/* Logo/Icon Area */}
          <Animated.View
            entering={ZoomIn.delay(200)}
            className="w-32 h-32 rounded-full bg-white/20 items-center justify-center mb-8"
          >
            <View className="w-24 h-24 rounded-full bg-white items-center justify-center">
              {isSyncComplete ? (
                <Animated.View entering={ZoomInEasyDown.delay(100)}>
                  {content.icon}
                </Animated.View>
              ) : (
                content.icon
              )}
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.Text
            entering={FadeInUp.delay(300)}
            className="text-3xl font-bold text-white text-center mb-3 max-w-xs"
          >
            {content.title}
          </Animated.Text>

          {/* Description */}
          <Animated.Text
            entering={FadeInUp.delay(400)}
            className="text-base text-white/80 text-center mb-10 leading-6 max-w-xs"
          >
            {content.description}
          </Animated.Text>

          {/* Data Change Badge - Shows when syncing due to data changes */}
          {!isSyncComplete && dataChange && (
            <Animated.View
              entering={FadeInUp.delay(450)}
              className={`flex-row items-center px-4 py-2 rounded-full mb-6 ${
                dataChange.type === "increased"
                  ? "bg-green-500/20"
                  : "bg-amber-500/20"
              }`}
            >
              {dataChange.type === "increased" ? (
                <TrendingUp size={16} color="#22c55e" />
              ) : (
                <TrendingDown size={16} color="#f59e0b" />
              )}
              <Text
                className={`text-sm font-medium ml-2 ${
                  dataChange.type === "increased"
                    ? "text-green-300"
                    : "text-amber-300"
                }`}
              >
                {dataChange.type === "increased"
                  ? `+${dataChange.count} new foods available`
                  : `${dataChange.count} foods updated`}
              </Text>
            </Animated.View>
          )}

          {/* Features List */}
          <Animated.View
            entering={FadeInUp.delay(500)}
            className="w-full bg-white/10 rounded-2xl p-5 mb-8 max-w-md"
          >
            {/* Nigerian Food Database */}
            <View className="flex-row items-center mb-4">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  syncProgress?.foods ? "bg-green-500/30" : "bg-white/20"
                }`}
              >
                {syncProgress?.foods ? (
                  <CheckCircle size={20} color="#22c55e" />
                ) : (
                  <Database size={20} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  Nigerian Food Database
                </Text>
                <Text className="text-white/70 text-sm">
                  {foodCount > 0
                    ? `${foodCount} local foods loaded`
                    : "100+ local foods with nutritional info"}
                </Text>
              </View>
              {syncProgress?.foods && (
                <Animated.View entering={ZoomIn}>
                  <CheckCircle size={20} color="#22c55e" />
                </Animated.View>
              )}
            </View>

            {/* AI Recommendation Rules */}
            <View className="flex-row items-center mb-4">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  syncProgress?.rules ? "bg-green-500/30" : "bg-white/20"
                }`}
              >
                {syncProgress?.rules ? (
                  <CheckCircle size={20} color="#22c55e" />
                ) : (
                  <Zap size={20} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  AI Recommendation Rules
                </Text>
                <Text className="text-white/70 text-sm">
                  {rulesCount > 0
                    ? `${rulesCount} smart rules for diabetes management`
                    : "Smart rules for diabetes management"}
                </Text>
              </View>
              {syncProgress?.rules && (
                <Animated.View entering={ZoomIn}>
                  <CheckCircle size={20} color="#22c55e" />
                </Animated.View>
              )}
            </View>

            {/* Works Offline */}
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
                <Wifi size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">Works Offline</Text>
                <Text className="text-white/70 text-sm">
                  Access recommendations anywhere
                </Text>
              </View>
              {isSyncComplete && (
                <Animated.View entering={ZoomIn.delay(200)}>
                  <CheckCircle size={20} color="#22c55e" />
                </Animated.View>
              )}
            </View>
          </Animated.View>

          {/* Action Button */}
          <Animated.View
            entering={FadeInUp.delay(600)}
            className="w-full max-w-md"
          >
            {isSyncComplete ? (
              // Continue Button
              <Pressable
                onPress={onContinue}
                className="w-full py-4 rounded-2xl items-center justify-center flex-row bg-white active:bg-gray-100 shadow-lg"
              >
                <Text className="text-primary font-bold text-lg mr-2">
                  Continue to Gluvia
                </Text>
                <ArrowRight size={22} color="#1447e6" />
              </Pressable>
            ) : (
              // Sync Button
              <Pressable
                onPress={onSync}
                disabled={isSyncing}
                className={`w-full py-4 rounded-2xl items-center justify-center flex-row ${
                  isSyncing
                    ? "bg-white/50"
                    : "bg-white active:bg-gray-100 shadow-lg"
                }`}
              >
                {isSyncing ? (
                  <>
                    <ActivityIndicator color="#1447e6" size="small" />
                    <Text className="text-primary font-bold text-lg ml-3">
                      Syncing Data...
                    </Text>
                  </>
                ) : (
                  <>
                    <Download size={22} color="#1447e6" />
                    <Text className="text-primary font-bold text-lg ml-3">
                      {syncReason === "first-time"
                        ? "Download & Get Started"
                        : "Sync Now"}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </Animated.View>

          {/* Skip/Cancel Button - Shows only when dismissible */}
          {dismissible && !isSyncComplete && (
            <Animated.View
              entering={FadeInUp.delay(650)}
              className="w-full max-w-md mt-3"
            >
              <Pressable
                onPress={onSkip}
                disabled={isSyncing}
                className="w-full py-3 rounded-xl items-center justify-center"
              >
                <Text className="text-white/70 font-semibold text-base">
                  Skip for Now
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Warning Message - Shows when skippable */}
          {dismissible && !isSyncComplete && (
            <Animated.View
              entering={FadeInUp.delay(700)}
              className="mt-4 bg-amber-500/20 px-4 py-3 rounded-lg max-w-md border border-amber-500/30"
            >
              <Text className="text-amber-200 text-xs font-medium leading-5">
                Note: You won't be able to use Gluvia until you sync the latest
                data. You can skip for now and sync later.
              </Text>
            </Animated.View>
          )}

          {/* Sync Progress Text */}
          {isSyncing && !isSyncComplete && (
            <Animated.View
              entering={FadeIn}
              className="mt-4 flex-row items-center max-w-xs"
            >
              <RefreshCw size={14} color="white" className="opacity-70" />
              <Text className="text-white/70 text-sm ml-2 text-center">
                Please wait while we prepare your personalized experience...
              </Text>
            </Animated.View>
          )}

          {/* Success Message */}
          {isSyncComplete && (
            <Animated.View
              entering={FadeIn.delay(300)}
              className="mt-4 flex-row items-center bg-green-500/20 px-4 py-2 rounded-full"
            >
              <CheckCircle size={16} color="#22c55e" />
              <Text className="text-green-300 text-sm ml-2 font-medium">
                Ready to give you personalized recommendations!
              </Text>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
