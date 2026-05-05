import { checkOnboardingStatus } from "@/app/onboarding";
import { AppLoader } from "@/components/ui";
import { Href, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Animated, Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function SplashScreenView() {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.8));

  useEffect(() => {
    // Hide native splash immediately
    SplashScreen.hideAsync();

    // Animate logo in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Check onboarding status and navigate accordingly
    const checkAndNavigate = async () => {
      const hasCompletedOnboarding = await checkOnboardingStatus();

      // Wait for splash animation
      setTimeout(() => {
        if (hasCompletedOnboarding) {
          router.replace("/current-user" as Href);
        } else {
          router.replace("/onboarding" as Href);
        }
      }, 2000);
    };

    checkAndNavigate();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-1 items-center justify-center">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
          className="items-center"
        >
          <Image
            source={require("@/assets/images/logo.png")}
            className="w-40 h-40"
            resizeMode="contain"
          />
          <Animated.Text
            style={{ opacity: fadeAnim }}
            className="mt-6 text-2xl font-bold text-[var(--primary)] tracking-wide"
          >
            GLUVIA AI
          </Animated.Text>
          <Animated.Text
            style={{ opacity: fadeAnim }}
            className="mt-2 text-sm text-[var(--muted-foreground)]"
          >
            Powered by Intelligence
          </Animated.Text>
        </Animated.View>

        <View className="absolute bottom-20 items-center">
          <AppLoader size="md" color="#1447e6" />
        </View>
      </View>
    </SafeAreaView>
  );
}
