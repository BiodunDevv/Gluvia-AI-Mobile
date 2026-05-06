import { T } from "@/hooks/use-translation";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ProfileFieldRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
  onPress?: () => void;
  children?: ReactNode;
}

export function ProfileFieldRow({
  icon: Icon,
  label,
  value,
  helper,
  onPress,
  children,
}: ProfileFieldRowProps) {
  const content = (
    <View className="flex-row items-center rounded-2xl border border-gray-100 bg-white px-4 py-4">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon size={18} color="#1447e6" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">
          <T>{label}</T>
        </Text>
        <Text className="mt-1 text-sm text-gray-500">
          <T>{value}</T>
        </Text>
        {helper ? (
          <Text className="mt-1 text-xs leading-4 text-gray-400">
            <T>{helper}</T>
          </Text>
        ) : null}
        {children}
      </View>
      {onPress ? <ChevronRight size={18} color="#9ca3af" /> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}
