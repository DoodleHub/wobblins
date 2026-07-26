/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { RewardToast } from "@/components/RewardToast";
import { StatBar } from "@/components/StatBar";
import { TraitBadge } from "@/components/TraitBadge";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, mixColors, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useCaptureWobblin } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";
import { achievementsToReward } from "@/utils/rewardToast";

type CaptureOutcome = "success" | "failure";

/** Glow radius/opacity behind the encountered Wobblin scales with rarity, so a legendary sighting reads as more dramatic than a common one. */
const RARITY_GLOW: Record<Rarity, { size: number; opacity: number; shadowRadius: number }> = {
  common: { size: 130, opacity: 0.25, shadowRadius: 30 },
  uncommon: { size: 138, opacity: 0.3, shadowRadius: 34 },
  rare: { size: 148, opacity: 0.36, shadowRadius: 40 },
  epic: { size: 158, opacity: 0.42, shadowRadius: 48 },
  legendary: { size: 170, opacity: 0.5, shadowRadius: 58 },
};

const RARITY_RIBBON_LABEL: Partial<Record<Rarity, string>> = {
  rare: "Rare Find",
  epic: "Epic Find",
  legendary: "Legendary Find",
};

/** Fixed display ceilings (not per-monster maxima) so a stat bar's fill communicates "how good is this roll" consistently across every encounter. */
const STAT_SCALE = {
  hp: 130,
  attack: 32,
  defense: 32,
  speed: 36,
};

export default function EncounterScreen() {
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const params = useLocalSearchParams<{
    name: string;
    element: Element;
    rarity: Rarity;
    base_hp: string;
    base_attack: string;
    base_defense: string;
    base_speed: string;
  }>();

  const captureMutation = useCaptureWobblin(playerId);
  const [outcome, setOutcome] = useState<CaptureOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const achievementReward = useMemo(
    () => achievementsToReward(captureMutation.checkAchievements.data?.unlocked ?? []),
    [captureMutation.checkAchievements.data],
  );

  const elementColor = ELEMENT_COLORS[params.element];
  const rarityColor = RARITY_COLORS[params.rarity];
  const glow = RARITY_GLOW[params.rarity];
  const ribbonLabel = RARITY_RIBBON_LABEL[params.rarity];
  const heroTint = mixColors(COLORS.surface, rarityColor, 0.18);
  const isSparkly = params.rarity === "epic" || params.rarity === "legendary";

  const [throwing, setThrowing] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const poof = useRef(new Animated.Value(0)).current;

  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const bobTranslate = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const shakeRotate = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-8deg", "0deg", "8deg"] });
  /** The creature itself pops, then shrinks away into the burst — separate from the sparkle burst so the sparkles keep radiating outward while the art collapses to nothing. */
  const captureScale = burst.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1, 1.15, 0] });
  const captureOpacity = burst.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });

  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  /**
   * Capture is resolved instantly by the RPC — no client-side suspense is
   * faked here. On success the creature shrinks away into a sparkle burst
   * and, the moment that finishes, the screen dismisses back to Explore
   * with a `caught` param — Explore is what shows the "Gotcha!" toast,
   * once the player is actually looking at it, rather than a toast that
   * flashes on a screen that's about to disappear. On failure the
   * creature stays put with a shake + poof so the player can retry or
   * back out manually.
   */
  const onCapture = () => {
    if (!playerId) {
      setError("Your session expired. Please log in again.");
      return;
    }

    setError(null);
    setOutcome(null);
    setThrowing(true);
    shake.setValue(0);
    burst.setValue(0);
    poof.setValue(0);

    captureMutation.mutate(params.name, {
      onSuccess: (result) => {
        setThrowing(false);

        if (result.success) {
          setOutcome("success");
          Animated.timing(burst, { toValue: 1, duration: 550, useNativeDriver: true }).start(() => {
            if (mounted.current) {
              router.dismissTo({ pathname: "/explore", params: { caught: params.name } });
            }
          });
        } else {
          setOutcome("failure");
          Animated.parallel([
            Animated.timing(poof, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
              Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
              Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
              Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
              Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
            ]),
          ]).start();
        }
      },
      onError: (err) => {
        setThrowing(false);
        setError(getErrorMessage(err));
      },
    });
  };

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={[`${rarityColor}26`, COLORS.background, COLORS.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      <RewardToast reward={achievementReward} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full min-w-0 flex-grow items-center gap-6 px-6 pb-10 pt-16"
      >
        <Reveal>
          <View className="items-center gap-1">
            <View className="flex-row items-center gap-1.5">
              <Icon family="ionicons" name="footsteps" size={14} color={COLORS.textMuted} />
              <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
                A wild Wobblin appeared!
              </Text>
            </View>
            {ribbonLabel && (
              <View
                className="mt-1 flex-row items-center gap-1.5 rounded-full border px-3 py-1"
                style={{ borderColor: `${rarityColor}66`, backgroundColor: `${rarityColor}1f` }}
              >
                <Icon family="ionicons" name="sparkles" size={12} color={rarityColor} />
                <Text className="font-sans-bold text-xs uppercase tracking-wide" style={{ color: rarityColor }}>
                  {ribbonLabel}
                </Text>
              </View>
            )}
          </View>
        </Reveal>

        <Reveal delay={80}>
          <View
            className="w-full items-center gap-4 overflow-hidden rounded-3xl border px-8 pb-6 pt-9"
            style={{ borderColor: `${rarityColor}4d` }}
          >
            <LinearGradient
              colors={[heroTint, COLORS.surface]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <Animated.View
              style={{
                width: 220,
                height: 220,
                transform: [{ translateY: bobTranslate }, { rotate: shakeRotate }],
              }}
              className="items-center justify-center"
            >
              {isSparkly && !throwing && outcome === null && <OrbitingSparkles color={rarityColor} />}
              {outcome === "success" && <CaptureBurst progress={burst} color={rarityColor} />}
              {outcome === "failure" && <CapturePoof progress={poof} />}

              <Animated.View
                className="items-center justify-center"
                style={{
                  width: 220,
                  height: 220,
                  opacity: outcome === "success" ? captureOpacity : 1,
                  transform: [{ scale: outcome === "success" ? captureScale : 1 }],
                }}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    width: glow.size,
                    height: glow.size,
                    borderRadius: glow.size / 2,
                    backgroundColor: rarityColor,
                    opacity: glow.opacity,
                    shadowColor: rarityColor,
                    shadowOpacity: 0.9,
                    shadowRadius: glow.shadowRadius,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 8,
                  }}
                />

                {SPECIES_ART[params.name] ? (
                  <Image source={SPECIES_ART[params.name]} style={{ width: "92%", height: "92%" }} contentFit="contain" />
                ) : (
                  <View
                    className="items-center justify-center rounded-full border-2 bg-background"
                    style={{ width: 180, height: 180, borderColor: rarityColor }}
                  >
                    <Icon {...ELEMENT_ICON[params.element]} size={64} color={elementColor} />
                  </View>
                )}
              </Animated.View>
            </Animated.View>

            <View className="items-center gap-1">
              <Text className="text-center font-display-bold text-3xl text-text">{params.name}</Text>
            </View>

            <View className="flex-row gap-2">
              <TraitBadge label={params.element} color={elementColor} />
              <TraitBadge label={params.rarity} color={rarityColor} />
            </View>
          </View>
        </Reveal>

        <Reveal delay={160}>
          <View className="w-full gap-3 rounded-2xl border border-border bg-surface p-4">
            <Text className="font-display text-sm uppercase tracking-wide text-text-muted">Base Stats</Text>
            <StatBar
              label="HP"
              value={Number(params.base_hp)}
              max={STAT_SCALE.hp}
              valueLabel={params.base_hp}
              color={COLORS.hp}
              icon={{ family: "ionicons", name: "heart" }}
            />
            <StatBar
              label="Attack"
              value={Number(params.base_attack)}
              max={STAT_SCALE.attack}
              valueLabel={params.base_attack}
              color={COLORS.primary}
              icon={{ family: "material-community", name: "sword" }}
            />
            <StatBar
              label="Defense"
              value={Number(params.base_defense)}
              max={STAT_SCALE.defense}
              valueLabel={params.base_defense}
              color={COLORS.secondary}
              icon={{ family: "material-community", name: "shield-outline" }}
            />
            <StatBar
              label="Speed"
              value={Number(params.base_speed)}
              max={STAT_SCALE.speed}
              valueLabel={params.base_speed}
              color={COLORS.energy}
              icon={{ family: "ionicons", name: "flash" }}
            />
          </View>
        </Reveal>

        {outcome === "failure" && (
          <Reveal>
            <OutcomeCard
              tone="warning"
              icon={{ family: "ionicons", name: "flash-off" }}
              message={`${params.name} broke free! Try again or move on.`}
            />
          </Reveal>
        )}

        {error && (
          <OutcomeCard tone="danger" icon={{ family: "ionicons", name: "alert-circle" }} message={error} />
        )}

        <View className="w-full flex-1 justify-end gap-3">
          {throwing ? (
            <View className="items-center py-2">
              <Text className="font-sans-medium text-sm text-text-muted">Capturing…</Text>
            </View>
          ) : outcome === "success" ? (
            <View className="items-center py-2">
              <Text className="font-sans-medium text-sm text-text-muted">Returning to Explore…</Text>
            </View>
          ) : (
            <View className="w-full gap-3">
              <Button label="Capture" onPress={onCapture} />
              <Button label="Run" variant="secondary" onPress={() => router.back()} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Simple staggered fade/rise-in used to sequence the header, hero card, and stats card on mount. */
function Reveal({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      className="w-full items-center"
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Three small twinkling sparkles orbiting the hero art, reserved for epic/legendary encounters so a rare sighting feels visibly more special. */
function OrbitingSparkles({ color }: { color: string }) {
  const positions = [
    { top: 6, left: 4, delay: 0 },
    { top: 18, right: -2, delay: 260 },
    { bottom: 10, left: -6, delay: 520 },
  ] as const;

  return (
    <>
      {positions.map((pos, index) => (
        <Sparkle key={index} color={color} delay={pos.delay} style={pos} />
      ))}
    </>
  );
}

function Sparkle({
  color,
  delay,
  style,
}: {
  color: string;
  delay: number;
  style: { top?: number; left?: number; right?: number; bottom?: number };
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.delay(600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        opacity: anim,
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] }) }],
        ...style,
      }}
    >
      <Icon family="ionicons" name="sparkles" size={16} color={color} />
    </Animated.View>
  );
}

/** A one-shot sparkle burst radiating out from the creature on a successful capture. */
function CaptureBurst({ progress, color }: { progress: Animated.Value; color: string }) {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <>
      {angles.map((angle) => {
        const radians = (angle * Math.PI) / 180;
        const distance = 90;
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(radians) * distance] });
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(radians) * distance] });
        const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });
        const scale = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.6] });

        return (
          <Animated.View
            key={angle}
            pointerEvents="none"
            style={{ position: "absolute", opacity, transform: [{ translateX }, { translateY }, { scale }] }}
          >
            <Icon family="ionicons" name="sparkles" size={14} color={color} />
          </Animated.View>
        );
      })}
    </>
  );
}

/** A quick fading puff behind the creature as it breaks free, paired with the "no" head-shake in `onCapture`. */
function CapturePoof({ progress }: { progress: Animated.Value }) {
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] });
  const opacity = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: COLORS.warning,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function OutcomeCard({
  tone,
  icon,
  message,
}: {
  tone: "success" | "warning" | "danger";
  icon: { family: "ionicons"; name: "checkmark-circle" | "flash-off" | "alert-circle" };
  message: string;
}) {
  const toneColor = tone === "success" ? COLORS.success : tone === "warning" ? COLORS.warning : COLORS.danger;

  return (
    <View
      className="w-full flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
      style={{ borderColor: `${toneColor}4d`, backgroundColor: `${toneColor}1a` }}
    >
      <Icon {...icon} size={22} color={toneColor} />
      <Text className="flex-1 font-sans-medium text-sm" style={{ color: toneColor }}>
        {message}
      </Text>
    </View>
  );
}
