// Game configuration and sprite definitions

const SPRITES = {
  PLAYER: [
    [0, 4, 4, 4, 4, 4, 4, 0], // Hat/Helmet Top (Outline + Color)
    [0, 2, 2, 2, 2, 2, 2, 0], // Hat Brim (Full Color)
    [0, 2, 3, 2, 2, 3, 2, 0], // Eyes (Skin + Dark Eyes)
    [0, 2, 2, 2, 2, 2, 2, 0], // Face/Chin (Skin)
    [0, 4, 4, 4, 4, 4, 4, 0], // Shoulders (Outline + Color)
    [0, 2, 4, 4, 4, 4, 2, 0], // Arms + Chest with White Emblem/Scarf (5)
    [0, 0, 4, 4, 4, 4, 0, 0], // Pants (Dark Grey)
    [0, 0, 4, 0, 0, 4, 0, 0], // Boots (Black)
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
    [1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 0],
    [0, 0, 2, 2, 0, 0],
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
  CAMPFIRE: [
    [0, 0, 1, 2, 1, 0, 0],
    [0, 1, 2, 3, 2, 1, 0],
    [1, 2, 3, 2, 1, 2, 1],
    [0, 0, 4, 4, 4, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  HOUSE: [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 2, 2, 2, 2, 2, 0],
    [0, 2, 3, 2, 2, 2, 0],
    [0, 2, 3, 2, 4, 2, 0],
    [0, 2, 2, 2, 4, 2, 0],
  ],
};

const COLORS = {
  FISH: ["transparent", "#4dd0e1", "#26c6da", "#00acc1"],
  TREE: ["transparent", "#2e7d32", "#5d4037"],
  SKULL: ["transparent", "#ddd", "#555"],
  WATER: ["#28648c", "#2c709e"],
  SAND: "#e6c288",
  GRASS: "#66bb6a",
  FIRE: ["transparent", "#d84315", "#f4511e", "#ff6e40", "#5d4037"],
  CAMPFIRE: ["transparent", "#d84315", "#f4511e", "#ff6e40", "#5d4037"],
  HOUSE: ["transparent", "#8d6e63", "#d7ccc8", "#6d4c41", "#5d4037"],
};

const COLOR_PALETTE = [
  "#e57373",
  "#81c784",
  "#64b5f6",
  "#fff176",
  "#ba68c8",
  "#4dd0e1",
  "#ff8a65",
  "#f06292",
  "#aed581",
  "#4db6ac",
  "#dce775",
  "#7986cb",
  "#a1887f",
  "#90a4ae",
  "#ffb300",
  "#26c6da",
  "#ef5350",
  "#66bb6a",
  "#42a5f5",
  "#ab47bc",
  "#26a69a",
];

const MODEL_COLORS = {
  sonnet: "#4fc3f7",
  opus: "#ba68c8",
  haiku: "#81c784",
};

const MAP_W = 160;
const MAP_H = 120;
