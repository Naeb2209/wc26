import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import SideRail from "@/components/SideRail";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/hub/AuthProvider";

export const metadata = {
  title: "DC42 Hub",
  description: "Sân chơi của anh em DC: giải đấu, kèo giao lưu hằng tuần, sự kiện, kho ảnh và Fantasy theo mùa.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700;800&family=Chakra+Petch:wght@600;700&family=Hanken+Grotesk:wght@600;700&display=swap"
        />
        {/* Material Symbols được self-host (public/fonts) qua @font-face trong globals.css
            để icon luôn load khi deploy, không phụ thuộc CDN runtime. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/material-symbols-outlined.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-background text-on-background antialiased min-h-screen flex flex-col pb-[74px] md:pb-0 md:pl-[110px]">
        {/* Đăng nhập dùng chung toàn site: menu tài khoản trên rail + trang điểm danh. */}
        <AuthProvider>
          <SideRail />
          <div className="flex-grow flex flex-col">{children}</div>
          <Footer />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
