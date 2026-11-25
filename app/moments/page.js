import Link from "next/link";
import { albums, fmtDate, heroImage, media, mediaYears, memberName } from "@/lib/dc42";
import { Card, Chip, EmptyState, MediaTile, PageHeader, Section, SportChip, Stat } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Moments | DC42 Hub",
  description: "Kho ảnh và video của mọi hoạt động DC, xem theo album hoặc theo năm.",
};

export default async function MomentsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const year = sp.nam || "all";
  const all = albums();
  const years = mediaYears();
  const list = year === "all" ? all : all.filter((a) => String(a.date).startsWith(year));

  const totalPhotos = media().filter((m) => m.type === "image").length;
  const totalVideos = media().filter((m) => m.type === "video").length;
  const latest = [...media()].slice(0, 8);

  return (
    <>
      <PageHeader
        hero
        image={heroImage()}
        eyebrow="Moments"
        title="Kho ảnh của DC"
        lede="Mỗi album gắn với một hoạt động — mở giải hay sự kiện nào thì thấy đúng album của nó, không cần đăng lại."
        aside={
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Ảnh" value={totalPhotos} />
            <Stat label="Video" value={totalVideos} />
          </div>
        }
      />

      <Section title="Mới nhất">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {latest.map((m) => (
            <MediaTile key={m.id} item={m} />
          ))}
        </div>
      </Section>

      <div className="border-y border-dc-line bg-dc-paper">
        <Section title="Album theo hoạt động">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Năm</span>
            <YearLink label="Tất cả" value="all" active={year === "all"} />
            {years.map((y) => (
              <YearLink key={y} label={y} value={y} active={year === y} />
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState icon="photo_library" title="Năm này chưa có album nào" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((a) => (
                <Card key={a.activity} className="flex flex-col overflow-hidden">
                  <div className="grid grid-cols-3 gap-0.5 bg-dc-line">
                    {a.items.slice(0, 3).map((m) => (
                      <MediaTile key={m.id} item={{ ...m, caption: "" }} className="rounded-none border-0" />
                    ))}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.sport ? <SportChip sport={a.sport} /> : <Chip tone="social">{a.kind}</Chip>}
                      <Chip icon="photo_camera">{a.photos} ảnh</Chip>
                      {a.videos > 0 ? <Chip icon="play_circle">{a.videos} video</Chip> : null}
                    </div>
                    <Link href={a.href} className="font-dc-display text-[18px] font-bold leading-snug text-dc-ink hover:text-dc-gold">
                      {a.title}
                    </Link>
                    <p className="mt-auto text-[13px] text-dc-ink-2">{fmtDate(a.date)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Góp ảnh">
        <Card className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[62ch]">
            <p className="font-dc-display text-[17px] font-bold text-dc-ink">Ảnh của bạn cũng nên nằm ở đây</p>
            <p className="mt-1 text-body-md text-dc-ink-2">
              Hiện ảnh do ban tổ chức thêm vào từng hoạt động. Khi bật phần góp ảnh, mỗi người sẽ tự tải lên và ảnh vào
              hàng chờ duyệt trước khi hiện — người đăng ghi nhận theo tên, ví dụ{" "}
              {memberName("m02")} hay {memberName("m13")}.
            </p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-dc-line px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            Sắp có
          </span>
        </Card>
      </Section>
    </>
  );
}

function YearLink({ label, value, active }) {
  return (
    <Link
      href={value === "all" ? "/moments" : `/moments?nam=${value}`}
      className={`rounded-full border px-3.5 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
        active ? "border-dc-ink bg-dc-ink text-white" : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
      }`}
    >
      {label}
    </Link>
  );
}
