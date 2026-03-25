import { T } from "@/hooks/use-translation";
import { Href, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react-native";
import { Text, View } from "react-native";

import { Button } from "@/components/ui";
import { getMissingProfileFields } from "@/lib/profile-completion";
import { useAuthStore } from "@/store/auth-store";

const LABELS: Record<string, string> = {
  diabetesType: "Diabetes type",
  age: "Age",
  sex: "Sex",
  heightCm: "Height",
  weightKg: "Weight",
  activityLevel: "Activity level",
  incomeBracket: "Income bracket",
  language: "Language",
};

export default function CompleteProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const missingFields = getMissingProfileFields(user);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View className="flex-1 px-6 py-8">
        <View className="mb-8 rounded-3xl bg-primary px-6 py-8">
          <View className="mb-5 size-14 items-center justify-center rounded-2xl bg-white/15">
            <AlertTriangle color="#fff" size={28} />
          </View>
          <Text className="text-3xl font-bold text-white"><T>Complete your profile</T></Text>
          <Text className="mt-3 text-sm leading-6 text-white/80">
            Gluvia needs your health and lifestyle details before you can use meal guidance, insights, and synced recommendations safely.
          </Text>
        </View>

        <View className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <Text className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            <T>Missing Required Details</T>
          </Text>
          <View className="mt-4 gap-3">
            {missingFields.map((field) => (
              <View
                key={field}
                className="flex-row items-center justify-between rounded-xl bg-white px-4 py-3"
              >
                <Text className="text-base font-medium text-gray-900">
                  {LABELS[field] || field}
                </Text>
                <CheckCircle2 size={18} color="#d1d5db" />
              </View>
            ))}
          </View>
        </View>

        <View className="mt-auto gap-3 pb-4">
          <Button onPress={() => router.replace("/edit-profile" as Href)}>
            <T>Update Profile Now</T>
          </Button>
          <Button
            variant="outline"
            onPress={() => router.replace("/current-user" as Href)}
          >
            <T>Back</T>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
