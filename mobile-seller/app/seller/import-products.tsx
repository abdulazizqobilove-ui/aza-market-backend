import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft, Search, Download, Package, FileSpreadsheet,
  CheckCircle, XCircle, Plus, ChevronRight, AlertTriangle,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import Toast from "react-native-toast-message";
import api, { API_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/lib/theme";

const P = "#2563EB";
const { width: SW } = Dimensions.get("window");

interface WBProduct {
  wb_id?: number;
  ozon_article?: string;
  title: string;
  brand: string;
  price: number;
  photos: string[];
  description: string;
  stock: number;
  _source?: "wb" | "ozon";
}

type Tab = "wb" | "excel";

export default function ImportProductsScreen() {
  const router = useRouter();
  const c = useThemeColors();

  const [tab, setTab] = useState<Tab>("wb");
  const [article, setArticle] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<WBProduct | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Excel state
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelPublishing, setExcelPublishing] = useState(false);

  // WB/Ozon fetch
  const fetchProduct = async () => {
    const raw = article.trim();
    if (!raw) return;
    setLoading(true);
    setPreview(null);
    try {
      // Detect: numeric = WB article, otherwise try Ozon
      const isNumeric = /^\d+$/.test(raw);
      const url = isNumeric
        ? `/products/import/wb/${raw}`
        : `/products/import/ozon/${raw}`;
      const r = await api.get<WBProduct>(url);
      setPreview({ ...r.data, _source: isNumeric ? "wb" : "ozon" });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Товар не найден" });
    } finally {
      setLoading(false);
    }
  };

  // Publish one imported product
  const publishImported = async () => {
    if (!preview) return;
    if (!categoryId) { Toast.show({ type: "error", text1: "Выберите категорию" }); return; }
    setPublishing(true);
    try {
      const res = await api.post<{ id: number }>("/products", {
        title: preview.title,
        description: preview.description || undefined,
        brand: preview.brand || undefined,
        price: preview.price || 1,
        stock: preview.stock || 10,
        category_id: parseInt(categoryId),
      });
      const pid = res.data.id;

      // Download and upload photos
      if (preview.photos.length > 0) {
        Toast.show({ type: "info", text1: "Загружаем фото..." });
        const token = await AsyncStorage.getItem("seller:token");
        const fd = new FormData();
        for (let i = 0; i < Math.min(preview.photos.length, 6); i++) {
          const photoUrl = preview.photos[i];
          // Fetch photo as blob
          const resp = await fetch(photoUrl);
          const blob = await resp.blob();
          fd.append("files", {
            uri: photoUrl,
            name: `photo_${i + 1}.jpg`,
            type: "image/jpeg",
          } as any);
        }
        await fetch(`${API_URL}/api/products/${pid}/images`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
      }

      Toast.show({ type: "success", text1: "Товар добавлен!" });
      setPreview(null);
      setArticle("");
      setCategoryId("");
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Ошибка публикации" });
    } finally {
      setPublishing(false);
    }
  };

  // Excel template download info
  const showExcelHelp = () => {
    Alert.alert(
      "Шаблон Excel",
      "Скачайте шаблон, заполните и загрузите:\n\nКолонки:\n• Название (обязательно)\n• Цена (обязательно)\n• Категория ID (обязательно)\n• Описание\n• Бренд\n• Остаток\n• Старая цена\n• Штрихкод\n\nМаксимум 200 товаров за раз.",
      [{ text: "Понятно" }]
    );
  };

  // Pick Excel/CSV file
  const pickExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel",
               "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      setExcelLoading(true);
      const file = result.assets[0];

      // Read as text (works for CSV)
      const response = await fetch(file.uri);
      const text = await response.text();
      const lines = text.split("\n").filter(l => l.trim());

      if (lines.length < 2) {
        Toast.show({ type: "error", text1: "Файл пустой или неверный формат" });
        return;
      }

      // Parse CSV (skip header row)
      const rows = lines.slice(1).map((line, i) => {
        const cols = line.split(/[,;	]/).map(c => c.trim().replace(/^"|"$/g, ""));
        return {
          index: i + 1,
          title: cols[0] || "",
          price: parseFloat(cols[1]) || 0,
          category_id: parseInt(cols[2]) || 0,
          description: cols[3] || "",
          brand: cols[4] || "",
          stock: parseInt(cols[5]) || 10,
          original_price: parseFloat(cols[6]) || undefined,
          barcode: cols[7] || undefined,
          valid: !!(cols[0] && parseFloat(cols[1]) > 0 && parseInt(cols[2]) > 0),
        };
      }).filter(r => r.title);

      setExcelRows(rows);
      Toast.show({ type: "success", text1: `Загружено ${rows.length} строк` });
    } catch (e) {
      Toast.show({ type: "error", text1: "Не удалось прочитать файл" });
    } finally {
      setExcelLoading(false);
    }
  };

  const publishExcel = async () => {
    const valid = excelRows.filter(r => r.valid);
    if (valid.length === 0) {
      Toast.show({ type: "error", text1: "Нет валидных товаров для публикации" });
      return;
    }
    setExcelPublishing(true);
    try {
      const products = valid.map(r => ({
        title: r.title,
        price: r.price,
        category_id: r.category_id,
        description: r.description || undefined,
        brand: r.brand || undefined,
        stock: r.stock,
        original_price: r.original_price || undefined,
        barcode: r.barcode || undefined,
      }));
      const res = await api.post<{ created: number }>("/products/bulk", products);
      Toast.show({ type: "success", text1: `Добавлено ${res.data.created} товаров!` });
      setExcelRows([]);
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Ошибка публикации" });
    } finally {
      setExcelPublishing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Импорт каталога</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", backgroundColor: c.card, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
        {([
          { key: "wb", label: "🛍 WB / Ozon", icon: Download },
          { key: "excel", label: "📊 Excel / CSV", icon: FileSpreadsheet },
        ] as const).map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center",
              backgroundColor: tab === t.key ? P : c.iconBg,
              borderWidth: 1.5, borderColor: tab === t.key ? P : c.border }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: tab === t.key ? "#fff" : c.textSub }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">

        {tab === "wb" ? (
          <>
            {/* WB / Ozon import */}
            <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Импорт с Wildberries или Ozon</Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>Введите артикул товара — система подтянет название, фото, бренд и цену</Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 12, gap: 8 }}>
                  <Search size={16} color={c.textMuted} />
                  <TextInput
                    value={article}
                    onChangeText={setArticle}
                    placeholder="Артикул WB (числовой) или Ozon"
                    placeholderTextColor={c.textMuted}
                    keyboardType="default"
                    onSubmitEditing={fetchProduct}
                    style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: c.text }}
                  />
                </View>
                <TouchableOpacity onPress={fetchProduct} disabled={loading || !article.trim()}
                  style={{ width: 48, height: 48, backgroundColor: article.trim() ? P : c.iconBg, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <Search size={20} color={article.trim() ? "#fff" : c.textMuted} />}
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: "#f0f9ff", borderRadius: 12, padding: 10, gap: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0369a1" }}>Примеры артикулов:</Text>
                <Text style={{ fontSize: 11, color: "#0369a1" }}>WB: 123456789 (числовой)</Text>
                <Text style={{ fontSize: 11, color: "#0369a1" }}>Ozon: 12345678 (числовой)</Text>
              </View>
            </View>

            {/* Preview card */}
            {preview && (
              <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#16a34a" }}>
                    Товар найден на {preview._source === "wb" ? "Wildberries" : "Ozon"}
                  </Text>
                </View>

                {/* Photos */}
                {preview.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {preview.photos.slice(0, 6).map((url, i) => (
                      <View key={i} style={{ width: 72, height: 96, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: c.border }}>
                        <Image source={{ uri: url }} style={{ width: 72, height: 96 }} contentFit="cover" />
                        {i === 0 && (
                          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(37,99,235,0.85)", paddingVertical: 2 }}>
                            <Text style={{ color: "#fff", fontSize: 9, textAlign: "center", fontWeight: "600" }}>Главное</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>{preview.title}</Text>
                  {preview.brand ? <Text style={{ fontSize: 13, color: c.textSub }}>{preview.brand}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: P }}>{preview.price.toLocaleString()} сом</Text>
                    <Text style={{ fontSize: 12, color: c.textMuted }}>· {preview.stock} шт. на складе</Text>
                  </View>
                </View>

                {/* Category ID input */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600" }}>ID категории * (найдите в разделе Категории)</Text>
                  <TextInput
                    value={categoryId}
                    onChangeText={setCategoryId}
                    placeholder="Например: 5"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                    style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text }}
                  />
                </View>

                <View style={{ backgroundColor: "#fff7ed", borderRadius: 12, padding: 10, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={14} color="#d97706" style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: 11, color: "#92400e", flex: 1 }}>Цену можно изменить после публикации. Фото импортируются с оригинального сайта.</Text>
                </View>

                <TouchableOpacity onPress={publishImported} disabled={publishing}
                  style={{ backgroundColor: P, borderRadius: 16, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                  {publishing ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Plus size={18} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Опубликовать товар</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Excel import */}
            <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Импорт из Excel / CSV</Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>Загрузите CSV файл с товарами. До 200 позиций за раз.</Text>

              {/* Column guide */}
              <View style={{ backgroundColor: "#f8fafc", borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, borderColor: "#e2e8f0" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#475569" }}>📋 Структура CSV (через запятую или ;)</Text>
                <Text style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>Название, Цена, ID категории, Описание, Бренд, Остаток, Старая цена</Text>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>Первая строка — заголовки (пропускается)</Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={pickExcel} disabled={excelLoading}
                  style={{ flex: 1, backgroundColor: P, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                  {excelLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <FileSpreadsheet size={18} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Выбрать файл</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={showExcelHelp}
                  style={{ width: 48, height: 48, backgroundColor: "#EFF6FF", borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Excel preview */}
            {excelRows.length > 0 && (
              <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Товары из файла</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <View style={{ backgroundColor: "#dcfce7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#166534" }}>✓ {excelRows.filter(r => r.valid).length} готово</Text>
                    </View>
                    {excelRows.filter(r => !r.valid).length > 0 && (
                      <View style={{ backgroundColor: "#fee2e2", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#991b1b" }}>✗ {excelRows.filter(r => !r.valid).length} ошибок</Text>
                      </View>
                    )}
                  </View>
                </View>

                {excelRows.slice(0, 10).map((row, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    {row.valid
                      ? <CheckCircle size={16} color="#16a34a" />
                      : <XCircle size={16} color="#ef4444" />}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: row.valid ? c.text : "#ef4444" }} numberOfLines={1}>
                        {row.title || "Нет названия"}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }}>
                        {row.price > 0 ? `${row.price.toLocaleString()} сом` : "Нет цены"} · Кат. {row.category_id || "?"} · {row.stock} шт.
                      </Text>
                    </View>
                  </View>
                ))}

                {excelRows.length > 10 && (
                  <Text style={{ fontSize: 12, color: c.textMuted, textAlign: "center" }}>... и ещё {excelRows.length - 10} товаров</Text>
                )}

                <TouchableOpacity onPress={publishExcel} disabled={excelPublishing || excelRows.filter(r => r.valid).length === 0}
                  style={{ backgroundColor: P, borderRadius: 16, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: excelRows.filter(r => r.valid).length === 0 ? 0.5 : 1 }}>
                  {excelPublishing ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Package size={18} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                        Опубликовать {excelRows.filter(r => r.valid).length} товаров
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
