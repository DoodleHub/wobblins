import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

type ComingSoonScreenProps = {
  icon: string;
  title: string;
  description: string;
};

export function ComingSoonScreen({ icon, title, description }: ComingSoonScreenProps) {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={<Button label="Back to Home" variant="secondary" onPress={() => router.replace("/")} />}
      />
    </View>
  );
}
