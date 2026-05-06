import { Check, X } from "lucide-react-native";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface ProfileOption {
  value: string;
  label: string;
  description?: string;
}

interface ProfileOptionSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  options: ProfileOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function ProfileOptionSheet({
  visible,
  title,
  description,
  options,
  value,
  onSelect,
  onClose,
}: ProfileOptionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable>
          <SafeAreaView edges={["bottom"]} className="rounded-t-3xl bg-white">
            <View className="px-5 pb-2 pt-3">
              <View className="mb-4 h-1 w-11 self-center rounded-full bg-gray-300" />
              <View className="mb-4 flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-bold tracking-tight text-gray-900">
                    {title}
                  </Text>
                  {description ? (
                    <Text className="mt-1 text-sm leading-5 text-gray-500">
                      {description}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                >
                  <X size={18} color="#374151" />
                </TouchableOpacity>
              </View>

              <View className="gap-2">
                {options.map((option) => {
                  const selected = option.value === value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        onSelect(option.value);
                        onClose();
                      }}
                      className={`rounded-2xl border px-4 py-4 ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-gray-100 bg-white"
                      }`}
                      activeOpacity={0.8}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-3">
                          <Text
                            className={`text-base font-semibold ${
                              selected ? "text-primary" : "text-gray-900"
                            }`}
                          >
                            {option.label}
                          </Text>
                          {option.description ? (
                            <Text className="mt-1 text-sm leading-5 text-gray-500">
                              {option.description}
                            </Text>
                          ) : null}
                        </View>
                        {selected ? <Check size={20} color="#1447e6" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
