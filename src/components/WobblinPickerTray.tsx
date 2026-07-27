import { Image } from "expo-image";
import { useState } from "react";
import { type LayoutChangeEvent, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { SPECIES_ART } from "@/constants/speciesArt";
import { COLORS, ELEMENT_COLORS, ELEMENT_ICON, type Element } from "@/constants/theme";
import type { PlayerWobblin } from "@/supabase/wobblins";

type WobblinPickerTrayProps = {
  visible: boolean;
  title: string;
  wobblins: PlayerWobblin[];
  onSelect: (wobblin: PlayerWobblin) => void;
  onClose: () => void;
  emptyLabel?: string;
};

const COLUMNS = 4;
const GRID_GAP = 14;
const SHEET_PADDING = 20;

/**
 * A bottom-sheet-style tray for picking one Wobblin out of a grid — used
 * wherever a picker would otherwise crowd an inline panel with a long
 * expanding list (e.g. choosing which Wobblin to list for sale). A grid
 * rather than rows so a large collection doesn't turn into an endless
 * scroll — deliberately chromeless (just the portrait + level, no card/
 * border/background) so more tiles fit per row. Tapping the scrim or the
 * close button dismisses without selecting.
 */
export function WobblinPickerTray({
  visible,
  title,
  wobblins,
  onSelect,
  onClose,
  emptyLabel = "Nothing eligible right now.",
}: WobblinPickerTrayProps) {
  const insets = useSafeAreaInsets();
  // Measured directly off the grid row rather than derived from
  // useWindowDimensions() — the sheet's actual rendered content width can
  // differ from the raw device width (safe areas, the modal's own layout),
  // and a mismatch there is exactly what makes tiles wrap early with a
  // stray gap on the right instead of spanning edge-to-edge.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = gridWidth > 0 ? (gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const onGridLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        {/*
         * The backdrop is an absolutely-positioned sibling behind the sheet,
         * not an ancestor wrapping it — a Pressable ancestor around the
         * ScrollView would grab the touch responder on touch-down (for its
         * own press handling) before the ScrollView gets a chance to detect
         * a drag, which is what made scrolling from empty space fail. As a
         * sibling, taps in the sheet's own area never reach this Pressable
         * at all (the sheet renders on top and occludes it there), so the
         * ScrollView underneath behaves like any other unobstructed one.
         */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="absolute inset-0 bg-black/60"
        />
        <View
          className="max-h-[90%] rounded-t-3xl border border-border bg-surface"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: COLORS.border }} />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
            <Text className="font-display-bold text-lg text-text">{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Icon family="ionicons" name="close" size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: SHEET_PADDING, paddingBottom: 20 }}>
            {wobblins.length === 0 ? (
              <Text className="py-8 text-center font-sans text-sm text-text-subtle">{emptyLabel}</Text>
            ) : (
              <View className="flex-row flex-wrap" onLayout={onGridLayout}>
                {gridWidth > 0 &&
                  wobblins.map((wobblin, index) => (
                    <View
                      key={wobblin.id}
                      // Explicit per-item margins (rather than a `gap` on the wrapping
                      // row) so a full row's tiles are guaranteed to span edge-to-edge —
                      // no right margin after the last column in a row, so the last
                      // tile's right edge lands flush with the row's own right edge.
                      style={{
                        marginRight: (index + 1) % COLUMNS === 0 ? 0 : GRID_GAP,
                        marginBottom: GRID_GAP,
                      }}
                    >
                      <TrayTile wobblin={wobblin} width={tileWidth} onPress={() => onSelect(wobblin)} />
                    </View>
                  ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TrayTile({ wobblin, width, onPress }: { wobblin: PlayerWobblin; width: number; onPress: () => void }) {
  const element = wobblin.species.element.toLowerCase() as Element;
  const elementColor = ELEMENT_COLORS[element];
  const art = SPECIES_ART[wobblin.species.name];
  const name = wobblin.nickname ?? wobblin.species.name;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, level ${wobblin.level}`}
      style={({ pressed }) => ({
        width,
        alignItems: "center",
        gap: 0,
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <View className="aspect-square w-full items-center justify-center">
        {art ? (
          <Image source={art} style={{ width: "92%", height: "92%" }} contentFit="contain" />
        ) : (
          <Icon {...ELEMENT_ICON[element]} size={26} color={elementColor} />
        )}
      </View>
      <Text className="font-display-bold text-[11px] text-text-muted">Lv. {wobblin.level}</Text>
    </Pressable>
  );
}
