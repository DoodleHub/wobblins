import { Text, View } from "react-native";

type StatBarProps = {
  label: string;
  value: number;
  max: number;
  color: string;
  valueLabel?: string;
};

export function StatBar({ label, value, max, color, valueLabel }: StatBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-medium text-xs text-text-muted">{label}</Text>
        <Text className="font-sans-semibold text-xs text-text">{valueLabel ?? `${value}/${max}`}</Text>
      </View>
      <View className="h-2 w-full overflow-hidden rounded-full bg-border">
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}
