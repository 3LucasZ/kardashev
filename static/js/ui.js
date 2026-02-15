/**
 * UI interactions - dialogue, bubbles, and user controls
 */

// =============================================
// DIALOGUE FUNCTIONS
// =============================================

function scrollDialogueToBottom() {
  const w = document.getElementById("log-wrapper");
  w.scrollTop = w.scrollHeight;
}

function addDialogueMessage(id, text, type = "speech") {
  const w = document.getElementById("log-wrapper");
  const agent = window.players[id];
  const color =
    id === "SYSTEM" || id === "⚠ DISASTER"
      ? "#ef5350"
      : window.getAgentColor(id);
  const isLeader = agent && agent.isLeader;
  const isDead = agent && !agent.alive;

  const row = document.createElement("div");
  row.className = "dialogue-msg";

  const av = document.createElement("div");
  av.className = "dialogue-avatar" + (isDead ? " dead" : "");
  av.style.background = isDead ? "" : color;
  av.style.borderColor = isDead ? "#555" : "#000";
  if (type === "born") av.style.animation = "bornFlash 1s ease";
  av.textContent = id ? id[0] : "?";

  const bubble = document.createElement("div");
  bubble.className = "dialogue-bubble";

  const nameEl = document.createElement("div");
  nameEl.className = "dialogue-name";
  nameEl.style.color = color;
  nameEl.innerHTML =
    id +
    (isLeader ? ' <span class="leader-crown">👑</span>' : "") +
    (type === "born" ? ' <span style="font-size:11px">🐣 NEW</span>' : "");

  const textEl = document.createElement("div");
  textEl.className =
    "dialogue-text" +
    (type === "status"
      ? " status"
      : type === "death"
      ? " death"
      : type === "born"
      ? " born"
      : type === "disaster"
      ? " disaster"
      : "");
  textEl.style.borderLeftColor = color;
  textEl.textContent = text;

  bubble.appendChild(nameEl);
  bubble.appendChild(textEl);
  row.appendChild(av);
  row.appendChild(bubble);
  w.appendChild(row);
  scrollDialogueToBottom();
}

function log(msg, type = "normal") {
  const w = document.getElementById("log-wrapper");

  if (type === "phase") {
    const d = document.createElement("div");
    d.className = "log-phase";
    d.textContent = "— " + msg + " —";
    w.appendChild(d);
  } else if (type !== "death") {
    const d = document.createElement("div");
    d.className = "log-system";
    d.textContent = msg;
    w.appendChild(d);
  }

  scrollDialogueToBottom();
}

// =============================================
// BUBBLE FUNCTIONS
// =============================================

function createBubble(id) {
  const b = document.createElement("div");
  b.id = `bubble-${id}`;
  b.className = "bubble";
  document.getElementById("game-container").appendChild(b);
}

function showBubble(id, text, special = false) {
  // Filter out boring messages
  const filtered = ["Yum.", "Yum!", "yum.", "yum!"];
  if (filtered.includes(text.trim())) return;

  const b = document.getElementById(`bubble-${id}`);
  if (b) {
    b.innerText = text;
    b.style.opacity = 1;
    b.style.borderColor = special ? "#4fc3f7" : "#000";
    setTimeout(() => (b.style.opacity = 0), 3000);
  }

  addDialogueMessage(id, text, special ? "status" : "speech");
}

// =============================================
// CONTROL FUNCTIONS
// =============================================

function startSim() {
  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    window.ws.send(JSON.stringify({ command: "start" }));
    document.getElementById("start-btn").disabled = true;
    document.getElementById("start-btn").innerText = "RUNNING...";
    document.getElementById("log-wrapper").innerHTML = "";

    if (window.clearChartData) window.clearChartData();
    window.colorIndex = 0;
  }
}

// =============================================
// EVENT LISTENERS
// =============================================

// Disaster input
document
  .getElementById("disaster-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      const val = this.value.trim();
      if (val && window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({ command: "disaster", text: val }));
        this.value = "";
        // Immediate feedback
        addDialogueMessage(
          "SYSTEM",
          `⚠️ IMPENDING DISASTER: "${val}"`,
          "disaster"
        );
      }
    }
  });

// =============================================
// EXPORTS
// =============================================

window.createBubble = createBubble;
window.showBubble = showBubble;
window.addDialogueMessage = addDialogueMessage;
window.log = log;
window.startSim = startSim;
