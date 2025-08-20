// src/overlays/MarkersOverlay.js

/* Basit marker overlay:
   - setMarkers([{ ts, side, color, label }]) ile marker listesi ver
   - onViewportChange() ve draw() chart yeniden çizimde çağrılmalı
   - candles: [{ openTime, open, high, low, close }]
   - time ve price dönüşümleri App.vue tarafından sağlanacak
*/

export function createMarkersOverlay({
  canvas,                 /* HTMLCanvasElement (overlay) */
  getXForTime,            /* (ms) => x px */
  getYForPrice,           /* (price) => y px */
  getCandles,             /* () => candles[] */
  intervalMs,             /* örn: 1m=60000, 5m=300000 */
  yPlacement = "high"     /* "high" | "close" | "open" | "low" */
}) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  let markers = [];       // orijinal input
  let cache = [];         // çizim için hazır {x,y,side,color,ts}

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width  = Math.round(width  * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function setMarkers(list) {
    markers = normalizeMarkers(list);
    rebuildCache();
    draw();
  }

  function rebuildCache() {
    cache = [];
    const candles = getCandles() || [];
    if (!candles.length) return;

    const opens = candles.map(c => c.openTime); // ms
    for (const m of markers) {
      const idx = findCandleIndex(opens, m.ts, intervalMs);
      if (idx >= 0) {
        const c = candles[idx];
        // Candle merkezine yakın x (istersen openTime kullan)
        const x = getXForTime(c.openTime + Math.floor(intervalMs / 2));
        const yVal = pickYValue(c, yPlacement);
        const y = getYForPrice(yVal);
        cache.push({
          x,
          y,
          side: m.side || "up",                 // "up" | "down"
          color: m.color || "#ff4d4f",         // varsayılan kırmızı
          ts: m.ts,
          label: m.label || ""
        });
      }
      // eşleşmezse sessizce atlıyoruz; istersen console.warn ekleyebilirsin
    }
    console.log('[markers] placed', cache.length, 'of', markers.length)
  }

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // duman testi: sol üstte ufak kırmızı kare
  ctx.save();
  ctx.fillStyle = 'rgba(255,0,0,0.3)';
  ctx.fillRect(10, 10, 10, 10);
  ctx.restore();

  for (const p of cache) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    drawTriangle(ctx, p.x, p.y, p.side, p.color);
    if (p.label) drawLabel(ctx, p.x, p.y, p.label);
  }
}


  function onViewportChange() {
    // zoom/pan/veri güncellemede çağır
    rebuildCache();
    draw();
  }

  // helpers
  function pickYValue(c, place) {
    if (place === "close") return c.close;
    if (place === "open")  return c.open;
    if (place === "low")   return c.low;
    return c.high; // default high
  }

  return { setMarkers, onViewportChange, resize, draw };
}

/* CSV -> markers normalize */
export function parseMarkersCsv(text) {
  // CSV formatı: timestamp[,side][,color][,label]
  // timestamp: s (10 hane) veya ms (13 hane) kabul edilir
  const out = [];
  const lines = text.trim().split(/\r?\n/);
  let start = 0;
  if (/timestamp/i.test(lines[0])) start = 1; // header varsa atla

  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(/[,\t;]+/).map(s => s.trim());
    let ts = Number(cols[0]);
    if (Number.isFinite(ts)) {
      if (ts < 1e12) ts = ts * 1000; // saniyeyse ms'e çevir
    } else {
      // sayı değilse (örn ISO string) Date parse et
      ts = Date.parse(cols[0]);
    }
    const side = (cols[1] || "").toLowerCase() === "down" ? "down" : "up";
    const color = cols[2] || "";
    const label = cols[3] || "";
    if (Number.isFinite(ts)) out.push({ ts, side, color, label });
  }
  return out;
}

function normalizeMarkers(list) {
  // yinelenen ts'leri koruyabiliriz; istersen uniq yap
  return Array.isArray(list) ? list : [];
}

function drawTriangle(ctx, x, y, side, color) {
  const size = 7; // px
  ctx.save();
  ctx.beginPath();
  if (side === "up") {
    // hafif yukarı taşı: candle high'ın üstünde dursun
    y = y - 6;
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.lineTo(x + size, y + size);
  } else {
    y = y + 6;
    ctx.moveTo(x, y + size);
    ctx.lineTo(x - size, y - size);
    ctx.lineTo(x + size, y - size);
  }
  ctx.closePath();
  ctx.fillStyle = color || "#ff4d4f";
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.restore();
}

function drawLabel(ctx, x, y, text) {
  ctx.save();
  ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillText(text, x, y + 8);
  ctx.restore();
}

/* opens: artan sıralı openTime[]; ts ms cinsinden
   Önce exact match, değilse ts ∈ [open, open+interval) ise o candle,
   o da değilse en yakın open'a yarım interval'den küçükse snap. */
function findCandleIndex(opens, ts, intervalMs) {
  let lo = 0, hi = opens.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const v = opens[mid];
    if (v === ts) return mid;
    if (v < ts) lo = mid + 1; else hi = mid - 1;
  }
  // hi: ts'den küçük en büyük open'ın index'i
  if (hi >= 0) {
    const open = opens[hi];
    if (ts < open + intervalMs) return hi; // ts bu candle içindeyse
  }
  // snap to nearest open (yarım interval tolerans)
  const prevIdx = hi;
  const nextIdx = lo < opens.length ? lo : -1;
  const prevDist = prevIdx >= 0 ? Math.abs(ts - opens[prevIdx]) : Infinity;
  const nextDist = nextIdx >= 0 ? Math.abs(opens[nextIdx] - ts) : Infinity;
  const nearestIdx = prevDist <= nextDist ? prevIdx : nextIdx;
  const nearestDist = Math.min(prevDist, nextDist);
  if (nearestIdx >= 0 && nearestDist <= intervalMs / 2) return nearestIdx;
  return -1;
}
