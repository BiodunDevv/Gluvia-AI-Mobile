import { Text, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  className?: string;
}

export function SectionHeader({ title, className }: SectionHeaderProps) {
  return (
    <Text
      className={`text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 ${className || ""}`}
    >
      {title}
    </Text>
  );
}

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <View
      className={`bg-gray-50 rounded-2xl overflow-hidden ${className || ""}`}
    >
      {children}
    </View>
  );
}
