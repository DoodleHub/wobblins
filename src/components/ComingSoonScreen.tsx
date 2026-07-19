import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "./Button";

type ComingSoonScreenProps = {
  icon: string;
  title: string;
  description: string;
};

export function ComingSoonScreen({ icon, title, description }: ComingSoonScreenProps) {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <Text className="text-5xl">{icon}</Text>
      <Text className="font-display-bold text-2xl text-text">{title}</Text>
      <Text className="text-center font-sans text-base text-text-muted">{description}</Text>
      <Button label="Back to Home" variant="secondary" onPress={() => router.replace("/")} />
    </View>
  );
}
