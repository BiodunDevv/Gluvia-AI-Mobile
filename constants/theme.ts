/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const Palette = {
  background: "#ffffff",
  foreground: "#09090b",
  primary: "#1447e6",
  primaryForeground: "#eff6ff",
  secondary: "#f4f4f5",
  secondaryForeground: "#18181b",
  mutedForeground: "#71717b",
  destructive: "#e7000b",
  border: "#e4e4e7",
  ring: "#9f9fa9",
  sidebar: "#fafafa",
  chart1: "#8ec5ff",
  chart2: "#2b7fff",
  chart3: "#155dfc",
  chart4: "#1447e6",
  chart5: "#193cb8",
};

export const Colors = {
  light: {
    text: Palette.foreground,
    background: Palette.background,
    tint: Palette.primary,
    icon: Palette.mutedForeground,
    tabIconDefault: Palette.mutedForeground,
    tabIconSelected: Palette.primary,
  },
  // Dark mode is currently disabled; keep the same palette to avoid branching.
  dark: {
    text: Palette.foreground,
    background: Palette.background,
    tint: Palette.primary,
    icon: Palette.mutedForeground,
    tabIconDefault: Palette.mutedForeground,
    tabIconSelected: Palette.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
