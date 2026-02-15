/**
 * Chart rendering engine - handles data visualization
 */

// =============================================
// CHART SETUP
// =============================================

const wildCanvas = document.getElementById("wildChart");
const wildCtx = wildCanvas.getContext("2d");
const stashCanvas = document.getElementById("stashChart");
const stashCtx = stashCanvas.getContext("2d");
const popCanvas = document.getElementById("popChart");
const popCtx = popCanvas.getContext("2d");

const wildHistory = [];
const stashHistory = [];
const popHistory = [];

// =============================================
// CHART FUNCTIONS
// =============================================

function resizeCharts() {
  [wildCanvas, stashCanvas, popCanvas].forEach((c) => {
    const wrap = c.parentElement;
    c.width = wrap.clientWidth;
    c.height = wrap.clientHeight;
  });
  drawChart(wildCtx, wildCanvas, wildHistory, "#4fc3f7", "#1a4a5e");
  drawChart(stashCtx, stashCanvas, stashHistory, "#ffb74d", "#5e3c1a");
  drawChart(popCtx, popCanvas, popHistory, "#a5d6a7", "#1a3d1e");
}

function drawChart(c, canvas, history, lineColor, fillColor) {
  const w = canvas.width;
  const h = canvas.height;
  c.clearRect(0, 0, w, h);

  const padding = { top: 6, right: 8, bottom: 20, left: 30 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  if (plotW <= 0 || plotH <= 0) return;

  // Draw grid lines
  c.strokeStyle = "#2a2a2a";
  c.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * plotH;
    c.beginPath();
    c.moveTo(padding.left, y);
    c.lineTo(padding.left + plotW, y);
    c.stroke();
  }

  // Draw axes
  c.strokeStyle = "#444";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(padding.left, padding.top);
  c.lineTo(padding.left, padding.top + plotH);
  c.lineTo(padding.left + plotW, padding.top + plotH);
  c.stroke();

  if (history.length === 0) {
    c.fillStyle = "#444";
    c.font = "14px VT323, monospace";
    c.textAlign = "center";
    c.fillText(
      "No data yet",
      padding.left + plotW / 2,
      padding.top + plotH / 2 + 5
    );
    return;
  }

  // Calculate scales
  const maxVal = Math.max(...history.map((d) => d.value), 1);
  const maxDay = Math.max(...history.map((d) => d.day), 1);
  const xRange = Math.max(maxDay - 1, 1);
  const xScale = plotW / xRange;
  const yScale = plotH / maxVal;

  function toScreenX(day) {
    return padding.left + (day - 1) * xScale;
  }

  function toScreenY(val) {
    return padding.top + plotH - val * yScale;
  }

  // Draw filled area
  c.beginPath();
  history.forEach((d, i) => {
    const x = toScreenX(d.day);
    const y = toScreenY(d.value);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  const lastX = toScreenX(history[history.length - 1].day);
  c.lineTo(lastX, padding.top + plotH);
  c.lineTo(toScreenX(history[0].day), padding.top + plotH);
  c.closePath();
  c.fillStyle = fillColor + "99";
  c.fill();

  // Draw line
  c.beginPath();
  history.forEach((d, i) => {
    const x = toScreenX(d.day);
    const y = toScreenY(d.value);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  c.strokeStyle = lineColor;
  c.lineWidth = 2;
  c.stroke();

  // Draw points
  history.forEach((d) => {
    const x = toScreenX(d.day);
    const y = toScreenY(d.value);
    c.beginPath();
    c.arc(x, y, 2.5, 0, Math.PI * 2);
    c.fillStyle = lineColor;
    c.fill();
  });

  // Draw Y-axis labels
  c.fillStyle = "#888";
  c.font = "12px VT323, monospace";
  c.textAlign = "right";
  c.fillText(maxVal, padding.left - 3, padding.top + 8);
  c.fillText(0, padding.left - 3, padding.top + plotH);

  // Draw last value label
  const last = history[history.length - 1];
  const lx = toScreenX(last.day);
  const ly = toScreenY(last.value);
  c.fillStyle = lineColor;
  c.font = "13px VT323, monospace";
  c.textAlign = lx > padding.left + plotW - 20 ? "right" : "left";
  c.fillText(
    last.value,
    lx + (lx > padding.left + plotW - 20 ? -4 : 4),
    ly - 3
  );

  // Draw X-axis day labels
  c.fillStyle = "#555";
  c.font = "11px VT323, monospace";
  c.textAlign = "center";
  for (let d = 1; d <= maxDay; d++) {
    const x = toScreenX(d);
    c.fillText(d, x, padding.top + plotH + 14);
  }
}

function pushChartData(day, wildVal, stashVal) {
  const updateArr = (arr, val) => {
    const existing = arr.find((d) => d.day === day);
    if (existing) existing.value = val;
    else arr.push({ day, value: val });
  };

  updateArr(wildHistory, wildVal);
  updateArr(stashHistory, stashVal);

  document.getElementById("wild-label").textContent = `🐟 Wild Fish: ${wildVal}`;
  document.getElementById("stash-label").textContent = `🪣 Village Stash: ${stashVal}`;

  drawChart(wildCtx, wildCanvas, wildHistory, "#4fc3f7", "#1a4a5e");
  drawChart(stashCtx, stashCanvas, stashHistory, "#ffb74d", "#5e3c1a");
}

function pushPopData(day) {
  const alive = Object.values(window.players).filter((p) => p.alive).length;

  const updateArr = (arr, val) => {
    const existing = arr.find((d) => d.day === day);
    if (existing) existing.value = val;
    else arr.push({ day, value: val });
  };

  updateArr(popHistory, alive);
  document.getElementById("pop-label").textContent = `👥 Population: ${alive}`;
  drawChart(popCtx, popCanvas, popHistory, "#a5d6a7", "#1a3d1e");
}

function clearChartData() {
  wildHistory.length = 0;
  stashHistory.length = 0;
  popHistory.length = 0;
  resizeCharts();
}

// =============================================
// EXPORTS
// =============================================

window.resizeCharts = resizeCharts;
window.pushChartData = pushChartData;
window.pushPopData = pushPopData;
window.clearChartData = clearChartData;

// Initial render
resizeCharts();
