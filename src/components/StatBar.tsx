/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { Icon, type IconSpec } from "@/components/Icon";
import { COLORS } from "@/constants/theme";

type StatBarProps = {
  label: string;
  value: number;
  max: number;
  color: string;
  valueLabel?: string;
  icon?: IconSpec;
  /** "inline" (default) shows the value beside the label above the bar; "below" shows just the number under the bar, for hero-card layouts. */
  valuePosition?: "inline" | "below";
};

export function StatBar({ label, value, max, color, valueLabel, icon, valuePosition = "inline" }: StatBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  const widthAnim = useRef(new Animated.Value(percent)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      widthAnim.setValue(percent);
      return;
    }
    Animated.timing(widthAnim, { toValue: percent, duration: 400, useNativeDriver: false }).start();
  }, [percent, widthAnim]);

  const width = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"], extrapolate: "clamp" });
  const display = valueLabel ?? `${value}/${max}`;

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          {icon && <Icon {...icon} size={14} color={COLORS.textMuted} />}
          <Text className="font-sans-medium text-xs text-text-muted">{label}</Text>
        </View>
        {valuePosition === "inline" && <Text className="font-sans-semibold text-xs text-text">{display}</Text>}
      </View>
      <View className="h-2 w-full overflow-hidden rounded-full bg-border">
        <Animated.View className="h-full rounded-full" style={{ width, backgroundColor: color }} />
      </View>
      {valuePosition === "below" && <Text className="font-sans-semibold text-sm text-text">{display}</Text>}
    </View>
  );
}
