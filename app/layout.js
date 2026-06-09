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
      <body className="bg-background text-on-background antialiased min-h-screen flex flex-col">
        <Nav />
        <div className="flex-grow flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
