import { Button, FormField } from "@/components/ui";
import { T } from "@/hooks/use-translation";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, clearError, maintenanceMessage } = useAuthStore();

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim()) {
      toast.error("Missing Email", "Please enter your email address");
      return;
    }
    if (!password) {
      toast.error("Missing Password", "Please enter your password");
      return;
    }

    try {
      clearError();
      await login({ email: email.trim().toLowerCase(), password });
      if (maintenanceMessage) {
        router.replace("/maintenance" as Href);
      } else {
        router.replace("/current-user" as Href);
      }
    } catch {
      // Error is already handled by the store with toast
    }
  };

  return (
    <View className="flex-1">
      {/* Form Fields */}
      <View>
        {/* Email Input */}
        <FormField label="Email" className="mb-4">
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
              returnKeyType="next"
            />
          </View>
        </FormField>

        {/* Password Input */}
        <FormField label="Password" className="mb-3">
          <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
            <Lock size={20} color="#71717b" />
            <TextInput
              className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
              placeholder="Enter your password"
              placeholderTextColor="#a1a1aa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color="#71717b" />
              ) : (
                <Eye size={20} color="#71717b" />
              )}
            </TouchableOpacity>
          </View>
        </FormField>

        {/* Forgot Password */}
        <TouchableOpacity
          className="self-end"
          onPress={() => router.push("/(auth)/forgot-password" as Href)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-sm font-semibold text-primary">
            <T>Forgot password?</T>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Sign In Button */}
      <Button onPress={handleLogin} loading={isLoading} disabled={isLoading}>
        <T>Sign In</T>
      </Button>
    </View>
  );
}
