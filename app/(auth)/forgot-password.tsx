import { AuthScreenShell, ForgotPasswordForm } from "@/components/auth";
import { T } from "@/hooks/use-translation";
import { Href, router } from "expo-router";
import { Text, View } from "react-native";

export default function ForgotPasswordScreen() {
  return (
    <AuthScreenShell
      rightButtonText="Sign In"
      rightButtonHref="/(auth)/login"
    >
      <View className="mb-5 mt-2">
        <Text className="mb-1 text-[27px] font-bold tracking-tight text-gray-900">
          <T>Forgot password?</T>
        </Text>
        <Text className="text-sm leading-5 text-gray-500">
          <T>{"Enter your email and we'll send a secure reset link."}</T>
        </Text>
      </View>

      <ForgotPasswordForm
        footer={
          <Text className="text-center text-xs leading-5 text-gray-400">
            <T>Remember your password?</T>{" "}
            <Text
              className="font-medium text-primary"
              onPress={() => router.push("/(auth)/login" as Href)}
            >
              <T>Sign In</T>
            </Text>
          </Text>
        }
      />
    </AuthScreenShell>
  );
}
