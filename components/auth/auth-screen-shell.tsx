import { ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthHeader } from "./auth-header";

interface AuthScreenShellProps {
  children: ReactNode;
  rightButtonText?: string;
  rightButtonHref?: string;
}

export function AuthScreenShell({
  children,
  rightButtonText,
  rightButtonHref,
}: AuthScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "android" ? (insets.top + (StatusBar.currentHeight ?? 0)) || 24 : 0}
      >
        <View
          className="flex-1 px-6"
          onStartShouldSetResponder={() => {
            Keyboard.dismiss();
            return false;
          }}
        >
          <AuthHeader
            rightButtonText={rightButtonText}
            rightButtonHref={rightButtonHref}
          />
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
