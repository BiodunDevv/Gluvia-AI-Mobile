import { AlertCircle } from "lucide-react-native";
import { Text, View } from "react-native";

interface AllergiesSectionProps {
  allergies?: string[];
}

export function AllergiesSection({ allergies }: AllergiesSectionProps) {
  if (!allergies || allergies.length === 0) return null;

  return (
    <View className="px-6 mb-4">
      <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Allergies
      </Text>
      <View className="bg-red-50 rounded-2xl p-4 border border-red-100">
        <View className="flex-row items-center mb-3">
          <AlertCircle size={18} color="#dc2626" />
          <Text className="ml-2 text-sm font-medium text-red-700">
            Known Allergies
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {allergies.map((allergy, index) => (
            <View
              key={index}
              className="px-3 py-1.5 bg-white rounded-full border border-red-200"
            >
              <Text className="text-sm text-red-700">{allergy}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
