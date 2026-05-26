import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOnline ? -60 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isOnline]);

  return (
    <Animated.View
      style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 999,
        transform: [{ translateY }],
      }}
    >
      <View style={{
        backgroundColor: "#1f2937", flexDirection: "row", alignItems: "center",
        justifyContent: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 16,
      }}>
        <WifiOff size={15} color="#f87171" />
        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
          Нет подключения к интернету
        </Text>
      </View>
    </Animated.View>
  );
}
