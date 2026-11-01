/*
 * Ночной лес: неподвижное небо и три повторяющихся слоя деревьев.
 * Скорость слоёв различается, создавая параллакс. Текстуры переиспользуются между сценами.
 */
import { settings } from '../settings.js';

function prepareForest(scene) {
  if (scene.textures.exists('forest-sky')) return;
  const { width, height } = settings;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  for (let y = 0; y < height; y += 4) {
    const progress = y / height;
    const red = Math.round(7 + progress * 17);
    const green = Math.round(15 + progress * 23);
    const blue = Math.round(37 + progress * 37);
    graphics.fillStyle((red << 16) | (green << 8) | blue);
    graphics.fillRect(0, y, width, 4);
  }
  // Постоянная формула распределения даёт одинаковое небо при повторном запуске.
  for (let index = 0; index < 80; index += 1) {
    graphics.fillStyle(0xbfd2e8, 0.2 + index % 4 * 0.12);
    graphics.fillRect((index * 137 + 31) % width, (index * 79 + 17) % 350, 2, 2);
  }
  for (let radius = 65; radius >= 24; radius -= 5) {
    graphics.fillStyle(0xbabce9, 0.018);
    graphics.fillCircle(760, 104, radius);
  }
  graphics.fillStyle(0xc5c9e5);
  graphics.fillCircle(760, 104, 23);
  graphics.fillStyle(0x9badd1, 0.6);
  graphics.fillCircle(752, 97, 7);
  graphics.fillCircle(769, 111, 5);
  graphics.generateTexture('forest-sky', width, height);

  const colors = [0x1b3054, 0x122b43, 0x0b2030];
  for (let layer = 0; layer < 3; layer += 1) {
    graphics.clear();
    graphics.fillStyle(colors[layer]);
    const count = 14 - layer * 3;
    for (let index = 0; index < count; index += 1) {
      const x = 35 + index * width / count;
      const treeHeight = 150 + (index * 73 + layer * 31) % 160;
      const top = height - treeHeight;
      const trunk = 7 + layer * 5;
      graphics.fillRect(x - trunk / 2, top, trunk, treeHeight);
      // Несколько треугольных ярусов образуют простой силуэт хвойного дерева.
      for (let tier = 0; tier < 4; tier += 1) {
        const tip = top + tier * treeHeight * 0.14;
        const halfWidth = 20 + tier * 10 + layer * 3;
        graphics.fillTriangle(x, tip, x - halfWidth, tip + 85, x + halfWidth, tip + 85);
      }
    }
    graphics.fillRect(0, height - 18 - layer * 7, width, 40);
    graphics.generateTexture(`forest-layer-${layer}`, width, height);
  }
  graphics.destroy();
}

export class ForestBackdrop {
  constructor(scene) {
    prepareForest(scene);
    const { width, height } = settings;
    scene.add.image(0, 0, 'forest-sky').setOrigin(0).setDepth(-30);
    this.layers = [0.15, 0.35, 0.65].map((factor, index) => ({
      factor,
      image: scene.add.tileSprite(0, 0, width, height, `forest-layer-${index}`)
        .setOrigin(0).setDepth(-25 + index),
    }));
  }

  update(seconds, worldSpeed) {
    // Меняем смещение текстуры, а не создаём новые деревья. Остаток предотвращает рост числа.
    for (const layer of this.layers) {
      layer.image.tilePositionX =
        (layer.image.tilePositionX + worldSpeed * seconds * layer.factor) % settings.width;
    }
  }
}
