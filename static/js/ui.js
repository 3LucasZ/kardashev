// UI interactions and dialogue management

function switchModel(modelName) {
  currentModel = modelName;

  // Update tabs
  document.querySelectorAll(".model-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document
    .querySelector(`.model-tab.${modelName}`)
    .classList.add("active");

  // Update island views
  document.querySelectorAll(".island-view").forEach((view) => {
    view.classList.remove("active");
  });
  document
    .querySelector(`.island-view[data-model="${modelName}"]`)
    .classList.add("active");

  // Update dialogue wrappers
  document.querySelectorAll(".dialogue-wrapper").forEach((wrapper) => {
    wrapper.classList.remove("active");
  });
  document.getElementById(`log-wrapper-${modelName}`).classList.add("active");
}

function scrollDialogueToBottom(model) {
  const w = document.getElementById(`log-wrapper-${model}`);
  w.scrollTop = w.scrollHeight;
}

function addDialogueMessage(model, id, text, type = "speech") {
  const state = modelStates[model];
  const w = document.getElementById(`log-wrapper-${model}`);
  const agent = state.players[id];
  const color = state.AGENT_COLORS[id] || "#aaa";
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
      : "");
  textEl.style.borderLeftColor = color;
  textEl.textContent = text;

  bubble.appendChild(nameEl);
  bubble.appendChild(textEl);
  row.appendChild(av);
  row.appendChild(bubble);
  w.appendChild(row);
  scrollDialogueToBottom(model);
}

function log(model, msg, type = "normal") {
  const w = document.getElementById(`log-wrapper-${model}`);
  if (type === "phase") {
    const d = document.createElement("div");
    d.className = "log-phase";
    d.textContent = "— " + msg + " —";
    w.appendChild(d);
  } else {
    const d = document.createElement("div");
    d.className = "log-system";
    d.textContent = msg;
    w.appendChild(d);
  }
  scrollDialogueToBottom(model);
}

function createBubble(model, id) {
  const view = document.querySelector(`.island-view[data-model="${model}"]`);
  const b = document.createElement("div");
  b.id = `bubble-${model}-${id}`;
  b.className = "bubble";
  view.appendChild(b);
}

function showBubble(model, id, text, special = false) {
  const filtered = ["Yum.", "Yum!", "yum.", "yum!"];
  if (filtered.includes(text.trim())) return;
  const b = document.getElementById(`bubble-${model}-${id}`);
  if (b) {
    b.innerText = text;
    b.style.opacity = 1;
    b.style.borderColor = special ? "#4fc3f7" : "#000";
    setTimeout(() => (b.style.opacity = 0), 3000);
  }
  addDialogueMessage(model, id, text, special ? "status" : "speech");
}

function showDisasterFeedback(text, isError = false) {
  const feedback = document.getElementById("disaster-feedback");
  feedback.textContent = text;
  feedback.style.color = isError ? "#ff6b6b" : "#81c784";
  setTimeout(() => {
    feedback.textContent = "";
  }, 5000);
}
