import { ActivityIndicator, Text, View } from "react-native";

import { COLORS } from "@/constants/theme";

type LoadingScreenProps = {
  message?: string;
};

/** Full-screen centered spinner for initial data loads, replacing the ad hoc spinner block repeated across detail screens. */
export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <ActivityIndicator color={COLORS.primary} />
      {message && <Text className="font-sans-medium text-sm text-text-muted">{message}</Text>}
    </View>
  );
}
