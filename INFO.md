# Chart Rendering Analysis:

## index.html - HTML Structure

•	Info: Main Chart Container
    •	Line Number: 47
	•	Element/Rule: <div class="weekly-chart-box" id="weekly-chart-box">
	•	What It Does: Main container for the entire chart, holding axes, grid, points layer, and zones.
	•	Styling/Logic Details: Positioned relatively; width 100%; height clamped 320px–420px; border-radius 20px; overflow hidden; radial gradient background (dark blue with cyan/pink accents).

•	Info: Y-Axis Container
    •	Line Number: 48
	•	Element/Rule: <div class="weekly-chart-y-axis" id="weekly-chart-y-axis"></div>
	•	What It Does: Container for y-axis ticks (fantasy points labels).
	•	Styling/Logic Details: Positioned absolutely (top 0, bottom 1.35rem, left 0.35rem); width 3.2rem; linear gradient background; flex column; z-index 3.

•	Info: Grid Background
    •	Line Number: 49
	•	Element/Rule: <div class="weekly-chart-grid" aria-hidden="true"></div>
	•	What It Does: Provides static horizontal grid lines for visual reference.
	•	Styling/Logic Details: Positioned absolutely (inset 0 0 0 3.5rem); linear gradient background-image (transparent to rgba(255, 255, 255, 0.04)); pointer-events none; z-index 1.

•	Info: Points and Curve Layer
    •	Line Number: 50
	•	Element/Rule: <div class="weekly-chart-line-layer" id="weekly-chart-points"></div>
	•	What It Does: Layer for data points and the connecting curve SVG.
	•	Styling/Logic Details: Positioned absolutely (inset 1rem 0.25rem 1.4rem 3.5rem); z-index 4.

•	Info: X-Axis Container
    •	Line Number: 51
	•	Element/Rule: <div class="weekly-chart-x-axis" id="weekly-chart-x-axis"></div>
	•	What It Does: Container for x-axis labels (week numbers).
	•	Styling/Logic Details: Positioned absolutely (bottom 0, left 3.5rem, right 0.3rem); flex row; background rgba(2, 6, 23, 0.85); border-radius 0 0 18px 18px; backdrop-filter blur(10px); z-index 5.

## app.js - JavaScript Logic

•	Info: Weekly Data Array
    •	Line Number: 10–20
	•	Element/Rule: const WEEKLY_DATA = [ ... ];
	•	What It Does: Defines static data array for 9 weeks, each with week number and fantasy points (e.g., { week: 1, pts: 27.9 }).
	•	Styling/Logic Details: Hardcoded array; used in rendering functions for positioning and labels.

•	Info: Max Points Constant
    •	Line Number: 21
	•	Element/Rule: const MAX_POINTS = 40;
	•	What It Does: Sets the maximum y-axis value for scaling calculations.
	•	Styling/Logic Details: Constant used in yFromPoints(), createZones(), and positioning.

•	Info: Chart Box Reference
    •	Line Number: 22
	•	Element/Rule: const chartBox = document.getElementById("weekly-chart-box");
	•	What It Does: References the main chart container for appending zones.
	•	Styling/Logic Details: DOM element; used in createZones() and renderWeeklyChart().

•	Info: Points Layer Reference
    •	Line Number: 23
	•	Element/Rule: const pointsLayer = document.getElementById("weekly-chart-points");
	•	What It Does: References the layer for points and curve.
	•	Styling/Logic Details: DOM element; used in renderPoints() and drawCurve().

•	Info: X-Axis Element Reference
    •	Line Number: 24
	•	Element/Rule: const xAxisEl = document.getElementById("weekly-chart-x-axis");
	•	What It Does: References the x-axis container for week labels.
	•	Styling/Logic Details: DOM element; used in renderXAxis().

•	Info: Y-Axis Element Reference
    •	Line Number: 25
	•	Element/Rule: const yAxisEl = document.getElementById("weekly-chart-y-axis");
	•	What It Does: References the y-axis container for point ticks.
	•	Styling/Logic Details: DOM element; used in renderYAxis().

•	Info: Curve SVG Variable
    •	Line Number: 26
	•	Element/Rule: let curveSvg = null;
	•	What It Does: Global variable to hold the SVG element for the curve; reset on re-render.
	•	Styling/Logic Details: Initialized to null; set in drawCurve(); reset in renderWeeklyChart().

•	Info: Create Zones Function
    •	Line Number: 28–46
	•	Element/Rule: function createZones()
	•	What It Does: Creates and appends zone divs ("Under", "Solid", "Elite") to chartBox, positioned vertically by percentage.
	•	Styling/Logic Details: Loops stops array; calculates pct = (zone.to / MAX_POINTS) * 100; sets top and height via calc(); appends <div class="weekly-zone"> with label.

•	Info: Y Position Calculator
    •	Line Number: 48–51
	•	Element/Rule: function yFromPoints(pts)
	•	What It Does: Converts fantasy points to y-percentage (0–100%) for positioning.
	•	Styling/Logic Details: Clamps points to 0–40; returns (1 - clamped / MAX_POINTS) * 100.

•	Info: Bucket Determiner
    •	Line Number: 53–60
	•	Element/Rule: function bucketFor(pts)
	•	What It Does: Determines performance bucket ("Elite", "Solid", "Under") based on points, returning color and glow.
	•	Styling/Logic Details: Conditional: >=22 Elite (purple #cf78ff, glow rgba(207,120,255,0.95)); >=16 Solid (cyan #00bfff, glow rgba(0,191,255,0.9)); else Under (red #ff5f6d, glow rgba(255,95,109,0.8)).

•	Info: X-Axis Renderer
    •	Line Number: 62–70
	•	Element/Rule: function renderXAxis()
	•	What It Does: Clears and populates x-axis with week spans (e.g., "WK 1").
	•	Styling/Logic Details: Clears xAxisEl.innerHTML; appends <span> for each WEEKLY_DATA entry.

•	Info: Y-Axis Renderer
    •	Line Number: 72–81
	•	Element/Rule: function renderYAxis()
	•	What It Does: Clears and populates y-axis with tick divs (40, 22, 16, 0 fpts).
	•	Styling/Logic Details: Clears yAxisEl.innerHTML; appends <div class="weekly-chart-y-tick"> for each tick.

•	Info: Points Renderer
    •	Line Number: 83–119
	•	Element/Rule: function renderPoints()
	•	What It Does: Creates point divs with positions, colors, glows, and labels; collects points for curve.
	•	Styling/Logic Details: Calculates pctX = ((index + 0.5) / n) * 100, pctY = yFromPoints(entry.pts); sets left/top via calc(); applies bucket.color and bucket.glow; appends label with week/value/bucket; calls drawCurve(curvePoints).

•	Info: Curve Drawer
    •	Line Number: 121–165
	•	Element/Rule: function drawCurve(points)
	•	What It Does: Generates SVG path for smooth curve connecting points, with glow effect.
	•	Styling/Logic Details: Creates SVG if null; sets viewBox/width/height; converts percentages to absolute XY; builds cubic Bézier d path; adds glow path (stroke-width 8, rgba(207,120,255,0.15)) and core path (stroke-width 2.6, rgba(207,120,255,0.7)).

•	Info: Chart Renderer
    •	Line Number: 167–175
	•	Element/Rule: function renderWeeklyChart()
	•	What It Does: Orchestrates full chart render: removes zones, resets SVG, calls all sub-functions.
	•	Styling/Logic Details: Removes .weekly-zone elements; sets curveSvg = null; calls createZones(), renderYAxis(), renderXAxis(), renderPoints().

•	Info: App Initializer
    •	Line Number: 195–200
	•	Element/Rule: function init()
	•	What It Does: Initializes the app: hydrates HUD circles, renders chart, adds resize listener.
	•	Styling/Logic Details: Calls hydrateProgressCircles(), renderWeeklyChart(); adds window.addEventListener("resize", renderWeeklyChart).

•	Info: DOM Ready Check
    •	Line Number: 202–206
	•	Element/Rule: if (document.readyState === "loading") ... else init();
	•	What It Does: Ensures init() runs on DOM ready.
	•	Styling/Logic Details: Standard DOMContentLoaded check.app.js - JavaScript Logic
	•	File: app.js
	•	Line Number: 10–20
	•	Element/Rule: const WEEKLY_DATA = [ ... ];
	•	What It Does: Defines static data array for 9 weeks, each with week number and fantasy points (e.g., { week: 1, pts: 27.9 }).
	•	Styling/Logic Details: Hardcoded array; used in rendering functions for positioning and labels.
	•	File: app.js
	•	Line Number: 21
	•	Element/Rule: const MAX_POINTS = 40;
	•	What It Does: Sets the maximum y-axis value for scaling calculations.
	•	Styling/Logic Details: Constant used in yFromPoints(), createZones(), and positioning.
	•	File: app.js
	•	Line Number: 22
	•	Element/Rule: const chartBox = document.getElementById("weekly-chart-box");
	•	What It Does: References the main chart container for appending zones.
	•	Styling/Logic Details: DOM element; used in createZones() and renderWeeklyChart().
	•	File: app.js
	•	Line Number: 23
	•	Element/Rule: const pointsLayer = document.getElementById("weekly-chart-points");
	•	What It Does: References the layer for points and curve.
	•	Styling/Logic Details: DOM element; used in renderPoints() and drawCurve().
	•	File: app.js
	•	Line Number: 24
	•	Element/Rule: const xAxisEl = document.getElementById("weekly-chart-x-axis");
	•	What It Does: References the x-axis container for week labels.
	•	Styling/Logic Details: DOM element; used in renderXAxis().
	•	File: app.js
	•	Line Number: 25
	•	Element/Rule: const yAxisEl = document.getElementById("weekly-chart-y-axis");
	•	What It Does: References the y-axis container for point ticks.
	•	Styling/Logic Details: DOM element; used in renderYAxis().
	•	File: app.js
	•	Line Number: 26
	•	Element/Rule: let curveSvg = null;
	•	What It Does: Global variable to hold the SVG element for the curve; reset on re-render.
	•	Styling/Logic Details: Initialized to null; set in drawCurve(); reset in renderWeeklyChart().
	•	File: app.js
	•	Line Number: 28–46
	•	Element/Rule: function createZones()
	•	What It Does: Creates and appends zone divs (“Under”, “Solid”, “Elite”) to chartBox, positioned vertically by percentage.
	•	Styling/Logic Details: Loops stops array; calculates pct = (zone.to / MAX_POINTS) * 100; sets top and height via calc(); appends <div class="weekly-zone"> with label.
	•	File: app.js
	•	Line Number: 48–51
	•	Element/Rule: function yFromPoints(pts)
	•	What It Does: Converts fantasy points to y-percentage (0–100%) for positioning.
	•	Styling/Logic Details: Clamps points to 0–40; returns (1 - clamped / MAX_POINTS) * 100.
	•	File: app.js
	•	Line Number: 53–60
	•	Element/Rule: function bucketFor(pts)
	•	What It Does: Determines performance bucket (“Elite”, “Solid”, “Under”) based on points, returning color and glow.
	•	Styling/Logic Details: Conditional: >=22 Elite (purple #cf78ff, glow rgba(207,120,255,0.95)); >=16 Solid (cyan #00bfff, glow rgba(0,191,255,0.9)); else Under (red #ff5f6d, glow rgba(255,95,109,0.8)).
	•	File: app.js
	•	Line Number: 62–70
	•	Element/Rule: function renderXAxis()
	•	What It Does: Clears and populates x-axis with week spans (e.g., “WK 1”).
	•	Styling/Logic Details: Clears xAxisEl.innerHTML; appends <span> for each WEEKLY_DATA entry.
	•	File: app.js
	•	Line Number: 72–81
	•	Element/Rule: function renderYAxis()
	•	What It Does: Clears and populates y-axis with tick divs (40, 22, 16, 0 fpts).
	•	Styling/Logic Details: Clears yAxisEl.innerHTML; appends <div class="weekly-chart-y-tick"> for each tick.
	•	File: app.js
	•	Line Number: 83–119
	•	Element/Rule: function renderPoints()
	•	What It Does: Creates point divs with positions, colors, glows, and labels; collects points for curve.
	•	Styling/Logic Details: Calculates pctX = ((index + 0.5) / n) * 100, pctY = yFromPoints(entry.pts); sets left/top via calc(); applies bucket.color and bucket.glow; appends label with week/value/bucket; calls drawCurve(curvePoints).
	•	File: app.js
	•	Line Number: 121–165
	•	Element/Rule: function drawCurve(points)
	•	What It Does: Generates SVG path for smooth curve connecting points, with glow effect.
	•	Styling/Logic Details: Creates SVG if null; sets viewBox/width/height; converts percentages to absolute XY; builds cubic Bézier d path; adds glow path (stroke-width 8, rgba(207,120,255,0.15)) and core path (stroke-width 2.6, rgba(207,120,255,0.7)).
	•	File: app.js
	•	Line Number: 167–175
	•	Element/Rule: function renderWeeklyChart()
	•	What It Does: Orchestrates full chart render: removes zones, resets SVG, calls all sub-functions.
	•	Styling/Logic Details: Removes .weekly-zone elements; sets curveSvg = null; calls createZones(), renderYAxis(), renderXAxis(), renderPoints().
	•	File: app.js
	•	Line Number: 195–200
	•	Element/Rule: function init()
	•	What It Does: Initializes the app: hydrates HUD circles, renders chart, adds resize listener.
	•	Styling/Logic Details: Calls hydrateProgressCircles(), renderWeeklyChart(); adds window.addEventListener("resize", renderWeeklyChart).
	•	File: app.js
	•	Line Number: 202–206
	•	Element/Rule: if (document.readyState === "loading") ... else init();
	•	What It Does: Ensures init() runs on DOM ready.
	•	Styling/Logic Details: Standard DOMContentLoaded check.