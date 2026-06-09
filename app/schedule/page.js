import { getSchedule } from "@/lib/fifa-api";
import ScheduleView from "@/components/ScheduleView";

export const revalidate = 3600;

export default async function SchedulePage() {
  const db = await getSchedule();
  return (
    <div className="kinetic-bg flex-grow">
      <main className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 relative z-10">
        <header className="mb-12">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4">
            Lịch Thi Đấu
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Theo dõi toàn bộ hành trình của 48 đội tuyển quốc gia tại FIFA World Cup 2026. Từ vòng bảng đầy kịch tính đến trận chung kết lịch sử.
          </p>
        </header>
        <ScheduleView stages={db.stages} schedule={db.schedule} />
      </main>
    </div>
  );
}
