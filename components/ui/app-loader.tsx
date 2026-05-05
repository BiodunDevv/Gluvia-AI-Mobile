import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";

type AppLoaderSize = "sm" | "md" | "lg" | number;

export interface AppLoaderProps {
  size?: AppLoaderSize;
  color?: string;
  centered?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<Exclude<AppLoaderSize, number>, number> = {
  sm: 18,
  md: 28,
  lg: 40,
};

function resolveSize(size: AppLoaderSize) {
  return typeof size === "number" ? size : sizeMap[size];
}

export function AppLoader({
  size = "md",
  color = "#1447e6",
  centered = false,
  style,
}: AppLoaderProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const iconSize = useMemo(() => resolveSize(size), [size]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
      spin.setValue(0);
    };
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const content = (
    <Animated.View style={[{ transform: [{ rotate }] }, style]}>
      <Ionicons name="logo-tableau" size={iconSize} color={color} />
    </Animated.View>
  );

  if (!centered) {
    return content;
  }

  return (
    <View className="items-center justify-center">
      {content}
    </View>
  );
}
