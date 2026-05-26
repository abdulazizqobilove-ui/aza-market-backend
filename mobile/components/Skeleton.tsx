import { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";

export function SkeletonBox({ width, height, borderRadius = 8, style }: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: "#e5e7eb", opacity }, style]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 10, gap: 8, width: 160 }}>
      <SkeletonBox height={140} borderRadius={12} />
      <SkeletonBox width="80%" height={12} borderRadius={6} />
      <SkeletonBox width="50%" height={12} borderRadius={6} />
      <SkeletonBox width="60%" height={16} borderRadius={6} />
    </View>
  );
}

export function SkeletonBanner() {
  return <SkeletonBox height={160} borderRadius={20} style={{ marginHorizontal: 12 }} />;
}

export function SkeletonProductRow() {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 12 }}>
      {[0, 1].map((i) => <SkeletonCard key={i} />)}
    </View>
  );
}
