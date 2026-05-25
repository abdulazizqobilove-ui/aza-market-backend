import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView, Keyboard,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Search, Clock, X, ArrowLeft, TrendingUp } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { Product, ProductsResponse, API_URL, imgUrl } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";

const STORAGE_KEY = "recent_searches";
const MAX_RECENT = 10;

const POPULAR = ["iPhone", "Samsung", "Nike", "Adidas", "Джинсы", "Платье", "Ноутбук", "Наушники", "Кроссовки", "Сумка"];

async function getRecent(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveRecent(query: string) {
  const current = await getRecent();
  const next = [query, ...current.filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

async function clearRecent() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

async function removeOne(query: string) {
  const current = await getRecent();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((q) => q !== query)));
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getRecent().then(setRecent);
    api.get<ProductsResponse>("/products?sort=rating&limit=6")
      .then((r) => setRecommended(r.data.items))
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const search = useCallback(async (q: string, save = false) => {
    if (!q.trim()) return;
    if (save) {
      await saveRecent(q.trim());
      setRecent(await getRecent());
    }
    setLoading(true);
    setSubmitted(true);
    setSuggestions([]);
    Keyboard.dismiss();
    try {
      const res = await api.get<ProductsResponse>(`/products?q=${encodeURIComponent(q.trim())}&limit=30&sort=rating`);
      setProducts(res.data.items);
    } catch {} finally { setLoading(false); }
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    setSubmitted(false);
    setProducts([]);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    // Filter recent searches as suggestions
    const recentMatches = recent.filter((r) => r.toLowerCase().includes(text.toLowerCase()) && r.toLowerCase() !== text.toLowerCase());

    // Popular suggestions
    const popularMatches = POPULAR.filter((p) => p.toLowerCase().includes(text.toLowerCase()) && !recentMatches.includes(p));

    setSuggestions([...recentMatches, ...popularMatches].slice(0, 6));

    // Delayed product fetch
    searchTimer.current = setTimeout(() => {
      api.get<ProductsResponse>(`/products?q=${encodeURIComponent(text.trim())}&limit=4&sort=rating`)
        .then((r) => setProducts(r.data.items))
        .catch(() => {});
    }, 400);
  };

  const handleSubmit = () => {
    if (query.trim()) search(query.trim(), true);
  };

  const pickSuggestion = (s: string) => {
    setQuery(s);
    search(s, true);
  };

  const handleClearAll = async () => {
    await clearRecent();
    setRecent([]);
  };

  const handleRemoveOne = async (q: string) => {
    await removeOne(q);
    setRecent(await getRecent());
  };

  const img = (p: Product) => p.images?.find((i) => i.is_main) || p.images?.[0];

  // ── No query: recent + recommended ─────────────────────────
  if (!query.trim() && !submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <Header query={query} onChangeText={handleChange} onSubmit={handleSubmit} onBack={() => router.back()} inputRef={inputRef} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Recent searches */}
          {recent.length > 0 && (
            <View style={{ paddingTop: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>Вы недавно искали</Text>
                <TouchableOpacity onPress={handleClearAll}>
                  <Text style={{ fontSize: 13, color: "#6b7280", fontWeight: "500" }}>Очистить</Text>
                </TouchableOpacity>
              </View>
              {recent.map((r) => (
                <TouchableOpacity key={r} onPress={() => pickSuggestion(r)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" }}>
                  <Clock size={16} color="#9ca3af" style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 14, color: "#374151" }}>{r}</Text>
                  <TouchableOpacity onPress={() => handleRemoveOne(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={15} color="#d1d5db" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular */}
          {recent.length === 0 && (
            <View style={{ paddingHorizontal: 16, paddingTop: 20, marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <TrendingUp size={16} color="#6b7280" />
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>Популярные запросы</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {POPULAR.map((p) => (
                  <TouchableOpacity key={p} onPress={() => pickSuggestion(p)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f3f4f6" }}>
                    <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Recommended products */}
          {recommended.length > 0 && (
            <View style={{ paddingTop: recent.length > 0 ? 20 : 0 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", paddingHorizontal: 16, marginBottom: 12 }}>Рекомендуем</Text>
              {recommended.map((p) => {
                const image = img(p);
                return (
                  <TouchableOpacity key={p.id} onPress={() => router.push(`/products/${p.id}` as any)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12, borderBottomWidth: 0.5, borderBottomColor: "#f9fafb" }}>
                    <View style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                      {image ? <Image source={{ uri: imgUrl(image.url) ?? "" }} style={{ width: 52, height: 52 }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22 }}>📦</Text></View>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: "#111827", fontWeight: "500" }} numberOfLines={1}>{p.title}</Text>
                      <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{p.category?.name}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>{p.price.toLocaleString()} сом.</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Typing: suggestions + quick product results ─────────────
  if (query.trim() && !submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <Header query={query} onChangeText={handleChange} onSubmit={handleSubmit} onBack={() => router.back()} inputRef={inputRef} />

        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {/* Suggestions */}
              {suggestions.map((s) => {
                const isRecent = recent.includes(s);
                return (
                  <TouchableOpacity key={s} onPress={() => pickSuggestion(s)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: "#f9fafb" }}>
                    {isRecent ? <Clock size={16} color="#9ca3af" /> : <Search size={16} color="#9ca3af" />}
                    <Text style={{ flex: 1, fontSize: 14, color: "#374151", marginLeft: 12 }}>
                      <Text style={{ fontWeight: "700" }}>{query}</Text>
                      {s.toLowerCase().startsWith(query.toLowerCase()) ? s.slice(query.length) : s.replace(new RegExp(query, "i"), "")}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Quick product results */}
              {products.length > 0 && (
                <View>
                  <View style={{ height: 1, backgroundColor: "#f3f4f6", marginVertical: 4 }} />
                  {products.map((p) => {
                    const image = img(p);
                    return (
                      <TouchableOpacity key={p.id} onPress={async () => { await saveRecent(query.trim()); setRecent(await getRecent()); router.push(`/products/${p.id}` as any); }} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12, borderBottomWidth: 0.5, borderBottomColor: "#f9fafb" }}>
                        <View style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                          {image ? <Image source={{ uri: imgUrl(image.url) ?? "" }} style={{ width: 44, height: 44 }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 18 }}>📦</Text></View>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: "#111827" }} numberOfLines={1}>{p.title}</Text>
                          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{p.category?.name}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          }
          keyExtractor={() => ""}
        />
      </SafeAreaView>
    );
  }

  // ── Results ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      <Header query={query} onChangeText={handleChange} onSubmit={handleSubmit} onBack={() => router.back()} inputRef={inputRef} />

      {loading ? (
        <ActivityIndicator color="#111827" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 12 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, gap: 8 }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>
                {products.length > 0 ? `Найдено ${products.length} товаров` : ""}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 6 }}>Ничего не найдено</Text>
              <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Попробуйте другой запрос</Text>
            </View>
          }
          renderItem={({ item }) => {
            const image = img(item);
            return (
              <TouchableOpacity onPress={() => router.push(`/products/${item.id}` as any)} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" }}>
                <View style={{ height: 160, backgroundColor: "#f3f4f6" }}>
                  {image ? <Image source={{ uri: imgUrl(image.url) ?? "" }} style={{ width: "100%", height: 160 }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 40 }}>📦</Text></View>}
                </View>
                <View style={{ padding: 10 }}>
                  <Text style={{ fontSize: 12, color: "#374151" }} numberOfLines={2}>{item.title}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827", marginTop: 4 }}>{item.price.toLocaleString()} сом.</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Header({ query, onChangeText, onSubmit, onBack, inputRef }: {
  query: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  inputRef: React.RefObject<TextInput>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 10 }}>
      <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
        <ArrowLeft size={22} color="#374151" />
      </TouchableOpacity>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 14, paddingHorizontal: 12, gap: 8 }}>
        <Search size={15} color="#9ca3af" />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Искать товары и категории"
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: "#111827" }}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#9ca3af", alignItems: "center", justifyContent: "center" }}>
              <X size={11} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
