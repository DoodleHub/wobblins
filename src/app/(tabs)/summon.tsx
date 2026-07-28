/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { RewardToast, type RewardToastData } from "@/components/RewardToast";
import { SlideUpModal } from "@/components/SlideUpModal";
import { TraitBadge } from "@/components/TraitBadge";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useEssenceConfig } from "@/hooks/useEssence";
import { usePlayer } from "@/hooks/usePlayer";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useSummonWobblin } from "@/hooks/useSummon";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { SummonResult } from "@/supabase/summon";
import { getErrorMessage } from "@/utils/errors";

import darkEgg from "@/assets/images/wobblins/species/dark-egg.png";
import fireEgg from "@/assets/images/wobblins/species/fire-egg.png";
import grassEgg from "@/assets/images/wobblins/species/grass-egg.png";
import iceEgg from "@/assets/images/wobblins/species/ice-egg.png";
import lightEgg from "@/assets/images/wobblins/species/light-egg.png";
import poisonEgg from "@/assets/images/wobblins/species/poison-egg.png";
import rockEgg from "@/assets/images/wobblins/species/rock-egg.png";
import thunderEgg from "@/assets/images/wobblins/species/thunder-egg.png";
import waterEgg from "@/assets/images/wobblins/species/water-egg.png";
import windEgg from "@/assets/images/wobblins/species/wind-egg.png";

/** One egg portrait per element — orbit the mystery orb to hint at the pool of possible summons. */
const ELEMENT_EGGS: Record<Element, number> = {
  fire: fireEgg,
  water: waterEgg,
  grass: grassEgg,
  thunder: thunderEgg,
  dark: darkEgg,
  ice: iceEgg,
  rock: rockEgg,
  wind: windEgg,
  light: lightEgg,
  poison: poisonEgg,
};
const RING_ELEMENTS = Object.keys(ELEMENT_EGGS) as Element[];

const ORB_SIZE = 168;
const RING_RADIUS = 118;
const EGG_SIZE = 36;
const RING_CONTAINER_SIZE = RING_RADIUS * 2 + EGG_SIZE + 8;
const RING_CENTER = RING_CONTAINER_SIZE / 2;

/** Each egg's home offset from the ring center, in the container's unrotated frame. */
const RING_OFFSETS = RING_ELEMENTS.map((element, i) => {
  const angle = (2 * Math.PI * i) / RING_ELEMENTS.length - Math.PI / 2;
  return { element, dx: RING_RADIUS * Math.cos(angle), dy: RING_RADIUS * Math.sin(angle) };
});

// Summon sequence timing/turns — see runSummonSequence for the choreography.
const ACCEL_MS = 550;
const CONVERGE_MS = 450;
const TURNS_ACCEL = 3;
const TURNS_CONVERGE = 4;
const HOLD_TURNS = 60;
const HOLD_MS = 20000;
const ELEMENT_HOLD_MS = 450;
const ELEMENT_POP_OUT_MS = 220;
const RING_FLY_BACK_MS = 500;
const ABORT_FLY_BACK_MS = 350;

function timingAsync(value: Animated.Value, toValue: number, duration: number, easing: (t: number) => number) {
  return new Promise<void>((resolve) => {
    Animated.timing(value, { toValue, duration, easing, useNativeDriver: true }).start(() => resolve());
  });
}

function springAsync(value: Animated.Value, toValue: number, config: { friction: number; tension: number }) {
  return new Promise<void>((resolve) => {
    Animated.spring(value, { toValue, useNativeDriver: true, ...config }).start(() => resolve());
  });
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type Stage = "idle" | "charging" | "elementReveal";

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
  const [stage, setStage] = useState<Stage>("idle");
  const [pendingElement, setPendingElement] = useState<Element | null>(null);

  const cost = essenceConfig?.summon_cost_essence ?? 0;
  const balance = player?.essence_balance ?? 0;
  const canAfford = !essenceConfig || balance >= cost;
  const busy = stage !== "idle";
  const contentStyle = useScrollScreenContentStyle(24, 1);

  // Ambient breathing glow behind the orb — always running.
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  // Slow ambient orbit of the element-egg ring — always running in the background.
  const idleTurns = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(idleTurns, { toValue: 1, duration: 22000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [idleTurns]);

  // Extra turns layered on top of the ambient orbit while a summon is charging — ramps up,
  // then holds fast until the result is known. Never reset to 0 (see runSummonSequence),
  // so it never visibly snaps backward.
  const chargeTurns = useRef(new Animated.Value(0)).current;
  const chargeTurnsBaseline = useRef(0);

  // How far the ring has pulled in toward the center: 1 = full ring, 0 = merged at the center.
  const convergeFactor = useRef(new Animated.Value(1)).current;

  // The specific element egg that pops into the center once the species is known.
  const elementEggAnim = useRef(new Animated.Value(0)).current;

  // Spring the freshly revealed Wobblin into place each time a new result lands.
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!revealed) return;
    reveal.setValue(0);
    Animated.spring(reveal, { toValue: 1, useNativeDriver: true, friction: 6, tension: 45 }).start();
  }, [revealed, reveal]);

  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  const runSummonSequence = async () => {
    setStage("charging");
    setPendingElement(null);
    // Clear the previous result now so it can't linger under the new element-egg
    // reveal — it reappears (as the new result) only at the "pop" moment below.
    setRevealed(null);

    const summonPromise = summonWobblin.mutateAsync();

    const base = chargeTurnsBaseline.current;
    // Phase 1: spin faster and faster in place.
    await timingAsync(chargeTurns, base + TURNS_ACCEL, ACCEL_MS, Easing.in(Easing.cubic));
    // Phase 2: keep accelerating while the ring pulls into the center.
    await Promise.all([
      timingAsync(chargeTurns, base + TURNS_ACCEL + TURNS_CONVERGE, CONVERGE_MS, Easing.in(Easing.quad)),
      timingAsync(convergeFactor, 0, CONVERGE_MS, Easing.in(Easing.cubic)),
    ]);

    // Hold: keep spinning fast at the center until the result comes back.
    const holdTarget = base + TURNS_ACCEL + TURNS_CONVERGE + HOLD_TURNS;
    Animated.timing(chargeTurns, { toValue: holdTarget, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: true }).start();

    let result: SummonResult;
    try {
      result = await summonPromise;
    } catch (err) {
      chargeTurnsBaseline.current = await new Promise<number>((resolve) => chargeTurns.stopAnimation(resolve));
      await timingAsync(convergeFactor, 1, ABORT_FLY_BACK_MS, Easing.out(Easing.cubic));
      setStage("idle");
      if (getErrorMessage(err) === "Not enough essence") {
        setNotEnoughEssenceVisible(true);
      }
      return;
    }
    chargeTurnsBaseline.current = await new Promise<number>((resolve) => chargeTurns.stopAnimation(resolve));

    // The eggs have merged — pop the specific element egg into the center.
    setPendingElement(result.species.element.toLowerCase() as Element);
    setStage("elementReveal");
    elementEggAnim.setValue(0);
    await springAsync(elementEggAnim, 1, { friction: 6, tension: 60 });
    await delay(ELEMENT_HOLD_MS);

    // Pop! The element egg gives way to the actual Wobblin.
    setToast({
      icon: { family: "ionicons", name: "sparkles" },
      title: `${result.species.name} Summoned!`,
      subtitle: "Added to your Collection.",
    });
    setRevealed(result);
    setPendingElement(null);
    await Promise.all([
      timingAsync(elementEggAnim, 0, ELEMENT_POP_OUT_MS, Easing.in(Easing.quad)),
      timingAsync(convergeFactor, 1, RING_FLY_BACK_MS, Easing.out(Easing.cubic)),
    ]);
    setStage("idle");
  };

  const onSummon = () => {
    if (busy) return;
    if (!canAfford) {
      setNotEnoughEssenceVisible(true);
      return;
    }
    runSummonSequence();
  };

  const glowColor = pendingElement
    ? ELEMENT_COLORS[pendingElement]
    : revealed
      ? RARITY_COLORS[revealed.species.rarity.toLowerCase() as Rarity]
      : COLORS.primary;
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const totalTurns = Animated.add(idleTurns, chargeTurns);
  const ringRotateDeg = totalTurns.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const eggCounterRotateDeg = totalTurns.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });
  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const elementEggScale = elementEggAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const ringOpacity = revealed && stage === "idle" ? 0.35 : 0.9;

  return (
    <View className="flex-1 bg-background">
      <RewardToast reward={toast} offsetTop={8} />
      <ScrollView className="flex-1" contentContainerStyle={contentStyle}>
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="font-display-bold text-3xl text-text">Summon</Text>
          <View
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
            style={{ borderColor: `${COLORS.essence}40`, backgroundColor: `${COLORS.essence}14` }}
          >
            <Icon family="ionicons" name="flash" size={14} color={COLORS.essence} />
            <Text className="font-sans-semibold text-sm" style={{ color: COLORS.essence }}>
              {balance}
            </Text>
          </View>
        </View>

        <Text className="mb-2 font-sans-medium text-sm text-text-muted">
          {stage === "charging"
            ? "The essence is swirling…"
            : stage === "elementReveal"
              ? "Something's taking shape…"
              : revealed
                ? "Press Summon to try your luck again."
                : "Spend essence for a random Stage 0 Wobblin."}
        </Text>

        <View className="items-center py-4">
          <View style={{ width: RING_CONTAINER_SIZE, height: RING_CONTAINER_SIZE, opacity: canAfford || revealed ? 1 : 0.55 }}>
            {/* Breathing glow */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: RING_CENTER - ORB_SIZE / 2,
                top: RING_CENTER - ORB_SIZE / 2,
                width: ORB_SIZE,
                height: ORB_SIZE,
                borderRadius: ORB_SIZE / 2,
                backgroundColor: glowColor,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
                shadowColor: glowColor,
                shadowOpacity: 0.9,
                shadowRadius: 40,
                shadowOffset: { width: 0, height: 0 },
                elevation: 8,
              }}
            />

            {/* Orbiting/converging element-egg ring */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                inset: 0,
                transform: [{ rotate: ringRotateDeg }],
                opacity: ringOpacity,
              }}
            >
              {RING_OFFSETS.map(({ element, dx, dy }) => (
                <Animated.View
                  key={element}
                  style={{
                    position: "absolute",
                    left: RING_CENTER - EGG_SIZE / 2,
                    top: RING_CENTER - EGG_SIZE / 2,
                    width: EGG_SIZE,
                    height: EGG_SIZE,
                    transform: [
                      { translateX: Animated.multiply(convergeFactor, dx) },
                      { translateY: Animated.multiply(convergeFactor, dy) },
                      { rotate: eggCounterRotateDeg },
                    ],
                  }}
                >
                  <View
                    className="h-full w-full items-center justify-center rounded-full border"
                    style={{ borderColor: `${ELEMENT_COLORS[element]}55`, backgroundColor: COLORS.surface }}
                  >
                    <Image source={ELEMENT_EGGS[element]} style={{ width: "82%", height: "82%" }} contentFit="contain" />
                  </View>
                </Animated.View>
              ))}
            </Animated.View>

            {/* Center content: idle mystery / element egg / revealed portrait — each layer is
                its own absolutely-positioned overlay so simultaneous content (e.g. the element
                egg fading out while the portrait pops in) overlaps instead of stacking. */}
            {!revealed && stage === "idle" && (
              <View
                pointerEvents="none"
                className="absolute items-center justify-center"
                style={{ left: RING_CENTER - ORB_SIZE / 2, top: RING_CENTER - ORB_SIZE / 2, width: ORB_SIZE, height: ORB_SIZE }}
              >
                <View
                  className="h-28 w-28 items-center justify-center rounded-full border-2 border-dashed"
                  style={{ borderColor: `${COLORS.primary}66` }}
                >
                  <Icon family="ionicons" name="help" size={40} color={COLORS.primaryDark} />
                </View>
              </View>
            )}
            {stage === "elementReveal" && pendingElement && (
              <View
                pointerEvents="none"
                className="absolute items-center justify-center"
                style={{ left: RING_CENTER - ORB_SIZE / 2, top: RING_CENTER - ORB_SIZE / 2, width: ORB_SIZE, height: ORB_SIZE }}
              >
                <Animated.View style={{ transform: [{ scale: elementEggScale }], opacity: elementEggAnim }}>
                  <Image
                    source={ELEMENT_EGGS[pendingElement]}
                    style={{ width: ORB_SIZE * 0.55, height: ORB_SIZE * 0.55 }}
                    contentFit="contain"
                  />
                </Animated.View>
              </View>
            )}
            {revealed && stage !== "charging" && (
              <View
                pointerEvents="none"
                className="absolute items-center justify-center"
                style={{ left: RING_CENTER - ORB_SIZE / 2, top: RING_CENTER - ORB_SIZE / 2, width: ORB_SIZE, height: ORB_SIZE }}
              >
                <RevealedPortrait result={revealed} scale={revealScale} opacity={reveal} />
              </View>
            )}
          </View>

          <Pressable
            onPress={onSummon}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Summon again" : "Summon a Wobblin"}
            className="mt-6 w-full max-w-xs"
          >
            <Animated.View
              className="flex-row items-center justify-center gap-2 rounded-full border px-6 py-4"
              style={{
                transform: [{ scale: pressScale }],
                borderColor: canAfford ? `${COLORS.essence}55` : `${COLORS.danger}55`,
                backgroundColor: canAfford ? `${COLORS.essence}1f` : `${COLORS.danger}1f`,
                shadowColor: canAfford ? COLORS.essence : COLORS.danger,
                shadowOpacity: busy ? 0 : 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
                elevation: busy ? 0 : 5,
                opacity: busy ? 0.7 : 1,
              }}
            >
              <Icon family="ionicons" name="flash" size={20} color={canAfford ? COLORS.essence : COLORS.danger} />
              <Text
                className="font-sans-bold text-lg"
                style={{ color: canAfford ? COLORS.essence : COLORS.danger }}
              >
                {busy ? "Summoning…" : `Summon for ${cost}`}
              </Text>
            </Animated.View>
          </Pressable>
        </View>

        {revealed && stage === "idle" && (
          <RevealedDetails result={revealed} onViewWobblin={() => router.push(`/wobblin/${revealed.wobblin.id}`)} />
        )}
      </ScrollView>

      <SlideUpModal
        visible={notEnoughEssenceVisible}
        onClose={() => setNotEnoughEssenceVisible(false)}
        title="Not enough essence"
        message={`You need ${cost} essence to summon. Keep earning from your featured Wobblin or claim your daily reward.`}
        icon={{ family: "ionicons", name: "flash" }}
      />
    </View>
  );
}

function RevealedPortrait({
  result,
  scale,
  opacity,
}: {
  result: SummonResult;
  scale: Animated.AnimatedInterpolation<number>;
  opacity: Animated.Value;
}) {
  const element = result.species.element.toLowerCase() as Element;
  const elementColor = ELEMENT_COLORS[element];
  const art = SPECIES_ART[result.species.name];

  return (
    <Animated.View style={{ transform: [{ scale }], opacity, alignItems: "center", justifyContent: "center" }}>
      {art ? (
        <Image source={art} style={{ width: ORB_SIZE * 0.72, height: ORB_SIZE * 0.72 }} contentFit="contain" />
      ) : (
        <View
          className="h-28 w-28 items-center justify-center rounded-full border-2 bg-background"
          style={{ borderColor: elementColor }}
        >
          <Icon {...ELEMENT_ICON[element]} size={44} color={elementColor} />
        </View>
      )}
    </Animated.View>
  );
}

function RevealedDetails({
  result,
  onViewWobblin,
}: {
  result: SummonResult;
  onViewWobblin: () => void;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [result, entrance]);

  const element = result.species.element.toLowerCase() as Element;
  const rarity = result.species.rarity.toLowerCase() as Rarity;

  return (
    <Animated.View
      className="items-center gap-3 rounded-2xl border p-5"
      style={{
        borderColor: `${RARITY_COLORS[rarity]}40`,
        backgroundColor: `${RARITY_COLORS[rarity]}0d`,
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Text className="font-display-bold text-2xl text-text">{result.species.name}</Text>
      <View className="flex-row gap-2">
        <TraitBadge label={element} color={ELEMENT_COLORS[element]} />
        <TraitBadge label={rarity} color={RARITY_COLORS[rarity]} />
      </View>
      <Pressable onPress={onViewWobblin} accessibilityRole="button" className="mt-1 flex-row items-center gap-1">
        <Text className="font-sans-semibold text-sm" style={{ color: COLORS.primaryDark }}>
          View Wobblin
        </Text>
        <Icon family="ionicons" name="arrow-forward" size={14} color={COLORS.primaryDark} />
      </Pressable>
    </Animated.View>
  );
}
