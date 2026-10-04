import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';

const targetDirs = [
  path.resolve('./pi-client/images'),
  path.resolve('./public/images')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const width = 480;
const height = 360;

function drawImage(sceneType, title, subtitle, hexColor) {
  const frameData = Buffer.alloc(width * height * 4);

  // Parse primary color
  const rBase = parseInt(hexColor.slice(1, 3), 16);
  const gBase = parseInt(hexColor.slice(3, 5), 16);
  const bBase = parseInt(hexColor.slice(5, 7), 16);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Dark background gradient
      const grad = (y / height) * 0.4 + 0.1;
      let r = Math.floor(15 * grad + 10);
      let g = Math.floor(23 * grad + 15);
      let b = Math.floor(42 * grad + 25);

      // Grid lines
      if (x % 40 === 0 || y % 40 === 0) {
        r = Math.min(255, r + 15);
        g = Math.min(255, g + 25);
        b = Math.min(255, b + 35);
      }

      // Border box (HUD reticle)
      if (
        (x >= 30 && x <= 450 && (y === 30 || y === 330)) ||
        (y >= 30 && y <= 330 && (x === 30 || x === 450))
      ) {
        r = rBase;
        g = gBase;
        b = bBase;
      }

      // Center crosshair / circular graphic
      const dx = x - 240;
      const dy = y - 180;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= 75 && dist <= 82) {
        r = rBase;
        g = gBase;
        b = bBase;
      }

      if (sceneType === 1) {
        // Plant leaves pattern
        if (y > 180 && dist < 120 && Math.sin(x * 0.1) * 30 + 220 > y) {
          r = 34;
          g = 197;
          b = 94;
        }
      } else if (sceneType === 2) {
        // Mist droplet sparkles
        const noise = (Math.sin(x * 12.3 + y * 7.7) * 43758.5453) % 1;
        if (dist < 130 && noise > 0.85) {
          r = 56;
          g = 189;
          b = 248;
        }
      } else if (sceneType === 3) {
        // Fan blade radial pattern
        const angle = Math.atan2(dy, dx);
        if (dist < 80 && Math.sin(angle * 4) > 0.4) {
          r = 245;
          g = 158;
          b = 11;
        }
      }

      frameData[idx] = r;
      frameData[idx + 1] = g;
      frameData[idx + 2] = b;
      frameData[idx + 3] = 255;
    }
  }

  const rawImageData = {
    data: frameData,
    width,
    height
  };

  return jpeg.encode(rawImageData, 85).data;
}

const images = [
  {
    name: 'image001.jpg',
    scene: 1,
    title: 'CAM-01: CANOPY',
    subtitle: 'TEMP: 28.5C | FAN: ON | MIST: OFF',
    color: '#22c55e'
  },
  {
    name: 'image002.jpg',
    scene: 2,
    title: 'CAM-02: MIST NOZZLE',
    subtitle: 'TEMP: 29.2C | FAN: ON | MIST: ON',
    color: '#38bdf8'
  },
  {
    name: 'image003.jpg',
    scene: 3,
    title: 'CAM-03: EXHAUST FAN',
    subtitle: 'TEMP: 27.8C | FAN: OFF | MIST: ON',
    color: '#f59e0b'
  }
];

for (const img of images) {
  const jpegBuf = drawImage(img.scene, img.title, img.subtitle, img.color);
  for (const dir of targetDirs) {
    const dest = path.join(dir, img.name);
    fs.writeFileSync(dest, jpegBuf);
    console.log(`Wrote ${dest} (${jpegBuf.length} bytes)`);
  }
}
console.log('Sample images generated successfully!');
