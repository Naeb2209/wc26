import { readDb } from "@/lib/db";
import StatsView from "./StatsView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thống kê giải đấu | FIFA World Cup 2026",
  description: "Vua phá lưới, kiến tạo và thống kê cá nhân World Cup 2026 — đồng bộ từ FotMob.",
};

export default async function StatsPage() {
  const db = await readDb();
  const stats = db.playerStats || null;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <header className="mb-8 border-b-2 border-surface-variant pb-4">
        <p className="font-label-caps text-label-caps uppercase text-secondary mb-1">
          Thành tích cá nhân
        </p>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
          Thống kê giải đấu
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
          Vua phá lưới, kiến tạo và các chỉ số cá nhân của World Cup 2026.
        </p>
      </header>

      {stats ? (
        <StatsView stats={stats} />
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-outline">query_stats</span>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Chưa có dữ liệu thống kê. Chạy <code className="font-data-mono">npm run sync-stats</code> để đồng bộ từ FotMob.
          </p>
        </div>
      )}
    </main>
  );
}
