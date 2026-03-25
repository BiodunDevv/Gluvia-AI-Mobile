import { AuthHeader, LegalModal, LoginForm } from "@/components/auth";
import { T } from "@/hooks/use-translation";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [legalModal, setLegalModal] = useState<{
    visible: boolean;
    type: "terms" | "privacy";
  }>({ visible: false, type: "terms" });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View className="flex-1 px-6">
              {/* Header with Logo and Sign Up button */}
              <AuthHeader
                rightButtonText="Sign Up"
                rightButtonHref="/(auth)/register"
              />

              {/* Title */}
              <View className="mt-2 mb-6">
                <Text className="text-[28px] font-bold text-gray-900 mb-1 tracking-tight">
                  <T>Welcome back</T>
                </Text>
                <Text className="text-sm text-gray-500 leading-5">
                  <T>Sign in to continue your health journey</T>
                </Text>
              </View>

              {/* Login Form - flex-1 pushes button to bottom */}
              <View className="flex-1">
                <LoginForm />
              </View>

              {/* Footer */}
              <View className="py-4 pb-6">
                <Text className="text-center text-xs text-gray-400 leading-5">
                  <T>By continuing, you agree to our</T>{" "}
                  <Text
                    className="text-primary font-medium"
                    onPress={() =>
                      setLegalModal({ visible: true, type: "terms" })
                    }
                  >
                    <T>Terms of Service</T>
                  </Text>{" "}
                  <T>and</T>{" "}
                  <Text
                    className="text-primary font-medium"
                    onPress={() =>
                      setLegalModal({ visible: true, type: "privacy" })
                    }
                  >
                    <T>Privacy Policy</T>
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Legal Modal */}
      <LegalModal
        visible={legalModal.visible}
        type={legalModal.type}
        onClose={() => setLegalModal({ ...legalModal, visible: false })}
      />
    </SafeAreaView>
  );
}
