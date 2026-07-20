import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { AVATARS, type AvatarId } from "@/constants/avatars";
import { completeCharacterCreation } from "@/supabase/auth";
import { useSupabase } from "@/supabase/SupabaseProvider";

export default function CharacterCreationScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<AvatarId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length >= 3 && avatar !== null && !loading;

  const onSubmit = async () => {
    if (!canSubmit || !avatar) return;
    const userId = session?.user.id;
    if (!userId) {
      setError("Your session expired. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await completeCharacterCreation(userId, username.trim(), avatar);
      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.replace("/starter-selection");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full min-w-0 flex-grow justify-center gap-8 px-6 py-16"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <Text className="font-display-bold text-3xl text-text">Create Your Character</Text>
          <Text className="font-sans text-base text-text-muted">
            Choose a name and avatar to begin your journey
          </Text>
        </View>

        <View className="gap-4">
          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Your trainer name"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />

          <View className="gap-2">
            <Text className="font-sans-medium text-sm text-text-muted">Avatar</Text>
            <View className="flex-row gap-3">
              {AVATARS.map((option) => {
                const selected = avatar === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setAvatar(option.id)}
                    className={`flex-1 items-center gap-1.5 rounded-2xl border p-4 ${
                      selected ? "border-primary bg-primary-light" : "border-border bg-surface"
                    }`}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                  >
                    <Text className="text-3xl">{option.icon}</Text>
                    <Text
                      className={`font-sans-semibold text-sm ${
                        selected ? "text-primary-dark" : "text-text-muted"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error && (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text className="font-sans-medium text-sm text-danger">{error}</Text>
            </View>
          )}

          <Button label="Continue" onPress={onSubmit} loading={loading} disabled={!canSubmit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
