/*
 * Проверки управления звуком без аудиоустройства: контекст, пауза, тишина и очистка.
 * Подмена Web Audio проверяет вызовы и состояния, а не качество звучания в браузере.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../src/GameAudio.js';

function fakeEnvironment({ stored = null, storageBlocked = false, resumeBlocked = false } = {}) {
  const originals = new Map();
  const writes = [];
  const contexts = [];
  const windowEvents = new Map();
  const documentEvents = new Map();
  const param = () => ({
    value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {},
  });
  const node = () => ({ connect() {}, disconnect() {} });
  class FakeContext {
    constructor() {
      this.state = 'suspended';
      this.sampleRate = 100;
      this.currentTime = 0;
      this.destination = {};
      this.sources = [];
      contexts.push(this);
    }
    createGain() { return { ...node(), gain: param() }; }
    createBuffer(channels, length) {
      const samples = new Float32Array(length);
      return { getChannelData: () => samples };
    }
    createBufferSource() { return this.source(); }
    createOscillator() { return this.source(); }
    source() {
      const source = {
        ...node(), frequency: param(), starts: 0, stops: 0,
        start() { this.starts += 1; }, stop() { this.stops += 1; },
      };
      this.sources.push(source);
      return source;
    }
    async resume() {
      if (resumeBlocked) throw new Error('blocked');
      this.state = 'running';
    }
    async close() { this.state = 'closed'; }
  }
  const events = (map) => ({
    addEventListener: (name, callback) => map.set(name, callback),
    removeEventListener: (name) => map.delete(name),
  });
  const values = {
    AudioContext: FakeContext,
    webkitAudioContext: undefined,
    localStorage: {
      getItem() { if (storageBlocked) throw new Error('blocked'); return stored; },
      setItem(key, value) { if (storageBlocked) throw new Error('blocked'); writes.push([key, value]); },
    },
    window: events(windowEvents),
    document: { ...events(documentEvents), hidden: false, hasFocus: () => true },
  };
  for (const [key, value] of Object.entries(values)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  return {
    contexts, writes, windowEvents, documentEvents,
    restore() {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

test('контекст создаётся после разрешения, фон не дублируется и останавливается на паузе', async () => {
  const env = fakeEnvironment();
  const audio = new GameAudio();
  try {
    audio.setAmbient(true);
    assert.equal(env.contexts.length, 0);
    assert.equal(await audio.unlock(), true);
    const first = audio.ambient;
    audio.setAmbient(true);
    await audio.unlock();
    assert.equal(audio.ambient, first);
    assert.equal(env.contexts.length, 1);
    assert.equal(first.source.starts, 1);
    audio.setAmbient(false);
    assert.equal(audio.ambient, null);
    assert.equal(first.source.stops, 1);
    audio.setAmbient(true);
    assert.notEqual(audio.ambient, first);
    assert.equal(env.contexts.length, 1);
  } finally { audio.destroy(); env.restore(); }
});

test('отключение сохраняется, запрещает эффекты и не создаёт контекст при старте', async () => {
  const env = fakeEnvironment({ stored: 'true' });
  const audio = new GameAudio();
  try {
    assert.equal(audio.muted, true);
    assert.equal(await audio.unlock(), false);
    audio.collect();
    assert.equal(env.contexts.length, 0);
    assert.equal(audio.toggleMuted(), false);
    await audio.unlock();
    audio.setAmbient(true);
    audio.collect();
    assert.equal(audio.effects.size, 2);
    assert.equal(audio.toggleMuted(), true);
    assert.equal(audio.ambient, null);
    const count = env.contexts[0].sources.length;
    audio.collision();
    assert.equal(env.contexts[0].sources.length, count);
    assert.deepEqual(env.writes.at(-1), ['forest_firefly.muted', 'true']);
    for (const effect of [...audio.effects]) effect.source.onended();
    assert.equal(audio.effects.size, 0);
  } finally { audio.destroy(); env.restore(); }
});

test('потеря фокуса останавливает фон и эффекты; один возврат фокуса не включает звук', async () => {
  const env = fakeEnvironment();
  const audio = new GameAudio();
  try {
    await audio.unlock();
    audio.setAmbient(true);
    audio.newRecord();
    const effects = [...audio.effects];
    env.windowEvents.get('blur')();
    assert.equal(audio.ambient, null);
    assert.ok(effects.every((effect) => effect.source.stops === 2));
    env.windowEvents.get('focus')();
    assert.equal(audio.ambient, null);
    audio.setAmbient(true);
    assert.ok(audio.ambient);
    globalThis.document.hidden = true;
    env.documentEvents.get('visibilitychange')();
    assert.equal(audio.ambient, null);
    audio.destroy();
    assert.equal(env.windowEvents.size, 0);
    assert.equal(env.documentEvents.size, 0);
  } finally { env.restore(); }
});

test('недоступное хранилище и отказ браузера запускать аудио не ломают управление', async () => {
  const env = fakeEnvironment({ storageBlocked: true, resumeBlocked: true });
  const audio = new GameAudio();
  try {
    assert.equal(await audio.unlock(), false);
    audio.setAmbient(true);
    audio.collect();
    assert.equal(audio.ambient, null);
    assert.equal(audio.effects.size, 0);
    assert.doesNotThrow(() => audio.toggleMuted());
  } finally { audio.destroy(); env.restore(); }
});

test('многократные попытки и завершение не копят контексты, эффекты и подписки', async () => {
  const env = fakeEnvironment();
  const audio = new GameAudio();
  try {
    await audio.unlock();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      audio.setAmbient(true);
      audio.collect();
      for (const effect of [...audio.effects]) effect.source.onended();
      audio.setAmbient(false);
      assert.equal(audio.ambient, null);
      assert.equal(audio.effects.size, 0);
    }
    assert.equal(env.contexts.length, 1);
    assert.equal(env.windowEvents.size, 2);
    audio.newRecord();
    audio.destroy();
    assert.equal(audio.effects.size, 0);
    assert.equal(audio.forestBuffer, null);
    assert.equal(env.windowEvents.size, 0);
    assert.equal(env.documentEvents.size, 0);
    assert.doesNotThrow(() => audio.destroy());
    assert.equal(await audio.unlock(), false);
  } finally { audio.destroy(); env.restore(); }
});

test('при отсутствии Web Audio игра может переключать настройку без исключений', async () => {
  const env = fakeEnvironment();
  globalThis.AudioContext = undefined;
  const audio = new GameAudio();
  try {
    assert.equal(audio.supported, false);
    assert.equal(await audio.unlock(), false);
    assert.doesNotThrow(() => {
      audio.setAmbient(true);
      audio.collect();
      audio.collision();
      audio.toggleMuted();
    });
    assert.equal(env.contexts.length, 0);
  } finally { audio.destroy(); env.restore(); }
});
