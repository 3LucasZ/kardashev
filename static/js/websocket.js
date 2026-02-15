/**
 * WebSocket communication and event handling
 */

// =============================================
// WEBSOCKET CONNECTION
// =============================================

const ws = new WebSocket(`ws://${window.location.host}/ws`);

ws.onopen = () => {
  console.log("WebSocket connected");
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("WebSocket closed");
};

ws.onmessage = (e) => {
  handleEvent(JSON.parse(e.data));
};

// =============================================
// EVENT HANDLERS
// =============================================

function handleEvent(data) {
  if (data.type === "INIT") {
    window.colorIndex = 0;
    data.agent_ids.forEach((id) => {
      window.spawnAgent(id);
    });
  } else if (data.type === "BORN") {
    window.spawnAgent(data.id);

    const banner = document.getElementById("born-banner");
    banner.textContent = `🐣 ${data.id} joins the island! (skill: ${data.skill})`;
    banner.style.opacity = 1;
    setTimeout(() => (banner.style.opacity = 0), 3500);

    window.addDialogueMessage(
      data.id,
      `${data.id} has joined the island.`,
      "born"
    );

    const currentDay = parseInt(document.getElementById("stat-day").innerText) || 0;
    window.pushPopData(currentDay);
  } else if (data.type === "UPDATE_STATS") {
    document.getElementById("stat-day").innerText = data.day;
    document.getElementById("stat-wild").innerText = data.wild;
    document.getElementById("stat-stash").innerText = data.stash;

    window.syncFish(data.wild);
    window.pushChartData(data.day, data.wild, data.stash);
    window.pushPopData(data.day);
  } else if (data.type === "MOVE") {
    data.ids.forEach((id) => {
      if (!window.players[id]) return;

      if (data.loc === "water") {
        const angle = Math.random() * Math.PI * 2;
        const r = 72 + Math.random() * 15;
        window.players[id].tx = 160 / 2 + Math.cos(angle) * r;
        window.players[id].ty = 120 / 2 + Math.sin(angle) * r;
      } else {
        const idx = Object.keys(window.players).indexOf(id);
        const homeAngle = (idx / 8) * Math.PI * 2;
        const homeR = 12 + (idx % 3) * 5;
        window.players[id].tx = 160 / 2 + Math.cos(homeAngle) * homeR;
        window.players[id].ty = 120 / 2 + Math.sin(homeAngle) * homeR;
      }
    });
  } else if (data.type === "PHASE") {
    document.getElementById("phase-banner").innerText = data.text;
    window.log(data.text, "phase");
  } else if (data.type === "LOG") {
    window.log(data.text);
  } else if (data.type === "DISASTER_HIT") {
    // Special handler for disaster logs
    window.addDialogueMessage("⚠ DISASTER", data.text, "disaster");

    // Shake effect on canvas
    const cvs = document.getElementById("gameCanvas");
    cvs.style.transform = "translate(4px, 4px)";
    setTimeout(() => (cvs.style.transform = "translate(-4px, -4px)"), 50);
    setTimeout(() => (cvs.style.transform = "translate(0, 0)"), 100);
  } else if (data.type === "SPEECH") {
    window.showBubble(data.id, data.text);
  } else if (data.type === "SHOW_STATUS") {
    window.showBubble(data.id, data.text, true);

    if (data.text && data.text.startsWith("Ate ")) {
      const amt = parseInt(data.text.replace("Ate ", ""));
      if (amt >= 1 && window.players[data.id]) {
        window.players[data.id].eatPop = 60;
      }
    }
  } else if (data.type === "SET_LEADER") {
    Object.values(window.players).forEach((p) => {
      p.isLeader = p.id === data.id;
    });
  } else if (data.type === "DIE") {
    if (window.players[data.id]) {
      window.players[data.id].alive = false;
    }

    window.addDialogueMessage(data.id, "💀 Died.", "death");

    const currentDay = parseInt(document.getElementById("stat-day").innerText) || 0;
    window.pushPopData(currentDay);
  }
}

// =============================================
// EXPORTS
// =============================================

window.ws = ws;
