import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  icon,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <>
      <TouchableOpacity
        className="flex-row items-center justify-between h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200"
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          {icon && <View className="mr-3">{icon}</View>}
          <Text
            className={`text-[15px] ${selectedOption ? "text-gray-900" : "text-gray-400"}`}
          >
            {selectedOption?.label || placeholder}
          </Text>
        </View>
        <ChevronDown size={18} color="#9ca3af" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setIsOpen(false)}
        >
          <SafeAreaView edges={["bottom"]} className="bg-white rounded-t-3xl">
            <View className="p-4">
              <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
              <Text className="text-lg font-bold text-gray-900 mb-4">
                {placeholder}
              </Text>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-row items-center justify-between px-4 py-4 rounded-xl mb-1 ${
                    value === option.value ? "bg-primary/10" : ""
                  }`}
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    className={`text-[15px] ${
                      value === option.value
                        ? "text-primary font-semibold"
                        : "text-gray-900"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Check size={20} color="#1447e6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}
