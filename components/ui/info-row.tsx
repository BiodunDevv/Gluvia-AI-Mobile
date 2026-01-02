import { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  showDivider?: boolean;
}

export function InfoRow({
  icon: Icon,
  label,
  value,
  showDivider = true,
}: InfoRowProps) {
  return (
    <View
      className={`flex-row items-center px-4 py-4 ${
        showDivider ? "border-b border-gray-200" : ""
      }`}
    >
      <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
        <Icon size={18} color="#1447e6" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-xs text-gray-500 mb-0.5">{label}</Text>
        <Text className="text-[15px] font-medium text-gray-900">{value}</Text>
      </View>
    </View>
  );
}
