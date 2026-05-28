import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Plus, Package, Eye, EyeOff, Pencil, Trash2, Search, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { Product, API_URL, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";
import { SkeletonSellerProductRow } from "@/components/Skeleton";

const P = "#8B5CF6";

export default function SellerProductsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "hidden" | "sold">("all");
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    api.get<Product[]>("/seller/products")
      .then((r) => setProducts(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (product: Product) => {
    try {
      const res = await api.patch<Product>(`/products/${product.id}/toggle`);
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_active: res.data.is_active } : p));
      Toast.show({ type: "success", text1: res.data.is_active ? "Товар активирован" : "Товар скрыт" });
    } catch { Toast.show({ type: "error", text1: "Не удалось изменить статус" }); }
  };

  const deleteProduct = (product: Product) => {
    Alert.alert("Удалить товар?", `«${product.title}»\nЭто действие нельзя отменить`, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
        try {
          await api.delete(`/products/${product.id}`);
          setProducts((prev) => prev.filter((p) => p.id !== product.id));
          Toast.show({ type: "success", text1: "Товар удалён" });
        } catch { Toast.show({ type: "error", text1: "Не удалось удалить" }); }
      }},
    ]);
  };

  // Unique categories from seller's products
  const categories = Array.from(
    new Map(products.map((p) => [p.category.id, p.category])).values()
  );

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "active" ? p.is_active :
      filter === "hidden" ? !p.is_active :
      filter === "sold" ? p.stock === 0 : true;
    const matchCategory = categoryFilter === null || p.category.id === categoryFilter;
    return matchSearch && matchFilter && matchCategory;
  });

  const activeCount = products.filter((p) => p.is_active).length;
  const soldOut = products.filter((p) => p.stock === 0).length;
  const totalStock = products.reduce((s, p) => s + p.stock, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Мои товары</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{products.length} товаров · {activeCount} активных</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/seller/new-product" as any)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: P, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 }}
          >
            <Plus size={15} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Добавить</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.iconBg, borderRadius: 12, paddingHorizontal: 12, gap: 8, marginBottom: 10 }}>
          <Search size={15} color={c.textMuted} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Поиск по товарам..." placeholderTextColor={c.textMuted}
            style={{ flex: 1, paddingVertical: 9, fontSize: 13, color: c.text }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={15} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {([["all", "Все"], ["active", "Активные"], ["hidden", "Скрытые"], ["sold", "Нет в наличии"]] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key} onPress={() => setFilter(key)}
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: filter === key ? P : c.iconBg }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: filter === key ? "#fff" : c.textSub }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats strip */}
      {products.length > 0 && (
        <View style={{ flexDirection: "row", backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border }}>
          {[
            { label: "Товаров", value: products.length, color: P },
            { label: "Активных", value: activeCount, color: "#16a34a" },
            { label: "В наличии", value: totalStock, color: "#f59e0b" },
            { label: "Нет в наличии", value: soldOut, color: "#ef4444" },
          ].map(({ label, value, color }, i, arr) => (
            <View key={label} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRightWidth: i < arr.length - 1 ? 0.5 : 0, borderRightColor: c.border }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color }}>{value}</Text>
              <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 1 }}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Category scroll */}
      {categories.length > 1 && (
        <View style={{ backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => setCategoryFilter(null)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: categoryFilter === null ? P : c.iconBg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: categoryFilter === null ? "#fff" : c.textSub }}>
                Все
              </Text>
              <View style={{ backgroundColor: categoryFilter === null ? "rgba(255,255,255,0.25)" : c.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: categoryFilter === null ? "#fff" : c.textMuted }}>
                  {products.length}
                </Text>
              </View>
            </TouchableOpacity>

            {categories.map((cat) => {
              const count = products.filter((p) => p.category.id === cat.id).length;
              const active = categoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryFilter(active ? null : cat.id)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: active ? P : c.iconBg,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : c.textSub }}>
                    {cat.name}
                  </Text>
                  <View style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : c.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: active ? "#fff" : c.textMuted }}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={{ gap: 8, paddingTop: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonSellerProductRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={P} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <Package size={52} color={c.border} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 16, marginBottom: 6 }}>
                {search ? "Ничего не найдено" : "Товаров пока нет"}
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 24 }}>
                {search ? "Попробуйте другой запрос" : "Добавьте первый товар в каталог"}
              </Text>
              {!search && (
                <TouchableOpacity onPress={() => router.push("/seller/new-product" as any)} style={{ backgroundColor: P, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Plus size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Добавить товар</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item: p }) => {
            const img = p.images.find((i) => i.is_main) || p.images[0];
            return (
              <View style={{ backgroundColor: c.card, borderRadius: 18, overflow: "hidden", opacity: p.is_active ? 1 : 0.75 }}>
                <View style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "center" }}>
                  <View style={{ width: 68, height: 68, borderRadius: 14, overflow: "hidden", backgroundColor: c.bg }}>
                    {img
                      ? <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: 68, height: 68 }} contentFit="cover" />
                      : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 28 }}>📦</Text></View>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.text, lineHeight: 18 }} numberOfLines={2}>{p.title}</Text>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: P, marginTop: 4 }}>{p.price.toLocaleString()} сом.</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: c.textMuted }}>В наличии: {p.stock} шт.</Text>
                      <View style={{ backgroundColor: p.is_active ? "#dcfce7" : c.iconBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: p.is_active ? "#16a34a" : c.textMuted }}>
                          {p.stock === 0 ? "Нет в наличии" : p.is_active ? "Активен" : "Скрыт"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: "row", borderTopWidth: 0.5, borderTopColor: c.border }}>
                  <TouchableOpacity onPress={() => router.push(`/seller/edit-product/${p.id}` as any)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 }}>
                    <Pencil size={14} color={P} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: P }}>Изменить</Text>
                  </TouchableOpacity>
                  <View style={{ width: 0.5, backgroundColor: c.border }} />
                  <TouchableOpacity onPress={() => toggleActive(p)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 }}>
                    {p.is_active ? <EyeOff size={14} color="#f97316" /> : <Eye size={14} color="#16a34a" />}
                    <Text style={{ fontSize: 12, fontWeight: "600", color: p.is_active ? "#f97316" : "#16a34a" }}>{p.is_active ? "Скрыть" : "Показать"}</Text>
                  </TouchableOpacity>
                  <View style={{ width: 0.5, backgroundColor: c.border }} />
                  <TouchableOpacity onPress={() => deleteProduct(p)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 }}>
                    <Trash2 size={14} color="#f87171" />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#f87171" }}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
