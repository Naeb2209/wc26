// Trang trí riêng cho từng sự kiện.
//
// Mỗi sự kiện trong data/dc42.json được map sang một "theme": bảng màu + một lớp
// hoạ tiết nền (decor) vẽ bằng SVG. Trang /su-kien/[slug] đọc theme này để đổi
// màu hero, chip, đường viền — nên thêm sự kiện mới chỉ cần thêm một mục ở đây.
//
// Ưu tiên khớp: theme khai báo thẳng trong data (event.theme) -> theo slug -> theo
// type -> theme mặc định.

const THEMES = {
  "trung-thu": {
    key: "trung-thu",
    label: "Trung thu",
    decor: "lantern",
    icon: "brightness_2",
    // Hero nền tối: chữ sáng.
    dark: true,
    accent: "#e8a33d",
    accentDeep: "#b9761f",
    soft: "#fdf1dc",
    line: "#f0d9ab",
    heroFrom: "#1b1233",
    heroTo: "#3b1f4e",
    heroInk: "#fdf6e6",
    heroInk2: "#e2cfae",
  },
  noel: {
    key: "noel",
    label: "Giáng sinh",
    decor: "snow",
    icon: "ac_unit",
    dark: true,
    accent: "#c8102e",
    accentDeep: "#8f0a20",
    soft: "#f6ecec",
    line: "#e6cfd2",
    heroFrom: "#0b2b21",
    heroTo: "#123f2f",
    heroInk: "#f5fbf7",
    heroInk2: "#c9e0d3",
  },
  "du-lich": {
    key: "du-lich",
    label: "Du lịch",
    decor: "mountain",
    icon: "landscape",
    dark: true,
    accent: "#2f8f7a",
    accentDeep: "#1f6a59",
    soft: "#e6f2ef",
    line: "#c9e2db",
    heroFrom: "#123b47",
    heroTo: "#2a6b6b",
    heroInk: "#f2fbf9",
    heroInk2: "#bcdcd6",
  },
  teambuilding: {
    key: "teambuilding",
    label: "Teambuilding",
    decor: "beach",
    icon: "beach_access",
    dark: true,
    accent: "#e07a2f",
    accentDeep: "#b35c1a",
    soft: "#fdeee1",
    line: "#f2d6bd",
    heroFrom: "#0f3a5c",
    heroTo: "#2b6c8f",
    heroInk: "#fdf7f1",
    heroInk2: "#cfe2ec",
  },
  "quoc-te-phu-nu": {
    key: "quoc-te-phu-nu",
    label: "8 tháng 3",
    decor: "petal",
    icon: "local_florist",
    dark: false,
    accent: "#b8436a",
    accentDeep: "#8c2f4e",
    soft: "#fdeef3",
    line: "#f2cfdc",
    heroFrom: "#fdf0f4",
    heroTo: "#f7dfe8",
    heroInk: "#3d1727",
    heroInk2: "#7a4257",
  },
  "sinh-nhat": {
    key: "sinh-nhat",
    label: "Sinh nhật DC",
    decor: "confetti",
    icon: "cake",
    dark: false,
    accent: "#6b4a86",
    accentDeep: "#4d3363",
    soft: "#f2ecf8",
    line: "#ddd0ea",
    heroFrom: "#f7f2fb",
    heroTo: "#ece0f5",
    heroInk: "#2b1b3a",
    heroInk2: "#5f4a72",
  },
  // Hội thao TMA: xanh cobalt của poster + xanh lá vạch sân, chữ sáng trên nền tối.
  "hoi-thao": {
    key: "hoi-thao",
    label: "Hội thao TMA",
    decor: "festival",
    icon: "emoji_events",
    dark: true,
    accent: "#29b3f0",
    accentDeep: "#1160b8",
    soft: "#e8f4fd",
    line: "#c3e2f7",
    heroFrom: "#0f2f9e",
    heroTo: "#1b58d6",
    heroInk: "#f4faff",
    heroInk2: "#bcd8f7",
  },
  default: {
    key: "default",
    label: "Sự kiện DC",
    decor: "none",
    icon: "celebration",
    dark: false,
    accent: "#987c4b",
    accentDeep: "#7d6339",
    soft: "#f0e7d6",
    line: "#e2ded6",
    heroFrom: "#ffffff",
    heroTo: "#faf8f5",
    heroInk: "#151515",
    heroInk2: "#5f5a52",
  },
};

// Khớp theo slug: dùng tiền tố để "trung-thu-2027" vẫn ăn theme "trung-thu".
const BY_SLUG_PREFIX = [
  ["trung-thu", "trung-thu"],
  ["noel", "noel"],
  ["giang-sinh", "noel"],
  ["trip-", "du-lich"],
  ["teambuilding", "teambuilding"],
  ["8-3", "quoc-te-phu-nu"],
  ["sinh-nhat", "sinh-nhat"],
  ["hoi-thao", "hoi-thao"],
];

const BY_TYPE = {
  "Du lịch": "du-lich",
  Teambuilding: "teambuilding",
  "Lễ hội": "trung-thu",
  "Kỷ niệm": "sinh-nhat",
  "Hội thao": "hoi-thao",
};

export function eventTheme(event) {
  if (!event) return THEMES.default;
  const slug = String(event.slug || "");
  const direct = event.theme && THEMES[event.theme];
  if (direct) return direct;
  const hit = BY_SLUG_PREFIX.find(([prefix]) => slug.startsWith(prefix));
  if (hit) return THEMES[hit[1]];
  return THEMES[BY_TYPE[event.type]] || THEMES.default;
}

// Biến CSS để component con dùng lại màu của theme mà không cần truyền props.
export function themeVars(theme) {
  return {
    "--ev-accent": theme.accent,
    "--ev-accent-deep": theme.accentDeep,
    "--ev-soft": theme.soft,
    "--ev-line": theme.line,
    "--ev-hero-from": theme.heroFrom,
    "--ev-hero-to": theme.heroTo,
    "--ev-hero-ink": theme.heroInk,
    "--ev-hero-ink-2": theme.heroInk2,
  };
}

export { THEMES };
