/*
 * Проверки чистой логики генератора: пределы сложности, повторы и безопасные коридоры.
 * Запуск: node --test. Они не заменяют проверку ощущения полёта в браузере.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { settings } from '../src/settings.js';
import { ObstacleGenerator, getDifficulty } from '../src/ObstacleGenerator.js';

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('сложность плавно растёт и останавливается на заданных пределах', () => {
  assert.equal(getDifficulty(0).speed, 220);
  assert.equal(getDifficulty(15).speed, 220);
  assert.equal(getDifficulty(35).speed, 245);
  assert.equal(getDifficulty(60).speed, 275);
  assert.equal(getDifficulty(90).speed, 310);
  assert.equal(getDifficulty(10000).speed, 310);
  assert.equal(getDifficulty(35).gapHeight, 190);
  assert.equal(getDifficulty(90).gapHeight, 150);
  assert.equal(getDifficulty(10000).spacing, 340);

  let previous = getDifficulty(0);
  for (let time = 0.1; time <= 120; time += 0.1) {
    const current = getDifficulty(time);
    assert.ok(current.speed >= previous.speed && current.speed <= 310);
    assert.ok(current.speed - previous.speed < 0.2);
    assert.ok(current.gapHeight <= previous.gapHeight && current.gapHeight >= 150);
    assert.ok(current.spacing >= 340 && current.spacing <= 380);
    previous = current;
  }
});

test('в длинных последовательностях соблюдаются повторы, границы и запас для сбора', () => {
  const patterns = new Set();
  for (let seed = 1; seed <= 20; seed += 1) {
    const generator = new ObstacleGenerator(seededRandom(seed));
    let previousCenter = settings.player.startY;
    let previousPattern = null;
    let repeats = 0;
    for (let index = 0; index < 500; index += 1) {
      const time = index * 1.5;
      const layout = generator.next(time);
      patterns.add(layout.pattern);
      repeats = layout.pattern === previousPattern ? repeats + 1 : 1;
      assert.ok(repeats <= settings.obstacles.maxRepeats);
      assert.ok(layout.safeBottom - layout.safeTop >= 150 - 1e-9);
      assert.ok(layout.safeTop >= settings.player.minY - 1e-9);
      assert.ok(layout.safeBottom <= settings.player.maxY + 1e-9);
      assert.ok(Math.abs(layout.center - previousCenter) <= settings.obstacles.maxCenterShift + 1e-9);
      assert.ok(layout.spacing >= settings.difficulty.minSpacing);

      // Зона сбора и хитбокс игрока помещаются в коридоре с запасом.
      const margin = settings.obstacles.safetyMargin;
      const halfSize = Math.max(settings.player.hitboxSize, settings.collectible.hitboxSize) / 2;
      assert.ok(layout.center - halfSize >= layout.safeTop + margin);
      assert.ok(layout.center + halfSize <= layout.safeBottom - margin);
      if (time < 15) assert.notEqual(layout.pattern, 'web');
      if (index === 0) {
        assert.equal(layout.center, settings.player.startY);
        assert.equal(layout.pattern, 'pair');
        assert.equal(layout.hasCollectible, true);
      }
      previousCenter = layout.center;
      previousPattern = layout.pattern;
    }
  }
  assert.deepEqual([...patterns].sort(), ['bottom', 'pair', 'top', 'web']);
});

test('паутина открывается по времени, а одинаковый seed воспроизводит маршрут', () => {
  assert.equal(getDifficulty(14.99).webEnabled, false);
  assert.equal(getDifficulty(15).webEnabled, true);
  const first = new ObstacleGenerator(seededRandom(42));
  const second = new ObstacleGenerator(seededRandom(42));
  for (let index = 0; index < 100; index += 1) {
    assert.deepEqual(first.next(index * 2), second.next(index * 2));
  }
});

test('ограничение повторов действует даже при постоянном источнике случайности', () => {
  for (const random of [() => 0, () => 0.999999]) {
    const generator = new ObstacleGenerator(random);
    let last = null;
    let count = 0;
    for (let index = 0; index < 100; index += 1) {
      const layout = generator.next(100);
      count = last === layout.pattern ? count + 1 : 1;
      assert.ok(count <= 2);
      last = layout.pattern;
    }
  }
});
