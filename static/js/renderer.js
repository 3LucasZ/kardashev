// Rendering engine for pixel art

function initCanvas(modelName) {
  const state = modelStates[modelName];
  state.canvas = document.getElementById(`canvas-${modelName}`);
  state.ctx = state.canvas.getContext("2d");

  const container = document.getElementById("game-container");
  state.W = container.clientWidth;
  state.H = container.clientHeight;
  state.canvas.width = state.W;
  state.canvas.height = state.H;

  // CRITICAL: Disable image smoothing for pixel art
  state.ctx.imageSmoothingEnabled = false;
  state.ctx.mozImageSmoothingEnabled = false;
  state.ctx.webkitImageSmoothingEnabled = false;
  state.ctx.msImageSmoothingEnabled = false;

  generateIsland(modelName);
}

function drawPixel(state, x, y, color) {
  state.ctx.fillStyle = color;
  const pixelW = state.W / MAP_W,
    pixelH = state.H / MAP_H;
  const size = Math.min(pixelW, pixelH);
  const offsetX = (state.W - size * MAP_W) / 2,
    offsetY = (state.H - size * MAP_H) / 2;
  state.ctx.fillRect(
    offsetX + Math.floor(x) * size,
    offsetY + Math.floor(y) * size,
    Math.ceil(size),
    Math.ceil(size),
  );
}

function drawSprite(state, key, x, y, palette) {
  const grid = SPRITES[key];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] > 0) drawPixel(state, x + c, y + r, palette[grid[r][c]]);
}

function drawImageSprite(state, image, x, y, scale = 1) {
  if (!image) return;

  const pixelSize = Math.min(state.W / MAP_W, state.H / MAP_H);
  const offsetX = (state.W - pixelSize * MAP_W) / 2;
  const offsetY = (state.H - pixelSize * MAP_H) / 2;

  const sx = offsetX + Math.floor(x) * pixelSize;
  const sy = offsetY + Math.floor(y) * pixelSize;
  const w = image.width * pixelSize * scale;
  const h = image.height * pixelSize * scale;

  state.ctx.drawImage(image, sx, sy, w, h);
}

function gameLoop() {
  Object.entries(modelStates).forEach(([modelName, state]) => {
    // Update idle walking behavior
    updateIdleWalking(modelName);

    const ctx = state.ctx;
    const W = state.W,
      H = state.H;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);

    const pixelSize = Math.min(W / MAP_W, H / MAP_H);
    const offsetX = (W - pixelSize * MAP_W) / 2,
      offsetY = (H - pixelSize * MAP_H) / 2;

    // Draw water
    ctx.fillStyle = COLORS.WATER[0];
    ctx.fillRect(offsetX, offsetY, MAP_W * pixelSize, MAP_H * pixelSize);

    const cx = MAP_W / 2,
      cy = MAP_H / 2;

    // Draw island (sand ring)
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d < 62) {
          drawPixel(
            state,
            x,
            y,
            Math.random() > 0.95 ? "#dcc080" : COLORS.SAND,
          );
        } else if (d < 68) {
          if (Math.random() > 0.5) drawPixel(state, x, y, COLORS.WATER[1]);
        }
      }
    }

    // Draw grass center
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d < 38) drawPixel(state, x, y, COLORS.GRASS);
      }
    }

    // Draw houses for each alive agent
    state.houses.forEach((h) =>
      drawSprite(state, "HOUSE", h.x, h.y, COLORS.HOUSE),
    );

    // Draw trees
    state.trees.forEach((t) =>
      drawSprite(state, "TREE", t.x, t.y, COLORS.TREE),
    );

    // Draw campfire at island center
    drawSprite(state, "CAMPFIRE", cx - 3, cy - 2, COLORS.CAMPFIRE);

    // Animated fire particles above campfire
    if (Math.random() > 0.5)
      state.particles.push({ x: cx, y: cy - 3, life: 1.0 });
    state.particles.forEach((p, i) => {
      p.y -= 0.2;
      p.life -= 0.1;
      drawPixel(
        state,
        p.x + (Math.random() - 0.5) * 2,
        p.y,
        COLORS.FIRE[Math.floor(Math.random() * COLORS.FIRE.length)],
      );
      if (p.life <= 0) state.particles.splice(i, 1);
    });

    // Draw fish (keep them in the pond only)
    state.fish.forEach((f) => {
      f.x += f.vx;
      f.y += f.vy;
      const d = Math.sqrt((f.x - cx) ** 2 + (f.y - cy) ** 2);

      // Fish must stay in pond: outside island (>65) but inside outer ring (<95)
      const minRadius = 65; // Just outside island
      const maxRadius = 75; // Inner edge of map

      if (d < minRadius) {
        // Too close to island - push away
        const angle = Math.atan2(f.y - cy, f.x - cx);
        f.x = cx + Math.cos(angle) * minRadius;
        f.y = cy + Math.sin(angle) * minRadius;
        f.vx *= -1;
        f.vy *= -1;
      } else if (d > maxRadius) {
        // Too far from center - bounce back
        const angle = Math.atan2(f.y - cy, f.x - cx);
        f.x = cx + Math.cos(angle) * maxRadius;
        f.y = cy + Math.sin(angle) * maxRadius;
        f.vx *= -1;
        f.vy *= -1;
      }

      // Always use pixel art sprites from config.js
      drawSprite(state, "FISH", f.x, f.y, COLORS.FISH);
    });

    // Draw players
    Object.values(state.players).forEach((p) => {
      if (!p.alive) {
        drawSprite(state, "SKULL", p.x, p.y, COLORS.SKULL);
        return;
      }

      // Pixelated movement - move in discrete steps
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.2) {
        // Lower threshold slightly for smoother end-movement
        // Move at constant speed (Slowed down from 0.5 to 0.2)
        const speed = 0.2;
        const moveX = (dx / dist) * speed;
        const moveY = (dy / dist) * speed;

        // We use float addition here so slow speeds accumulate correctly.
        // The draw functions (drawPixel/drawImageSprite) use Math.floor(),
        // so the visual result stays snapped to the pixel grid.
        p.x += moveX;
        p.y += moveY;
      } else {
        // Snap to target when very close
        p.x = p.tx;
        p.y = p.ty;
      }

      // Always use pixel art sprites from config.js
      const palette = [
        "transparent", // 0
        "#000", // 1 - outline
        "#fec", // 2 - skin
        "#222", // 3 - eyes
        p.color, // 4 - body/clothes (agent color)
      ];
      drawSprite(state, "PLAYER", p.x, p.y, palette);

      // Draw name tag
      {
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
          tagFontSize + 2,
        );
        ctx.fillStyle = p.color;
        ctx.fillText(p.id, sx + pixelSize * 3, sy - 3);
      }

      // Draw leader crown
      if (p.isLeader) {
        drawPixel(state, p.x + 3, p.y - 2, "#ffd700");
        drawPixel(state, p.x + 2, p.y - 1, "#ffd700");
        drawPixel(state, p.x + 4, p.y - 1, "#ffd700");
      }

      // Draw eat animation
      if (p.eatPop > 0) {
        const progress = p.eatPop / 60;
        const sx = offsetX + p.x * pixelSize;
        const sy = offsetY + p.y * pixelSize;
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
      const bubble = document.getElementById(`bubble-${modelName}-${p.id}`);
      if (bubble) {
        const sx = offsetX + p.x * pixelSize;
        const sy = offsetY + p.y * pixelSize;
        bubble.style.left = `${sx + pixelSize * 3}px`;
        bubble.style.top = `${sy - 10}px`;
      }
    });
  });

  requestAnimationFrame(gameLoop);
}

function resizeGame() {
  Object.keys(modelStates).forEach(initCanvas);
  resizeCharts();
}

window.addEventListener("resize", resizeGame);
