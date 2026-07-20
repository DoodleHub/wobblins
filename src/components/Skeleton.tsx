/* eslint-disable react-hooks/refs -- Animated.Value held in useRef is the standard RN pattern; it's a mutable animation handle, not a component ref, and reading it during render is how Animated interpolation works. */
import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

type SkeletonProps = {
  className?: string;
  style?: ViewStyle;
};

/** A pulsing placeholder box for loading states — shape it with sizing/rounding classes at the call site. */
export function Skeleton({ className, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View className={`rounded-xl bg-border ${className ?? ""}`} style={[{ opacity: pulse }, style]} />
  );
}
