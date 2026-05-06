import { Button, FormField } from "@/components/ui";
import { T } from "@/hooks/use-translation";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { ReactNode, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LoginFormProps {
  footer?: ReactNode;
}

export function LoginForm({ footer }: LoginFormProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);
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
      router.replace((maintenanceMessage ? "/maintenance" : "/current-user") as Href);
    } catch {
      // handled by store
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Email */}
      <FormField label="Email" className="mb-4">
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
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
        </View>
      </FormField>

      {/* Password */}
      <FormField label="Password" className="mb-3">
        <View className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5">
          <Lock size={18} color="#71717b" />
          <TextInput
            ref={passwordInputRef}
            className="ml-2.5 flex-1 py-0 text-sm text-gray-900"
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
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? (
              <EyeOff size={18} color="#71717b" />
            ) : (
              <Eye size={18} color="#71717b" />
            )}
          </TouchableOpacity>
        </View>
      </FormField>

      {/* Forgot password */}
      <TouchableOpacity
        className="self-end mb-8"
        onPress={() => router.push("/(auth)/forgot-password" as Href)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text className="text-sm font-semibold text-primary">
          <T>Forgot password?</T>
        </Text>
      </TouchableOpacity>

      {/* Sign in button — flows right after the last input */}
      <Button onPress={handleLogin} loading={isLoading} disabled={isLoading} className="mb-4">
        <T>Sign In</T>
      </Button>

      {footer ? <View>{footer}</View> : null}
    </ScrollView>
  );
}
