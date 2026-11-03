// Lớp hoạ tiết nền cho hero của từng sự kiện.
//
// Toàn bộ là SVG + span tĩnh (server component), chuyển động do CSS ở globals.css
// lo — không JS, và tự tắt khi máy bật "giảm chuyển động".

function Sky({ stars = 26 }) {
  return (
    <>
      {Array.from({ length: stars }, (_, i) => {
        const left = (i * 37) % 100;
        const top = (i * 53) % 62;
        const size = 1 + ((i * 7) % 3) * 0.6;
        return (
          <span
            key={i}
            className="ev-star"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${(i % 9) * 0.4}s`,
            }}
          />
        );
      })}
    </>
  );
}

function Lantern({ left, top, scale, delay, hue }) {
  return (
    <div className="ev-lantern" style={{ left, top, "--ev-lantern-scale": scale, animationDelay: `${delay}s` }}>
      <svg width="46" height="96" viewBox="0 0 46 96" fill="none" aria-hidden="true">
        <line x1="23" y1="0" x2="23" y2="16" stroke="#e8a33d" strokeWidth="1.4" opacity="0.7" />
        <rect x="13" y="14" width="20" height="5" rx="2" fill="#8a5a1c" />
        <ellipse cx="23" cy="42" rx="16" ry="23" fill={hue} />
        <path d="M23 19v46" stroke="#fff3d6" strokeWidth="0.8" opacity="0.45" />
        <path d="M12 42h22" stroke="#fff3d6" strokeWidth="0.8" opacity="0.3" />
        <rect x="13" y="63" width="20" height="5" rx="2" fill="#8a5a1c" />
        <path d="M18 68l1 14M23 68v16M28 68l-1 14" stroke="#e8a33d" strokeWidth="1.2" opacity="0.75" />
      </svg>
    </div>
  );
}

function LanternScene() {
  return (
    <>
      <Sky stars={30} />
      {/* Trăng rằm */}
      <div className="ev-moon">
        <svg width="150" height="150" viewBox="0 0 150 150" fill="none" aria-hidden="true">
          <circle cx="75" cy="75" r="46" fill="#ffe9b0" />
          <circle cx="75" cy="75" r="46" fill="url(#moonGlow)" />
          <circle cx="62" cy="66" r="7" fill="#f0d79a" opacity="0.7" />
          <circle cx="88" cy="84" r="5" fill="#f0d79a" opacity="0.6" />
          <circle cx="83" cy="59" r="3.5" fill="#f0d79a" opacity="0.55" />
          <defs>
            <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0.7" stopColor="#ffe9b0" stopOpacity="0" />
              <stop offset="1" stopColor="#ffd27a" stopOpacity="0.55" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <Lantern left="5%" top="-8%" scale={1} delay={0} hue="#d8442f" />
      <Lantern left="17%" top="-16%" scale={0.72} delay={1.1} hue="#e8622f" />
      <Lantern left="76%" top="-12%" scale={0.85} delay={0.6} hue="#d8442f" />
      <Lantern left="88%" top="-4%" scale={0.62} delay={1.6} hue="#e8a33d" />
      {/* Mái ngói cách điệu ở chân hero */}
      <svg className="ev-baseline" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 90V58c60-10 120-10 180 0s120 10 180 0 120-10 180 0 120 10 180 0 120-10 180 0 120 10 180 0v32z"
          fill="#0f0a1f"
          opacity="0.55"
        />
      </svg>
    </>
  );
}

function SnowScene() {
  return (
    <>
      {Array.from({ length: 34 }, (_, i) => {
        const size = 3 + ((i * 5) % 4);
        return (
          <span
            key={i}
            className="ev-flake"
            style={{
              left: `${(i * 29) % 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${(i % 11) * 0.9}s`,
              animationDuration: `${9 + (i % 6) * 1.6}s`,
              opacity: 0.35 + (i % 4) * 0.15,
            }}
          />
        );
      })}
      <svg className="ev-baseline" viewBox="0 0 1200 140" preserveAspectRatio="none" aria-hidden="true">
        <path d="M120 140 150 40 180 140zM95 140 150 62 205 140z" fill="#08201a" opacity="0.5" />
        <path d="M1010 140 1046 26 1082 140zM980 140 1046 54 1112 140z" fill="#08201a" opacity="0.45" />
        <path d="M0 140V96c90 18 180 6 300 14s210-14 320-8 200 16 320 6 180-16 260-6v38z" fill="#f5fbf7" opacity="0.14" />
        <path d="M0 140V116c110 14 210 2 330 8s220-12 330-6 190 14 300 4 150-12 240-4v22z" fill="#f5fbf7" opacity="0.2" />
      </svg>
    </>
  );
}

function Cloud({ top, delay, scale }) {
  return (
    <span className="ev-cloud" style={{ top, animationDelay: `${delay}s`, "--ev-cloud-scale": scale }}>
      <svg width="150" height="46" viewBox="0 0 150 46" fill="none" aria-hidden="true">
        <path
          d="M22 44c-12 0-22-8-22-18S10 8 22 8c4-5 11-8 18-8 12 0 22 8 24 18 3-2 7-3 11-3 11 0 20 8 20 18s-9 11-20 11z"
          fill="#ffffff"
          opacity="0.4"
        />
      </svg>
    </span>
  );
}

function MountainScene() {
  return (
    <>
      <div className="ev-sun" />
      {[0, 1, 2].map((i) => (
        <Cloud key={i} top={`${14 + i * 16}%`} delay={i * -9} scale={1 - i * 0.2} />
      ))}
      <svg className="ev-baseline" viewBox="0 0 1200 190" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 190l260-140 150 82 190-116 210 128 190-84 200 130z" fill="#0b2b34" opacity="0.35" />
        <path d="M0 190l200-96 180 60 220-84 200 96 180-52 220 76z" fill="#0b2b34" opacity="0.55" />
        <path d="M0 190l300-70 260 44 300-58 340 84z" fill="#07202a" opacity="0.8" />
      </svg>
    </>
  );
}

function BeachScene() {
  return (
    <>
      <div className="ev-sun ev-sun--warm" />
      {[0, 1].map((i) => (
        <Cloud key={i} top={`${16 + i * 18}%`} delay={i * -11} scale={0.9 - i * 0.25} />
      ))}
      <div className="ev-waves" aria-hidden="true">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0 60c100 26 200 26 300 0s200-26 300 0 200 26 300 0 200-26 300 0v60H0z" fill="#8fd6e8" opacity="0.35" />
        </svg>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0 76c100 24 200 24 300 0s200-24 300 0 200 24 300 0 200-24 300 0v44H0z" fill="#f5e6c8" opacity="0.55" />
        </svg>
      </div>
    </>
  );
}

function PetalScene() {
  return (
    <>
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className="ev-petal"
          style={{
            left: `${(i * 41) % 100}%`,
            animationDelay: `${(i % 8) * 1.3}s`,
            animationDuration: `${11 + (i % 5) * 2}s`,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 0c3 3.5 4.5 6 4.5 8.2A4.6 4.6 0 0 1 7 13a4.6 4.6 0 0 1-4.5-4.8C2.5 6 4 3.5 7 0z" fill="#e79ab5" opacity="0.85" />
          </svg>
        </span>
      ))}
      <svg className="ev-baseline" viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 110V70c120 22 220-8 340 6s240 20 360-4 260-16 500 8v30z" fill="#b8436a" opacity="0.1" />
      </svg>
    </>
  );
}

function ConfettiScene() {
  const colors = ["#6b4a86", "#e8a33d", "#c8102e", "#2f8f7a", "#3b7dd8"];
  return (
    <>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="ev-confetti"
          style={{
            left: `${(i * 31) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 0.8}s`,
            animationDuration: `${7 + (i % 5) * 1.4}s`,
            width: i % 3 === 0 ? "5px" : "7px",
            height: i % 3 === 0 ? "9px" : "5px",
          }}
        />
      ))}
    </>
  );
}

// --- Hội thao TMA: đèn sân khấu + dụng cụ các bộ môn bay lơ lửng ---

// Mỗi bộ môn một hình nhỏ, vẽ tay cho nhẹ (không dùng icon font trong lớp nền).
const KIT = {
  shuttle: (
    <>
      <path d="M12 26c-4-3-5-8-4-13l8 5z" fill="#ffffff" opacity="0.92" />
      <path d="M20 18l-8-5c3-4 8-6 13-5z" fill="#ffffff" opacity="0.7" />
      <circle cx="21" cy="24" r="5" fill="#ffd400" />
    </>
  ),
  ball: (
    <>
      <circle cx="16" cy="16" r="10" fill="#ffd400" />
      <path d="M8 12c6 1 10 5 12 11M12 7c5 3 8 8 9 14" stroke="#e0a800" strokeWidth="1.2" fill="none" opacity="0.7" />
    </>
  ),
  dart: (
    <>
      <circle cx="16" cy="16" r="11" fill="#ffffff" opacity="0.9" />
      <circle cx="16" cy="16" r="7" fill="#12b34a" />
      <circle cx="16" cy="16" r="3" fill="#c8102e" />
    </>
  ),
  chess: (
    <>
      <path d="M11 26h10l-1.5-8h-7z" fill="#ffffff" opacity="0.92" />
      <circle cx="16" cy="13" r="5" fill="#ffffff" opacity="0.92" />
      <rect x="9" y="25" width="14" height="3" rx="1.5" fill="#29b3f0" />
    </>
  ),
  note: (
    <>
      <path d="M13 24V9l10-2v13" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.92" />
      <circle cx="11" cy="24" r="3.5" fill="#12b34a" />
      <circle cx="21" cy="21" r="3.5" fill="#12b34a" />
    </>
  ),
};

function Kit({ shape, left, top, scale, delay }) {
  return (
    <div className="ev-kit" style={{ left, top, "--ev-kit-scale": scale, animationDelay: `${delay}s` }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {KIT[shape]}
      </svg>
    </div>
  );
}

function FestivalScene() {
  const colors = ["#ffd400", "#12b34a", "#29b3f0", "#ffffff"];
  return (
    <>
      {/* Hai luồng đèn sân khấu quét chéo phía sau tiêu đề */}
      <div className="ev-beam ev-beam--left" />
      <div className="ev-beam ev-beam--right" />

      <Kit shape="shuttle" left="63%" top="14%" scale={1.1} delay={0} />
      <Kit shape="ball" left="88%" top="26%" scale={0.8} delay={1.4} />
      <Kit shape="dart" left="74%" top="52%" scale={1} delay={0.7} />
      <Kit shape="chess" left="93%" top="66%" scale={0.9} delay={2.1} />
      <Kit shape="note" left="64%" top="74%" scale={0.85} delay={1.1} />

      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="ev-confetti"
          style={{
            left: `${(i * 43) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 7) * 0.9}s`,
            animationDuration: `${8 + (i % 4) * 1.5}s`,
            width: i % 3 === 0 ? "4px" : "7px",
            height: i % 3 === 0 ? "10px" : "4px",
          }}
        />
      ))}

      {/* Chân hero: vạch sân xanh lá kiểu poster */}
      <svg className="ev-baseline" viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 110V64c180 26 360 26 600 6s420-26 600-6v46z" fill="#12b34a" opacity="0.35" />
        <path d="M0 110V82c200 20 380 16 600 0s420-20 600-2v30z" fill="#0a8f3a" opacity="0.4" />
        <path d="M0 96c200 18 380 14 600 -2s420-18 600 0" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.35" />
      </svg>
    </>
  );
}

const SCENES = {
  lantern: LanternScene,
  snow: SnowScene,
  mountain: MountainScene,
  beach: BeachScene,
  petal: PetalScene,
  confetti: ConfettiScene,
  festival: FestivalScene,
};

export default function EventDecor({ decor }) {
  const Scene = SCENES[decor];
  if (!Scene) return null;
  return (
    <div className="ev-decor" aria-hidden="true">
      <Scene />
    </div>
  );
}
