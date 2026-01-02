import { forwardRef, ReactNode } from "react";
import {
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

interface InputProps extends TextInputProps {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  error?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    { leftIcon, rightIcon, onRightIconPress, error, className, ...props },
    ref
  ) => {
    return (
      <View
        className={`flex-row items-center bg-gray-50 border rounded-xl h-[52px] px-4 ${
          error ? "border-red-300" : "border-gray-200"
        }`}
      >
        {leftIcon}
        <TextInput
          ref={ref}
          className={`flex-1 text-base text-gray-900 py-0 ${leftIcon ? "ml-3" : ""}`}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
