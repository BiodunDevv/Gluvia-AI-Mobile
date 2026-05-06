import { T } from "@/hooks/use-translation";
import { Text, View, type DimensionValue } from "react-native";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  currentLabel?: string;
}

export function StepIndicator({
  currentStep,
  totalSteps,
  currentLabel,
}: StepIndicatorProps) {
  const progress =
    `${Math.round((currentStep / totalSteps) * 100)}%` as DimensionValue;

  return (
    <View className="py-3">
      <View className="mb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            <T>Account setup</T>
          </Text>
          {currentLabel ? (
            <Text className="mt-1 text-[22px] font-bold tracking-tight text-gray-900">
              <T>{currentLabel}</T>
            </Text>
          ) : null}
        </View>
        <Text className="text-xs font-semibold text-primary">
          <T>Step</T> {currentStep}/{totalSteps}
        </Text>
      </View>

      <View className="h-1 overflow-hidden rounded-full bg-gray-100">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: progress }}
        />
      </View>
    </View>
  );
}
