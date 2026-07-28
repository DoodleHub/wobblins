import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { SlideUpModal } from "@/components/SlideUpModal";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useEssenceConfig } from "@/hooks/useEssence";
import { usePlayer } from "@/hooks/usePlayer";
import { useSummonWobblin } from "@/hooks/useSummon";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { SummonResult } from "@/supabase/summon";
import { getErrorMessage } from "@/utils/errors";

export default function SummonScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: player } = usePlayer(playerId);
  const { data: essenceConfig } = useEssenceConfig();
  const summonWobblin = useSummonWobblin(playerId);

  const [toast, setToast] = useState<RewardToastData | null>(null);
  const [revealed, setRevealed] = useState<SummonResult | null>(null);
  const [notEnoughEssenceVisible, setNotEnoughEssenceVisible] = useState(false);

  const cost = essenceConfig?.summon_cost_essence ?? 0;

  const onSummon = () => {
    summonWobblin.mutate(undefined, {
      onSuccess: (result) => {
        setRevealed(result);
        setToast({
          icon: { family: "ionicons", name: "sparkles" },
          title: `${result.species.name} Summoned!`,
          subtitle: "Added to your Collection.",
        });
      },
      onError: (err) => {
        if (getErrorMessage(err) === "Not enough essence") {
          setNotEnoughEssenceVisible(true);
        }
      },
    });
  };

  return (
    <View className="flex-1 bg-background">
      <RewardToast reward={toast} offsetTop={76} />
      <ScrollView className="flex-1" contentContainerClassName="w-full min-w-0 flex-grow gap-6 px-6 pb-8 pt-16">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
          >
            <Icon family="ionicons" name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
          <View
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
            style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}14` }}
          >
            <Icon family="ionicons" name="flash" size={14} color={COLORS.essence} />
            <Text className="font-sans-semibold text-sm" style={{ color: COLORS.essence }}>
              {player?.essence_balance ?? 0}
            </Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="font-display-bold text-3xl text-text">Summon</Text>
          <Text className="font-sans-medium text-sm text-text-muted">
            Spend essence for a random Stage 0 Wobblin.
          </Text>
        </View>

        <SummonCard result={revealed} />

        <Pressable
          onPress={onSummon}
          disabled={summonWobblin.isPending}
          accessibilityRole="button"
          className="items-center rounded-2xl py-4"
          style={{
            backgroundColor: COLORS.primary,
            opacity: summonWobblin.isPending ? 0.5 : 1,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Icon family="ionicons" name="flash" size={16} color="#ffffff" />
            <Text className="font-sans-bold text-base text-white">
              {summonWobblin.isPending ? "Summoning…" : `Summon for ${cost}`}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      <SlideUpModal
        visible={notEnoughEssenceVisible}
        onClose={() => setNotEnoughEssenceVisible(false)}
        title="Not enough essence"
        icon={{ family: "ionicons", name: "flash" }}
      />
    </View>
  );
}

function SummonCard({ result }: { result: SummonResult | null }) {
  if (!result) {
    return (
      <View
        className="aspect-square items-center justify-center rounded-2xl border border-dashed"
        style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
      >
        <Icon family="ionicons" name="help-circle-outline" size={48} color={COLORS.textMuted} />
        <Text className="mt-2 font-sans-medium text-sm text-text-muted">Your next Wobblin is a mystery.</Text>
      </View>
    );
  }

  const element = result.species.element.toLowerCase() as Element;
  const rarity = result.species.rarity.toLowerCase() as Rarity;
  const elementColor = ELEMENT_COLORS[element];
  const rarityColor = RARITY_COLORS[rarity];
  const art = SPECIES_ART[result.species.name];

  return (
    <View
      className="aspect-square items-center justify-center gap-2 rounded-2xl border p-4"
      style={{ borderColor: `${rarityColor}55`, backgroundColor: `${rarityColor}14` }}
    >
      {art ? (
        <Image source={art} style={{ width: "70%", height: "70%" }} contentFit="contain" />
      ) : (
        <View
          className="h-32 w-32 items-center justify-center rounded-full border-2 bg-background"
          style={{ borderColor: elementColor }}
        >
          <Icon {...ELEMENT_ICON[element]} size={48} color={elementColor} />
        </View>
      )}
      <Text className="font-display-bold text-lg text-text">{result.species.name}</Text>
    </View>
  );
}
