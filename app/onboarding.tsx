import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, router } from "expo-router";
import {
  Heart,
  Shield,
  Smartphone,
  TrendingUp,
  Utensils,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const ONBOARDING_KEY = "@gluvia_onboarding_completed";

interface Slide {
  id: number;
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    id: 1,
    icon: Heart,
    iconColor: "#ef4444",
    iconBg: "#fee2e2",
    title: "Welcome to Gluvia",
    description:
      "Your personal AI-powered companion for managing diabetes with confidence and ease.",
  },
  {
    id: 2,
    icon: Utensils,
    iconColor: "#10b981",
    iconBg: "#d1fae5",
    title: "Track Your Meals",
    description:
      "Log your meals effortlessly with our comprehensive food database and get instant nutritional insights.",
  },
  {
    id: 3,
    icon: TrendingUp,
    iconColor: "#f59e0b",
    iconBg: "#fef3c7",
    title: "Monitor Glucose Levels",
    description:
      "Keep track of your blood glucose readings and understand patterns over time with smart analytics.",
  },
  {
    id: 4,
    icon: Shield,
    iconColor: "#1447e6",
    iconBg: "#dbeafe",
    title: "Personalized Guidance",
    description:
      "Receive AI-powered meal recommendations tailored to your diabetes type and health goals.",
  },
  {
    id: 5,
    icon: Smartphone,
    iconColor: "#8b5cf6",
    iconBg: "#ede9fe",
    title: "Works Offline",
    description:
      "Access your data anytime, anywhere. Gluvia works seamlessly even without an internet connection.",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<any>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      router.replace("/current-user" as Href);
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      router.replace("/current-user" as Href);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        setCurrentIndex(index);
      },
    }
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Skip Button */}
      <View className="px-6 py-4">
        <TouchableOpacity
          onPress={handleSkip}
          className="self-end"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-base font-semibold text-gray-500">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <Animated.ScrollView
        ref={slidesRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => (
          <SlideItem key={slide.id} slide={slide} index={index} />
        ))}
      </Animated.ScrollView>

      {/* Bottom Section */}
      <View className="px-6 pb-8">
        {/* Pagination Dots */}
        <View className="flex-row justify-center mb-8">
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={index}
                className="h-2 rounded-full bg-primary mx-1"
                style={{ width: dotWidth, opacity }}
              />
            );
          })}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          className="h-14 bg-primary rounded-2xl items-center justify-center"
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-semibold">
            {currentIndex === slides.length - 1 ? "Get Started" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SlideItem({ slide, index }: { slide: Slide; index: number }) {
  const Icon = slide.icon;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View className="flex-1 items-center justify-center px-8" style={{ width }}>
      {/* Icon */}
      <Animated.View
        className="w-32 h-32 rounded-full items-center justify-center mb-12"
        style={{
          backgroundColor: slide.iconBg,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Icon size={64} color={slide.iconColor} />
      </Animated.View>

      {/* Title */}
      <Text className="text-3xl font-bold text-gray-900 text-center mb-4 tracking-tight">
        {slide.title}
      </Text>

      {/* Description */}
      <Text className="text-base text-gray-500 text-center leading-6 px-4">
        {slide.description}
      </Text>
    </View>
  );
}

export async function checkOnboardingStatus(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
}
