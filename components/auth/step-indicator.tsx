import { View } from "react-native";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <View className="flex-row items-center justify-center space-x-2 py-4">
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          className={`h-1.5 rounded-full ${
            index + 1 === currentStep
              ? "w-8 bg-primary"
              : index + 1 < currentStep
                ? "w-8 bg-primary/40"
                : "w-8 bg-gray-200"
          }`}
        />
      ))}
    </View>
  );
}
