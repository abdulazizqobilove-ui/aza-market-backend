import { useEffect, useRef } from "react";
import { Animated, Dimensions, View, ViewStyle } from "react-native";
import { useThemeColors } from "@/lib/theme";

const { width: SW } = Dimensions.get("window");

export function SkeletonBox({ width, height, borderRadius = 8, style }: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const c = useThemeColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width ?? "100%", height, borderRadius, backgroundColor: c.iconBg, opacity }, style]}
    />
  );
}

// Product card (matches ProductCard layout, 2-column grid)
export function SkeletonCard() {
  const c = useThemeColors();
  const cardW = (SW - 36) / 2;
  return (
    <View style={{ width: cardW, backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
      <SkeletonBox height={cardW} borderRadius={0} />
      <View style={{ padding: 10, gap: 8 }}>
        <SkeletonBox width="80%" height={12} borderRadius={6} />
        <SkeletonBox width="50%" height={11} borderRadius={6} />
        <SkeletonBox width="55%" height={15} borderRadius={6} />
      </View>
    </View>
  );
}

// 2-column product grid (n rows)
export function SkeletonProductGrid({ rows = 4 }: { rows?: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 12 }}>
      {Array.from({ length: rows * 2 }).map((_, i) => <SkeletonCard key={i} />)}
    </View>
  );
}

// Banner carousel placeholder
export function SkeletonBanner() {
  return <SkeletonBox height={160} borderRadius={20} style={{ marginHorizontal: 12 }} />;
}

// Category chips row
export function SkeletonCategoryRow() {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 12 }}>
      {[80, 100, 70, 90, 80].map((w, i) => (
        <SkeletonBox key={i} width={w} height={34} borderRadius={20} />
      ))}
    </View>
  );
}

// Home screen full skeleton
export function SkeletonHome() {
  return (
    <View style={{ gap: 16, paddingVertical: 12 }}>
      <SkeletonBanner />
      <SkeletonCategoryRow />
      <SkeletonProductGrid rows={3} />
    </View>
  );
}

// Order item
export function SkeletonOrderItem() {
  const c = useThemeColors();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 14, gap: 12, marginHorizontal: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonBox width={110} height={12} borderRadius={6} />
        <SkeletonBox width={80} height={22} borderRadius={10} />
      </View>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <SkeletonBox width={58} height={58} borderRadius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="80%" height={12} borderRadius={6} />
          <SkeletonBox width="50%" height={12} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

// Notification / chat list item
export function SkeletonListItem() {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: c.card, borderRadius: 14, marginHorizontal: 12 }}>
      <SkeletonBox width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="65%" height={12} borderRadius={6} />
        <SkeletonBox width="85%" height={11} borderRadius={6} />
      </View>
      <SkeletonBox width={36} height={10} borderRadius={5} />
    </View>
  );
}

// Seller product row (list with image + text + actions)
export function SkeletonSellerProductRow() {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, borderRadius: 16, padding: 12, marginHorizontal: 12 }}>
      <SkeletonBox width={60} height={60} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="75%" height={13} borderRadius={6} />
        <SkeletonBox width="45%" height={11} borderRadius={6} />
        <SkeletonBox width="35%" height={11} borderRadius={6} />
      </View>
      <View style={{ gap: 8 }}>
        <SkeletonBox width={32} height={32} borderRadius={10} />
        <SkeletonBox width={32} height={32} borderRadius={10} />
      </View>
    </View>
  );
}

// Stat card (seller stats)
export function SkeletonStatCard() {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 10, minWidth: "47%" }}>
      <SkeletonBox width={38} height={38} borderRadius={12} />
      <SkeletonBox width="65%" height={22} borderRadius={8} />
      <SkeletonBox width="80%" height={11} borderRadius={5} />
    </View>
  );
}

// Cart item row
export function SkeletonCartItem() {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", gap: 12, backgroundColor: c.card, borderRadius: 16, padding: 12, marginHorizontal: 12, alignItems: "center" }}>
      <SkeletonBox width={72} height={72} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="80%" height={13} borderRadius={6} />
        <SkeletonBox width="45%" height={16} borderRadius={6} />
        <SkeletonBox width={90} height={30} borderRadius={10} />
      </View>
    </View>
  );
}

// Product detail page
export function SkeletonProductDetail() {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SkeletonBox height={SW * 0.9} borderRadius={0} />
      <View style={{ padding: 16, gap: 14 }}>
        <SkeletonBox width="40%" height={13} borderRadius={6} />
        <SkeletonBox width="85%" height={20} borderRadius={8} />
        <SkeletonBox width="60%" height={20} borderRadius={8} />
        <SkeletonBox width="40%" height={28} borderRadius={8} />
        <View style={{ gap: 8, marginTop: 4 }}>
          <SkeletonBox height={12} borderRadius={6} />
          <SkeletonBox width="90%" height={12} borderRadius={6} />
          <SkeletonBox width="75%" height={12} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

// Shop page (banner + logo + product grid)
export function SkeletonShop() {
  const c = useThemeColors();
  return (
    <View style={{ gap: 16 }}>
      <SkeletonBox height={160} borderRadius={0} />
      <View style={{ paddingHorizontal: 16, gap: 12, marginTop: -30 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
          <SkeletonBox width={72} height={72} borderRadius={16} />
          <View style={{ flex: 1, gap: 8, paddingBottom: 4 }}>
            <SkeletonBox width="60%" height={14} borderRadius={6} />
            <SkeletonBox width="40%" height={11} borderRadius={6} />
          </View>
        </View>
      </View>
      <SkeletonProductGrid rows={3} />
    </View>
  );
}

// Review item
export function SkeletonReviewItem() {
  const c = useThemeColors();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <View style={{ gap: 6 }}>
            <SkeletonBox width={90} height={12} borderRadius={6} />
            <SkeletonBox width={60} height={10} borderRadius={5} />
          </View>
        </View>
        <SkeletonBox width={70} height={14} borderRadius={6} />
      </View>
      <SkeletonBox width="90%" height={12} borderRadius={6} />
      <SkeletonBox width="70%" height={12} borderRadius={6} />
    </View>
  );
}

// Waitlist / my-reviews simple list item
export function SkeletonSimpleRow() {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", gap: 12, backgroundColor: c.card, borderRadius: 16, padding: 12, marginHorizontal: 12, alignItems: "center" }}>
      <SkeletonBox width={60} height={60} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="75%" height={13} borderRadius={6} />
        <SkeletonBox width="50%" height={11} borderRadius={6} />
      </View>
    </View>
  );
}
