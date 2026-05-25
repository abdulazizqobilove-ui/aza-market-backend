import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrendingUp, DollarSign, Package, ShoppingBag } from "lucide-react-native";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface Balance { balance: number; total_earned: number; total_withdrawn: number; payouts: any[]; }

export default function SellerAnalyticsScreen() {
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<Balance>("/seller/balance").then((r) => setBalance(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const stats = [
    { label: "Баланс", value: `${(balance?.balance || 0).toLocaleString()} сом.`, icon: DollarSign, color: "#8B5CF6", bg: "#eff6ff" },
    { label: "Всего заработано", value: `${(balance?.total_earned || 0).toLocaleString()} сом.`, icon: TrendingUp, color: "#22c55e", bg: "#f0fdf4" },
    { label: "Выведено", value: `${(balance?.total_withdrawn || 0).toLocaleString()} сом.`, icon: ShoppingBag, color: "#a855f7", bg: "#faf5ff" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Аналитика и баланс</Text>
      </View>

      {loading ? <ActivityIndicator color="#8B5CF6" className="mt-10" /> : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <View key={label} className="bg-white rounded-2xl p-4 flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon size={22} color={color} />
              </View>
              <View>
                <Text className="text-2xl font-bold text-gray-900">{value}</Text>
                <Text className="text-sm text-gray-400 mt-0.5">{label}</Text>
              </View>
            </View>
          ))}

          {balance?.payouts && balance.payouts.length > 0 && (
            <View className="bg-white rounded-2xl p-4">
              <Text className="font-semibold text-gray-800 mb-3">История выплат</Text>
              {balance.payouts.map((p: any) => (
                <View key={p.id} className="flex-row justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <Text className="text-sm text-gray-700">{new Date(p.created_at).toLocaleDateString("ru-RU")}</Text>
                  <Text className="text-sm font-semibold text-gray-800">{p.amount.toLocaleString()} сом.</Text>
                  <View className={`px-2 py-0.5 rounded-full ${p.status === "approved" ? "bg-green-100" : p.status === "rejected" ? "bg-red-100" : "bg-yellow-100"}`}>
                    <Text className={`text-xs font-medium ${p.status === "approved" ? "text-green-700" : p.status === "rejected" ? "text-red-600" : "text-yellow-700"}`}>
                      {p.status === "approved" ? "Выплачено" : p.status === "rejected" ? "Отклонено" : "Ожидает"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
