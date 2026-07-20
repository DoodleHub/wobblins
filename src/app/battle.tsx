import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { LevelUpBanner } from "@/components/LevelUpBanner";
import { StatBar } from "@/components/StatBar";
import { XPBar } from "@/components/XPBar";
import { COLORS, ELEMENT_EMOJI, type Element } from "@/constants/theme";
import { useResolveBattle } from "@/hooks/useBattle";
import { useWobblin } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import { getErrorMessage } from "@/utils/errors";

type Phase = "fighting" | "victory" | "defeat";

export default function BattleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSupabase();
  const playerId = session?.user.id;

  const { data: wobblin, isPending: wobblinPending, error: wobblinError } = useWobblin(id);
  const battleMutation = useResolveBattle(id, playerId);

  const [turnIndex, setTurnIndex] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("fighting");
  const [levelUp, setLevelUp] = useState<number | null>(null);

  function startBattle() {
    battleMutation.mutate(undefined, {
      onSuccess: (result) => {
        setTurnIndex(0);
        setLog([`A wild ${result.enemy.name} appears!`]);
        setPhase("fighting");
      },
    });
  }

  useEffect(() => {
    if (id) startBattle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const battleResult = battleMutation.data;

  function handleAttack() {
    if (!wobblin || !battleResult || phase !== "fighting") return;

    const playerName = wobblin.nickname ?? wobblin.species.name;
    const enemyName = battleResult.enemy.name;
    const turns = battleResult.turns;

    // Reveal one full round (player hit + enemy counter) per tap.
    const nextIndex = Math.min(turnIndex + 2, turns.length);
    const revealed = turns.slice(turnIndex, nextIndex);
    const nextLog = [...log];

    for (const turn of revealed) {
      if (turn.actor === "player") {
        nextLog.push(`${playerName} hits ${enemyName} for ${turn.damage} damage.`);
      } else {
        nextLog.push(`${enemyName} hits ${playerName} for ${turn.damage} damage.`);
      }
    }

    setTurnIndex(nextIndex);

    if (nextIndex >= turns.length) {
      if (battleResult.winner === "player") {
        nextLog.push(`${enemyName} was defeated! Victory!`);
        setPhase("victory");
      } else {
        nextLog.push(`${playerName} was defeated...`);
        setPhase("defeat");
      }
    }

    setLog(nextLog);
  }

  const loading = wobblinPending || (battleMutation.isPending && !battleResult);
  const loadError = wobblinError ?? battleMutation.error;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (loadError || !wobblin || !battleResult) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Text className="font-sans-medium text-sm text-danger">
          {loadError ? getErrorMessage(loadError) : "Couldn't start battle."}
        </Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const playerName = wobblin.nickname ?? wobblin.species.name;
  const playerElement = wobblin.species.element.toLowerCase() as Element;
  const enemyElement = battleResult.enemy.element.toLowerCase() as Element;

  const lastTurn = turnIndex > 0 ? battleResult.turns[turnIndex - 1] : null;
  const playerHp = lastTurn ? lastTurn.player_hp : battleResult.player_max_hp;
  const enemyHp = lastTurn ? lastTurn.enemy_hp : battleResult.enemy.max_hp;

  return (
    <View className="relative w-full min-w-0 flex-1 gap-5 bg-background px-6 pb-8 pt-16">
      <LevelUpBanner level={levelUp} label={`${playerName} leveled up!`} />
      <Text className="text-center font-display-bold text-2xl text-text">Battle</Text>

      <View className="flex-row items-center gap-3">
        <Combatant
          name={playerName}
          level={wobblin.level}
          emoji={ELEMENT_EMOJI[playerElement]}
          hp={playerHp}
          maxHp={battleResult.player_max_hp}
          xp={{ experience: wobblin.experience, onLevelUp: setLevelUp }}
        />
        <Text className="font-display-bold text-lg text-text-subtle">VS</Text>
        <Combatant
          name={battleResult.enemy.name}
          level={wobblin.level}
          emoji={ELEMENT_EMOJI[enemyElement]}
          hp={enemyHp}
          maxHp={battleResult.enemy.max_hp}
        />
      </View>

      <ScrollView className="max-h-48 grow-0 rounded-2xl border border-border bg-surface p-3">
        <View className="gap-1.5">
          {log.map((entry, index) => (
            <Text key={index} className="font-sans text-xs text-text-muted">
              {entry}
            </Text>
          ))}
        </View>
      </ScrollView>

      {phase === "fighting" && <Button label="Attack" onPress={handleAttack} />}

      {phase === "victory" && (
        <View className="gap-4 rounded-2xl border border-success/30 bg-success/10 p-4">
          <Text className="text-center font-display-bold text-lg text-success">Victory!</Text>
          <View className="flex-row justify-center gap-6">
            <Reward icon="🪙" label="Gold" value={`+${battleResult.gold_reward}`} className="text-gold" />
            <Reward icon="✨" label="XP" value={`+${battleResult.xp_reward}`} className="text-xp" />
          </View>
          <View className="gap-3">
            <Button label="Battle Again" onPress={startBattle} loading={battleMutation.isPending} />
            <Button label="Back to Wobblin" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      )}

      {phase === "defeat" && (
        <View className="gap-4 rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <Text className="text-center font-display-bold text-lg text-danger">Defeated</Text>
          <Text className="text-center font-sans text-sm text-text-muted">
            {playerName} needs to recover before battling again.
          </Text>
          <View className="gap-3">
            <Button label="Try Again" onPress={startBattle} loading={battleMutation.isPending} />
            <Button label="Back to Wobblin" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      )}
    </View>
  );
}

function Combatant({
  name,
  level,
  emoji,
  hp,
  maxHp,
  xp,
}: {
  name: string;
  level: number;
  emoji: string;
  hp: number;
  maxHp: number;
  xp?: { experience: number; onLevelUp?: (level: number) => void };
}) {
  return (
    <View className="flex-1 gap-2 rounded-2xl border border-border bg-surface p-3">
      <View className="items-center gap-1">
        <Text className="text-4xl">{emoji}</Text>
        <Text className="font-display-bold text-sm text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="font-sans-medium text-xs text-text-muted">Level {level}</Text>
      </View>
      <StatBar label="HP" value={hp} max={maxHp} color={COLORS.hp} />
      {xp && <XPBar level={level} experience={xp.experience} onLevelUp={xp.onLevelUp} showLevel={false} />}
    </View>
  );
}

function Reward({
  icon,
  label,
  value,
  className,
}: {
  icon: string;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <View className="items-center gap-0.5">
      <Text className="text-lg">{icon}</Text>
      <Text className="font-sans text-xs text-text-subtle">{label}</Text>
      <Text className={`font-sans-bold text-base ${className}`}>{value}</Text>
    </View>
  );
}
