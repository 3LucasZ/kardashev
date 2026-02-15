// Game state management

let currentModel = "sonnet";

// State per model
const modelStates = {
  sonnet: {
    canvas: null,
    ctx: null,
    W: 0,
    H: 0,
    players: {},
    fish: [],
    trees: [],
    houses: [],
    particles: [],
    colorIndex: 0,
    AGENT_COLORS: {},
  },
  opus: {
    canvas: null,
    ctx: null,
    W: 0,
    H: 0,
    players: {},
    fish: [],
    trees: [],
    houses: [],
    particles: [],
    colorIndex: 0,
    AGENT_COLORS: {},
  },
  haiku: {
    canvas: null,
    ctx: null,
    W: 0,
    H: 0,
    players: {},
    fish: [],
    trees: [],
    houses: [],
    particles: [],
    colorIndex: 0,
    AGENT_COLORS: {},
  },
};

function generateIsland(modelName) {
  const state = modelStates[modelName];
  state.trees = [];
  // Reduced from 15 to 6 trees
  for (let i = 0; i < 6; i++) {
    const r = Math.random() * 35,
      theta = Math.random() * Math.PI * 2;
    state.trees.push({
      x: MAP_W / 2 + r * Math.cos(theta) - 3,
      y: MAP_H / 2 + r * Math.sin(theta) - 3,
    });
  }
}

function syncFish(model, count) {
  const state = modelStates[model];
  // Show accurate fish count up to 50 (for performance)
  const target = Math.min(count, 50);
  while (state.fish.length < target) {
    const angle = Math.random() * Math.PI * 2;
    // Spawn fish in the pond (between radius 65 and 95)
    const r = 65 + Math.random() * 5;
    state.fish.push({
      x: MAP_W / 2 + Math.cos(angle) * r,
      y: MAP_H / 2 + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    });
  }
  while (state.fish.length > target) state.fish.pop();
}

function syncHouses(model) {
  const state = modelStates[model];
  const aliveCount = Object.values(state.players).filter((p) => p.alive).length;

  // Generate house positions in a ring around the island
  state.houses = [];
  for (let i = 0; i < aliveCount; i++) {
    const angle = (i / Math.max(aliveCount, 1)) * Math.PI * 2;
    const r = 22 + (i % 2) * 5; // Stagger houses in two rings
    state.houses.push({
      x: MAP_W / 2 + Math.cos(angle) * r - 3,
      y: MAP_H / 2 + Math.sin(angle) * r - 4,
    });
  }
}

function spawnAgent(model, id) {
  const state = modelStates[model];
  const color = COLOR_PALETTE[state.colorIndex % COLOR_PALETTE.length];
  state.colorIndex++;
  state.AGENT_COLORS[id] = color;
  const idx = Object.keys(state.players).length;
  const spawnAngle = (idx / 8) * Math.PI * 2;
  const spawnR = 12 + (idx % 3) * 5;
  const sx = MAP_W / 2 + Math.cos(spawnAngle) * spawnR;
  const sy = MAP_H / 2 + Math.sin(spawnAngle) * spawnR;
  state.players[id] = {
    id,
    color,
    x: sx,
    y: sy,
    tx: sx,
    ty: sy,
    alive: true,
    isLeader: false,
    eatPop: 0,
    idleWalkTimer: Math.random() * 200, // Random start for idle walking
    homeAngle: spawnAngle,
    homeR: spawnR,
  };
  createBubble(model, id);
}

// Make agents walk around when idle
function updateIdleWalking(model) {
  const state = modelStates[model];
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;

  Object.values(state.players).forEach((p) => {
    if (!p.alive) return;

    // Check if agent is close to target (idle at home)
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      p.idleWalkTimer--;

      if (p.idleWalkTimer <= 0) {
        // Pick a new random spot on the island to walk to
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 30 + 5; // Stay within island (radius 5-35)
        p.tx = cx + Math.cos(angle) * radius;
        p.ty = cy + Math.sin(angle) * radius;
        p.idleWalkTimer = 100 + Math.random() * 200; // Wait 100-300 frames before next walk
      }
    }
  });
}
