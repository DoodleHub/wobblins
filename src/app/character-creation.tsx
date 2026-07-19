import { View, Text } from "react-native";

export default function CharacterCreationScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-6">
      <Text className="font-display-bold text-2xl text-text">Character Creation</Text>
      <Text className="text-center font-sans text-base text-text-muted">
        Coming soon — pick your username and avatar here.
      </Text>
    </View>
  );
}
