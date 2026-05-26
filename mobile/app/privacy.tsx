import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

function H1({ children }: { children: string }) {
  return <Text style={{ fontSize: 20, fontWeight: "900", color: "#111827", marginTop: 24, marginBottom: 8 }}>{children}</Text>;
}
function H2({ children }: { children: string }) {
  return <Text style={{ fontSize: 15, fontWeight: "700", color: "#374151", marginTop: 16, marginBottom: 6 }}>{children}</Text>;
}
function P({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: 14, color: "#4b5563", lineHeight: 22 }}>{children}</Text>;
}
function Li({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
      <Text style={{ fontSize: 14, color: "#8B5CF6", marginTop: 4 }}>•</Text>
      <Text style={{ flex: 1, fontSize: 14, color: "#4b5563", lineHeight: 22 }}>{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Политика конфиденциальности</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>Дата вступления в силу: 26 мая 2026 г.</Text>
        <P>Добро пожаловать в приложение AZA Market. Настоящая Политика конфиденциальности объясняет, какие данные мы собираем, как используем, храним и защищаем их при использовании нашего мобильного приложения и связанных сервисов.</P>
        <P>Используя приложение, вы соглашаетесь с условиями данной Политики.</P>

        <H1>1. Какие данные мы собираем</H1>

        <H2>1.1 Личные данные</H2>
        <Li>Имя и фамилия</Li>
        <Li>Номер телефона</Li>
        <Li>Адрес электронной почты</Li>
        <Li>Дата регистрации аккаунта</Li>
        <Li>Фото профиля (если загружено)</Li>

        <H2>1.2 Данные продавца</H2>
        <Li>Паспортные данные</Li>
        <Li>ИНН</Li>
        <Li>Банковские реквизиты</Li>
        <Li>Название и адрес магазина</Li>
        <Li>Информация о товарах</Li>

        <H2>1.3 Данные о заказах</H2>
        <Li>История заказов</Li>
        <Li>Информация о доставке</Li>
        <Li>Адрес получения</Li>
        <Li>Способ оплаты</Li>
        <Li>Статус заказов</Li>

        <H2>1.4 Технические данные</H2>
        <Li>IP-адрес</Li>
        <Li>Тип устройства и версия ОС</Li>
        <Li>Идентификаторы устройства</Li>
        <Li>Логи ошибок и данные аналитики</Li>

        <H1>2. Как мы используем данные</H1>
        <P>Мы используем данные для:</P>
        <View style={{ marginTop: 8 }}>
          <Li>Создания и обслуживания аккаунта</Li>
          <Li>Обработки заказов и подключения продавцов</Li>
          <Li>Улучшения работы приложения</Li>
          <Li>Обеспечения безопасности и предотвращения мошенничества</Li>
          <Li>Отправки уведомлений о заказах и сервисе</Li>
          <Li>Выполнения требований законодательства</Li>
        </View>

        <H1>3. Передача данных третьим лицам</H1>
        <P>Мы можем передавать данные платёжным системам, службам доставки, партнёрам по обработке заказов, государственным органам при наличии законных требований, а также сервисам аналитики и облачного хранения.</P>
        <View style={{ marginTop: 8, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 14 }}>
          <Text style={{ fontSize: 14, color: "#16a34a", fontWeight: "700" }}>Мы не продаём личные данные пользователей третьим лицам.</Text>
        </View>

        <H1>4. Хранение и защита данных</H1>
        <P>Мы принимаем разумные технические и организационные меры для защиты данных:</P>
        <View style={{ marginTop: 8 }}>
          <Li>Шифрование соединений (HTTPS)</Li>
          <Li>Ограничение доступа к данным</Li>
          <Li>Защита серверов</Li>
          <Li>Мониторинг подозрительной активности</Li>
        </View>

        <H1>5. Права пользователей</H1>
        <P>Пользователь имеет право:</P>
        <View style={{ marginTop: 8 }}>
          <Li>Получить информацию о своих данных</Li>
          <Li>Изменить данные аккаунта</Li>
          <Li>Удалить аккаунт и запросить удаление персональных данных</Li>
          <Li>Отозвать согласие на обработку данных</Li>
        </View>

        <H1>6. Аналитика</H1>
        <P>Приложение использует инструменты аналитики (Sentry, аналитика устройств) для улучшения стабильности и производительности сервиса.</P>

        <H1>7. Дети</H1>
        <P>Наш сервис не предназначен для детей младше 13 лет. Мы сознательно не собираем данные детей младше 13 лет.</P>

        <H1>8. Изменения политики</H1>
        <P>Мы можем обновлять настоящую Политику. Обновлённая версия публикуется внутри приложения. Продолжение использования приложения означает согласие с новой версией.</P>

        <H1>9. Контакты</H1>
        <P>Email: support@azamarket.tj{"\n"}Компания: AZA Market{"\n"}Страна: Таджикистан</P>

        <View style={{ marginTop: 32, backgroundColor: "#f5f3ff", borderRadius: 14, padding: 16 }}>
          <Text style={{ fontSize: 13, color: "#7c3aed", fontWeight: "600", textAlign: "center" }}>
            Используя приложение, вы подтверждаете, что ознакомились с настоящей Политикой конфиденциальности и соглашаетесь с обработкой персональных данных.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
