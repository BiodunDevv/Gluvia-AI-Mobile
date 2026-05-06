import { AuthScreenShell, LegalModal, LoginForm } from "@/components/auth";
import { T } from "@/hooks/use-translation";
import { useState } from "react";
import { Text, View } from "react-native";

export default function LoginScreen() {
  const [legalModal, setLegalModal] = useState<{
    visible: boolean;
    type: "terms" | "privacy";
  }>({ visible: false, type: "terms" });

  return (
    <AuthScreenShell
      rightButtonText="Sign Up"
      rightButtonHref="/(auth)/register"
    >
      <View className="mb-5 mt-2">
        <Text className="mb-1 text-[27px] font-bold tracking-tight text-gray-900">
          <T>Welcome back</T>
        </Text>
        <Text className="text-sm leading-5 text-gray-500">
          <T>Sign in to continue your health journey</T>
        </Text>
      </View>

      <LoginForm
        footer={
          <Text className="text-center text-xs leading-5 text-gray-400">
            <T>By continuing, you agree to our</T>{" "}
            <Text
              className="font-medium text-primary"
              onPress={() => setLegalModal({ visible: true, type: "terms" })}
            >
              <T>Terms of Service</T>
            </Text>{" "}
            <T>and</T>{" "}
            <Text
              className="font-medium text-primary"
              onPress={() => setLegalModal({ visible: true, type: "privacy" })}
            >
              <T>Privacy Policy</T>
            </Text>
          </Text>
        }
      />

      <LegalModal
        visible={legalModal.visible}
        type={legalModal.type}
        onClose={() => setLegalModal({ ...legalModal, visible: false })}
      />
    </AuthScreenShell>
  );
}
