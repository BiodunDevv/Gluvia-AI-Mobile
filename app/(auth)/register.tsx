import { AuthHeader, RegisterForm } from "@/components/auth";
import { T } from "@/hooks/use-translation";
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

export default function RegisterScreen() {
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
            <View className="flex-1 px-6 pb-6">
              {/* Header with Logo and Sign In button */}
              <AuthHeader
                rightButtonText="Sign In"
                rightButtonHref="/(auth)/login"
              />

              <View className="mt-2 mb-6">
                <Text className="text-[28px] font-bold text-gray-900 mb-1 tracking-tight">
                  <T>Create Account</T>
                </Text>
                <Text className="text-sm text-gray-500 leading-5">
                  <T>Build your Gluvia account in a few simple steps.</T>
                </Text>
              </View>

              {/* Register Form (handles multi-step flow) */}
              <RegisterForm />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
