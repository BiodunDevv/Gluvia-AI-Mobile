import { Button, FormField } from "@/components/ui";
import { T } from "@/hooks/use-translation";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import { ArrowRight, CheckCircle, Mail } from "lucide-react-native";
import { useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { requestPasswordReset, isLoading } = useAuthStore();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
      <View className="flex-1 justify-center pb-16">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-green-50 self-center">
          <CheckCircle size={48} color="#22c55e" />
        </View>
        <Text className="mb-2 text-center text-[28px] font-bold tracking-tight text-gray-900">
          <T>Check your email</T>
        </Text>
        <Text className="mb-1 px-6 text-center text-sm leading-6 text-gray-500">
          <T>We've sent password reset instructions to:</T>
        </Text>
        <Text className="mb-8 text-center text-base font-semibold text-gray-900">
          {email}
        </Text>
        <Button
          onPress={() => router.replace("/(auth)/login" as Href)}
          className="w-full mb-4"
          icon={<ArrowRight size={18} color="#fff" />}
        >
          <T>Back to Sign In</T>
        </Button>
        <TouchableOpacity
          className="py-3"
          onPress={() => setIsSubmitted(false)}
          activeOpacity={0.7}
        >
          <Text className="text-center text-sm font-semibold text-primary">
            <T>Didn't receive email? Try again</T>
          </Text>
        </TouchableOpacity>

        <View className="mt-8 rounded-2xl bg-gray-50 p-4">
          <Text className="text-center text-sm leading-5 text-gray-500">
            <T>
              Make sure to check your spam folder. The email should arrive
              within a few minutes.
            </T>
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Email Input */}
      <FormField label="Email" className="mb-6">
        <View className="h-[52px] flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4">
          <Mail size={20} color="#71717b" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
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

      <View className="mb-6 rounded-2xl bg-gray-50 p-4">
        <Text className="text-sm leading-6 text-gray-600">
          <T>
            Enter the email linked to your account and we will send a secure
            password reset link.
          </T>
        </Text>
      </View>

      {/* Submit Button */}
      <Button onPress={handleSubmit} loading={isLoading} disabled={isLoading}>
        <T>Send Reset Link</T>
      </Button>
    </View>
  );
}
