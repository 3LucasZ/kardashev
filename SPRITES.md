# Sprite System

The game now uses actual pixel art sprite images instead of programmatically drawn pixels!

## How It Works

The sprite system loads pixel art images and renders them on the canvas:

1. **`sprite-loader.js`** - Loads sprite images (built-in or custom)
2. **`game.js`** - Renders sprites using `drawImage()`
3. **Fallback** - Uses programmatic drawing if images fail to load

## Built-in Sprites

The game includes generated sprites for:
- 🌊 **Water** - Animated water tiles (2 frames)
- 🏖️ **Sand** - Beach sand tiles with texture
- 🌱 **Grass** - Green grass tiles with blades
- 👤 **Player** - Character sprites (auto-colored per agent)
- 🐟 **Fish** - Swimming fish
- 🌳 **Tree** - Palm trees
- 💀 **Skull** - Death marker

## Using Custom Sprites

### Option 1: External URLs

Edit `static/js/sprite-loader.js` and replace the URLs:

```javascript
const SPRITE_URLS = {
  WATER: [
    'https://example.com/water1.png',
    'https://example.com/water2.png',
  ],
  SAND: 'https://example.com/sand.png',
  GRASS: 'https://example.com/grass.png',
  PLAYER: 'https://example.com/character.png',
  FISH: 'https://example.com/fish.png',
  TREE: 'https://example.com/tree.png',
  SKULL: 'https://example.com/skull.png',
};
```

### Option 2: Local Files

1. Add your sprites to `static/assets/sprites/`:
```bash
static/assets/sprites/
├── water1.png
├── water2.png
├── sand.png
├── grass.png
├── character.png
├── fish.png
├── tree.png
└── skull.png
```

2. Update the URLs in `sprite-loader.js`:
```javascript
const SPRITE_URLS = {
  WATER: [
    '/static/assets/sprites/water1.png',
    '/static/assets/sprites/water2.png',
  ],
  SAND: '/static/assets/sprites/sand.png',
  // ... etc
};
```

### Option 3: Sprite Sheets

For advanced users, you can use a sprite sheet:

```javascript
// Load sprite sheet
const spriteSheet = new Image();
spriteSheet.src = '/static/assets/sprites/sheet.png';

spriteSheet.onload = () => {
  // Extract individual sprites
  loadedImages.WATER = extractSprite(spriteSheet, 0, 0, 8, 8);
  loadedImages.SAND = extractSprite(spriteSheet, 8, 0, 8, 8);
  // ... etc
};

function extractSprite(sheet, x, y, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
  return canvas;
}
```

## Sprite Requirements

### Size Guidelines
- **Tiles** (water, sand, grass): 8×8 pixels
- **Player**: 6×8 pixels
- **Fish**: 4×3 pixels
- **Tree**: 6×6 pixels
- **Skull**: 5×5 pixels

### Format
- PNG with transparency recommended
- Keep pixel art aesthetic (no anti-aliasing)
- Use indexed colors for smaller file size

### Color Palette
For consistency, use these colors:
- Water: `#28648c`, `#2c709e`, `#3a8bb8`
- Sand: `#e6c288`, `#dcc080`
- Grass: `#66bb6a`, `#4caf50`
- Fish: `#88ccff`
- Trees: `#2e7d32` (leaves), `#5d4037` (trunk)

## Free Pixel Art Resources

### Recommended Sites (CC0/Free)

1. **Kenney.nl** ⭐
   - https://kenney.nl/assets
   - Huge collection of CC0 game assets
   - Look for "Pixel" category

2. **OpenGameArt.org**
   - https://opengameart.org/
   - Filter by "Public Domain" or "CC0"
   - Search for "pixel art"

3. **itch.io**
   - https://itch.io/game-assets/free
   - Many free pixel art packs
   - Check licenses

4. **Craftpix.net**
   - https://craftpix.net/freebies/
   - Free game assets section

5. **Pixelart.io**
   - https://pixelart.io/
   - Free online pixel art maker

### Creating Your Own

Use these free tools:
- **Piskel** - https://www.piskelapp.com/ (browser-based)
- **Aseprite** - $20 (best pixel art editor)
- **GIMP** - Free (set pencil tool to 1px)
- **Photoshop/Photopea** - Disable anti-aliasing

## Animated Sprites

The system supports animated sprites (like water waves):

```javascript
const SPRITE_URLS = {
  WATER: [
    'frame1.png',  // Frame 0
    'frame2.png',  // Frame 1
    'frame3.png',  // Frame 2
  ],
};

// In game code:
drawTile("WATER", x, y, currentFrame);
```

## Performance Tips

### Optimization
1. **Use small sprites** - Larger sprites = slower rendering
2. **Limit animation frames** - 2-3 frames is usually enough
3. **Cache colored sprites** - Avoid recoloring every frame
4. **Use sprite sheets** - Reduces HTTP requests

### File Size
```bash
# Optimize PNGs with pngquant
pngquant sprite.png --output sprite-optimized.png

# Or use ImageOptim (Mac)
# Or use TinyPNG.com (online)
```

## Examples

### Example 1: Using Kenney's Assets

```javascript
const SPRITE_URLS = {
  PLAYER: 'https://kenney.nl/content/3-assets/122-tiny-town/Buildings/houseSmall1.png',
  // etc...
};
```

### Example 2: Custom Water Animation

```javascript
function createAnimatedWater() {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');

    // Animate wave height based on frame
    const waveOffset = Math.sin(i * Math.PI / 2) * 2;

    ctx.fillStyle = '#28648c';
    ctx.fillRect(0, 0, 8, 8);

    ctx.fillStyle = '#3a8bb8';
    ctx.fillRect(0, 3 + waveOffset, 8, 2);

    frames.push(canvas.toDataURL());
  }
  return frames;
}
```

## Troubleshooting

### Sprites not loading
1. Check browser console for errors
2. Verify URLs are correct
3. Check CORS if using external URLs
4. Try local files first

### Sprites look blurry
Make sure `imageSmoothingEnabled` is false:
```javascript
ctx.imageSmoothingEnabled = false;
```

### Colors wrong
For player sprites, white pixels (`#fff`) are automatically recolored to the agent's color. Other colors remain unchanged.

### Performance issues
- Reduce sprite size
- Use fewer animation frames
- Cache colored sprites
- Consider using sprite sheets

## Contributing Sprites

If you create cool sprites, consider:
1. Using CC0 or MIT license
2. Sharing on OpenGameArt.org
3. Submitting a PR with your sprites!

Sprite dimensions should match the originals for best results.
