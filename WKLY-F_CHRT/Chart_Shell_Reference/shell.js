// dataset from user
const data = [
  { week: 1, pts: 27.9 },
  { week: 2, pts: 18.8 },
  { week: 3, pts: 15.6 },
  { week: 4, pts: 14.5 },
  { week: 5, pts: 15.6 },
  { week: 6, pts: 18.8 },
  { week: 7, pts: 29.9 },
  { week: 8, pts: 26.3 },
  { week: 9, pts: 28.7 },
];

const maxPts = 40;
const chartBox = document.querySelector(".chart-box");
const pointsLayer = document.getElementById("points-layer");
const xAxis = document.getElementById("x-axis");
const yAxis = document.getElementById("y-axis");
let curveSvg = null;

function makeZones() {
  const badTo = (15.9 / maxPts) * 100;
  const goodTo = (21.9 / maxPts) * 100;
  const zones = [
    { c: "bad", h: badTo, label: "under" },
    { c: "good", h: goodTo, label: "solid" },
    { c: "great", h: 100, label: "elite" },
  ];
  zones.forEach((zone, i) => {
    const z = document.createElement("div");
    z.className = `zone ${zone.c}`;
    z.style.top = `calc(${100 - zone.h}% - 1px)`;
    z.style.height = `calc(${zone.h - (zones[i - 1]?.h || 0)}%)`;
    const label = document.createElement("span");
    label.className = "zone-label";
    label.textContent = zone.label;
    z.appendChild(label);
    chartBox.appendChild(z);
  });
}

function yFromPoints(pts) {
  const clamped = Math.max(0, Math.min(pts, maxPts));
  return (1 - clamped / maxPts) * 100;
}

function bucketFor(pts) {
  if (pts >= 22) return { name: "Elite", color: "#cf78ff", glow: "var(--glow-elite)" };
  if (pts >= 16) return { name: "Solid", color: "#00bfff", glow: "var(--glow-solid)" };
  return { name: "Under", color: "#ff5f6d", glow: "var(--glow-bad)" };
}

function renderXAxis() {
  data.forEach((d) => {
    const span = document.createElement("span");
    span.textContent = "WK " + d.week;
    xAxis.appendChild(span);
  });
}

function renderYAxis() {
  const ticks = [40, 22, 16, 0];
  ticks.forEach((t) => {
    const y = document.createElement("div");
    y.className = "y-tick";
    y.textContent = t + " fpts";
    yAxis.appendChild(y);
  });
}

function renderPoints() {
  const n = data.length;
  const curvePoints = [];

  data.forEach((d, i) => {
    // center each point in its x-axis cell
    const pctX = ((i + 0.5) / n) * 100;
    const pctY = yFromPoints(d.pts);
    curvePoints.push({ x: pctX, y: pctY });

    const bucket = bucketFor(d.pts);
    const point = document.createElement("div");
    point.className = "point";
    point.style.left = `calc(${pctX}% - 6px)`;
    point.style.top = `calc(${pctY}% - 6px)`;
    point.style.background = bucket.color;
    point.style.boxShadow = bucket.glow;

    const label = document.createElement("div");
    label.className = "point-label";
    label.innerHTML =
      `<span class="wk">WK ${d.week}</span>` +
      `<span class="val">${d.pts.toFixed(1)} fpts</span>` +
      `<span class="bucket">${bucket.name}</span>`;
    point.appendChild(label);
    pointsLayer.appendChild(point);
  });

  drawCurve(curvePoints);
}

function drawCurve(points) {
  const layer = pointsLayer;
  const box = layer.getBoundingClientRect();
  const width = box.width;
  const height = box.height;

  if (!curveSvg) {
    curveSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    curveSvg.setAttribute("class", "curve-layer");
    curveSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    curveSvg.style.position = "absolute";
    curveSvg.style.inset = "0";
    curveSvg.style.overflow = "visible";
    layer.prepend(curveSvg);
  }

  curveSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  curveSvg.setAttribute("width", width);
  curveSvg.setAttribute("height", height);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const toXY = (p) => ({
    x: (p.x / 100) * width,
    y: (p.y / 100) * height,
  });
  const pts = points.map(toXY);
  if (!pts.length) return;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = (p1.x - p0.x) * 0.35;
    const c1x = p0.x + dx;
    const c1y = p0.y;
    const c2x = p1.x - dx;
    const c2y = p1.y;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }

  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(207, 120, 255, 0.7)");
  path.setAttribute("stroke-width", "2.6");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  const pathGlow = path.cloneNode(true);
  pathGlow.setAttribute("stroke", "rgba(207, 120, 255, 0.15)");
  pathGlow.setAttribute("stroke-width", "8");

  curveSvg.innerHTML = "";
  curveSvg.appendChild(pathGlow);
  curveSvg.appendChild(path);
}

// render chart
makeZones();
renderXAxis();
renderYAxis();
renderPoints();

// tests
console.assert(bucketFor(27.9).name === "Elite", "WK1 should be Elite");
console.assert(bucketFor(18.8).name === "Solid", "WK2 should be Solid");
console.assert(bucketFor(14.5).name === "Under", "WK4 should be Under");
console.assert(Math.round(yFromPoints(40)) === 0, "40 fpts should map to top (0%)");
console.assert(Math.round(yFromPoints(0)) === 100, "0 fpts should map to bottom (100%)");
console.assert(document.querySelector(".curve-layer") !== null, "curve svg should be created");
