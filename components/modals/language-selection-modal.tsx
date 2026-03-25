import { SupportedLanguage, useTranslation } from "@/hooks/use-translation";
import { Check, Globe2, X } from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";

interface LanguageSelectionModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  onClose?: () => void;
  onSelect?: (language: SupportedLanguage) => void;
}

export function LanguageSelectionModal({
  visible,
  title = "Choose your language",
  description = "Pick the language you want Gluvia to use across onboarding and your app experience.",
  onClose,
  onSelect,
}: LanguageSelectionModalProps) {
  const { language, languages, setLanguage } = useTranslation();

  const handleSelect = async (value: SupportedLanguage) => {
    await setLanguage(value);
    onSelect?.(value);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40 px-4 py-8">
        <View className="rounded-[28px] bg-white p-5">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Globe2 size={22} color="#1447e6" />
              </View>
              <Text className="text-xl font-bold text-gray-900">{title}</Text>
              <Text className="mt-2 text-sm leading-6 text-gray-600">
                {description}
              </Text>
            </View>
            {onClose ? (
              <Pressable
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <X size={18} color="#374151" />
              </Pressable>
            ) : null}
          </View>

          <View className="gap-3">
            {languages.map((item) => {
              const selected = item.value === language;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => handleSelect(item.value)}
                  className={`rounded-2xl border px-4 py-4 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-semibold text-gray-900">
                        {item.label}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500">
                        {item.nativeLabel}
                      </Text>
                    </View>
                    {selected ? <Check size={20} color="#1447e6" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
