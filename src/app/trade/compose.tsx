import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { TextField } from "@/components/TextField";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element } from "@/constants/theme";
import {
  useFindPlayerByUsername,
  usePlayerWobblinsForTrade,
  useProposeTradeOffer,
} from "@/hooks/useTrades";
import { usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

/** `player_public_profiles` types every column nullable (it's a view), but `id`/`username` are never actually null in practice — narrowed once here after the lookup so the rest of the screen doesn't have to re-check. */
type RecipientProfile = { id: string; username: string };

export default function ComposeTradeScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: myWobblins } = usePlayerWobblins(playerId);
  const findPlayerByUsername = useFindPlayerByUsername();
  const proposeTradeOffer = useProposeTradeOffer(playerId);

  const [username, setUsername] = useState("");
  const [findError, setFindError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<RecipientProfile | null>(null);
  const [offeredId, setOfferedId] = useState<string | null>(null);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: theirWobblins } = usePlayerWobblinsForTrade(recipient?.id);

  const myEligible = myWobblins ?? [];

  const onFindPlayer = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setFindError("Enter a username.");
      return;
    }
    setFindError(null);
    findPlayerByUsername.mutate(trimmed, {
      onSuccess: (found) => {
        if (!found || !found.id || !found.username) {
          setFindError("No player found with that username.");
          return;
        }
        if (found.id === playerId) {
          setFindError("You can't trade with yourself.");
          return;
        }
        setRecipient({ id: found.id, username: found.username });
        setRequestedId(null);
      },
      onError: (err) => setFindError(getErrorMessage(err)),
    });
  };

  const onSubmit = () => {
    if (!recipient || !offeredId || !requestedId) {
      setSubmitError("Choose a Wobblin from each side to complete the offer.");
      return;
    }
    setSubmitError(null);
    proposeTradeOffer.mutate(
      { offeredWobblinId: offeredId, recipientId: recipient.id, requestedWobblinId: requestedId },
      {
        onSuccess: () => router.back(),
        onError: (err) => setSubmitError(getErrorMessage(err)),
      },
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
          >
            <Icon family="ionicons" name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
        </View>

        <Text className="font-display-bold text-3xl text-text">Propose Trade</Text>

        <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
          <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Trade With</Text>
          {recipient ? (
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-semibold text-sm text-text">{recipient.username}</Text>
              <Pressable
                onPress={() => {
                  setRecipient(null);
                  setRequestedId(null);
                }}
              >
                <Text className="font-sans-semibold text-xs text-primary-dark">Change</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              <TextField
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="their-username"
                autoCapitalize="none"
              />
              <Button label="Find Player" onPress={onFindPlayer} loading={findPlayerByUsername.isPending} />
              {findError && <Text className="font-sans-medium text-sm text-danger">{findError}</Text>}
            </View>
          )}
        </View>

        {recipient && (
          <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
              Their Wobblin You Want
            </Text>
            {!theirWobblins || theirWobblins.length === 0 ? (
              <Text className="font-sans text-sm text-text-subtle">
                {recipient.username} has no eligible Wobblins.
              </Text>
            ) : (
              <View className="gap-2">
                {theirWobblins.map((w) => (
                  <WobblinPickRow
                    key={w.id}
                    wobblin={w}
                    selected={requestedId === w.id}
                    onPress={() => setRequestedId(w.id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {recipient && (
          <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
              Your Wobblin to Offer
            </Text>
            {myEligible.length === 0 ? (
              <Text className="font-sans text-sm text-text-subtle">No eligible Wobblins to offer.</Text>
            ) : (
              <View className="gap-2">
                {myEligible.map((w) => (
                  <WobblinPickRow
                    key={w.id}
                    wobblin={w}
                    selected={offeredId === w.id}
                    onPress={() => setOfferedId(w.id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {recipient && (
          <View className="gap-2">
            <Button label="Send Offer" onPress={onSubmit} loading={proposeTradeOffer.isPending} />
            {submitError && <Text className="font-sans-medium text-sm text-danger">{submitError}</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function WobblinPickRow({
  wobblin,
  selected,
  onPress,
}: {
  wobblin: PlayerWobblin;
  selected: boolean;
  onPress: () => void;
}) {
  const element = wobblin.species.element.toLowerCase() as Element;
  const name = wobblin.nickname ?? wobblin.species.name;
  const art = SPECIES_ART[wobblin.species.name];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className="flex-row items-center gap-3 rounded-xl border p-3"
      style={{
        borderColor: selected ? COLORS.primary : COLORS.border,
        backgroundColor: selected ? COLORS.primaryLight : COLORS.surfaceRaised,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full border bg-background"
        style={{ borderColor: `${ELEMENT_COLORS[element]}66` }}
      >
        {art ? (
          <Image source={art} style={{ width: "82%", height: "82%" }} contentFit="contain" />
        ) : (
          <Icon {...ELEMENT_ICON[element]} size={16} color={ELEMENT_COLORS[element]} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-sm text-text">{name}</Text>
        <Text className="font-sans text-xs text-text-subtle">Lv. {wobblin.level}</Text>
      </View>
      <View
        className="h-5 w-5 items-center justify-center rounded-full border-2"
        style={{ borderColor: selected ? COLORS.primary : COLORS.border }}
      >
        {selected && <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.primary }} />}
      </View>
    </Pressable>
  );
}
