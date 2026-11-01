/*
 * Генератор описывает препятствия числами, не создавая объекты Phaser.
 * Выбирает шаблон и безопасный коридор; ограничивает повторы и смещение соседних проходов.
 * Сложность зависит только от активного времени полёта, поэтому пауза её не увеличивает.
 */
import { settings } from './settings.js';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export function getDifficulty(seconds) {
  const config = settings.difficulty;
  const stages = config.speedStages;
  let speed = stages[stages.length - 1].speed;

  // Линейная интерполяция соединяет значения без резких скачков на границе этапов.
  for (let index = 1; index < stages.length; index += 1) {
    if (seconds <= stages[index].time) {
      const previous = stages[index - 1];
      const next = stages[index];
      const progress = clamp((seconds - previous.time) / (next.time - previous.time), 0, 1);
      speed = previous.speed + (next.speed - previous.speed) * progress;
      break;
    }
  }

  const progress = clamp(
    (seconds - config.tightenStart) / (config.tightenEnd - config.tightenStart), 0, 1,
  );
  return {
    speed,
    gapHeight: config.startGap + (config.minGap - config.startGap) * progress,
    spacing: config.startSpacing + (config.minSpacing - config.startSpacing) * progress,
    webEnabled: seconds >= config.webUnlockTime,
  };
}

export class ObstacleGenerator {
  constructor(random = Math.random) {
    // В тестах можно передать воспроизводимый источник случайных чисел.
    this.random = random;
    this.lastPattern = null;
    this.repeatCount = 0;
    this.lastCenter = settings.player.startY;
    this.generatedCount = 0;
  }

  next(seconds) {
    const difficulty = getDifficulty(seconds);
    const config = settings.obstacles;
    let patterns = ['top', 'bottom', 'pair'];
    if (difficulty.webEnabled) patterns.push('web');
    if (this.repeatCount >= config.maxRepeats) {
      patterns = patterns.filter((pattern) => pattern !== this.lastPattern);
    }

    // Первый проход всегда центральный и знакомый; дальше выбираем из допустимых шаблонов.
    const first = this.generatedCount === 0;
    const pattern = first ? 'pair' : patterns[Math.floor(this.random() * patterns.length)];
    this.repeatCount = pattern === this.lastPattern ? this.repeatCount + 1 : 1;
    this.lastPattern = pattern;

    // Коридоры соседних наборов перекрываются с запасом для хитбокса игрока.
    // Дополнительно ограничиваем манёвр с учётом времени между препятствиями на максимальной скорости.
    const maxSpeed = settings.difficulty.speedStages.at(-1).speed;
    const travelTime = (difficulty.spacing - config.width) / maxSpeed;
    const maneuverTime = Math.max(0, travelTime - 0.5);
    const shift = Math.min(
      config.maxCenterShift,
      difficulty.gapHeight - settings.player.hitboxSize - 2 * config.safetyMargin,
      Math.min(settings.player.liftSpeed, settings.player.fallSpeed) * maneuverTime / 2,
    );
    const halfGap = difficulty.gapHeight / 2;
    const center = first ? this.lastCenter : clamp(
      this.lastCenter + (this.random() * 2 - 1) * Math.max(0, shift),
      settings.player.minY + halfGap,
      settings.player.maxY - halfGap,
    );
    this.lastCenter = center;
    this.generatedCount += 1;

    return {
      pattern,
      center,
      safeTop: center - halfGap,
      safeBottom: center + halfGap,
      spacing: difficulty.spacing,
      // Первая частица гарантирована, последующие появляются с заданной вероятностью.
      hasCollectible: first || this.random() < settings.collectible.spawnChance,
      webAtTop: pattern === 'web' && this.random() < 0.5,
    };
  }
}
