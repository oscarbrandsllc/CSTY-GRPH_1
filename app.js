/**
 * Weekly fantasy points chart + HUD progress circles
 * - HUD circle logic preserved from the original build
 * - Chart markup + rendering mirrors the reference single-chart app
 */

const WEEKLY_DATA = [
  { week: 1, pts: 27.9 },
  { week: 2, pts: 18.8 },
  { week: 3, pts: 15.6 },
  { week: 4, pts: 14.5 },
  { week: 5, pts: 15.6 },
  { week: 6, pts: 18.8 },
  { week: 7, pts: 29.9 },
  { week: 8, pts: 26.3 },
  { week: 9, pts: 28.7 }
];

const MAX_POINTS = 40;
const chartBox = document.getElementById("weekly-chart-box");
const pointsLayer = document.getElementById("weekly-chart-points");
const xAxisEl = document.getElementById("weekly-chart-x-axis");
const yAxisEl = document.getElementById("weekly-chart-y-axis");
let curveSvg = null;

function createZones() {
  if (!chartBox) return;
  const stops = [
    { className: "weekly-zone--bad", label: "Under", to: 15.9 },
    { className: "weekly-zone--good", label: "Solid", to: 21.9 },
    { className: "weekly-zone--great", label: "Elite", to: MAX_POINTS }
  ];

  let prev = 0;
  stops.forEach((zone) => {
    const pct = (zone.to / MAX_POINTS) * 100;
    const zoneEl = document.createElement("div");
    zoneEl.className = `weekly-zone ${zone.className}`;
    zoneEl.style.top = `calc(${100 - pct}% - 1px)`;
    zoneEl.style.height = `calc(${pct - prev}%)`;

    const label = document.createElement("span");
    label.className = "weekly-zone-label";
    label.textContent = zone.label;
    zoneEl.appendChild(label);

    chartBox.appendChild(zoneEl);
    prev = pct;
  });
}

function yFromPoints(pts) {
  const clamped = Math.max(0, Math.min(pts, MAX_POINTS));
  return (1 - clamped / MAX_POINTS) * 100;
}

function bucketFor(pts) {
  if (pts >= 22) {
    return { name: "Elite", color: "#cf78ff", glow: "0 0 30px rgba(207, 120, 255, 0.95)" };
  }
  if (pts >= 16) {
    return { name: "Solid", color: "#00bfff", glow: "0 0 26px rgba(0, 191, 255, 0.9)" };
  }
  return { name: "Under", color: "#ff5f6d", glow: "0 0 18px rgba(255, 95, 109, 0.8)" };
}

function renderXAxis() {
  if (!xAxisEl) return;
  xAxisEl.innerHTML = "";
  WEEKLY_DATA.forEach((entry) => {
    const span = document.createElement("span");
    span.textContent = `WK ${entry.week}`;
    xAxisEl.appendChild(span);
  });
}

function renderYAxis() {
  if (!yAxisEl) return;
  yAxisEl.innerHTML = "";
  [40, 22, 16, 0].forEach((tick) => {
    const tickEl = document.createElement("div");
    tickEl.className = "weekly-chart-y-tick";
    tickEl.textContent = `${tick} fpts`;
    yAxisEl.appendChild(tickEl);
  });
}

function renderPoints() {
  if (!pointsLayer) return;
  pointsLayer.innerHTML = "";

  const n = WEEKLY_DATA.length;
  const curvePoints = [];

  WEEKLY_DATA.forEach((entry, index) => {
    const pctX = ((index + 0.5) / n) * 100;
    const pctY = yFromPoints(entry.pts);
    curvePoints.push({ x: pctX, y: pctY });

    const bucket = bucketFor(entry.pts);
    const pointEl = document.createElement("div");
    pointEl.className = "weekly-point";
    pointEl.style.left = `calc(${pctX}% - 6px)`;
    pointEl.style.top = `calc(${pctY}% - 6px)`;
    pointEl.style.background = bucket.color;
    pointEl.style.boxShadow = bucket.glow;

    const label = document.createElement("div");
    label.className = "weekly-point-label";
    label.innerHTML = `
      <span class="weekly-point-label__week">WK ${entry.week}</span>
      <span class="weekly-point-label__value">${entry.pts.toFixed(1)} fpts</span>
      <span class="weekly-point-label__bucket">${bucket.name}</span>
    `;
    pointEl.appendChild(label);
    pointsLayer.appendChild(pointEl);
  });

  drawCurve(curvePoints);
}

function drawCurve(points) {
  if (!pointsLayer || !points.length) return;

  const box = pointsLayer.getBoundingClientRect();
  const width = box.width;
  const height = box.height;

  if (!curveSvg) {
    curveSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    curveSvg.setAttribute("class", "weekly-curve-layer");
    curveSvg.style.position = "absolute";
    curveSvg.style.inset = "0";
    pointsLayer.prepend(curveSvg);
  }

  curveSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  curveSvg.setAttribute("width", width);
  curveSvg.setAttribute("height", height);

  const toXY = (point) => ({
    x: (point.x / 100) * width,
    y: (point.y / 100) * height
  });

  const absPoints = points.map(toXY);
  let d = `M ${absPoints[0].x} ${absPoints[0].y}`;

  for (let i = 0; i < absPoints.length - 1; i += 1) {
    const p0 = absPoints[i];
    const p1 = absPoints[i + 1];
    const dx = (p1.x - p0.x) * 0.35;
    const c1x = p0.x + dx;
    const c1y = p0.y;
    const c2x = p1.x - dx;
    const c2y = p1.y;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }

  const pathCore = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathCore.setAttribute("d", d);
  pathCore.setAttribute("fill", "none");
  pathCore.setAttribute("stroke", "rgba(207, 120, 255, 0.7)");
  pathCore.setAttribute("stroke-width", "2.6");
  pathCore.setAttribute("stroke-linecap", "round");
  pathCore.setAttribute("stroke-linejoin", "round");

  const pathGlow = pathCore.cloneNode(true);
  pathGlow.setAttribute("stroke", "rgba(207, 120, 255, 0.15)");
  pathGlow.setAttribute("stroke-width", "8");

  curveSvg.innerHTML = "";
  curveSvg.appendChild(pathGlow);
  curveSvg.appendChild(pathCore);
}

function renderWeeklyChart() {
  if (!chartBox || !pointsLayer || !xAxisEl || !yAxisEl) return;

  chartBox.querySelectorAll(".weekly-zone").forEach((zone) => zone.remove());
  curveSvg = null;

  createZones();
  renderYAxis();
  renderXAxis();
  renderPoints();
}

/* HUD PROGRESS CIRCLES */

const PROGRESS_CONFIG = {
  ceilingRankMax: 20,
  consistencyPercent: 66.7,
  ceilingRank: 4
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hydrateProgressCircles() {
  const consistencyCircle = document.querySelector(
    ".progress-circle--consistency .progress-ring-fill"
  );
  if (consistencyCircle) {
    consistencyCircle.style.setProperty(
      "--progress",
      (PROGRESS_CONFIG.consistencyPercent / 100).toFixed(3)
    );
  }

  const ceilingCircle = document.querySelector(
    ".progress-circle--ceiling .progress-ring-fill--ceiling"
  );
  if (ceilingCircle) {
    const rank = PROGRESS_CONFIG.ceilingRank;
    const normalized = clamp(
      (PROGRESS_CONFIG.ceilingRankMax - rank) /
        (PROGRESS_CONFIG.ceilingRankMax - 1),
      0,
      1
    );
    ceilingCircle.style.setProperty("--progress", normalized.toFixed(3));
  }
}

function init() {
  hydrateProgressCircles();
  renderWeeklyChart();
  window.addEventListener("resize", renderWeeklyChart);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
