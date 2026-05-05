/**
 * Log Glucose Modal
 *
 * Modal for users to log their glucose readings with
 * reading type, value, symptoms, and optional notes.
 */

import { Button } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import {
  GlucoseReadingType,
  GlucoseSymptom,
  GlucoseUnit,
  useSyncStore,
} from "@/store/sync-store";
import * as Haptics from "expo-haptics";
import {
  Activity,
  AlertCircle,
  Check,
  Clock,
  Coffee,
  Droplets,
  Eye,
  Moon,
  Utensils,
  X,
  Zap,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInUp, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Reading type options with icons and descriptions
const READING_TYPES: Array<{
  value: GlucoseReadingType;
  label: string;
  description: string;
  icon: any;
  color: string;
}> = [
  {
    value: "fasting",
    label: "Fasting",
    description: "Before eating anything",
    icon: Moon,
    color: "#8b5cf6",
  },
  {
    value: "before_meal",
    label: "Before Meal",
    description: "Right before eating",
    icon: Utensils,
    color: "#f59e0b",
  },
  {
    value: "after_meal",
    label: "After Meal",
    description: "1 hour after eating",
    icon: Coffee,
    color: "#10b981",
  },
  {
    value: "2hr_post_meal",
    label: "2hr Post-Meal",
    description: "2 hours after eating",
    icon: Clock,
    color: "#3b82f6",
  },
  {
    value: "bedtime",
    label: "Bedtime",
    description: "Before going to sleep",
    icon: Moon,
    color: "#6366f1",
  },
  {
    value: "random",
    label: "Random",
    description: "Any other time",
    icon: Zap,
    color: "#ec4899",
  },
];

// Symptom options
const SYMPTOM_OPTIONS: Array<{
  value: GlucoseSymptom;
  label: string;
  icon: any;
  color: string;
}> = [
  { value: "none", label: "No Symptoms", icon: Check, color: "#22c55e" },
  { value: "dizzy", label: "Dizzy", icon: AlertCircle, color: "#f59e0b" },
  { value: "shaky", label: "Shaky", icon: Activity, color: "#ef4444" },
  { value: "sweaty", label: "Sweaty", icon: Droplets, color: "#06b6d4" },
  { value: "tired", label: "Tired", icon: Moon, color: "#6366f1" },
  { value: "hungry", label: "Hungry", icon: Utensils, color: "#f97316" },
  { value: "thirsty", label: "Thirsty", icon: Droplets, color: "#3b82f6" },
  {
    value: "blurred_vision",
    label: "Blurred Vision",
    icon: Eye,
    color: "#8b5cf6",
  },
];

function getGlucoseInterpretation(value: number, type: GlucoseReadingType) {
  const ranges = {
    fasting: { low: 70, normal: 100 },
    before_meal: { low: 70, normal: 100 },
    after_meal: { low: 70, normal: 140 },
    "2hr_post_meal": { low: 70, normal: 140 },
    bedtime: { low: 90, normal: 150 },
    random: { low: 70, normal: 140 },
  };

  const range = ranges[type];

  if (value < range.low) {
    return {
      status: "low",
      label: "Low",
      color: "#ef4444",
      bgColor: "bg-red-50",
      message: "Your glucose is below target. Consider having a snack.",
    };
  } else if (value <= range.normal) {
    return {
      status: "normal",
      label: "In Range",
      color: "#10b981",
      bgColor: "bg-green-50",
      message: "Great! Your glucose is within the target range.",
    };
  } else {
    return {
      status: "high",
      label: "High",
      color: "#ef4444",
      bgColor: "bg-red-50",
      message:
        "High glucose. Consider contacting your healthcare provider if persistent.",
    };
  }
}

interface LogGlucoseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  linkedMealId?: string;
}

export function LogGlucoseModal({
  visible,
  onClose,
  onSuccess,
  linkedMealId,
}: LogGlucoseModalProps) {
  const { logGlucoseReading, isUploading } = useSyncStore();
  const { user } = useAuthStore();

  const [glucoseValue, setGlucoseValue] = useState("");
  const [unit, setUnit] = useState<GlucoseUnit>("mg/dL");
  const [readingType, setReadingType] = useState<GlucoseReadingType>("random");
  const [symptoms, setSymptoms] = useState<GlucoseSymptom[]>(["none"]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setGlucoseValue("");
      setUnit("mg/dL");
      setReadingType("random");
      setSymptoms(["none"]);
      setNotes("");
      setError(null);
    }
  }, [visible]);

  // Handle symptom toggle
  const toggleSymptom = (symptom: GlucoseSymptom) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (symptom === "none") {
      setSymptoms(["none"]);
    } else {
      const newSymptoms = symptoms.filter((s) => s !== "none");
      if (newSymptoms.includes(symptom)) {
        const filtered = newSymptoms.filter((s) => s !== symptom);
        setSymptoms(filtered.length === 0 ? ["none"] : filtered);
      } else {
        setSymptoms([...newSymptoms, symptom]);
      }
    }
  };

  // Validate and submit
  const handleSubmit = async () => {
    const value = parseFloat(glucoseValue);

    if (!glucoseValue || isNaN(value)) {
      setError("Please enter a valid glucose value");
      return;
    }

    if (value < 20 || value > 600) {
      setError("Glucose value must be between 20 and 600 mg/dL");
      return;
    }

    if (!user?._id) {
      setError("User not logged in");
      return;
    }

    setError(null);
    Keyboard.dismiss();

    try {
      await logGlucoseReading(
        {
          timestamp: new Date().toISOString(),
          value,
          unit,
          type: readingType,
          notes: notes.trim() || undefined,
          mealRelated: linkedMealId ? true : readingType.includes("meal"),
          mealLogId: linkedMealId,
          symptoms: symptoms.length > 0 ? symptoms : ["none"],
        },
        user._id,
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log glucose reading");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const numericValue = parseFloat(glucoseValue) || 0;
  const interpretation =
    numericValue > 0
      ? getGlucoseInterpretation(numericValue, readingType)
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <X size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Log Glucose</Text>
          <View className="w-10" />
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Glucose Value Input */}
            <Animated.View entering={FadeInUp.delay(100)} className="px-6 pt-6">
              <Text className="text-sm font-semibold text-gray-600 mb-3">
                Blood Glucose Reading
              </Text>
              <View className="flex-row items-center">
                <View className="flex-1 flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
                  <Activity size={24} color="#1447e6" />
                  <TextInput
                    className="flex-1 text-3xl font-bold text-gray-900 ml-3"
                    placeholder="0"
                    placeholderTextColor="#d1d5db"
                    value={glucoseValue}
                    onChangeText={setGlucoseValue}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text className="text-lg text-gray-500 font-medium">
                    {unit}
                  </Text>
                </View>
              </View>

              {/* Unit Toggle */}
              <View className="flex-row mt-3">
                <TouchableOpacity
                  onPress={() => setUnit("mg/dL")}
                  className={`flex-1 py-2 rounded-l-xl border ${
                    unit === "mg/dL"
                      ? "bg-primary border-primary"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      unit === "mg/dL" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    mg/dL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setUnit("mmol/L")}
                  className={`flex-1 py-2 rounded-r-xl border border-l-0 ${
                    unit === "mmol/L"
                      ? "bg-primary border-primary"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      unit === "mmol/L" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    mmol/L
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Interpretation Banner */}
              {interpretation && (
                <Animated.View
                  entering={FadeIn}
                  className={`mt-4 p-4 rounded-xl ${interpretation.bgColor}`}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: interpretation.color + "20" }}
                    >
                      {interpretation.status === "normal" ? (
                        <Check size={16} color={interpretation.color} />
                      ) : (
                        <AlertCircle size={16} color={interpretation.color} />
                      )}
                    </View>
                    <View className="flex-1 ml-3">
                      <Text
                        className="font-semibold"
                        style={{ color: interpretation.color }}
                      >
                        {interpretation.label}
                      </Text>
                      <Text className="text-xs text-gray-600 mt-0.5">
                        {interpretation.message}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              )}
            </Animated.View>

            {/* Reading Type Selection */}
            <Animated.View entering={FadeInUp.delay(200)} className="px-6 pt-6">
              <Text className="text-sm font-semibold text-gray-600 mb-3">
                When did you take this reading?
              </Text>
              <View className="flex-row flex-wrap">
                {READING_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = readingType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setReadingType(type.value);
                      }}
                      className={`w-[31%] m-[1%] p-3 rounded-xl border ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <View
                        className="w-8 h-8 rounded-lg items-center justify-center mb-2"
                        style={{ backgroundColor: type.color + "20" }}
                      >
                        <Icon size={16} color={type.color} />
                      </View>
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? "text-primary" : "text-gray-700"
                        }`}
                        numberOfLines={1}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {/* Symptoms Selection */}
            <Animated.View entering={FadeInUp.delay(300)} className="px-6 pt-6">
              <Text className="text-sm font-semibold text-gray-600 mb-3">
                How are you feeling?
              </Text>
              <View className="flex-row flex-wrap">
                {SYMPTOM_OPTIONS.map((symptom) => {
                  const isSelected = symptoms.includes(symptom.value);
                  const SymptomIcon = symptom.icon;
                  return (
                    <TouchableOpacity
                      key={symptom.value}
                      onPress={() => toggleSymptom(symptom.value)}
                      className={`px-3 py-2 m-1 rounded-full border flex-row items-center ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <SymptomIcon
                        size={14}
                        color={isSelected ? "#1447e6" : symptom.color}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className={`text-sm ${
                          isSelected
                            ? "text-primary font-medium"
                            : "text-gray-600"
                        }`}
                      >
                        {symptom.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {/* Notes */}
            <Animated.View entering={FadeInUp.delay(400)} className="px-6 pt-6">
              <Text className="text-sm font-semibold text-gray-600 mb-3">
                Notes (Optional)
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200 min-h-[80px]"
                placeholder="Add any notes about this reading..."
                placeholderTextColor="#9ca3af"
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
            </Animated.View>

            {/* Error Message */}
            {error && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                className="mx-6 mt-4 p-3 bg-red-50 rounded-xl flex-row items-center"
              >
                <AlertCircle size={16} color="#ef4444" />
                <Text className="text-red-600 text-sm ml-2 flex-1">
                  {error}
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Submit Button */}
        <View className="px-6 pb-8 pt-4 bg-white border-t border-gray-100">
          <Button
            onPress={handleSubmit}
            loading={isUploading}
            disabled={isUploading || !glucoseValue}
          >
            Log Reading
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
