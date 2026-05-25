import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "tj.azamarket.app",
  appName: "AZA Market",
  webDir: "out",
  server: {
    // Для разработки — грузим с локального сервера Next.js
    // Убери эту секцию когда будешь делать production APK
    url: "http://192.168.1.45:3000",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#2563EB",
      showSpinner: false,
    },
  },
};

export default config;
