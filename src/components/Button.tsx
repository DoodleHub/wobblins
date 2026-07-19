import { ActivityIndicator, Pressable, Text } from "react-native";

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

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`items-center rounded-xl px-4 py-3.5 ${
        isPrimary ? "bg-primary" : "border border-border bg-surface"
      } ${isDisabled ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#ffffff" : "#4f46e5"} />
      ) : (
        <Text className={`font-sans-bold text-base ${isPrimary ? "text-white" : "text-primary"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
