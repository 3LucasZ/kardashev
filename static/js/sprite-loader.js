// Sprite loader - DEPRECATED
// All sprites are now defined as pixel arrays in config.js
// This file is kept for backwards compatibility but is no longer used

const spriteImages = {};

// Empty load function for compatibility
function loadSprites() {
  return Promise.resolve();
}

// Unused functions kept for reference
function recolorSprite() { return null; }
function getPlayerSprite() { return null; }
function getFishSprite() { return null; }
