import { useEffect, useRef } from "react";
import { Animated, Easing, View, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

interface Props {
  onFinish: () => void;
}

export default function SplashAnim({ onFinish }: Props) {
  const scale    = useRef(new Animated.Value(0.2)).current;
  const rotate   = useRef(new Animated.Value(0)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Появление + вращение + масштаб
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 2. Лёгкий пульс назад
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      // 3. Пауза
      Animated.delay(400),
      // 4. Уходит — масштаб вверх + fade out
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.6,
          duration: 380,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onFinish());
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity: bgOpacity }]}>
      <Animated.Image
        source={require("../assets/logo.png")}
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ scale }, { rotate: spin }],
          },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  logo: {
    width: width * 0.55,
    height: width * 0.55,
  },
});
