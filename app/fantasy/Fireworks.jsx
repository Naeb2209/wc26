"use client";

// Pháo hoa chúc mừng kết thúc mùa giải — canvas thuần, không thư viện, phủ toàn màn hình và
// KHÔNG chặn thao tác (pointer-events: none). Tự dừng sau `duration` để không đốt CPU,
// và tôn trọng prefers-reduced-motion (người dùng tắt hiệu ứng -> không vẽ gì).
import { useEffect, useRef } from "react";

const COLORS = ["#ffd700", "#ff5f6d", "#40e0d0", "#7cff6b", "#ff9f43", "#c56cff", "#ffffff"];

export default function Fireworks({ duration = 12000, replayKey = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rockets = [];
    const sparks = [];
    const rand = (a, b) => a + Math.random() * (b - a);

    const launch = () => {
      const x = rand(w * 0.12, w * 0.88);
      rockets.push({
        x,
        y: h + 8,
        vx: rand(-0.5, 0.5),
        vy: -rand(8.5, 12),
        color: COLORS[(Math.random() * COLORS.length) | 0],
      });
    };

    const explode = (r) => {
      const n = 46 + ((Math.random() * 26) | 0);
      const speed = rand(3, 6);
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + rand(-0.06, 0.06);
        const s = speed * rand(0.55, 1.15);
        sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          decay: rand(0.008, 0.018),
          color: Math.random() < 0.15 ? "#ffffff" : r.color,
        });
      }
    };

    let raf = 0;
    const start = performance.now();
    let nextLaunch = 0;
    // Loạt chào mừng ngay khi vào trang (không đợi nhịp ngẫu nhiên đầu tiên).
    launch();
    launch();
    launch();

    const frame = (now) => {
      const elapsed = now - start;
      // Vệt mờ dần thay vì xoá hẳn -> có đuôi sáng.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      if (elapsed < duration && now >= nextLaunch) {
        launch();
        if (Math.random() < 0.35) launch(); // thỉnh thoảng bắn kép
        nextLaunch = now + rand(320, 800);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.16; // trọng lực
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= -1.4) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + 0.055;
        s.life -= s.decay;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Hết giờ và không còn hạt nào -> dừng vòng lặp.
      if (elapsed >= duration && !rockets.length && !sparks.length) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [duration, replayKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] w-full h-full pointer-events-none"
    />
  );
}
