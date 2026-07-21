import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Height of the tab bar's tappable area, excluding the safe-area inset its background
 * additionally extends through. Must match `(tabs)/_layout.tsx`'s own tabBarStyle. */
export const TAB_BAR_HEIGHT = 78;

/** Mirrors `px-6` / `pt-16` — kept as numbers (not those classes) so they can live in the
 * same plain style object as the dynamic bottom clearance below; see useScrollScreenContentStyle. */
export const SCREEN_PADDING_HORIZONTAL = 24;
export const SCREEN_PADDING_TOP = 64;

/**
 * Bottom padding a scrollable tab screen needs so its content never renders
 * behind the tab bar. The tab bar is absolutely positioned (it doesn't reserve
 * layout space) and sits flush with the bottom edge, with its own height
 * absorbing the safe-area inset — so the screen's own clearance needs that
 * same inset plus the tab bar's tappable height, not a fixed Tailwind class
 * like `pb-32` which can't account for a device's actual inset.
 */
export function useTabBarClearance(extraSpace = 24) {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_HEIGHT + extraSpace;
}

/**
 * Full `contentContainerStyle` for a tab screen's ScrollView/FlatList.
 *
 * NativeWind only smart-merges `style`+`className` on the literal `style` target;
 * for `contentContainerStyle` (a different target than `style`) an inline value
 * fully replaces rather than merges with `contentContainerClassName`-derived styles.
 * So this can't be `contentContainerClassName="... pb-32"` + a separate
 * `contentContainerStyle={{ paddingBottom }}` — the latter would silently wipe out
 * every class in the former. Passing one plain object as the sole source avoids that.
 */
export function useScrollScreenContentStyle(gap: number, flexGrow?: 1) {
  const tabBarClearance = useTabBarClearance();
  return {
    width: "100%" as const,
    minWidth: 0,
    flexGrow,
    gap,
    paddingHorizontal: SCREEN_PADDING_HORIZONTAL,
    paddingTop: SCREEN_PADDING_TOP,
    paddingBottom: tabBarClearance,
  };
}
