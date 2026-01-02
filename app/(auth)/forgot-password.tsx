import { AuthHeader, ForgotPasswordForm } from "@/components/auth";
import { Href, router } from "expo-router";
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

export default function ForgotPasswordScreen() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-1 px-6">
          {/* Header */}
          <AuthHeader
            rightButtonText="Sign In"
            rightButtonHref="/(auth)/login"
          />
          <ForgotPasswordForm />
        </View>
      </SafeAreaView>
    );
  }

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
              {/* Header with Logo and Sign In button */}
              <AuthHeader
                rightButtonText="Sign In"
                rightButtonHref="/(auth)/login"
              />

              {/* Content */}
              <View className="flex-1 justify-center py-6">
                {/* Title */}
                <View className="mb-8">
                  <Text className="text-[32px] font-bold text-gray-900 mb-2 tracking-tight">
                    Forgot password?
                  </Text>
                  <Text className="text-base text-gray-500 leading-6">
                    No worries! Enter your email and we'll send you a link to
                    reset your password.
                  </Text>
                </View>

                {/* Forgot Password Form */}
                <ForgotPasswordForm onSuccess={() => setIsSubmitted(true)} />
              </View>

              {/* Footer */}
              <View className="py-4 pb-6">
                <Text className="text-center text-sm text-gray-500">
                  Remember your password?{" "}
                  <Text
                    className="text-primary font-semibold"
                    onPress={() => router.push("/(auth)/login" as Href)}
                  >
                    Sign In
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
