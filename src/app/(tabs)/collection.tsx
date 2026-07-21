import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconSpec } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, RARITY_COLORS, type Element, type Rarity } from "@/constants/theme";
import { useScrollScreenContentStyle } from "@/hooks/useTabBarClearance";
import { useAllSpecies, usePlayerWobblins } from "@/hooks/useWobblins";
import { useSupabase } from "@/supabase/SupabaseProvider";
import type { PlayerWobblin } from "@/supabase/wobblins";
import { getErrorMessage } from "@/utils/errors";

type FilterValue = "all" | Element;

const ALL_ICON: IconSpec = { family: "ionicons", name: "grid" };
const SEARCH_ICON: IconSpec = { family: "ionicons", name: "search" };
const FILTER_ICON: IconSpec = { family: "ionicons", name: "options" };

const FILTERS: { value: FilterValue; label: string; icon: IconSpec }[] = [
  { value: "all", label: "All", icon: ALL_ICON },
  { value: "fire", label: "Fire", icon: ELEMENT_ICON.fire },
  { value: "water", label: "Water", icon: ELEMENT_ICON.water },
  { value: "grass", label: "Grass", icon: ELEMENT_ICON.grass },
  { value: "thunder", label: "Thunder", icon: ELEMENT_ICON.thunder },
  { value: "dark", label: "Dark", icon: ELEMENT_ICON.dark },
  { value: "ice", label: "Ice", icon: ELEMENT_ICON.ice },
  { value: "rock", label: "Rock", icon: ELEMENT_ICON.rock },
  { value: "wind", label: "Wind", icon: ELEMENT_ICON.wind },
  { value: "light", label: "Light", icon: ELEMENT_ICON.light },
  { value: "poison", label: "Poison", icon: ELEMENT_ICON.poison },
];

const SCREEN_PADDING = 24;
const CARD_GAP = 12;

export default function CollectionScreen() {
  const { session } = useSupabase();
  const playerId = session?.user.id;
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3;

  const { data: wobblins, isPending, error } = usePlayerWobblins(playerId);
  const { data: allSpecies } = useAllSpecies();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const contentStyle = useScrollScreenContentStyle(CARD_GAP);

  const filtered = useMemo(() => {
    if (!wobblins) return [];
    let result = wobblins;
    if (filter !== "all") result = result.filter((w) => w.species.element.toLowerCase() === filter);
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((w) => (w.nickname ?? w.species.name).toLowerCase().includes(query));
    }
    return result;
  }, [wobblins, filter, search]);

  const speciesDiscovered = useMemo(() => {
    if (!wobblins) return 0;
    return new Set(wobblins.map((w) => w.species_id)).size;
  }, [wobblins]);

  if (isPending) {
    return <CollectionSkeleton />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-sans-medium text-sm text-danger">{getErrorMessage(error)}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerStyle={contentStyle}
      columnWrapperStyle={{ gap: CARD_GAP }}
      data={filtered}
      numColumns={3}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View className="mb-4 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display-bold text-3xl text-text">My Wobblins</Text>
            <View className="flex-row gap-2">
              <HeaderIconButton icon={SEARCH_ICON} active={searchOpen} onPress={() => setSearchOpen((v) => !v)} />
              <HeaderIconButton icon={FILTER_ICON} />
            </View>
          </View>
          {searchOpen && <SearchField value={search} onChange={setSearch} />}
          {wobblins && wobblins.length > 0 && <FilterRow value={filter} onChange={setFilter} />}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={{ family: "ionicons", name: "book" }}
          title={wobblins && wobblins.length > 0 ? "No Wobblins match" : "No Wobblins yet"}
          description={
            wobblins && wobblins.length > 0
              ? "Try a different filter."
              : "Explore to discover and capture your first Wobblin."
          }
        />
      }
      ListFooterComponent={
        wobblins && wobblins.length > 0 ? (
          <CollectionStats
            collected={wobblins.length}
            discovered={speciesDiscovered}
            totalSpecies={allSpecies?.length ?? speciesDiscovered}
          />
        ) : null
      }
      renderItem={({ item }) => <WobblinGridCard wobblin={item} width={cardWidth} />}
    />
  );
}

function HeaderIconButton({
  icon,
  active = false,
  onPress,
}: {
  icon: IconSpec;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-10 w-10 items-center justify-center rounded-full border"
      style={{
        borderColor: active ? COLORS.primary : COLORS.border,
        backgroundColor: active ? COLORS.primaryLight : COLORS.surface,
      }}
    >
      <Icon {...icon} size={18} color={active ? COLORS.primaryDark : COLORS.textMuted} />
    </Pressable>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-full border px-4 py-2.5"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
    >
      <Icon {...SEARCH_ICON} size={16} color={COLORS.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search your Wobblins"
        placeholderTextColor={COLORS.textSubtle}
        autoFocus
        className="flex-1 font-sans text-sm text-text"
      />
    </View>
  );
}

function FilterRow({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {FILTERS.map((option) => {
        const selected = option.value === value;
        const color = option.value === "all" ? COLORS.primary : ELEMENT_COLORS[option.value];

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
            style={{
              borderColor: selected ? color : COLORS.border,
              backgroundColor: selected ? color : COLORS.surface,
            }}
          >
            <Icon {...option.icon} size={13} color={selected ? "#ffffff" : color} />
            <Text
              className="font-sans-semibold text-xs capitalize"
              style={{ color: selected ? "#ffffff" : COLORS.textMuted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WobblinGridCard({ wobblin, width }: { wobblin: PlayerWobblin; width: number }) {
  const router = useRouter();

  const element = wobblin.species.element.toLowerCase() as Element;
  const rarity = wobblin.species.rarity.toLowerCase() as Rarity;
  const name = wobblin.nickname ?? wobblin.species.name;
  const elementColor = ELEMENT_COLORS[element];
  const rarityColor = RARITY_COLORS[rarity];
  const art = SPECIES_ART[wobblin.species.name];

  return (
    <Pressable
      onPress={() => router.push(`/wobblin/${wobblin.id}`)}
      accessibilityRole="button"
      className="gap-2 overflow-hidden rounded-2xl border p-2"
      style={{ width, borderColor: `${rarityColor}55`, backgroundColor: `${rarityColor}14` }}
    >
      <View
        className="h-6 w-6 items-center justify-center rounded-full border"
        style={{ borderColor: `${elementColor}66`, backgroundColor: `${elementColor}22` }}
      >
        <Icon {...ELEMENT_ICON[element]} size={12} color={elementColor} />
      </View>

      <View className="aspect-square items-center justify-center">
        {art ? (
          <Image source={art} style={{ width: "100%", height: "100%" }} contentFit="contain" />
        ) : (
          <View
            className="h-14 w-14 items-center justify-center rounded-full border bg-background"
            style={{ borderColor: `${elementColor}66` }}
          >
            <Icon {...ELEMENT_ICON[element]} size={24} color={elementColor} />
          </View>
        )}
      </View>

      <View className="gap-1 px-0.5 pb-0.5">
        <Text numberOfLines={1} className="font-display-bold text-sm text-text">
          {name}
        </Text>
        <Text className="font-sans-medium text-xs text-text-muted">Level {wobblin.level}</Text>
      </View>
    </Pressable>
  );
}

function CollectionStats({
  collected,
  discovered,
  totalSpecies,
}: {
  collected: number;
  discovered: number;
  totalSpecies: number;
}) {
  return (
    <View className="mt-2 flex-row items-center rounded-2xl border border-border bg-surface p-4">
      <StatTile
        icon={{ family: "material-community", name: "paw" }}
        value={String(collected)}
        label="Wobblins Collected"
      />
      <View className="mx-4 h-10 w-px bg-border" />
      <StatTile
        icon={{ family: "ionicons", name: "sparkles" }}
        value={`${discovered}/${totalSpecies}`}
        label="Species Discovered"
      />
    </View>
  );
}

function StatTile({ icon, value, label }: { icon: IconSpec; value: string; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-3">
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: COLORS.primaryLight }}
      >
        <Icon {...icon} size={20} color={COLORS.primaryDark} />
      </View>
      <View className="gap-0.5">
        <Text className="font-display-bold text-lg text-text">{value}</Text>
        <Text className="font-sans text-xs text-text-muted">{label}</Text>
      </View>
    </View>
  );
}

function CollectionSkeleton() {
  const contentStyle = useScrollScreenContentStyle(16);
  return (
    <View className="flex-1 bg-background" style={contentStyle}>
      <Skeleton className="mb-2 h-9 w-48" />
      <View className="flex-row flex-wrap gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 flex-1 rounded-2xl" />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 flex-1 rounded-2xl" />
        ))}
      </View>
    </View>
  );
}
