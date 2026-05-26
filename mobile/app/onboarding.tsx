import { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Dimensions, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SW } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🛒",
    title: "Покупай легко",
    desc: "Тысячи товаров от проверенных продавцов Таджикистана. Заказывай в пару касаний и получай прямо домой.",
    bg: "#8B5CF6",
    accent: "#C4B5FD",
  },
  {
    emoji: "🏪",
    title: "Продавай выгодно",
    desc: "Открой свой магазин бесплатно. Управляй товарами, заказами и выплатами прямо из приложения.",
    bg: "#059669",
    accent: "#6EE7B7",
  },
  {
    emoji: "🚀",
    title: "Быстрая доставка",
    desc: "Доставляем по всему Таджикистану. Следи за статусом заказа в реальном времени.",
    bg: "#2563EB",
    accent: "#93C5FD",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * SW, animated: true });
      setCurrent(next);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem("onboarding_done", "1");
    router.replace("/(tabs)");
  };

  const slide = SLIDES[current];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: slide.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={slide.bg} />

      {/* Skip */}
      <TouchableOpacity onPress={finish} style={{ position: "absolute", top: 56, right: 20, zIndex: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" }}>
        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Пропустить</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width: SW, flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            {/* Circle bg decoration */}
            <View style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <View style={{ position: "absolute", bottom: 80, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.06)" }} />

            {/* Emoji */}
            <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 48 }}>
              <Text style={{ fontSize: 72 }}>{s.emoji}</Text>
            </View>

            <Text style={{ fontSize: 32, fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: 16, letterSpacing: -0.5 }}>{s.title}</Text>
            <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 24 }}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 40, gap: 24 }}>
        {/* Dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((_, i) => (
            <View key={i} style={{ height: 6, borderRadius: 3, backgroundColor: i === current ? "#fff" : "rgba(255,255,255,0.35)", width: i === current ? 24 : 6 }} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity onPress={goNext} style={{ backgroundColor: "#fff", borderRadius: 18, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: slide.bg }}>
            {current < SLIDES.length - 1 ? "Далее" : "Начать →"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
