import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { TextField } from "@/components/TextField";
import { COLORS } from "@/constants/theme";
import { useCreateGroup, useJoinGroup, useJoinPublicGroup, useMyGroups, usePublicGroups } from "@/hooks/useGroups";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { Group, PublicGroupListing } from "@/supabase/groups";
import { getErrorMessage } from "@/utils/errors";

type Mode = "list" | "create" | "join" | "discover";

export default function GroupsScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: groups, isPending, error } = useMyGroups(playerId);
  const createGroup = useCreateGroup(playerId);
  const joinGroup = useJoinGroup(playerId);
  const joinPublicGroup = useJoinPublicGroup(playerId);

  const [mode, setMode] = useState<Mode>("list");
  const { data: publicGroups, isPending: publicGroupsPending } = usePublicGroups(mode === "discover");
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const contentStyle = useScrollScreenContentStyle(16, 1);

  const resetForm = () => {
    setMode("list");
    setName("");
    setIsPublic(false);
    setInviteCode("");
    setFormError(null);
  };

  const onCreate = () => {
    if (!name.trim()) return;
    setFormError(null);
    createGroup.mutate(
      { name: name.trim(), isPublic },
      {
        onSuccess: (group) => {
          resetForm();
          router.push(`/group/${group.id}`);
        },
        onError: (err) => setFormError(getErrorMessage(err)),
      },
    );
  };

  const onJoin = () => {
    if (!inviteCode.trim()) return;
    setFormError(null);
    joinGroup.mutate(inviteCode.trim(), {
      onSuccess: (group) => {
        resetForm();
        router.push(`/group/${group.id}`);
      },
      onError: (err) => setFormError(getErrorMessage(err)),
    });
  };

  const onJoinPublic = (group: PublicGroupListing) => {
    setFormError(null);
    joinPublicGroup.mutate(group.id, {
      onSuccess: () => {
        resetForm();
        router.push(`/group/${group.id}`);
      },
      onError: (err) => setFormError(getErrorMessage(err)),
    });
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-background" style={contentStyle}>
        <Skeleton className="mb-2 h-9 w-40" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={contentStyle}>
      <Text className="font-display-bold text-3xl text-text">Groups</Text>

      {error && (
        <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          <Text className="font-sans-medium text-sm text-danger">{getErrorMessage(error)}</Text>
        </View>
      )}

      {mode === "list" && (
        <>
          {groups && groups.length > 0 ? (
            <View className="gap-3">
              {groups.map((group) => (
                <GroupRow key={group.id} group={group} onPress={() => router.push(`/group/${group.id}`)} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={{ family: "ionicons", name: "people" }}
              title="No groups yet"
              description="Create a group or join one with an invite code to start trading tasks for Wobblins."
            />
          )}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Create Group" onPress={() => setMode("create")} />
            </View>
            <View className="flex-1">
              <Button label="Join Group" variant="secondary" onPress={() => setMode("join")} />
            </View>
          </View>
          <Button label="Discover Public Groups" variant="secondary" onPress={() => setMode("discover")} />
        </>
      )}

      {mode === "create" && (
        <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">New Group</Text>
          <TextField label="Group Name" value={name} onChangeText={setName} placeholder="e.g. Roommates" maxLength={40} />

          <View className="gap-2">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Visibility</Text>
            <View className="flex-row gap-2">
              {[
                { label: "Private", value: false, description: "Invite code only" },
                { label: "Public", value: true, description: "Anyone can discover & join" },
              ].map((option) => {
                const selected = option.value === isPublic;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setIsPublic(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="flex-1 rounded-xl border px-3 py-2.5"
                    style={{
                      borderColor: selected ? COLORS.primary : COLORS.border,
                      backgroundColor: selected ? COLORS.primary : COLORS.surface,
                    }}
                  >
                    <Text
                      className="font-sans-semibold text-sm"
                      style={{ color: selected ? "#ffffff" : COLORS.text }}
                    >
                      {option.label}
                    </Text>
                    <Text
                      className="font-sans text-xs"
                      style={{ color: selected ? "#ffffffcc" : COLORS.textSubtle }}
                    >
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {formError && <Text className="font-sans-medium text-sm text-danger">{formError}</Text>}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancel" variant="secondary" onPress={resetForm} />
            </View>
            <View className="flex-1">
              <Button
                label="Create"
                onPress={onCreate}
                loading={createGroup.isPending}
                disabled={!name.trim()}
              />
            </View>
          </View>
        </View>
      )}

      {mode === "join" && (
        <View className="gap-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Join Group</Text>
          <TextField
            label="Invite Code"
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            placeholder="e.g. AB12CD"
            autoCapitalize="characters"
            maxLength={6}
          />
          {formError && <Text className="font-sans-medium text-sm text-danger">{formError}</Text>}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancel" variant="secondary" onPress={resetForm} />
            </View>
            <View className="flex-1">
              <Button label="Join" onPress={onJoin} loading={joinGroup.isPending} disabled={!inviteCode.trim()} />
            </View>
          </View>
        </View>
      )}

      {mode === "discover" && (
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Public Groups</Text>
            <Pressable onPress={resetForm} accessibilityRole="button">
              <Text className="font-sans-semibold text-sm text-primary">Done</Text>
            </Pressable>
          </View>

          {formError && <Text className="font-sans-medium text-sm text-danger">{formError}</Text>}

          {publicGroupsPending ? (
            <Skeleton className="h-20 w-full rounded-2xl" />
          ) : publicGroups && publicGroups.length > 0 ? (
            <View className="gap-3">
              {publicGroups.map((group) => (
                <PublicGroupRow
                  key={group.id}
                  group={group}
                  onJoin={() => onJoinPublic(group)}
                  joining={joinPublicGroup.isPending}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={{ family: "ionicons", name: "compass-outline" }}
              title="No public groups yet"
              description="Public groups anyone can discover and join will show up here."
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function GroupRow({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: COLORS.primaryLight }}
      >
        <Icon family="ionicons" name="people" size={22} color={COLORS.primaryDark} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-display-bold text-base text-text">{group.name}</Text>
          {group.is_public && (
            <View className="rounded-full bg-secondary/15 px-2 py-0.5">
              <Text className="font-sans-semibold text-[10px] uppercase text-secondary">Public</Text>
            </View>
          )}
        </View>
        <Text className="font-sans text-xs text-text-subtle">Code: {group.invite_code}</Text>
      </View>
      <Icon family="ionicons" name="chevron-forward" size={18} color={COLORS.textSubtle} />
    </Pressable>
  );
}

function PublicGroupRow({
  group,
  onJoin,
  joining,
}: {
  group: PublicGroupListing;
  onJoin: () => void;
  joining: boolean;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: COLORS.primaryLight }}
      >
        <Icon family="ionicons" name="people" size={22} color={COLORS.primaryDark} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-display-bold text-base text-text">{group.name}</Text>
        <Text className="font-sans text-xs text-text-subtle">
          {group.member_count} member{group.member_count === 1 ? "" : "s"} · {group.open_task_count} open task
          {group.open_task_count === 1 ? "" : "s"}
        </Text>
      </View>
      <Button label="Join" onPress={onJoin} loading={joining} />
    </View>
  );
}
