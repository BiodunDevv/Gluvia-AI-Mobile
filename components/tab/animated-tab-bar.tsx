import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const tabWidth = SCREEN_WIDTH / state.routes.length;

  // Animated value for sliding indicator
  const slideAnim = useSharedValue(0);

  useEffect(() => {
    // Animate to new position with smooth spring
    slideAnim.value = withSpring(state.index * tabWidth, {
      damping: 18,
      stiffness: 180,
      mass: 0.5,
      overshootClamping: false,
    });
  }, [state.index, tabWidth]);

  const getIconName = (routeName: string, focused: boolean): string => {
    const icons: Record<string, { focused: string; unfocused: string }> = {
      index: {
        focused: "home",
        unfocused: "home-outline",
      },
      profile: {
        focused: "person",
        unfocused: "person-outline",
      },
    };

    const icon = icons[routeName] || icons.index;
    return focused ? icon.focused : icon.unfocused;
  };

  const getLabel = (routeName: string): string => {
    const labels: Record<string, string> = {
      index: "Home",
      profile: "Profile",
    };
    return labels[routeName] || routeName;
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideAnim.value }],
    };
  });

  return (
    <SafeAreaView edges={["bottom"]} className="bg-white">
      <View className="bg-white">
        {/* Animated Sliding Indicator */}
        <Animated.View
          className="absolute top-0 bg-primary rounded-full"
          style={[
            {
              height: 3,
              width: tabWidth * 0.35,
              marginLeft: tabWidth * 0.325,
            },
            animatedStyle,
          ]}
        />

        {/* Tab Buttons */}
        <View className="flex-row items-center justify-around pt-2 pb-1">
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            const iconName = getIconName(route.name, isFocused);
            const label = getLabel(route.name);

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                className="flex-1 items-center justify-center py-1"
              >
                <View
                  className={`items-center justify-center rounded-xl px-3 py-1.5 transition-all ${
                    isFocused ? "bg-primary/10" : ""
                  }`}
                >
                  {/* Icon */}
                  <View className="mb-0.5">
                    <Ionicons
                      name={iconName as any}
                      size={22}
                      color={isFocused ? "#1447e6" : "#6B7280"}
                    />
                  </View>

                  {/* Label */}
                  <Text
                    className={`text-[10px] font-semibold ${
                      isFocused ? "text-primary" : "text-gray-500"
                    }`}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
