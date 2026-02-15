// WebSocket connection and event handling

const ws = new WebSocket(`ws://${window.location.host}/ws`);
ws.onmessage = (e) => handleEvent(JSON.parse(e.data));

function startSim() {
  ws.send(JSON.stringify({ command: "start" }));
  document.getElementById("start-btn").disabled = true;
  document.getElementById("start-btn").innerText = "RUNNING...";

  // Clear all logs and data
  Object.keys(modelStates).forEach((model) => {
    document.getElementById(`log-wrapper-${model}`).innerHTML = "";
    modelStates[model].colorIndex = 0;
    chartData[model].wild = [];
    chartData[model].stash = [];
    chartData[model].pop = [];
  });
  resizeCharts();
  updateLeaderboard();
}

function sendDisaster(disasterText) {
  if (!disasterText.trim()) return;
  ws.send(JSON.stringify({ command: "disaster", text: disasterText }));
  document.getElementById("disaster-input").value = "";
  showDisasterFeedback("Processing disaster...");
}

function handleEvent(data) {
  const model = data.model || "sonnet";
  const state = modelStates[model];

  if (data.type === "DISASTER") {
    // Show disaster banner
    const banner = document.getElementById(`phase-banner-${model}`);
    banner.innerText = `⚠️ DISASTER: ${data.disaster_name}`;
    banner.style.background = "#ff6b6b";
    setTimeout(() => {
      banner.style.background = "";
    }, 5000);
    log(model, `🌋 DISASTER: ${data.disaster_name}`, "phase");
    log(model, data.description);
    showDisasterFeedback(`Disaster "${data.disaster_name}" applied!`);
  } else if (data.type === "INIT") {
    state.colorIndex = 0;
    data.agent_ids.forEach((id) => {
      spawnAgent(model, id);
    });
    syncHouses(model);
  } else if (data.type === "BORN") {
    spawnAgent(model, data.id);
    syncHouses(model);
    const banner = document.getElementById(`born-banner-${model}`);
    banner.textContent = `🐣 ${data.id} joins the island! (skill: ${data.skill})`;
    banner.style.opacity = 1;
    setTimeout(() => (banner.style.opacity = 0), 3500);
    addDialogueMessage(
      model,
      data.id,
      `${data.id} has joined the island.`,
      "born",
    );
    const currentDay =
      parseInt(document.getElementById(`stat-day-${model}`).innerText) || 0;
    pushPopData(model, currentDay);
  } else if (data.type === "UPDATE_STATS") {
    document.getElementById(`stat-day-${model}`).innerText = data.day;
    syncFish(model, data.wild);
    pushChartData(model, data.day, data.wild, data.stash);
    pushPopData(model, data.day);
  } else if (data.type === "MOVE") {
    data.ids.forEach((id, index) => {
      if (!state.players[id]) return;
      if (data.loc === "water") {
        // Walk to fishing spot
        const angle =
          (index / data.ids.length) * Math.PI * 2 + Math.random() * 0.3;
        const r = 58 + Math.random() * 2;
        state.players[id].tx = MAP_W / 2 + Math.cos(angle) * r;
        state.players[id].ty = MAP_H / 2 + Math.sin(angle) * r;
        state.players[id].idleWalkTimer = 999; // Don't wander while fishing
      } else {
        // Walk back home
        const homeAngle = state.players[id].homeAngle;
        const homeR = state.players[id].homeR;
        state.players[id].tx = MAP_W / 2 + Math.cos(homeAngle) * homeR;
        state.players[id].ty = MAP_W / 2 + Math.sin(homeAngle) * homeR;
        state.players[id].idleWalkTimer = 100 + Math.random() * 200; // Resume idle walking
      }
    });
  } else if (data.type === "PHASE") {
    document.getElementById(`phase-banner-${model}`).innerText = data.text;
    log(model, data.text, "phase");
  } else if (data.type === "LOG") {
    log(model, data.text);
  } else if (data.type === "SPEECH") {
    showBubble(model, data.id, data.text);
  } else if (data.type === "SHOW_STATUS") {
    showBubble(model, data.id, data.text, true);
    if (data.text && data.text.startsWith("Ate ")) {
      const amt = parseInt(data.text.replace("Ate ", ""));
      if (amt >= 1 && state.players[data.id])
        state.players[data.id].eatPop = 60;
    }
  } else if (data.type === "SET_LEADER") {
    Object.values(state.players).forEach(
      (p) => (p.isLeader = p.id === data.id),
    );
  } else if (data.type === "DIE") {
    if (state.players[data.id]) state.players[data.id].alive = false;
    syncHouses(model);
    addDialogueMessage(model, data.id, "💀 Died of starvation.", "death");
    const currentDay =
      parseInt(document.getElementById(`stat-day-${model}`).innerText) || 0;
    pushPopData(model, currentDay);
  }
}
