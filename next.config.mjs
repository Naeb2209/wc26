/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cấu trúc cũ (/giai-dau, /giao-luu phẳng) -> gom vào /the-thao/<mon>/...
  async redirects() {
    return [
      { source: "/giai-dau", destination: "/the-thao", permanent: false },
      { source: "/giao-luu", destination: "/the-thao", permanent: false },
      { source: "/giai-dau/dc-cup-2026", destination: "/the-thao/bong-da/giai-dau/tma-futsal-league-2026", permanent: false },
      { source: "/giai-dau/tma-futsal-league-2026", destination: "/the-thao/bong-da/giai-dau/tma-futsal-league-2026", permanent: false },
      { source: "/giai-dau/dc-league-2025", destination: "/the-thao/bong-da/giai-dau/dc-league-2025", permanent: false },
      { source: "/giai-dau/tma-football-cup-2025", destination: "/the-thao/bong-da/giai-dau/tma-football-cup-2025", permanent: false },
      { source: "/giai-dau/tma-badminton-open-2026", destination: "/the-thao/cau-long/giai-dau/tma-badminton-open-2026", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
