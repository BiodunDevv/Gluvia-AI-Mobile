import { Button, FormField } from "@/components/ui";
import { T } from "@/hooks/use-translation";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import { ArrowRight, CheckCircle, Mail } from "lucide-react-native";
import { ReactNode, useState } from "react";
import {
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  footer?: ReactNode;
}

export function ForgotPasswordForm({ onSuccess, footer }: ForgotPasswordFormProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { requestPasswordReset, isLoading } = useAuthStore();

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!email.trim()) {
      toast.error("Missing Information", "Please enter your email address");
      return;
    }
    if (!validateEmail(email)) {
      toast.error("Invalid Email", "Please enter a valid email address");
      return;
    }
    await requestPasswordReset(email.trim().toLowerCase());
    setIsSubmitted(true);
    onSuccess?.();
  };

  if (isSubmitted) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 h-20 w-20 items-center justify-center self-center rounded-full bg-green-50">
          <CheckCircle size={48} color="#22c55e" />
        </View>
        <Text className="mb-2 text-center text-[28px] font-bold tracking-tight text-gray-900">
          <T>Check your email</T>
        </Text>
        <Text className="mb-1 px-6 text-center text-sm leading-6 text-gray-500">
          <T>{"We've sent password reset instructions to:"}</T>
        </Text>
        <Text className="mb-8 text-center text-base font-semibold text-gray-900">
          {email}
        </Text>

        <View className="mb-6 rounded-2xl bg-gray-50 p-4">
          <Text className="text-center text-sm leading-5 text-gray-500">
            <T>Check your spam folder. The email should arrive within a few minutes.</T>
          </Text>
        </View>

        <Button
          onPress={() => router.replace("/(auth)/login" as Href)}
          className="mb-3"
          icon={<ArrowRight size={18} color="#fff" />}
        >
          <T>Back to Sign In</T>
        </Button>

        <TouchableOpacity className="py-3" onPress={() => setIsSubmitted(false)} activeOpacity={0.7}>
          <Text className="text-center text-sm font-semibold text-primary">
            <T>{"Didn't receive email? Try again"}</T>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Email field */}
      <FormField label="Email" className="mb-5">
        <View className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5">
          <Mail size={18} color="#71717b" />
          <TextInput
            className="ml-2.5 flex-1 py-0 text-sm text-gray-900"
            placeholder="Enter your email"
            placeholderTextColor="#a1a1aa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>
      </FormField>

      {/* Helper card */}
      <View className="mb-8 rounded-2xl bg-gray-50 p-4">
        <Text className="text-sm leading-6 text-gray-600">
          <T>Use the same email linked to your Gluvia account. We will help you get back in securely.</T>
        </Text>
      </View>

      {/* Send button — flows right after helper */}
      <Button onPress={handleSubmit} loading={isLoading} disabled={isLoading} className="mb-4">
        <T>Send Reset Link</T>
      </Button>

      {footer ? <View>{footer}</View> : null}
    </ScrollView>
  );
}
