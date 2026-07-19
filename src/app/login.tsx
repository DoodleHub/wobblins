import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { hasPlayerProfile, signInWithEmail } from "@/supabase/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await signInWithEmail(email.trim(), password);
      if (signInError) {
        setError(signInError.message);
        return;
      }

      const userId = data.user?.id;
      const profileExists = userId ? await hasPlayerProfile(userId) : false;
      router.replace(profileExists ? "/" : "/character-creation");
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
          <Text className="font-display-bold text-3xl text-text">Monster Realms</Text>
          <Text className="font-sans text-base text-text-muted">Log in to continue your journey</Text>
        </View>

        <View className="gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
          />

          {error && (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text className="font-sans-medium text-sm text-danger">{error}</Text>
            </View>
          )}

          <Button label="Log In" onPress={onSubmit} loading={loading} disabled={!canSubmit} />
        </View>

        <View className="flex-row justify-center gap-1.5">
          <Text className="font-sans text-sm text-text-muted">Don&apos;t have an account?</Text>
          <Link href="/signup" className="font-sans-semibold text-sm text-primary-dark">
            Sign up
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
