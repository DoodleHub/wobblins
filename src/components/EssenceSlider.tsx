import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, Text, View, type LayoutChangeEvent } from "react-native";

import { COLORS } from "@/constants/theme";

const THUMB_SIZE = 26;
const TRACK_HEIGHT = 10;
const PRESETS = [0.25, 0.5, 0.75, 1];

type EssenceSliderProps = {
  /** Highest amount the user is allowed to pick — the player's current essence balance. */
  max: number;
  value: number;
  onChange: (value: number) => void;
  color?: string;
};

/**
 * Drag-to-fill essence picker: replaces a manual numeric text field. Tap
 * anywhere on the track to jump there, drag the knob to fine-tune, or tap a
 * percent-of-balance chip for an instant snap. `value` always stays an
 * integer clamped to `[0, max]`.
 */
export function EssenceSlider({ max, value, onChange, color = COLORS.essence }: EssenceSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const usableWidth = Math.max(trackWidth - THUMB_SIZE, 1);
  const clampedMax = Math.max(Math.floor(max), 0);
  const disabled = clampedMax <= 0;
  const percent = clampedMax > 0 ? Math.min(Math.max(value, 0) / clampedMax, 1) : 0;

  const thumbX = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const dragOriginX = useRef(0);

  // Keeps the knob in sync with externally-driven changes (a preset chip tap,
  // the balance shrinking after a successful feed, initial layout) — but not
  // while the user's finger is actively on the track, where direct
  // manipulation already owns the position.
  useEffect(() => {
    if (isDragging.current) return;
    Animated.spring(thumbX, {
      toValue: percent * usableWidth,
      useNativeDriver: false,
      speed: 20,
      bounciness: 6,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, usableWidth]);

  const commitFromX = (x: number) => {
    if (disabled || usableWidth <= 0) return;
    const clampedX = Math.min(Math.max(x, 0), usableWidth);
    const nextValue = Math.round((clampedX / usableWidth) * clampedMax);
    onChange(nextValue);
    return clampedX;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        const x = evt.nativeEvent.locationX - THUMB_SIZE / 2;
        dragOriginX.current = Math.min(Math.max(x, 0), usableWidth);
        const clampedX = commitFromX(dragOriginX.current);
        if (clampedX != null) thumbX.setValue(clampedX);
      },
      onPanResponderMove: (_evt, gesture) => {
        const x = dragOriginX.current + gesture.dx;
        const clampedX = commitFromX(x);
        if (clampedX != null) thumbX.setValue(clampedX);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const fillWidth = Animated.add(thumbX, THUMB_SIZE / 2);

  return (
    <View className="gap-3">
      <View
        onLayout={onTrackLayout}
        className="justify-center"
        style={{ height: THUMB_SIZE + 8 }}
        {...panResponder.panHandlers}
      >
        <View
          className="w-full overflow-hidden rounded-full bg-border"
          style={{ height: TRACK_HEIGHT, opacity: disabled ? 0.5 : 1 }}
        >
          <Animated.View style={{ width: fillWidth, height: "100%" }}>
            <LinearGradient
              colors={[`${color}80`, color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
        {!disabled && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: thumbX,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: COLORS.surface,
              borderWidth: 2.5,
              borderColor: color,
              shadowColor: color,
              shadowOpacity: 0.8,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
              elevation: 4,
            }}
          />
        )}
      </View>

      <View className="flex-row gap-2">
        {PRESETS.map((fraction) => {
          const presetValue = Math.round(fraction * clampedMax);
          const active = !disabled && presetValue === Math.round(value);
          return (
            <Pressable
              key={fraction}
              disabled={disabled}
              onPress={() => onChange(presetValue)}
              className="flex-1 items-center rounded-full border py-2"
              style={{
                borderColor: active ? color : COLORS.border,
                backgroundColor: active ? `${color}26` : COLORS.surface,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Text
                className="font-sans-bold text-xs"
                style={{ color: active ? color : COLORS.textMuted }}
              >
                {fraction === 1 ? "MAX" : `${Math.round(fraction * 100)}%`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
