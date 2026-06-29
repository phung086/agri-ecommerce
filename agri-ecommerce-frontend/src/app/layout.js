import "./globals.css";
import AiChatWidget from "@/components/AiChatWidget";

export const metadata = {
  title: "AgriMarket - Sàn nông sản trực tuyến",
  description:
    "Sàn thương mại điện tử nông sản với rau củ, trái cây, gạo sạch và nguồn gốc minh bạch.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {children}
        <AiChatWidget />
      </body>
    </html>
  );
}
