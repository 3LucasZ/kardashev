// Chart rendering engine

const wildCanvas = document.getElementById("wildChart");
const wildCtx = wildCanvas.getContext("2d");
const popCanvas = document.getElementById("popChart");
const popCtx = popCanvas.getContext("2d");

const chartData = {
  sonnet: { wild: [], stash: [], pop: [] },
  opus: { wild: [], stash: [], pop: [] },
  haiku: { wild: [], stash: [], pop: [] },
};

function resizeCharts() {
  [wildCanvas, popCanvas].forEach((c) => {
    const wrap = c.parentElement;
    c.width = wrap.clientWidth;
    c.height = wrap.clientHeight;
  });
  drawMultiModelChart(wildCtx, wildCanvas, "wild");
  drawMultiModelChart(popCtx, popCanvas, "pop");
}

function drawMultiModelChart(c, canvas, dataType) {
  const w = canvas.width,
    h = canvas.height;
  c.clearRect(0, 0, w, h);

  const padding = { top: 6, right: 8, bottom: 20, left: 30 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  if (plotW <= 0 || plotH <= 0) return;

  // Grid lines
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

  // Axes
  c.strokeStyle = "#444";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(padding.left, padding.top);
  c.lineTo(padding.left, padding.top + plotH);
  c.lineTo(padding.left + plotW, padding.top + plotH);
  c.stroke();

  // Get all data
  const allData = {
    sonnet: chartData.sonnet[dataType],
    opus: chartData.opus[dataType],
    haiku: chartData.haiku[dataType],
  };

  const hasData = Object.values(allData).some((d) => d.length > 0);
  if (!hasData) {
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

  // Find max values across all models
  const maxVal = Math.max(
    1,
    ...Object.values(allData).flatMap((history) => history.map((d) => d.value))
  );
  const maxDay = Math.max(
    1,
    ...Object.values(allData).flatMap((history) => history.map((d) => d.day))
  );
  const xRange = Math.max(maxDay - 1, 1);
  const xScale = plotW / xRange;
  const yScale = plotH / maxVal;

  function toScreenX(day) {
    return padding.left + (day - 1) * xScale;
  }
  function toScreenY(val) {
    return padding.top + plotH - val * yScale;
  }

  // Draw each model's line
  Object.entries(allData).forEach(([model, history]) => {
    if (history.length === 0) return;

    const lineColor = MODEL_COLORS[model];

    // Line
    c.beginPath();
    history.forEach((d, i) => {
      const x = toScreenX(d.day),
        y = toScreenY(d.value);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.strokeStyle = lineColor;
    c.lineWidth = 2;
    c.stroke();

    // Dots
    history.forEach((d) => {
      const x = toScreenX(d.day),
        y = toScreenY(d.value);
      c.beginPath();
      c.arc(x, y, 2.5, 0, Math.PI * 2);
      c.fillStyle = lineColor;
      c.fill();
    });

    // Current value label
    const last = history[history.length - 1];
    const lx = toScreenX(last.day),
      ly = toScreenY(last.value);
    c.fillStyle = lineColor;
    c.font = "12px VT323, monospace";
    c.textAlign = "left";
    c.fillText(`${model}: ${last.value}`, lx + 5, ly);
  });

  // Y-axis labels
  c.fillStyle = "#888";
  c.font = "12px VT323, monospace";
  c.textAlign = "right";
  c.fillText(maxVal, padding.left - 3, padding.top + 8);
  c.fillText(0, padding.left - 3, padding.top + plotH);

  // X-axis day ticks
  c.fillStyle = "#555";
  c.font = "11px VT323, monospace";
  c.textAlign = "center";
  for (let d = 1; d <= maxDay; d++) {
    const x = toScreenX(d);
    c.fillText(d, x, padding.top + plotH + 14);
  }
}

function pushChartData(model, day, wildVal, stashVal) {
  const updateArr = (arr, val) => {
    const existing = arr.find((d) => d.day === day);
    if (existing) existing.value = val;
    else arr.push({ day, value: val });
  };
  updateArr(chartData[model].wild, wildVal);
  updateArr(chartData[model].stash, stashVal);

  drawMultiModelChart(wildCtx, wildCanvas, "wild");
}

function pushPopData(model, day) {
  const state = modelStates[model];
  const alive = Object.values(state.players).filter((p) => p.alive).length;
  const updateArr = (arr, val) => {
    const existing = arr.find((d) => d.day === day);
    if (existing) existing.value = val;
    else arr.push({ day, value: val });
  };
  updateArr(chartData[model].pop, alive);
  drawMultiModelChart(popCtx, popCanvas, "pop");

  // Update leaderboard
  updateLeaderboard();
}

function updateLeaderboard() {
  // Get current population for each model
  const populations = {
    sonnet: Object.values(modelStates.sonnet.players).filter((p) => p.alive)
      .length,
    opus: Object.values(modelStates.opus.players).filter((p) => p.alive)
      .length,
    haiku: Object.values(modelStates.haiku.players).filter((p) => p.alive)
      .length,
  };

  // Update population counts
  document.getElementById("lb-pop-sonnet").textContent = populations.sonnet;
  document.getElementById("lb-pop-opus").textContent = populations.opus;
  document.getElementById("lb-pop-haiku").textContent = populations.haiku;

  // Sort models by population
  const sorted = Object.entries(populations).sort((a, b) => b[1] - a[1]);

  // Update rankings
  const leaderboard = document.getElementById("leaderboard");
  sorted.forEach(([modelName, pop], index) => {
    const row = leaderboard.querySelector(
      `.leaderboard-row[data-model="${modelName}"]`
    );
    const rank = index + 1;

    // Update rank badge
    row.querySelector(".rank-badge").textContent = `#${rank}`;

    // Update data-rank attribute for styling
    row.setAttribute("data-rank", rank);

    // Reorder in DOM
    leaderboard.appendChild(row);
  });
}
