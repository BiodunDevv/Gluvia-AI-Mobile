import { ReactNode } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const variantStyles = {
  primary: "bg-primary",
  secondary: "bg-gray-100",
  outline: "bg-transparent border border-gray-200",
  ghost: "bg-transparent",
  danger: "bg-red-500",
};

const variantTextStyles = {
  primary: "text-white",
  secondary: "text-gray-700",
  outline: "text-gray-700",
  ghost: "text-gray-700",
  danger: "text-white",
};

const sizeStyles = {
  sm: "h-10 px-4",
  md: "h-[52px] px-6",
  lg: "h-14 px-8",
};

const textSizeStyles = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "right",
  fullWidth = true,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`rounded-xl items-center justify-center flex-row ${variantStyles[variant]} ${sizeStyles[size]} ${
        isDisabled ? "opacity-60" : ""
      } ${fullWidth ? "w-full" : ""} ${className || ""}`}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "danger" ? "#fff" : "#374151"
          }
          size="small"
        />
      ) : (
        <View className="flex-row items-center">
          {icon && iconPosition === "left" && (
            <View className="mr-2">{icon}</View>
          )}
          <Text
            className={`font-semibold ${variantTextStyles[variant]} ${textSizeStyles[size]}`}
          >
            {children}
          </Text>
          {icon && iconPosition === "right" && (
            <View className="ml-2">{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
