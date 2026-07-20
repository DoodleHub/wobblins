import type { ReactNode } from "react";
import { Text, View } from "react-native";

type EmptyStateProps = {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
};

/** Icon + title + description block for empty lists and "nothing here yet" screens. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="items-center gap-3 px-6 py-12">
      <Text className="text-5xl">{icon}</Text>
      <Text className="font-display-bold text-lg text-text">{title}</Text>
      <Text className="text-center font-sans text-sm text-text-muted">{description}</Text>
      {action}
    </View>
  );
}
