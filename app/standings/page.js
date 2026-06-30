import { getStandings, flagUrl } from "@/lib/fifa-api";

export const revalidate = 3600;

function GroupCard({ group }) {
  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden hover:shadow-[0px_8px_24px_rgba(29,78,216,0.12)] hover:border-primary transition-all duration-300">
      <div className="bg-primary-fixed-dim p-4 flex justify-between items-center border-b border-surface-variant">
        <h3 className="font-headline-md text-headline-md text-on-primary-fixed">{group.name}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead className="bg-primary text-on-primary font-label-caps text-label-caps">
            <tr>
              <th className="py-3 px-4 w-12 text-center">VT</th>
              <th className="py-3 px-4">Đội</th>
              <th className="py-3 px-2 text-center" title="Trận">T</th>
              <th className="py-3 px-2 text-center" title="Thắng">Th</th>
              <th className="py-3 px-2 text-center" title="Hòa">H</th>
              <th className="py-3 px-2 text-center" title="Thua">B</th>
              <th className="py-3 px-2 text-center" title="Hiệu số">HS</th>
              <th className="py-3 px-4 text-center font-bold">Đ</th>
            </tr>
          </thead>
          <tbody className="font-data-mono text-data-mono">
            {group.rows.map((r, i) => {
              const qualified = i < 2;
              return (
                <tr
                  key={r.code}
                  className={`table-zebra border-b border-surface-variant hover:bg-surface-container transition-colors ${
                    qualified ? "qualified-border" : ""
                  }`}
                >
                  <td className={`py-3 px-4 text-center ${qualified ? "font-bold" : ""}`}>{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        alt={`Cờ ${r.team}`}
                        className="w-6 h-4 object-contain border border-outline-variant bg-white"
                        src={r.flag || flagUrl(r.iso, 40)}
                      />
                      <span className={qualified ? "font-bold" : ""}>{r.team}</span>
                      {r.fifaRank != null && (
                        <span
                          className="text-[10px] bg-surface-variant text-on-surface-variant px-1 rounded ml-1"
                          title="Thứ hạng FIFA"
                        >
                          #{r.fifaRank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">{r.p}</td>
                  <td className="py-3 px-2 text-center">{r.w}</td>
                  <td className="py-3 px-2 text-center">{r.d}</td>
                  <td className="py-3 px-2 text-center">{r.l}</td>
                  <td className="py-3 px-2 text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className={`py-3 px-4 text-center font-bold ${qualified ? "text-primary" : ""}`}>{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SOURCE_LABEL = {
  "football-data": { text: "Dữ liệu trực tiếp · football-data.org", live: true },
  "api-football": { text: "Dữ liệu trực tiếp · API-Football", live: true },
  snapshot: { text: "Dữ liệu đã đồng bộ · db.json", live: false },
  sample: { text: "Dữ liệu mẫu (chưa kết nối API)", live: false },
};

export default async function StandingsPage() {
  const { groups, source } = await getStandings();
  const src = SOURCE_LABEL[source] || SOURCE_LABEL.sample;
  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <section className="mb-16">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b-2 border-surface-variant pb-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary">Vòng Bảng</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
              Cập nhật bảng xếp hạng liên tục từ các trận đấu. Top 2 mỗi bảng (viền xanh lá) giành quyền đi tiếp.
            </p>
          </div>
          <span
            className={`mt-3 md:mt-0 shrink-0 inline-flex items-center gap-1.5 font-label-caps text-label-caps uppercase px-3 py-1.5 rounded-full ${
              src.live ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container text-on-surface-variant"
            }`}
            title="Nguồn dữ liệu bảng xếp hạng"
          >
            <span className={`w-2 h-2 rounded-full ${src.live ? "bg-tertiary animate-pulse" : "bg-outline"}`} />
            {src.text}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {groups.map((g) => (
            <GroupCard key={g.name} group={g} />
          ))}
        </div>
      </section>
    </main>
  );
}
