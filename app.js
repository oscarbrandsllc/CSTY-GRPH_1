/**
 * Liquid Glass Weekly Fantasy Points Chart
 * Single static render (no animation loop) + interactive hover tooltips.
 * Data and zones:
 * - Data: [27.9, 18.8, 15.6, 14.5, 15.6, 18.8, 29.9, 26.3, 28.7] for weeks 1-9
 * - Zones (0-40):
 *   - Bad: 0-16 (cool)
 *   - Good: 16-22 (neutral)
 *   - Great: 22-40 (warm)
 */

const CONFIG = {
  // Data domain
  minVal: 0,
  maxVal: 40,

  // Fixed paddings in px (applied relative via clamped logic in computeLayout)
  padding: {
    top: 40,     // space for chart title + subtitle
    right: 32,   // prevent last point / labels clipping
    bottom: 46,  // x-axis ticks + labels + "Week"
    left: 54     // y-axis ticks + vertical label
  },

  // Hit radius in px for hover detection on logical canvas space
  hitRadius: 16,

  fontFamily: `"Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,

  // Y-axis tick values
  yTicks: [0, 8, 16, 22, 30, 40],

  // Tooltip sizing fallback used for clamping (matches CSS min-width)
  tooltipWidthFallback: 136,

  // Max rank for ceiling circle mapping (HUD-only)
  ceilingRankMax: 20
};

const DATA = {
  player: "Justin Herbert",
  weeks: [
    { weekIndex: 1, label: "WK1", value: 27.9 },
    { weekIndex: 2, label: "WK2", value: 18.8 },
    { weekIndex: 3, label: "WK3", value: 15.6 },
    { weekIndex: 4, label: "WK4", value: 14.5 },
    { weekIndex: 5, label: "WK5", value: 15.6 },
    { weekIndex: 6, label: "WK6", value: 18.8 },
    { weekIndex: 7, label: "WK7", value: 29.9 },
    { weekIndex: 8, label: "WK8", value: 26.3 },
    { weekIndex: 9, label: "WK9", value: 28.7 }
  ]
};

const ZONES = {
  BAD: { name: "Bad", key: "bad", min: 0, max: 16 },
  GOOD: { name: "Good", key: "good", min: 16, max: 22 },
  GREAT: { name: "Great", key: "great", min: 22, max: 40 }
};

const COLORS = {
  backgroundTop: "#020309",
  backgroundBottom: "#050714",
  gridLine: "rgba(255,255,255,0.06)",
  weekGrid: "rgba(120, 150, 255, 0.08)",
  axis: "rgba(146, 180, 255, 0.6)",
  textSoft: "rgba(144,150,192,0.9)",
  zoneBad: {
    fillFrom: "rgba(15, 26, 56, 0.78)",
    fillTo: "rgba(8, 12, 29, 0.38)",
    accent: "#ff6fb6"
  },
  zoneGood: {
    fillFrom: "rgba(45, 41, 82, 0.80)",
    fillTo: "rgba(22, 22, 44, 0.38)",
    accent: "#b9acff"
  },
  zoneGreat: {
    fillFrom: "rgba(19, 53, 70, 0.84)",
    fillTo: "rgba(20, 24, 37, 0.42)",
    accent: "#7cf5ff"
  },
  spline: {
    from: "#7cf5ff",
    mid: "#9f8bff",
    to: "#ff89cf"
  }
};

/* DOM REFS */

const canvas = document.getElementById("infographicCanvas");
const ctx = canvas.getContext("2d");

const tooltipEl = document.getElementById("chart-tooltip");
const tooltipWeekEl = document.getElementById("tooltip-week");
const tooltipValueEl = document.getElementById("tooltip-value");
const tooltipZoneEl = document.getElementById("tooltip-zone");


/* STATE */

let layout = null; // { rect, points }
let deviceRatio = window.devicePixelRatio || 1;

/* UTILITIES */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function mapValueToY(value, rect) {
  const { minVal, maxVal } = CONFIG;
  const pct = (value - minVal) / (maxVal - minVal);
  return rect.y + rect.h - pct * rect.h;
}

function zoneForValue(value) {
  if (value <= ZONES.BAD.max) return ZONES.BAD;
  if (value <= ZONES.GOOD.max) return ZONES.GOOD;
  return ZONES.GREAT;
}

function formatPoints(value) {
  return `${value.toFixed(1)} pts`;
}

/* PROGRESS CIRCLES HYDRATION (static metrics expressed via CSS vars if needed)
 * Metrics:
 * - Consistency Rate (CSTY%): 66.7% of 100
 * - Ceiling Pos Rank (CL_RK): 4 where 1 is best; use inverse mapping on 1-20 scale
 */

function hydrateProgressCircles() {
  const consistencyCircle = document.querySelector(
    ".progress-circle--consistency .progress-ring-fill"
  );
  if (consistencyCircle) {
    // 66.7% expressed directly via inline style in HTML; keep here for clarity / future hooks.
    consistencyCircle.style.setProperty("--progress", (66.7 / 100).toFixed(3));
  }

  const ceilingCircle = document.querySelector(
    ".progress-circle--ceiling .progress-ring-fill--ceiling"
  );
  if (ceilingCircle) {
    const rank = 4;
    const maxRank = CONFIG.ceilingRankMax;
    const normalized = clamp((maxRank - rank) / (maxRank - 1), 0, 1);
    // Inline style already set close; enforce canonical mapping so arc = closeness to #1.
    ceilingCircle.style.setProperty("--progress", normalized.toFixed(3));
  }
}

/* LAYOUT + POINTS */

function computeLayout() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || canvas.clientWidth || 320);
  const height = Math.max(260, rect.height || canvas.clientHeight || 260);

  const padCfg = CONFIG.padding;

  // Clamp paddings so they remain proportionate on smaller widths/heights
  const pad = {
    top: Math.max(padCfg.top, height * 0.08),
    right: Math.max(padCfg.right, width * 0.04),
    bottom: Math.max(padCfg.bottom, height * 0.14),
    left: Math.max(padCfg.left, width * 0.09)
  };

  const chartRect = {
    x: pad.left,
    y: pad.top,
    w: width - pad.left - pad.right,
    h: height - pad.top - pad.bottom
  };

  const n = DATA.weeks.length;
  const spacing = chartRect.w / (n - 1);

  const points = DATA.weeks.map((w, i) => {
    const x = chartRect.x + i * spacing;
    const y = mapValueToY(w.value, chartRect);
    return {
      ...w,
      x,
      y,
      zone: zoneForValue(w.value)
    };
  });

  return { rect: chartRect, points };
}


/* DRAW HELPERS */

function clearCanvas() {
  const width = canvas.width / deviceRatio;
  const height = canvas.height / deviceRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
}

function drawBackdropGradient() {
  const width = canvas.width / deviceRatio;
  const height = canvas.height / deviceRatio;

  // Deterministic dark gradient matching shell aesthetic
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#020309");
  g.addColorStop(0.35, "#040712");
  g.addColorStop(1, "#010108");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Subtle deterministic inner vignette
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    0,
    width * 0.5,
    height * 0.45,
    Math.max(width, height) * 0.78
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawZoneBands(rect) {
  ctx.save();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  const yBadTop = mapValueToY(ZONES.BAD.max, rect);
  const yGoodTop = mapValueToY(ZONES.GOOD.max, rect);

  // Great zone band (top)
  const gGreat = ctx.createLinearGradient(rect.x, rect.y, rect.x, yGoodTop);
  gGreat.addColorStop(0, COLORS.zoneGreat.fillFrom);
  gGreat.addColorStop(1, COLORS.zoneGreat.fillTo);
  ctx.fillStyle = gGreat;
  ctx.fillRect(rect.x, rect.y, rect.w, yGoodTop - rect.y);

  // Good zone band (middle)
  const gGood = ctx.createLinearGradient(rect.x, yGoodTop, rect.x, yBadTop);
  gGood.addColorStop(0, COLORS.zoneGood.fillFrom);
  gGood.addColorStop(1, COLORS.zoneGood.fillTo);
  ctx.fillStyle = gGood;
  ctx.fillRect(rect.x, yGoodTop, rect.w, yBadTop - yGoodTop);

  // Bad zone band (bottom)
  const gBad = ctx.createLinearGradient(
    rect.x,
    yBadTop,
    rect.x,
    rect.y + rect.h
  );
  gBad.addColorStop(0, COLORS.zoneBad.fillFrom);
  gBad.addColorStop(1, COLORS.zoneBad.fillTo);
  ctx.fillStyle = gBad;
  ctx.fillRect(rect.x, yBadTop, rect.w, rect.y + rect.h - yBadTop);

  // Zone boundaries are implicitly communicated via tick labels; no extra hard lines.

  ctx.restore();
}

function drawGrid(rect) {
  ctx.save();

  // Horizontal grid lines at major structure (aligned with yTicks)
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;
  CONFIG.yTicks.forEach((v) => {
    const y = mapValueToY(v, rect);
    ctx.beginPath();
    ctx.moveTo(rect.x, y);
    ctx.lineTo(rect.x + rect.w, y);
    ctx.stroke();
  });

  // Vertical columns for each week
  ctx.setLineDash([]);
  ctx.strokeStyle = COLORS.weekGrid;
  const step = rect.w / (DATA.weeks.length - 1);
  DATA.weeks.forEach((_, i) => {
    const x = rect.x + step * i;
    ctx.beginPath();
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.h);
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Explicit axes:
 *  - X-axis: W1–W9, labeled, with central label "Week"
 *  - Y-axis: ticks at [0, 8, 16, 22, 30, 40], label "Fantasy Points"
 */
function drawAxes(rect) {
  ctx.save();

  // Base axes
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1.2;

  // Y-axis
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y);
  ctx.lineTo(rect.x, rect.y + rect.h);
  ctx.stroke();

  // X-axis
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + rect.h);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
  ctx.stroke();

  // Y-axis ticks and labels
  ctx.fillStyle = COLORS.textSoft;
  ctx.font = `10px ${CONFIG.fontFamily}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  CONFIG.yTicks.forEach((v) => {
    const y = mapValueToY(v, rect);

    // Tick
    ctx.beginPath();
    ctx.moveTo(rect.x - 4, y);
    ctx.lineTo(rect.x, y);
    ctx.stroke();

    // Label
    ctx.fillText(String(v), rect.x - 8, y);
  });

  // Y-axis label "Fantasy Points"
  ctx.save();
  ctx.translate(rect.x - 26, rect.y + rect.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `9px ${CONFIG.fontFamily}`;
  ctx.fillStyle = "rgba(156, 177, 245, 0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Fantasy Points", 0, 0);
  ctx.restore();

  // X-axis week labels
  const step = rect.w / (DATA.weeks.length - 1);
  ctx.font = `9px ${CONFIG.fontFamily}`;
  ctx.fillStyle = "rgba(156, 177, 245, 0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  DATA.weeks.forEach((w, i) => {
    const x = rect.x + step * i;
    const y = rect.y + rect.h + 6;

    // Tick
    ctx.beginPath();
    ctx.moveTo(x, rect.y + rect.h);
    ctx.lineTo(x, rect.y + rect.h + 4);
    ctx.stroke();

    // Label
    ctx.fillText(`W${w.weekIndex}`, x, y + 2);
  });

  // X-axis label "Week"
  ctx.font = `9px ${CONFIG.fontFamily}`;
  ctx.fillStyle = "rgba(132, 163, 242, 0.96)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Week", rect.x + rect.w / 2, rect.y + rect.h + 20);

  // Chart title & subtitle inside chart area (top-left)
  ctx.font = `11px ${CONFIG.fontFamily}`;
  ctx.fillStyle = "rgba(214, 224, 255, 0.98)";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Weekly Fantasy Points (Weeks 1–9)", rect.x + 4, rect.y - 14);

  ctx.font = `9px ${CONFIG.fontFamily}`;
  ctx.fillStyle = "rgba(148, 176, 255, 0.94)";
  ctx.fillText("Liquid Glass Consistency Map", rect.x + 4, rect.y - 3);

  ctx.restore();
}

function traceLine(points) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    ctx.lineTo(p.x, p.y);
  }
}

function drawLine(points) {
  if (!points.length) return;

  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.shadowColor = "rgba(124,245,255,0.22)";
  ctx.shadowBlur = 14;

  const first = points[0];
  const last = points[points.length - 1];
  const grad = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
  grad.addColorStop(0, COLORS.spline.from);
  grad.addColorStop(0.5, COLORS.spline.mid);
  grad.addColorStop(1, COLORS.spline.to);

  ctx.strokeStyle = grad;

  traceLine(points);
  ctx.stroke();
  ctx.restore();
}




function drawPoints(points, rect) {
  ctx.save();

  // Identify max and min for subtle emphasis
  const maxPoint = points.reduce((m, p) => (p.value > m.value ? p : m), points[0]);
  const minPoint = points.reduce((m, p) => (p.value < m.value ? p : m), points[0]);

  points.forEach((p) => {
    const isMax = p === maxPoint;
    const isMin = p === minPoint;

    const zone = p.zone;
    let baseColor;
    if (zone === ZONES.BAD) baseColor = COLORS.zoneBad.accent;
    else if (zone === ZONES.GOOD) baseColor = COLORS.zoneGood.accent;
    else baseColor = COLORS.zoneGreat.accent;

    // Base visual: compact, disciplined nodes
    let coreRadius = 4.2;
    let strokeWidth = 1;
    let strokeColor = "rgba(255,255,255,0.9)";
    let glowOuterRadius = 7;
    let glowAlpha = 0.18;

    if (isMax) {
      coreRadius = 6;               // Hero point
      strokeWidth = 1.4;
      strokeColor = "rgba(255,196,160,0.98)";
      glowOuterRadius = 10;
      glowAlpha = 0.32;
    } else if (isMin) {
      coreRadius = 5;               // Slightly called out, cooler
      strokeWidth = 1.2;
      strokeColor = "rgba(162,188,255,0.98)";
      glowOuterRadius = 8;
      glowAlpha = 0.24;
    }

    // Very subtle outer glow (no large neon halos)
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(
      p.x,
      p.y,
      0,
      p.x,
      p.y,
      glowOuterRadius
    );
    glow.addColorStop(0, `rgba(124,245,255,${isMax ? glowAlpha : glowAlpha * 0.9})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowOuterRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Core node: zone-tinted solid with soft inner highlight
    const inner = ctx.createRadialGradient(
      p.x,
      p.y - 1,
      0,
      p.x,
      p.y + 1,
      coreRadius * 1.4
    );
    inner.addColorStop(0, "rgba(6,9,18,1)");
    inner.addColorStop(0.55, baseColor);
    inner.addColorStop(1, "rgba(240,244,255,0.96)");
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(p.x, p.y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // Thin rim for precision
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.arc(p.x, p.y, coreRadius + 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical guide to x-axis (understated)
    ctx.save();
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = "rgba(124,245,255,0.06)";
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + coreRadius + 1);
    ctx.lineTo(p.x, rect.y + rect.h);
    ctx.stroke();
    ctx.restore();

    // Value label (always above point; padding guarantees no collision)
    ctx.save();
    ctx.font = `9px ${CONFIG.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(230, 238, 255, 0.96)";
    const labelOffset = 8;
    ctx.fillText(p.value.toFixed(1), p.x, p.y - labelOffset);
    ctx.restore();
  });

  ctx.restore();
}

/* RENDER */

function render() {
  if (!layout) return;
  clearCanvas();
  drawBackdropGradient();
  drawZoneBands(layout.rect);
  drawGrid(layout.rect);
  drawAxes(layout.rect);
  drawLine(layout.points);
  drawPoints(layout.points, layout.rect);
}

/* CANVAS SIZE / RESIZE */

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || canvas.clientWidth || 320);
  const height = Math.max(260, rect.height || canvas.clientHeight || 260);

  deviceRatio = window.devicePixelRatio || 1;
  canvas.width = width * deviceRatio;
  canvas.height = height * deviceRatio;
  ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

  layout = computeLayout();
  render();
}

/* TOOLTIP + HOVER */

function updateTooltip(point) {
  if (!point) {
    tooltipEl.hidden = true;
    return;
  }

  const zone = point.zone;
  let zoneLabel;
  let zoneColor;
  if (zone === ZONES.BAD) {
    zoneLabel = "Bad Zone • 0–16";
    zoneColor = COLORS.zoneBad.accent;
  } else if (zone === ZONES.GOOD) {
    zoneLabel = "Good Zone • 16–22";
    zoneColor = COLORS.zoneGood.accent;
  } else {
    zoneLabel = "Great Zone • 22–40";
    zoneColor = COLORS.zoneGreat.accent;
  }

  tooltipWeekEl.textContent = `Week ${point.weekIndex}`;
  tooltipValueEl.textContent = formatPoints(point.value);
  tooltipZoneEl.textContent = zoneLabel;
  tooltipEl.style.borderColor = zoneColor;

  const canvasRect = canvas.getBoundingClientRect();
  const tx = canvasRect.left + point.x;
  const ty = canvasRect.top + point.y;

  const tooltipWidth =
    tooltipEl.offsetWidth || CONFIG.tooltipWidthFallback;
  let left = tx;

  // Center tooltip above point, clamped to canvas horizontally
  const half = tooltipWidth / 2;
  if (left - half < canvasRect.left + 8) {
    left = canvasRect.left + 8 + half;
  } else if (left + half > canvasRect.right - 8) {
    left = canvasRect.right - 8 - half;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${ty - 20}px`;
  tooltipEl.hidden = false;
}

function findNearestPoint(mouseX, mouseY) {
  if (!layout) return null;
  let nearest = null;
  let nearestDist = Infinity;
  const radiusSq = CONFIG.hitRadius * CONFIG.hitRadius;

  layout.points.forEach((p) => {
    const dx = mouseX - p.x;
    const dy = mouseY - p.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= radiusSq && distSq < nearestDist) {
      nearestDist = distSq;
      nearest = p;
    }
  });

  return nearest;
}

function handleMouseMove(evt) {
  if (!layout) return;
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left);
  const y = (evt.clientY - rect.top);

  const point = findNearestPoint(x, y);
  updateTooltip(point);
}

function handleMouseLeave() {
  updateTooltip(null);
}

/* INIT */

function init() {
  hydrateProgressCircles();
  resizeCanvas();

  window.addEventListener("resize", resizeCanvas);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseleave", handleMouseLeave);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
