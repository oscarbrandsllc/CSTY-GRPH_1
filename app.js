/**
 * Liquid Glass Fantasy Consistency Chart
 * Deterministic, static, no animations.
 * - Preserves HUD / progress circles.
 * - Builds a new chart DOM next to #infographicCanvas inside .chart-shell.
 * - Uses SVG for the curve and fixed glassy labels, no randomness.
 */

/* -------------------------
 * DATA / CONSTANTS
 * ---------------------- */

const MAX_PTS = 40;
const UNDER_MAX = 15.9;
const SOLID_MAX = 21.9;
const ELITE_MIN = 22;

const DATA_POINTS = [
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

const LG_Y_TICKS = [40, 22, 16, 0];

/* -------------------------
 * HUD / PROGRESS CIRCLES
 * (unchanged, deterministic)
 * ---------------------- */

const PROGRESS_CONFIG = {
  ceilingRankMax: 20,
  consistencyPercent: 66.7,
  ceilingRank: 4
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
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

/* -------------------------
 * ZONES / MAPPING
 * ---------------------- */

function getZoneForPoints(pts) {
  if (pts >= ELITE_MIN) {
    return { name: "Elite", className: "lg-zone--great" };
  }
  if (pts > UNDER_MAX && pts <= SOLID_MAX) {
    return { name: "Solid", className: "lg-zone--good" };
  }
  return { name: "Under", className: "lg-zone--bad" };
}

function mapYPercent(pts) {
  const clamped = Math.max(0, Math.min(MAX_PTS, pts));
  const t = 1 - clamped / MAX_PTS; // 0 at bottom, 1 at top -> invert
  return t * 100;
}

/* -------------------------
 * DOM STRUCTURE
 * ---------------------- */

function buildChartStructure() {
  const canvas = document.getElementById("infographicCanvas");
  if (!canvas || !canvas.parentNode) return null;

  // Reuse existing root if present
  let root = document.getElementById("lg-chart-root");
  if (root) {
    root.innerHTML = "";
  } else {
    root = document.createElement("div");
    root.id = "lg-chart-root";
    root.className = "lg-chart-root";

    // Insert immediately AFTER the canvas in the same parent
    const parent = canvas.parentNode;
    const next = canvas.nextSibling;
    if (next) {
      parent.insertBefore(root, next);
    } else {
      parent.appendChild(root);
    }
  }

  // Main box that holds everything
  const box = document.createElement("div");
  box.className = "lg-chart-box";
  root.appendChild(box);

  // Y axis
  const yAxis = document.createElement("div");
  yAxis.className = "lg-y-axis";
  box.appendChild(yAxis);

  // Chart body wrapper
  const body = document.createElement("div");
  body.className = "lg-chart-body";
  box.appendChild(body);

  // Zones
  const zones = document.createElement("div");
  zones.className = "lg-zones";
  body.appendChild(zones);

  // Grid overlay
  const grid = document.createElement("div");
  grid.className = "lg-grid";
  body.appendChild(grid);

  // Points + curve layer
  const pointsLayer = document.createElement("div");
  pointsLayer.className = "lg-points-layer";
  body.appendChild(pointsLayer);

  // X axis
  const xAxis = document.createElement("div");
  xAxis.className = "lg-x-axis";
  box.appendChild(xAxis);

  return {
    root,
    box,
    yAxis,
    zones,
    grid,
    pointsLayer,
    xAxis
  };
}

/* -------------------------
 * BUILD ZONES / AXES
 * ---------------------- */

function buildZones(container) {
  container.innerHTML = "";

  const underHeightPct = ((UNDER_MAX - 0) / MAX_PTS) * 100;
  const solidHeightPct = ((SOLID_MAX - UNDER_MAX) / MAX_PTS) * 100;
  const eliteHeightPct = ((MAX_PTS - ELITE_MIN) / MAX_PTS) * 100;

  const elite = document.createElement("div");
  elite.className = "lg-zone lg-zone--great";
  elite.style.top = "0%";
  elite.style.height = `${eliteHeightPct}%`;
  container.appendChild(elite);

  const solid = document.createElement("div");
  solid.className = "lg-zone lg-zone--good";
  solid.style.top = `${eliteHeightPct}%`;
  solid.style.height = `${solidHeightPct}%`;
  container.appendChild(solid);

  const under = document.createElement("div");
  under.className = "lg-zone lg-zone--bad";
  under.style.top = `${eliteHeightPct + solidHeightPct}%`;
  under.style.height = `${underHeightPct}%`;
  container.appendChild(under);
}

function buildYAxis(container) {
  container.innerHTML = "";
  LG_Y_TICKS.forEach((val) => {
    const tick = document.createElement("div");
    tick.className = "lg-y-tick";

    const label = document.createElement("div");
    label.className = "lg-y-label";
    label.textContent = `${val} fpts`;

    tick.appendChild(label);
    container.appendChild(tick);
  });
}

function buildXAxis(container) {
  container.innerHTML = "";
  DATA_POINTS.forEach((pt) => {
    const lab = document.createElement("div");
    lab.className = "lg-x-label";
    lab.textContent = `WK ${pt.week}`;
    container.appendChild(lab);
  });
}

/* -------------------------
 * CURVE / POINTS
 * ---------------------- */

function buildPointsAndCurve(container) {
  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";

  // SVG back layer for curve
  const svg = document.createElementNS(svgNS, "svg");
  svg.classList.add("lg-curve-layer");
  svg.setAttribute("aria-hidden", "true");
  container.appendChild(svg);

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 260;

  const n = DATA_POINTS.length;
  const pts = DATA_POINTS.map((p, i) => {
    const xPct = ((i + 0.5) / n) * 100;
    const yPct = mapYPercent(p.pts);
    return {
      ...p,
      xPct,
      yPct,
      x: (xPct / 100) * width,
      y: (yPct / 100) * height
    };
  });

  // Smooth path using Catmull-Rom -> Bezier-style interpolation
  const pathD = buildSmoothSvgPath(pts);

  // Glow path
  const glowPath = document.createElementNS(svgNS, "path");
  glowPath.setAttribute("d", pathD);
  glowPath.classList.add("lg-curve", "lg-curve--glow");
  svg.appendChild(glowPath);

  // Core path
  const corePath = document.createElementNS(svgNS, "path");
  corePath.setAttribute("d", pathD);
  corePath.classList.add("lg-curve", "lg-curve--core");
  svg.appendChild(corePath);

  // Points + labels
  pts.forEach((p) => {
    const zone = getZoneForPoints(p.pts);

    const point = document.createElement("div");
    point.className = `lg-point ${zone.className}`;
    point.style.left = `calc(${p.xPct}% - 6px)`;
    point.style.top = `calc(${p.yPct}% - 6px)`;
    container.appendChild(point);

    const label = document.createElement("div");
    label.className = "lg-point-label";
    label.innerHTML = `
      <div class="lg-point-label-week">WK ${p.week}</div>
      <div class="lg-point-label-pts">${p.pts.toFixed(1)} fpts</div>
      <div class="lg-point-label-zone">${zone.name}</div>
    `;
    label.style.left = `calc(${p.xPct}% - 40px)`;
    label.style.top = `calc(${p.yPct}% - 54px)`;
    container.appendChild(label);
  });
}

function buildSmoothSvgPath(points) {
  if (!points.length) return "";

  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x},${p.y}`;
  }

  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    return `M ${p0.x},${p0.y} L ${p1.x},${p1.y}`;
  }

  const tension = 0.24;
  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

/* -------------------------
 * MOUNT / RESIZE
 * ---------------------- */

let lastStructure = null;

function mountChart() {
  lastStructure = buildChartStructure();
  if (!lastStructure) return;

  const { zones, yAxis, pointsLayer, xAxis } = lastStructure;

  buildZones(zones);
  buildYAxis(yAxis);
  buildXAxis(xAxis);
  buildPointsAndCurve(pointsLayer);
}

function remountDynamicLayers() {
  if (!lastStructure) {
    mountChart();
    return;
  }
  const { zones, yAxis, pointsLayer, xAxis } = lastStructure;
  if (!zones || !yAxis || !pointsLayer || !xAxis) {
    mountChart();
    return;
  }

  buildZones(zones);
  buildYAxis(yAxis);
  buildXAxis(xAxis);
  buildPointsAndCurve(pointsLayer);
}

/* -------------------------
 * INIT
 * ---------------------- */

function init() {
  hydrateProgressCircles();
  mountChart();

  window.addEventListener("resize", () => {
    remountDynamicLayers();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
