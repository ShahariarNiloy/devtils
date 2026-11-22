/**
 * "Try examples": three sample images drawn on the fly (no bundled assets,
 * nothing fetched) that cover the cases the tool treats differently — a
 * grainy dusk photo with smooth gradients (JPEG; banding shows up in "Show
 * what changed"), a dark UI screenshot with small text (PNG), and a
 * transparent badge (PNG with alpha, so Auto skips JPEG).
 *
 * Browser-only (OffscreenCanvas). Each image is drawn in one short task and
 * encoded by the browser off the main thread; we yield between images so
 * nothing blocks input.
 */

const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

function canvas(w: number, h: number): { c: OffscreenCanvas; x: OffscreenCanvasRenderingContext2D } {
  const c = new OffscreenCanvas(w, h);
  const x = c.getContext("2d");
  if (!x) throw new Error("2D canvas unavailable");
  return { c, x };
}

/** Deterministic PRNG (mulberry32) so the samples are identical each time. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Film grain as a small tile, overlaid as a pattern (cheap at any size). */
function grain(x: OffscreenCanvasRenderingContext2D, w: number, h: number, amount: number, seed: number) {
  const { c: tile, x: tx } = canvas(128, 128);
  const img = tx.createImageData(128, 128);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 2 * amount;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tx.putImageData(img, 0, 0);
  const pattern = x.createPattern(tile, "repeat");
  if (!pattern) return;
  x.save();
  x.globalCompositeOperation = "overlay";
  x.globalAlpha = 0.55;
  x.fillStyle = pattern;
  x.fillRect(0, 0, w, h);
  x.restore();
}

async function streetDusk(): Promise<File> {
  const w = 1600;
  const h = 1067;
  const { c, x } = canvas(w, h);
  const sky = x.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, "#1b2340");
  sky.addColorStop(0.45, "#6b4a6e");
  sky.addColorStop(0.8, "#e08a5c");
  sky.addColorStop(1, "#f4c27a");
  x.fillStyle = sky;
  x.fillRect(0, 0, w, h);
  const sun = x.createRadialGradient(w * 0.62, h * 0.66, 10, w * 0.62, h * 0.66, 420);
  sun.addColorStop(0, "rgba(255,236,190,0.95)");
  sun.addColorStop(0.2, "rgba(255,190,120,0.55)");
  sun.addColorStop(1, "rgba(255,160,100,0)");
  x.fillStyle = sun;
  x.fillRect(0, 0, w, h);
  const r = rng(7);
  // Skyline silhouettes with lit windows: hard edges next to soft sky.
  let px = -20;
  while (px < w) {
    const bw = 60 + r() * 140;
    const bh = h * (0.22 + r() * 0.38);
    const top = h - bh;
    x.fillStyle = `rgb(${18 + r() * 10}, ${16 + r() * 8}, ${26 + r() * 12})`;
    x.fillRect(px, top, bw, bh);
    for (let wy = top + 14; wy < h - 20; wy += 22) {
      for (let wx = px + 10; wx < px + bw - 14; wx += 18) {
        if (r() < 0.32) {
          x.fillStyle = `rgba(255, ${200 + r() * 40}, ${120 + r() * 60}, ${0.55 + r() * 0.4})`;
          x.fillRect(wx, wy, 8, 11);
        }
      }
    }
    px += bw + r() * 12;
  }
  // Street with a warm reflection.
  const street = x.createLinearGradient(0, h * 0.88, 0, h);
  street.addColorStop(0, "#2a1f24");
  street.addColorStop(1, "#0d0b0e");
  x.fillStyle = street;
  x.fillRect(0, h * 0.88, w, h * 0.12);
  grain(x, w, h, 14, 11);
  return new File([await c.convertToBlob({ type: "image/jpeg", quality: 0.93 })], "street-dusk.jpg", { type: "image/jpeg" });
}

async function dashboard(): Promise<File> {
  const w = 1440;
  const h = 900;
  const { c, x } = canvas(w, h);
  x.fillStyle = "#0f1115";
  x.fillRect(0, 0, w, h);
  x.fillStyle = "#151821";
  x.fillRect(0, 0, 240, h);
  x.font = "600 15px system-ui, sans-serif";
  const nav = ["Overview", "Projects", "Deploys", "Analytics", "Logs", "Storage", "Settings"];
  nav.forEach((label, i) => {
    if (i === 0) {
      x.fillStyle = "#232838";
      x.fillRect(12, 72 + i * 40, 216, 32);
    }
    x.fillStyle = i === 0 ? "#f1f3f8" : "#8a91a5";
    x.fillText(label, 28, 93 + i * 40);
  });
  x.fillStyle = "#f1f3f8";
  x.font = "700 26px system-ui, sans-serif";
  x.fillText("Overview", 280, 64);
  const cards = [
    ["Requests", "1.28M", "#5b9cf2"],
    ["Error rate", "0.14%", "#e5636b"],
    ["p95 latency", "182 ms", "#58c08b"],
    ["Bandwidth", "3.4 TB", "#e0a072"],
  ];
  cards.forEach(([label, value, color], i) => {
    const cx = 280 + i * 284;
    x.fillStyle = "#171a23";
    x.fillRect(cx, 96, 264, 120);
    x.fillStyle = "#8a91a5";
    x.font = "500 14px system-ui, sans-serif";
    x.fillText(label, cx + 20, 128);
    x.fillStyle = "#f1f3f8";
    x.font = "700 32px system-ui, sans-serif";
    x.fillText(value, cx + 20, 176);
    x.fillStyle = color;
    x.fillRect(cx + 20, 194, 80 + i * 30, 4);
  });
  // Chart: thin coloured lines + grid — where 4:2:0 chroma and ringing show.
  x.fillStyle = "#171a23";
  x.fillRect(280, 240, 1120, 360);
  x.strokeStyle = "#232838";
  x.lineWidth = 1;
  for (let gy = 280; gy < 600; gy += 40) {
    x.beginPath();
    x.moveTo(300, gy + 0.5);
    x.lineTo(1380, gy + 0.5);
    x.stroke();
  }
  const r = rng(3);
  for (const [color, base] of [["#5b9cf2", 470], ["#58c08b", 520], ["#e0a072", 400]] as const) {
    x.strokeStyle = color;
    x.lineWidth = 2;
    x.beginPath();
    let y: number = base;
    for (let gx = 300; gx <= 1380; gx += 24) {
      y = Math.max(270, Math.min(590, y + (r() - 0.5) * 50));
      if (gx === 300) x.moveTo(gx, y);
      else x.lineTo(gx, y);
    }
    x.stroke();
  }
  x.font = "13px ui-monospace, monospace";
  for (let row = 0; row < 7; row++) {
    const ry = 640 + row * 34;
    x.fillStyle = row % 2 ? "#13161e" : "#171a23";
    x.fillRect(280, ry, 1120, 34);
    x.fillStyle = "#c9cede";
    x.fillText(`GET /api/v2/items/${(4821 + row * 37).toString(16)}`, 300, ry + 22);
    x.fillStyle = row === 3 ? "#e5636b" : "#58c08b";
    x.fillText(row === 3 ? "500" : "200", 900, ry + 22);
    x.fillStyle = "#8a91a5";
    x.fillText(`${(40 + r() * 160).toFixed(0)} ms`, 1000, ry + 22);
  }
  return new File([await c.convertToBlob({ type: "image/png" })], "dashboard.png", { type: "image/png" });
}

async function badge(): Promise<File> {
  const s = 900;
  const { c, x } = canvas(s, s);
  const cx = s / 2;
  const rings: [number, string, string][] = [
    [400, "#e0a072", "#a76f3e"],
    [330, "#6fa6af", "#2e6670"],
    [260, "#adb99a", "#5f6b4c"],
    [190, "#d08070", "#7a3b30"],
  ];
  for (const [radius, a, b] of rings) {
    const g = x.createLinearGradient(cx - radius, cx - radius, cx + radius, cx + radius);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    x.beginPath();
    x.arc(cx, cx, radius, 0, Math.PI * 2);
    x.arc(cx, cx, radius - 46, 0, Math.PI * 2, true);
    x.fillStyle = g;
    x.fill();
  }
  // Soft shadow + a translucent centre: alpha that JPEG can't keep.
  const glow = x.createRadialGradient(cx, cx, 20, cx, cx, 150);
  glow.addColorStop(0, "rgba(246,242,234,0.9)");
  glow.addColorStop(1, "rgba(246,242,234,0)");
  x.fillStyle = glow;
  x.beginPath();
  x.arc(cx, cx, 150, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#1a1a18";
  x.font = "700 64px system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("v2", cx, cx);
  return new File([await c.convertToBlob({ type: "image/png" })], "badge-rings.png", { type: "image/png" });
}

export async function makeExampleFiles(): Promise<File[]> {
  if (typeof OffscreenCanvas === "undefined") return [];
  const out: File[] = [];
  for (const make of [streetDusk, dashboard, badge]) {
    out.push(await make());
    await yieldToMain();
  }
  return out;
}
