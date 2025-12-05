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
  minVal: 0,
  maxVal: 40,
  paddingRatio: {
    top: 0.16,   // headroom for title / top ticks
    right: 0.10,
    bottom: 0.24, // space for x-axis labels + axis label
    left: 0.14    // space for y-axis labels + axis label
  },
  hitRadius: 18,
  fontFamily: `"Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  yTicks: [0, 8, 16, 22, 30, 40],
  ceilingRankMax: 20 // for inverse scale mapping (1 best -> 1.0, 20 -> 0)
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

let layout = null; // { rect, points, microBubbles }
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
  const width = rect.width;
  const height = rect.height;

  const pad = {
    top: height * CONFIG.paddingRatio.top,
    right: width * CONFIG.paddingRatio.right,
    bottom: height * CONFIG.paddingRatio.bottom,
    left: width * CONFIG.paddingRatio.left
  };

  const chartRect = {
    x: pad.left,
    y: pad.top,
    w: width - pad.left - pad.right,
    h: height - pad.top - pad.bottom
  };

  const spacing = chartRect.w / (DATA.weeks.length - 1);

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

  // Micro-bubbles: static positions relative to chart rect
  const microBubbles = generateMicroBubbles(chartRect, 26);

  return { rect: chartRect, points, microBubbles };
}

function generateMicroBubbles(rect, count) {
  const bubbles = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const x = rect.x + t * rect.w + (Math.random() - 0.5) * rect.w * 0.04;
    const y =
      rect.y +
      rect.h * (0.22 + 0.6 * Math.random()) +
      (Math.random() - 0.5) * rect.h * 0.02;
    const r = 2 + Math.random() * 4;
    bubbles.push({ x, y, r, alpha: 0.10 + Math.random() * 0.14 });
  }
  return bubbles;
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

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "rgba(3,5,15,1)");
  g.addColorStop(0.35, "rgba(4,7,18,1)");
  g.addColorStop(1, "rgba(1,1,5,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Soft volumetric blobs behind the chart panel
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const blob1 = ctx.createRadialGradient(
    width * 0.18,
    height * 0.1,
    0,
    width * 0.18,
    height * 0.1,
    width * 0.32
  );
  blob1.addColorStop(0, "rgba(124,245,255,0.25)");
  blob1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = blob1;
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.1, width * 0.35, 0, Math.PI * 2);
  ctx.fill();

  const blob2 = ctx.createRadialGradient(
    width * 0.88,
    height * 0.9,
    0,
    width * 0.88,
    height * 0.9,
    width * 0.36
  );
  blob2.addColorStop(0, "rgba(255,137,207,0.22)");
  blob2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = blob2;
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.9, width * 0.36, 0, Math.PI * 2);
  ctx.fill();

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

  // White inner glow at boundaries
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.moveTo(rect.x, yGoodTop);
  ctx.lineTo(rect.x + rect.w, yGoodTop);
  ctx.moveTo(rect.x, yBadTop);
  ctx.lineTo(rect.x + rect.w, yBadTop);
  ctx.stroke();

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

function traceSpline(points, close, baseY) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const n = points[i + 1];
    const mx = (p.x + n.x) / 2;
    const my = (p.y + n.y) / 2;
    ctx.quadraticCurveTo(p.x, p.y, mx, my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  if (close) {
    ctx.lineTo(last.x, baseY);
    ctx.lineTo(points[0].x, baseY);
    ctx.closePath();
  }
}

function drawSplineArea(points, rect) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const grad = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x,
    rect.y + rect.h
  );
  grad.addColorStop(0, "rgba(124,245,255,0.16)");
  grad.addColorStop(0.4, "rgba(159,139,255,0.09)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  traceSpline(points, true, rect.y + rect.h);
  ctx.fill();
  ctx.restore();
}

function drawSplineLine(points) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(124,245,255,0.35)";
  ctx.shadowBlur = 20;

  const first = points[0];
  const last = points[points.length - 1];
  const grad = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
  grad.addColorStop(0, COLORS.spline.from);
  grad.addColorStop(0.5, COLORS.spline.mid);
  grad.addColorStop(1, COLORS.spline.to);

  ctx.strokeStyle = grad;
  traceSpline(points, false, 0);
  ctx.stroke();

  ctx.restore();
}

function drawMicroBubbles(bubbles) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  bubbles.forEach((b) => {
    const g = ctx.createRadialGradient(
      b.x,
      b.y,
      0,
      b.x,
      b.y,
      b.r * 2.2
    );
    g.addColorStop(0, `rgba(180, 220, 255, ${b.alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawCaustics(points, rect) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // Gentle elliptical highlight hugging the main region
  const cx = rect.x + rect.w * 0.5;
  const cy = rect.y + rect.h * 0.82;
  const caustic = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    rect.w * 0.35
  );
  caustic.addColorStop(0, "rgba(255,255,255,0.034)");
  caustic.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = caustic;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    rect.w * 0.38,
    rect.h * 0.16,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Subtle glow beneath highest point
  const maxPoint = points.reduce((m, p) => (p.value > m.value ? p : m), points[0]);
  const rx = maxPoint.x;
  const ry = rect.y + rect.h * 0.96;
  const crestGlow = ctx.createRadialGradient(rx, ry, 0, rx, ry, rect.w * 0.18);
  crestGlow.addColorStop(0, "rgba(255,137,207,0.06)");
  crestGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = crestGlow;
  ctx.beginPath();
  ctx.ellipse(
    rx,
    ry,
    rect.w * 0.22,
    rect.h * 0.12,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

function drawPoints(points, rect) {
  ctx.save();

  // Identify max and min for special styling
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

    let coreRadius = 5.2;
    let glowRadius = 11;
    let strokeWidth = 1.2;
    let strokeColor = "rgba(255,255,255,0.9)";

    if (isMax) {
      coreRadius = 6.4;
      glowRadius = 14;
      strokeWidth = 1.6;
      strokeColor = "rgba(255,196,160,0.98)";
    } else if (isMin) {
      coreRadius = 5.4;
      glowRadius = 12;
      strokeWidth = 1.3;
      strokeColor = "rgba(162, 188, 255, 0.98)";
    }

    // Soft halo
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius * 2.2);
    halo.addColorStop(0, isMax ? "rgba(255,196,160,0.45)" : isMin ? "rgba(136,176,255,0.4)" : "rgba(124,245,255,0.38)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Core node
    const inner = ctx.createRadialGradient(p.x, p.y - 1.5, 0, p.x, p.y + 1.5, coreRadius * 2);
    inner.addColorStop(0, "rgba(4,6,14,1)");
    inner.addColorStop(0.55, baseColor);
    inner.addColorStop(1, "rgba(255,255,255,0.96)");
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(p.x, p.y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.arc(p.x, p.y, coreRadius + 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical hairline down to x-axis for positional clarity
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "rgba(124,245,255,0.16)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + coreRadius + 1.5);
    ctx.lineTo(p.x, rect.y + rect.h);
    ctx.stroke();
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
  drawSplineArea(layout.points, layout.rect);
  drawSplineLine(layout.points);
  drawMicroBubbles(layout.microBubbles);
  drawCaustics(layout.points, layout.rect);
  drawPoints(layout.points, layout.rect);
}

/* CANVAS SIZE / RESIZE */

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width);
  const height = Math.max(260, rect.height);

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

  const tooltipWidth = tooltipEl.offsetWidth || 150;
  let left = tx;
  if (tx - tooltipWidth / 2 < canvasRect.left + 12) {
    left = canvasRect.left + 12 + tooltipWidth / 2;
  } else if (tx + tooltipWidth / 2 > canvasRect.right - 12) {
    left = canvasRect.right - 12 - tooltipWidth / 2;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${ty - 18}px`;
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
