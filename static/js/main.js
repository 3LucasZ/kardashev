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

  // Set up disaster input
  document
    .getElementById("disaster-input")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendDisaster(e.target.value);
      }
    });
}

// Start initialization
init();
