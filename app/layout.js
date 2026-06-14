import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "FIFA World Cup 2026 | Pitch Pulse",
  description: "Lịch thi đấu, bảng xếp hạng, đội bóng và trực tiếp World Cup 2026 trên VTV.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700;800&family=Hanken+Grotesk:wght@600;700&display=swap"
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
      <body className="bg-background text-on-background antialiased min-h-screen flex flex-col">
        <Nav />
        <div className="flex-grow flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
