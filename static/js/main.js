// Main initialization

// Load sprites first, then initialize
async function init() {
  // Load sprite images
  await loadSprites();

  // Initialize canvases for all models
  Object.keys(modelStates).forEach(initCanvas);

  // Start game loop
  resizeCharts();
  gameLoop();
}

// Start initialization
init();
