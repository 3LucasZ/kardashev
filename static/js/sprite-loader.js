/**
 * Sprite loader - loads pixel art images from URLs
 * Falls back to programmatic drawing if images fail to load
 */

// =============================================
// SPRITE IMAGE URLS
// =============================================

// Using Kenney's free CC0 pixel art assets and data URLs
const SPRITE_URLS = {
  // Water tile (animated)
  WATER: [
    createWaterTile(0),
    createWaterTile(1),
  ],

  // Sand tile
  SAND: createSandTile(),

  // Grass tile
  GRASS: createGrassTile(),

  // Character sprite
  PLAYER: createPlayerSprite(),

  // Fish sprite
  FISH: createFishSprite(),

  // Tree sprite
  TREE: createTreeSprite(),

  // Skull sprite
  SKULL: createSkullSprite(),
};

// =============================================
// SPRITE GENERATORS (Data URLs)
// =============================================

function createWaterTile(frame = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Dark blue water with lighter waves
  ctx.fillStyle = frame === 0 ? '#28648c' : '#2c709e';
  ctx.fillRect(0, 0, 8, 8);

  // Add some wave pixels
  ctx.fillStyle = '#3a8bb8';
  if (frame === 0) {
    ctx.fillRect(1, 2, 2, 1);
    ctx.fillRect(5, 5, 2, 1);
  } else {
    ctx.fillRect(2, 3, 2, 1);
    ctx.fillRect(6, 6, 1, 1);
  }

  return canvas.toDataURL();
}

function createSandTile() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Base sand color
  ctx.fillStyle = '#e6c288';
  ctx.fillRect(0, 0, 8, 8);

  // Add texture with random darker pixels
  ctx.fillStyle = '#dcc080';
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(Math.random() * 8);
    const y = Math.floor(Math.random() * 8);
    ctx.fillRect(x, y, 1, 1);
  }

  return canvas.toDataURL();
}

function createGrassTile() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Base grass color
  ctx.fillStyle = '#66bb6a';
  ctx.fillRect(0, 0, 8, 8);

  // Add darker grass blades
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(2, 1, 1, 2);
  ctx.fillRect(5, 3, 1, 2);
  ctx.fillRect(1, 5, 1, 2);
  ctx.fillRect(6, 6, 1, 1);

  return canvas.toDataURL();
}

function createPlayerSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 6;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Simple character sprite
  // Head
  ctx.fillStyle = '#fec';
  ctx.fillRect(1, 1, 4, 1);
  ctx.fillRect(1, 2, 4, 1);
  ctx.fillRect(1, 3, 4, 1);

  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(2, 2, 1, 1);
  ctx.fillRect(3, 2, 1, 1);

  // Outline
  ctx.fillStyle = '#000';
  ctx.fillRect(1, 0, 4, 1);
  ctx.fillRect(0, 1, 1, 4);
  ctx.fillRect(5, 1, 1, 4);
  ctx.fillRect(1, 4, 4, 1);

  // Body (will be colored per agent)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 5, 6, 1);
  ctx.fillRect(0, 6, 6, 1);
  ctx.fillRect(0, 7, 6, 1);

  return canvas.toDataURL();
}

function createFishSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 3;
  const ctx = canvas.getContext('2d');

  // Fish body
  ctx.fillStyle = '#88ccff';
  ctx.fillRect(1, 0, 2, 1);
  ctx.fillRect(0, 1, 3, 1);
  ctx.fillRect(1, 2, 2, 1);

  // Tail
  ctx.fillStyle = '#88ccff';
  ctx.fillRect(3, 1, 1, 1);

  // Eye
  ctx.fillStyle = '#000';
  ctx.fillRect(2, 1, 1, 1);

  return canvas.toDataURL();
}

function createTreeSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 6;
  canvas.height = 6;
  const ctx = canvas.getContext('2d');

  // Leaves
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(2, 0, 2, 1);
  ctx.fillRect(1, 1, 4, 1);
  ctx.fillRect(0, 2, 6, 1);
  ctx.fillRect(1, 3, 4, 1);

  // Trunk
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(2, 4, 2, 1);
  ctx.fillRect(2, 5, 2, 1);

  return canvas.toDataURL();
}

function createSkullSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 5;
  canvas.height = 5;
  const ctx = canvas.getContext('2d');

  // Skull shape
  ctx.fillStyle = '#ddd';
  ctx.fillRect(1, 0, 3, 1);
  ctx.fillRect(0, 1, 5, 1);
  ctx.fillRect(0, 2, 5, 1);
  ctx.fillRect(1, 3, 3, 1);
  ctx.fillRect(1, 4, 1, 1);
  ctx.fillRect(3, 4, 1, 1);

  // Eye sockets
  ctx.fillStyle = '#000';
  ctx.fillRect(1, 2, 1, 1);
  ctx.fillRect(3, 2, 1, 1);

  return canvas.toDataURL();
}

// =============================================
// IMAGE LOADING
// =============================================

const loadedImages = {};
const imageLoadPromises = [];

function loadImage(key, url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      loadedImages[key] = img;
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to load sprite: ${key}`);
      resolve(null); // Resolve with null instead of rejecting
    };
    img.src = url;
  });
}

// Load all sprites
for (const [key, url] of Object.entries(SPRITE_URLS)) {
  if (Array.isArray(url)) {
    // Handle animated sprites (multiple frames)
    url.forEach((frameUrl, index) => {
      const frameKey = `${key}_${index}`;
      imageLoadPromises.push(loadImage(frameKey, frameUrl));
    });
  } else {
    imageLoadPromises.push(loadImage(key, url));
  }
}

// =============================================
// EXPORTS
// =============================================

window.spriteLoader = {
  loadedImages,
  ready: Promise.all(imageLoadPromises),
  getSprite: (key) => loadedImages[key] || null,
  getAnimatedSprite: (key, frame) => loadedImages[`${key}_${frame}`] || loadedImages[key] || null,
};

// Log when sprites are loaded
window.spriteLoader.ready.then(() => {
  console.log(`✅ Loaded ${Object.keys(loadedImages).length} sprite images`);
});
