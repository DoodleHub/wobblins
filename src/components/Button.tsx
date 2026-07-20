/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text } from "react-native";

import { COLORS } from "@/constants/theme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        className={`items-center rounded-xl px-4 py-3.5 ${
          isPrimary ? "bg-primary" : "border border-border bg-surface"
        } ${isDisabled ? "opacity-60" : ""}`}
        style={
          isPrimary
            ? { shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 5 }
            : undefined
        }
      >
        {loading ? (
          <ActivityIndicator color={isPrimary ? "#ffffff" : COLORS.primary} />
        ) : (
          <Text className={`font-sans-bold text-base ${isPrimary ? "text-white" : "text-primary"}`}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
