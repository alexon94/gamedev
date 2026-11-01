/*
 * Проверки сохранения рекорда: повреждённые значения, запись только улучшения и ошибки хранения.
 * Каждый тест получает отдельный экземпляр модуля и подмену хранилища, не трогая данные браузера.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

let moduleId = 0;
const freshModule = () => import(`../src/highScore.js?test=${moduleId++}`);

async function withStorage(storage, callback) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    await callback();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
}

test('отсутствующие, повреждённые и недопустимые рекорды заменяются нулём', async () => {
  for (const value of [null, '', 'broken', 'NaN', 'Infinity', '-20', '1.5', '9007199254740992']) {
    await withStorage({ getItem: () => value }, async () => {
      const score = await freshModule();
      assert.equal(score.loadHighScore(), 0, String(value));
    });
  }
});

test('записывается только новый рекорд, который восстанавливается после нового запуска', async () => {
  const values = new Map([['forest_firefly.high_score', '42']]);
  let writes = 0;
  await withStorage({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { writes += 1; values.set(key, value); },
  }, async () => {
    const score = await freshModule();
    assert.equal(score.loadHighScore(), 42);
    for (const value of [0, 20, 42, -5, NaN, Infinity, 1.5]) {
      assert.equal(score.saveHighScore(value), false);
    }
    assert.equal(writes, 0);
    assert.equal(score.saveHighScore(60), true);
    assert.equal(writes, 1);
    assert.equal((await freshModule()).loadHighScore(), 60);
  });
});

test('запрет чтения и записи оставляет рабочий рекорд в памяти', async () => {
  await withStorage({
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  }, async () => {
    const score = await freshModule();
    assert.equal(score.loadHighScore(), 0);
    assert.equal(score.saveHighScore(25), true);
    assert.equal(score.loadHighScore(), 25);
    assert.equal(score.saveHighScore(10), false);
    assert.equal(score.loadHighScore(), 25);
  });
});

test('ошибка записи не теряет загруженный и новый рекорд', async () => {
  await withStorage({
    getItem: () => '80',
    setItem() { throw new Error('quota exceeded'); },
  }, async () => {
    const score = await freshModule();
    assert.equal(score.loadHighScore(), 80);
    assert.equal(score.saveHighScore(100), true);
    assert.equal(score.loadHighScore(), 100);
  });
});
