import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";

export default function Index() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === "admin")  return <Redirect href={"/(tabs)/admin-tab" as any} />;
  return <Redirect href={"/(tabs)/seller-products" as any} />;
}
