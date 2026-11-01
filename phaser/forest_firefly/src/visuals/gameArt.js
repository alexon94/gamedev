/*
 * Процедурная графика: общие текстуры, светлячок, ветки и собираемые огоньки.
 * Изображения создаются один раз на игру. Визуальные эффекты не меняют хитбоксы.
 */
import { settings } from '../settings.js';

const keys = {
  glow: 'firefly-glow', body: 'firefly-body', wing: 'firefly-wing', bark: 'forest-bark',
};

export function prepareGameArt(scene) {
  if (scene.textures.exists(keys.body)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

  // Полупрозрачные круги имитируют мягкое свечение без фильтров и внешних изображений.
  for (let radius = 30; radius >= 4; radius -= 2) {
    graphics.fillStyle(0xffdc72, 0.025);
    graphics.fillCircle(32, 32, radius);
  }
  graphics.generateTexture(keys.glow, 64, 64);
  graphics.clear();

  // Небольшой силуэт смотрит вправо: светящееся брюшко, голова, глаз и ножки.
  graphics.fillStyle(0x423954);
  graphics.fillRect(10, 22, 2, 5);
  graphics.fillRect(20, 22, 2, 4);
  graphics.fillStyle(0x756644);
  graphics.fillEllipse(15, 18, 25, 18);
  graphics.fillStyle(0xffd35d);
  graphics.fillEllipse(12, 18, 20, 16);
  graphics.fillStyle(0xffed9c);
  graphics.fillEllipse(10, 16, 12, 10);
  graphics.fillStyle(0x66503e);
  graphics.fillCircle(25, 15, 7);
  graphics.fillStyle(0xffe9a3);
  graphics.fillCircle(26, 14, 5);
  graphics.fillStyle(0x15263b);
  graphics.fillRect(27, 12, 2, 3);
  graphics.lineStyle(1, 0xffe9a3);
  graphics.lineBetween(26, 8, 27, 4);
  graphics.generateTexture(keys.body, 36, 32);
  graphics.clear();

  graphics.fillStyle(0xc4e4ea, 0.75);
  graphics.fillEllipse(12, 8, 22, 12);
  graphics.lineStyle(1, 0xffffff, 0.6);
  graphics.lineBetween(3, 8, 21, 8);
  graphics.generateTexture(keys.wing, 24, 16);
  graphics.clear();

  // Бесшовный по вертикали участок коры повторяется вдоль ветки любой высоты.
  graphics.fillStyle(0x243d43);
  graphics.fillRect(0, 0, 48, 64);
  graphics.fillStyle(0x3b5854);
  graphics.fillRect(4, 0, 6, 64);
  graphics.fillRect(24, 0, 3, 64);
  graphics.fillStyle(0x142c38);
  graphics.fillRect(38, 0, 8, 64);
  graphics.lineStyle(2, 0x172f39);
  graphics.lineBetween(17, 0, 14, 28);
  graphics.lineBetween(14, 28, 19, 45);
  graphics.lineBetween(19, 45, 17, 64);
  graphics.lineBetween(32, 0, 34, 32);
  graphics.lineBetween(34, 32, 32, 64);
  graphics.fillStyle(0x658568);
  graphics.fillRect(5, 12, 4, 8);
  graphics.fillRect(25, 42, 3, 5);
  graphics.generateTexture(keys.bark, 48, 64);
  graphics.destroy();
}

export function createFirefly(scene, x, y) {
  prepareGameArt(scene);
  const glow = scene.add.image(0, 0, keys.glow).setScale(1.3);
  const farWing = scene.add.image(-2, -8, keys.wing).setOrigin(0.8, 0.7).setAlpha(0.55);
  const body = scene.add.image(0, 0, keys.body).setDisplaySize(settings.player.size, settings.player.size);
  const nearWing = scene.add.image(-2, -5, keys.wing).setOrigin(0.8, 0.7);
  const object = scene.add.container(x, y, [glow, farWing, body, nearWing]).setDepth(3);
  return { object, glow, farWing, nearWing };
}

export function animateFirefly(firefly, seconds, velocityY = 0) {
  // Меняем только рисунок и угол контейнера. Координаты центра и хитбокс остаются прежними.
  firefly.nearWing.rotation = -0.5 + Math.sin(seconds * 45) * 0.55;
  firefly.farWing.rotation = -0.8 - Math.sin(seconds * 45) * 0.4;
  firefly.glow.alpha = 0.75 + Math.sin(seconds * 4) * 0.15;
  firefly.object.rotation = Math.max(-0.18, Math.min(velocityY / 1800, 0.18));
}

export function createBranch(scene, x, y, width, height, fromTop) {
  const branch = scene.add.container(x, y);
  branch.add(scene.add.tileSprite(0, 0, width, height, keys.bark).setOrigin(0.5, 0));
  // Мох и срез остаются внутри исходного прямоугольника: видимая опасность совпадает с границами.
  const tipY = fromTop ? height - 6 : 0;
  branch.add(scene.add.rectangle(0, tipY, width, 6, 0x78966b).setOrigin(0.5, 0));
  const moss = scene.add.graphics();
  moss.fillStyle(0x456a57);
  for (let index = 0; index < 5; index += 1) {
    const mossY = fromTop ? height - 18 - index % 2 * 5 : 6;
    moss.fillRect(-width / 2 + index * width / 5, mossY, width / 5, 12);
  }
  branch.add(moss);
  return branch;
}

export function createCollectible(scene, x, y, config) {
  const glow = scene.add.image(0, 0, keys.glow).setTint(config.color).setScale(0.65).setAlpha(0.6);
  const core = scene.add.rectangle(0, 0, config.radius * 1.4, config.radius * 1.4, config.color)
    .setAngle(45);
  const center = scene.add.circle(0, 0, 3, 0xe4fff4);
  return scene.add.container(x, y, [glow, core, center]).setDepth(2);
}
