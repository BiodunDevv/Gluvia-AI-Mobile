import { AuthHeader, ForgotPasswordForm } from "@/components/auth";
import { T } from "@/hooks/use-translation";
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
          <AuthHeader
            rightButtonText="Sign In"
            rightButtonHref="/(auth)/login"
          />
          <View className="flex-1 justify-center">
            <ForgotPasswordForm />
          </View>
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
              <AuthHeader
                rightButtonText="Sign In"
                rightButtonHref="/(auth)/login"
              />

              <View className="mb-6 mt-2">
                <Text className="mb-1 text-[28px] font-bold tracking-tight text-gray-900">
                  <T>Forgot password?</T>
                </Text>
                <Text className="text-sm leading-5 text-gray-500">
                  <T>
                    Enter your email address and we'll send a secure reset link.
                  </T>
                </Text>
              </View>

              <View className="mb-6 rounded-[28px] border border-gray-100 bg-white p-5">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">
                  <T>Account Recovery</T>
                </Text>
                <Text className="mt-2 text-sm leading-6 text-gray-600">
                  <T>
                    Use the same email you use to sign in. We will help you get
                    back into your Gluvia account securely.
                  </T>
                </Text>
              </View>

              <View className="flex-1">
                <ForgotPasswordForm onSuccess={() => setIsSubmitted(true)} />
              </View>

              <View className="py-4 pb-6">
                <Text className="text-center text-xs leading-5 text-gray-400">
                  <T>Remember your password?</T>{" "}
                  <Text
                    className="text-primary font-medium"
                    onPress={() => router.push("/(auth)/login" as Href)}
                  >
                    <T>Sign In</T>
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
