import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Icon, type IconSpec } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PLAYER_PORTRAIT, PROFILE_BANNER } from "@/constants/avatars";
import { COLORS } from "@/constants/theme";
import { usePlayer } from "@/hooks/usePlayer";
import { useMyGroups } from "@/hooks/useGroups";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
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
  const { data: groups } = useMyGroups(playerId);

  const [signingOut, setSigningOut] = useState(false);
  const contentStyle = useScrollScreenContentStyle(24, 1);

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

  const memberSince = new Date(player.created_at).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={contentStyle}>
      <ProfileBanner username={player.username} memberSince={memberSince} />

      <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
        <StatColumn
          icon={{ family: "material-community", name: "paw" }}
          value={String(wobblins?.length ?? 0)}
          label={"Wobblins\nCollected"}
        />
        <View className="h-10 w-px bg-border" />
        <StatColumn
          icon={{ family: "ionicons", name: "people" }}
          value={String(groups?.length ?? 0)}
          label={"Groups\nJoined"}
        />
      </View>

      <Button label="Sign Out" variant="secondary" onPress={onSignOut} loading={signingOut} />
    </ScrollView>
  );
}

function ProfileBanner({ username, memberSince }: { username: string; memberSince: string }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border">
      <Image source={PROFILE_BANNER} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={[COLORS.surface, `${COLORS.surface}cc`, "transparent"]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.3 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="gap-4 p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-3">
            <View>
              <Image
                source={PLAYER_PORTRAIT}
                style={{ width: 72, height: 72, borderRadius: 36 }}
                contentFit="cover"
              />
              <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-raised">
                <Icon family="ionicons" name="pencil" size={12} color={COLORS.textMuted} />
              </View>
            </View>
            <View className="gap-0.5">
              <Text className="font-display-bold text-2xl text-text">{username}</Text>
              <Text className="font-sans-medium text-sm text-text-muted">Joined {memberSince}</Text>
            </View>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-raised">
            <Icon family="ionicons" name="settings-sharp" size={17} color={COLORS.textMuted} />
          </View>
        </View>
      </View>
    </View>
  );
}

function StatColumn({ icon, value, label }: { icon: IconSpec; value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Icon {...icon} size={24} color={COLORS.textMuted} />
      <Text className="font-display-bold text-xl text-text">{value}</Text>
      <Text className="text-center font-sans-medium text-xs text-text-subtle">{label}</Text>
    </View>
  );
}
