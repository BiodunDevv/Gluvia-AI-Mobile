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
      <View className="mb-1.5 flex-row items-center">
        <Text className="text-[13px] font-medium text-gray-700">{label}</Text>
        {optional && (
          <Text className="ml-2 text-xs text-gray-400">(Optional)</Text>
        )}
      </View>
      {children}
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
