import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { signUpWithEmail } from "@/supabase/auth";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setConfirmationSent(false);

    try {
      const { data, error: signUpError } = await signUpWithEmail(email.trim(), password);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        // A brand new account with an active session — straight into onboarding.
        router.replace("/character-creation");
      } else {
        // Email confirmation is required before a session is issued.
        setConfirmationSent(true);
      }
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
          <Text className="font-sans text-base text-text-muted">
            Create an account to start your journey
          </Text>
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
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
          />

          {error && (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text className="font-sans-medium text-sm text-danger">{error}</Text>
            </View>
          )}

          {confirmationSent && (
            <View className="rounded-xl border border-success/30 bg-success/10 px-4 py-3">
              <Text className="font-sans-medium text-sm text-success">
                Check your email to confirm your account, then log in.
              </Text>
            </View>
          )}

          <Button label="Sign Up" onPress={onSubmit} loading={loading} disabled={!canSubmit} />
        </View>

        <View className="flex-row justify-center gap-1.5">
          <Text className="font-sans text-sm text-text-muted">Already have an account?</Text>
          <Link href="/login" className="font-sans-semibold text-sm text-primary-dark">
            Log in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
