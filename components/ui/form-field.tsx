import { Text, View } from "react-native";

interface FormFieldProps {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export function FormField({
  label,
  optional,
  children,
  error,
  className,
}: FormFieldProps) {
  return (
    <View className={className || "mb-4"}>
      <View className="flex-row items-center mb-2">
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
        {optional && (
          <Text className="text-xs text-gray-400 ml-2">(Optional)</Text>
        )}
      </View>
      {children}
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
