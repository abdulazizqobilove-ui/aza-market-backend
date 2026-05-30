import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AZA Partners — Кабинет продавца",
  description: "Управляйте товарами, заказами и аналитикой вашего магазина",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
