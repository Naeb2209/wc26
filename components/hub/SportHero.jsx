import fs from "node:fs";
import path from "node:path";

// Dải giới thiệu đầu trang tổng quát của từng môn: đoạn văn ngắn bên trái, ảnh nguyên khung bên phải.
// Ảnh đặt trong /public/hero. Chưa có file thì bỏ cột ảnh (khỏi 404 trong log), đoạn văn chạy full.
//
// Đây là chỗ DUY NHẤT mô tả môn ở trang tổng quan — PageHeader không truyền `lede` nữa,
// vì trước đây `sport.blurb` và đoạn hero nằm sát nhau mà nói gần như cùng một câu.
// Môn chưa khai ở HERO thì rơi về `sport.blurb` để không bao giờ mất phần mô tả.

const HERO = {
  football: {
    src: "/hero/bong-da-tunnel.jpg",
    alt: "Đường hầm dẫn ra sân nhìn thẳng vào mặt cỏ",
    eyebrow: "Tối thứ Tư, ra sân",
    text:
      "Bóng đá là môn đông người nhất của DC42: sân 5 ở Cầu Suối đều đặn mỗi tối thứ Tư, TMA Futsal League mỗi năm một lần, và các giải dự đoán / Fantasy chạy song song theo mùa. Trang này gom lại đúng những thứ cần biết trước khi ra sân — buổi kế tiếp còn chỗ hay không, giải nào đang diễn ra, ai đang dẫn đầu.",
  },
  badminton: {
    eyebrow: "Tối thứ Năm, vào sân",
    text:
      "Cầu lông là kèo gọn nhất của DC42: một buổi tối thứ Năm ở Sân Cầu Lông Đức Kim, Quận 12, cộng giải đôi nam / đôi nữ của TMA mỗi năm. Trang này gom đúng những thứ cần biết trước khi vào sân — buổi kế tiếp còn chỗ hay không, giải nào đang diễn ra, cặp nào của DC vừa đánh xong.",
  },
};

function hasPublicFile(src) {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", src));
  } catch {
    return false;
  }
}

export default function SportHero({ sport }) {
  const hero = HERO[sport?.id];
  const text = hero?.text || sport?.blurb;
  if (!text) return null;
  const hasImage = !!hero?.src && hasPublicFile(hero.src);

  return (
    <div className="border-b border-dc-line bg-dc-paper">
      <div className="mx-auto w-full max-w-container-max px-margin-mobile py-10 md:px-margin-desktop md:py-14">
        <div className={`grid items-center gap-8 ${hasImage ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-12" : ""}`}>
          <div className="max-w-[52ch]">
            {hero?.eyebrow ? (
              <p className="font-dc-display text-[11px] font-bold uppercase tracking-[0.22em] text-dc-gold">
                {hero.eyebrow}
              </p>
            ) : null}
            <p className={`text-body-lg leading-relaxed text-dc-ink-2 ${hero?.eyebrow ? "mt-4" : ""}`}>{text}</p>
          </div>

          {hasImage ? (
            // object-contain trên nền mực: giữ nguyên toàn bộ khung ảnh, không cắt mép.
            <figure className="overflow-hidden rounded-2xl border border-dc-line bg-dc-ink">
              <img
                src={hero.src}
                alt={hero.alt}
                className="block h-auto w-full object-contain"
              />
            </figure>
          ) : null}
        </div>
      </div>
    </div>
  );
}
