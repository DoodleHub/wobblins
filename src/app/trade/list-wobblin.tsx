import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Icon, type IconSpec } from "@/components/Icon";
import { MonsterHero } from "@/components/MonsterHero";
import { TextField } from "@/components/TextField";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, type Element, type Rarity } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useListWobblinForOffers, useListWobblinForSale } from "@/hooks/useTrades";
import { useWobblin } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

type ListingChoice = "essence" | "offers";

/**
 * Pushed from `/trade/choose-wobblin`: the player decides whether the Wobblin
 * they just picked goes up for a fixed essence price or open to other
 * players' Wobblin offers. Submitting either path lists it and jumps straight
 * back to the Trade tab — this screen has no other exit.
 */
export default function ListWobblinScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const { wobblinId } = useLocalSearchParams<{ wobblinId: string }>();
  const contentStyle = useScrollScreenContentStyle(24, 1);

  const { data: wobblin, isPending } = useWobblin(wobblinId);
  const listForSale = useListWobblinForSale(playerId);
  const listForOffers = useListWobblinForOffers(playerId);

  const [choice, setChoice] = useState<ListingChoice | null>(null);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmitEssence = () => {
    const amount = Math.floor(Number(price));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an essence price.");
      return;
    }
    setError(null);
    listForSale.mutate(
      { playerWobblinId: wobblinId, priceEssence: amount },
      {
        onSuccess: () => router.dismissTo("/(tabs)/trade"),
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  const onSubmitOffers = () => {
    setError(null);
    listForOffers.mutate(wobblinId, {
      onSuccess: () => router.dismissTo("/(tabs)/trade"),
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={contentStyle}>
      <View className="mb-2 flex-row items-center">
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

      {isPending ? (
        <Text className="font-sans text-sm text-text-subtle">Loading…</Text>
      ) : !wobblin ? (
        <Text className="font-sans text-sm text-text-subtle">Wobblin not found.</Text>
      ) : (
        <View className="gap-6">
          <MonsterHero
            name={wobblin.nickname ?? wobblin.species.name}
            speciesName={wobblin.species.name}
            nicknamed={wobblin.nickname != null}
            level={wobblin.level}
            element={wobblin.species.element.toLowerCase() as Element}
            rarity={wobblin.species.rarity.toLowerCase() as Rarity}
            art={SPECIES_ART[wobblin.species.name]}
          />

          <View className="gap-3">
            <ChoiceCard
              icon={{ family: "ionicons", name: "flash" }}
              title="For Essence"
              description="Set a fixed price. Any player can buy it instantly."
              selected={choice === "essence"}
              onPress={() => setChoice("essence")}
            />
            <ChoiceCard
              icon={{ family: "ionicons", name: "swap-horizontal" }}
              title="For Offers"
              description="Open to other players' Wobblins. You choose which offer to accept."
              selected={choice === "offers"}
              onPress={() => setChoice("offers")}
            />
          </View>

          {choice === "essence" && (
            <View className="gap-3">
              <TextField
                label="Price (essence)"
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                placeholder="0"
              />
              <Button label="List for Sale" onPress={onSubmitEssence} loading={listForSale.isPending} />
            </View>
          )}

          {choice === "offers" && (
            <View className="gap-3">
              <Text className="font-sans text-sm text-text-subtle">
                Other players will be able to propose one or more of their own Wobblins in exchange.
                You&rsquo;ll be able to review and accept any offer from the Trade tab.
              </Text>
              <Button label="Open to Offers" onPress={onSubmitOffers} loading={listForOffers.isPending} />
            </View>
          )}

          {error && <Text className="font-sans-medium text-sm text-danger">{error}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: IconSpec;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className="flex-row items-center gap-3 rounded-2xl border p-4"
      style={{
        borderColor: selected ? COLORS.primary : COLORS.border,
        backgroundColor: selected ? COLORS.primaryLight : COLORS.surface,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: selected ? COLORS.primary : COLORS.surfaceRaised }}
      >
        <Icon {...icon} size={18} color={selected ? "#ffffff" : COLORS.textMuted} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-bold text-base text-text">{title}</Text>
        <Text className="font-sans text-xs text-text-subtle">{description}</Text>
      </View>
      <View
        className="h-6 w-6 items-center justify-center rounded-full border"
        style={{ borderColor: selected ? COLORS.primary : COLORS.border }}
      >
        {selected && <View className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.primary }} />}
      </View>
    </Pressable>
  );
}
