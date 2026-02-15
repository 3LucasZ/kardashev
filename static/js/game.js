/**
 * Game rendering engine - handles canvas, sprites, and animations
 */

// =============================================
// CONSTANTS & SPRITES
// =============================================

const SPRITES = {
  PLAYER: [
    [0, 1, 1, 1, 1, 0],
    [1, 2, 2, 2, 2, 1],
    [1, 2, 5, 6, 2, 1],
    [1, 2, 2, 2, 2, 1],
    [0, 1, 1, 1, 1, 0],
    [0, 4, 4, 4, 4, 0],
    [4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4],
  ],
  FISH: [
    [0, 1, 1, 0],
    [1, 1, 2, 1],
    [0, 1, 1, 0],
  ],
  TREE: [
    [0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 0],
    [0, 0, 2, 2, 0, 0],
    [0, 0, 2, 2, 0, 0],
  ],
  SKULL: [
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 1, 0, 1, 0],
  ],
};

const COLORS = {
  FISH: ["transparent", "#88ccff", "#000"],
  TREE: ["transparent", "#2e7d32", "#5d4037"],
  SKULL: ["transparent", "#ddd"],
  WATER: ["#28648c", "#2c709e"],
  SAND: "#e6c288",
  GRASS: "#66bb6a",
  FIRE: ["#d84315", "#f4511e", "#ff6e40"],
};

const COLOR_PALETTE = [
  "#e57373", "#81c784", "#64b5f6", "#fff176", "#ba68c8",
  "#4dd0e1", "#ff8a65", "#f06292", "#aed581", "#4db6ac",
  "#dce775", "#7986cb", "#a1887f", "#90a4ae", "#ffb300",
  "#26c6da", "#ef5350", "#66bb6a", "#42a5f5", "#ab47bc",
  "#26a69a",
];

// =============================================
// GAME STATE
// =============================================

const MAP_W = 160;
const MAP_H = 120;
let W, H;

let colorIndex = 0;
let players = {};
let fish = [];
let trees = [];
let particles = [];
let AGENT_COLORS = {};

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =============================================
// INITIALIZATION
// =============================================

function resizeGame() {
  const container = document.getElementById("game-container");
  W = container.clientWidth;
  H = container.clientHeight;
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  generateIsland();
}

function generateIsland() {
  trees = [];
  for (let i = 0; i < 15; i++) {
    const r = Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    trees.push({
      x: MAP_W / 2 + r * Math.cos(theta) - 3,
      y: MAP_H / 2 + r * Math.sin(theta) - 3,
    });
  }
}

window.addEventListener("resize", () => {
  resizeGame();
  if (window.resizeCharts) window.resizeCharts();
});

resizeGame();

// =============================================
// AGENT MANAGEMENT
// =============================================

function spawnAgent(id) {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  colorIndex++;
  AGENT_COLORS[id] = color;

  const idx = Object.keys(players).length;
  const spawnAngle = (idx / 8) * Math.PI * 2;
  const spawnR = 12 + (idx % 3) * 5;
  const sx = MAP_W / 2 + Math.cos(spawnAngle) * spawnR;
  const sy = MAP_H / 2 + Math.sin(spawnAngle) * spawnR;

  players[id] = {
    id,
    color,
    x: sx,
    y: sy,
    tx: sx,
    ty: sy,
    alive: true,
    isLeader: false,
    eatPop: 0,
  };

  if (window.createBubble) window.createBubble(id);
}

function syncFish(count) {
  const target = Math.min(count, 15);

  while (fish.length < target) {
    const angle = Math.random() * Math.PI * 2;
    const r = 75 + Math.random() * 20;
    fish.push({
      x: MAP_W / 2 + Math.cos(angle) * r,
      y: MAP_H / 2 + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    });
  }

  while (fish.length > target) {
    fish.pop();
  }
}

function getAgentColor(id) {
  return AGENT_COLORS[id] || "#aaa";
}

// =============================================
// RENDERING
// =============================================

function drawPixel(x, y, color) {
  ctx.fillStyle = color;
  const pixelW = W / MAP_W;
  const pixelH = H / MAP_H;
  const size = Math.min(pixelW, pixelH);
  const offsetX = (W - size * MAP_W) / 2;
  const offsetY = (H - size * MAP_H) / 2;
  ctx.fillRect(
    offsetX + Math.floor(x) * size,
    offsetY + Math.floor(y) * size,
    size + 1,
    size + 1
  );
}

function drawImage(img, x, y, scale = 1) {
  if (!img) return;
  const pixelW = W / MAP_W;
  const pixelH = H / MAP_H;
  const size = Math.min(pixelW, pixelH);
  const offsetX = (W - size * MAP_W) / 2;
  const offsetY = (H - size * MAP_H) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    offsetX + Math.floor(x) * size,
    offsetY + Math.floor(y) * size,
    img.width * size * scale,
    img.height * size * scale
  );
}

function drawSprite(key, x, y, palette) {
  // Try to use loaded image sprite first
  if (window.spriteLoader) {
    const sprite = window.spriteLoader.getSprite(key);
    if (sprite) {
      // For player sprites, we need to apply color
      if (key === "PLAYER" && palette && palette[4]) {
        drawColoredSprite(sprite, x, y, palette[4]);
      } else {
        drawImage(sprite, x, y);
      }
      return;
    }
  }

  // Fallback to programmatic drawing
  const grid = SPRITES[key];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] > 0) {
        drawPixel(x + c, y + r, palette[grid[r][c]]);
      }
    }
  }
}

function drawColoredSprite(img, x, y, color) {
  if (!img) return;

  const pixelW = W / MAP_W;
  const pixelH = H / MAP_H;
  const size = Math.min(pixelW, pixelH);
  const offsetX = (W - size * MAP_W) / 2;
  const offsetY = (H - size * MAP_H) / 2;

  // Create temporary canvas to color the sprite
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext('2d');

  // Draw original sprite
  tempCtx.drawImage(img, 0, 0);

  // Get image data to recolor white pixels (body)
  const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  // Parse the color
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Recolor white/body pixels
  for (let i = 0; i < data.length; i += 4) {
    // If pixel is white-ish (body color), replace with agent color
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  tempCtx.putImageData(imageData, 0, 0);

  // Draw colored sprite
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    tempCanvas,
    offsetX + Math.floor(x) * size,
    offsetY + Math.floor(y) * size,
    tempCanvas.width * size,
    tempCanvas.height * size
  );
}

function drawTile(tileKey, x, y, frame = 0) {
  if (window.spriteLoader) {
    const sprite = window.spriteLoader.getAnimatedSprite(tileKey, frame);
    if (sprite) {
      drawImage(sprite, x, y);
      return true;
    }
  }
  return false;
}

let waterAnimFrame = 0;
let frameCounter = 0;

function gameLoop() {
  frameCounter++;
  if (frameCounter % 30 === 0) {
    waterAnimFrame = (waterAnimFrame + 1) % 2;
  }

  // Clear screen
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);

  const pixelSize = Math.min(W / MAP_W, H / MAP_H);
  const offsetX = (W - pixelSize * MAP_W) / 2;
  const offsetY = (H - pixelSize * MAP_H) / 2;

  // Draw water background
  ctx.fillStyle = COLORS.WATER[0];
  ctx.fillRect(offsetX, offsetY, MAP_W * pixelSize, MAP_H * pixelSize);

  const cx = MAP_W / 2;
  const cy = MAP_H / 2;

  // Draw sand beach with tile sprites
  for (let y = 0; y < MAP_H; y += 8) {
    for (let x = 0; x < MAP_W; x += 8) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d < 62) {
        // Try to draw sand tile, fallback to pixel drawing
        if (!drawTile("SAND", x, y)) {
          drawPixel(x, y, Math.random() > 0.95 ? "#dcc080" : COLORS.SAND);
        }
      } else if (d < 68) {
        // Draw animated water tiles
        if (!drawTile("WATER", x, y, waterAnimFrame)) {
          if (Math.random() > 0.5) drawPixel(x, y, COLORS.WATER[1]);
        }
      }
    }
  }

  // Draw grass center with tile sprites
  for (let y = 0; y < MAP_H; y += 8) {
    for (let x = 0; x < MAP_W; x += 8) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d < 38) {
        // Try to draw grass tile, fallback to pixel drawing
        if (!drawTile("GRASS", x, y)) {
          drawPixel(x, y, COLORS.GRASS);
        }
      }
    }
  }

  // Draw trees
  trees.forEach((t) => drawSprite("TREE", t.x, t.y, COLORS.TREE));

  // Draw fire particles
  if (Math.random() > 0.5) {
    particles.push({ x: cx, y: cy, life: 1.0 });
  }
  particles.forEach((p, i) => {
    p.y -= 0.2;
    p.life -= 0.1;
    drawPixel(
      p.x + (Math.random() - 0.5) * 2,
      p.y,
      COLORS.FIRE[Math.floor(Math.random() * 3)]
    );
    if (p.life <= 0) particles.splice(i, 1);
  });

  // Draw fish
  fish.forEach((f) => {
    f.x += f.vx;
    f.y += f.vy;
    const d = Math.sqrt((f.x - cx) ** 2 + (f.y - cy) ** 2);
    if (d < 68) {
      f.vx *= -1;
      f.vy *= -1;
    }
    if (f.x < 0 || f.x > MAP_W) f.vx *= -1;
    if (f.y < 0 || f.y > MAP_H) f.vy *= -1;
    drawSprite("FISH", f.x, f.y, COLORS.FISH);
  });

  // Draw players
  Object.values(players).forEach((p) => {
    if (!p.alive) {
      drawSprite("SKULL", p.x, p.y, COLORS.SKULL);
      return;
    }

    // Move towards target
    p.x += (p.tx - p.x) * 0.05;
    p.y += (p.ty - p.y) * 0.05;

    // Draw player sprite
    const palette = [
      "transparent",
      "#000",
      "#fec",
      "#000",
      p.color,
      "#fff",
      "#111",
    ];
    drawSprite("PLAYER", p.x, p.y, palette);

    // Draw nametag
    const sx = offsetX + p.x * pixelSize;
    const sy = offsetY + p.y * pixelSize;
    const tagFontSize = Math.max(8, Math.floor(pixelSize * 4));
    ctx.font = `bold ${tagFontSize}px VT323, monospace`;
    ctx.textAlign = "center";
    const tw = ctx.measureText(p.id).width;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(
      sx + pixelSize * 3 - tw / 2 - 2,
      sy - tagFontSize - 2,
      tw + 4,
      tagFontSize + 2
    );
    ctx.fillStyle = p.color;
    ctx.fillText(p.id, sx + pixelSize * 3, sy - 3);

    // Draw leader crown
    if (p.isLeader) {
      drawPixel(p.x + 3, p.y - 2, "#ffd700");
      drawPixel(p.x + 2, p.y - 1, "#ffd700");
      drawPixel(p.x + 4, p.y - 1, "#ffd700");
    }

    // Draw eat popup
    if (p.eatPop > 0) {
      const progress = p.eatPop / 60;
      const rise = (1 - progress) * pixelSize * 12;
      const eatFontSize = Math.max(9, Math.floor(pixelSize * 5));
      ctx.font = `bold ${eatFontSize}px VT323, monospace`;
      ctx.textAlign = "center";
      ctx.globalAlpha = Math.min(1, progress * 3);
      ctx.fillStyle = "#a5d6a7";
      ctx.fillText("+1 🍴", sx + pixelSize * 3, sy - rise);
      ctx.globalAlpha = 1;
      p.eatPop--;
    }

    // Update bubble position
    const bubble = document.getElementById(`bubble-${p.id}`);
    if (bubble) {
      bubble.style.left = `${sx + pixelSize * 3}px`;
      bubble.style.top = `${sy - 10}px`;
    }
  });

  requestAnimationFrame(gameLoop);
}

// =============================================
// EXPORTS
// =============================================

window.spawnAgent = spawnAgent;
window.syncFish = syncFish;
window.getAgentColor = getAgentColor;
window.players = players;
window.colorIndex = colorIndex;

// Start game loop
gameLoop();
