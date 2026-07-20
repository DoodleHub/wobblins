import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { XPBar } from "@/components/XPBar";
import { AVATAR_ICON, type AvatarId } from "@/constants/avatars";
import { usePlayer } from "@/hooks/usePlayer";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { signOut } from "@/supabase/auth";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: player, isPending, error } = usePlayer(playerId);
  const { data: wobblins } = usePlayerWobblins(playerId);

  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  if (isPending) {
    return <LoadingScreen message="Loading profile…" />;
  }

  if (error || !player) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {error ? getErrorMessage(error) : "Profile not found."}
        </Text>
      </View>
    );
  }

  const avatarIcon = player.avatar ? AVATAR_ICON[player.avatar as AvatarId] : "🧭";
  const memberSince = new Date(player.created_at).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16"
    >
      <View className="items-center gap-3 rounded-2xl border border-border bg-surface p-6">
        <View className="h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary-light">
          <Text className="text-4xl">{avatarIcon}</Text>
        </View>
        <View className="items-center gap-0.5">
          <Text className="font-display-bold text-2xl text-text">{player.username}</Text>
          <Text className="font-sans-medium text-sm text-text-muted">Joined {memberSince}</Text>
        </View>
        <View className="w-full pt-2">
          <XPBar level={player.level} experience={player.experience} />
        </View>
      </View>

      <View className="flex-row gap-4">
        <StatCard icon="📚" label="Wobblins" value={String(wobblins?.length ?? 0)} />
        <StatCard icon="🪙" label="Gold" value={player.gold.toLocaleString()} />
      </View>

      <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
        <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Achievements</Text>
        <Text className="font-sans text-sm text-text-subtle">Coming soon.</Text>
      </View>

      <Button label="Sign Out" variant="secondary" onPress={onSignOut} loading={signingOut} />
    </ScrollView>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl border border-border bg-surface p-4">
      <Text className="text-2xl">{icon}</Text>
      <Text className="font-display-bold text-xl text-text">{value}</Text>
      <Text className="font-sans-medium text-xs text-text-subtle">{label}</Text>
    </View>
  );
}
