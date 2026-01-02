import { Button, FormField } from "@/components/ui";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import { CheckCircle, Mail } from "lucide-react-native";
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
      <View className="flex-1 justify-center items-center pb-16">
        {/* Success Icon */}
        <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-6">
          <CheckCircle size={48} color="#22c55e" />
        </View>

        {/* Success Message */}
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center tracking-tight">
          Check your email
        </Text>
        <Text className="text-base text-gray-500 text-center mb-1 px-6 leading-6">
          We've sent password reset instructions to:
        </Text>
        <Text className="text-base font-semibold text-gray-900 mb-8">
          {email}
        </Text>

        {/* Back to Login Button */}
        <Button
          onPress={() => router.replace("/(auth)/login" as Href)}
          className="w-full mb-4"
        >
          Back to Sign In
        </Button>

        {/* Resend Link */}
        <TouchableOpacity
          className="py-3"
          onPress={() => setIsSubmitted(false)}
          activeOpacity={0.7}
        >
          <Text className="text-primary text-sm font-semibold">
            Didn't receive email? Try again
          </Text>
        </TouchableOpacity>

        {/* Help Text */}
        <View className="mt-8 p-4 bg-gray-50 rounded-xl">
          <Text className="text-sm text-gray-500 text-center leading-5">
            Make sure to check your spam folder. The email should arrive within
            a few minutes.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Email Input */}
      <FormField label="Email" className="mb-6">
        <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
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

      {/* Submit Button */}
      <Button onPress={handleSubmit} loading={isLoading} disabled={isLoading}>
        Send Reset Link
      </Button>
    </View>
  );
}
