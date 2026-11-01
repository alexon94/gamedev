/*
 * Общий звук игры через Web Audio: процедурный лесной фон и короткие сигналы событий.
 * Контекст создаётся после действия пользователя. Настройка тишины хранится в localStorage.
 * Пауза, потеря фокуса и переходы останавливают фон, не создавая новые аудиоконтексты.
 */
const storageKey = 'forest_firefly.muted';

export class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.forestBuffer = null;
    this.ambient = null;
    this.wantsAmbient = false;
    this.effects = new Set();
    this.muted = false;
    this.focused = true;
    this.detachFocus = null;
    this.destroyed = false;
    try {
      this.muted = globalThis.localStorage.getItem(storageKey) === 'true';
    } catch {
      // Недоступное сохранение не мешает переключать звук в текущем запуске.
    }
  }

  get supported() {
    return Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  }

  async unlock() {
    // Вызывается кнопками старта, продолжения и включения звука, а не при загрузке страницы.
    if (this.destroyed || !this.supported || this.muted) return false;
    try {
      if (!this.context) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.context.destination);
        this.bindFocus();
      }
      if (this.context.state !== 'running') await this.context.resume();
      if (this.destroyed) return false;
      // После ожидания ещё раз проверяем актуальные флаги: пользователь мог успеть включить паузу.
      this.syncAmbient();
      return this.context.state === 'running';
    } catch {
      // Если браузер запретил звук, игра продолжает работать без него.
      return false;
    }
  }

  bindFocus() {
    const window = globalThis.window;
    const document = globalThis.document;
    if (!window || !document) return;
    const stop = () => {
      this.focused = false;
      this.stopAmbient();
      this.stopEffects();
    };
    const focus = () => {
      this.focused = !document.hidden;
      // Сам фокус не возобновляет звук: пользователь должен продолжить игру явно.
    };
    const visibility = () => document.hidden ? stop() : focus();
    this.focused = !document.hidden && document.hasFocus();
    window.addEventListener('blur', stop);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    this.detachFocus = () => {
      window.removeEventListener('blur', stop);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visibility);
    };
  }

  toggleMuted() {
    this.muted = !this.muted;
    try {
      globalThis.localStorage.setItem(storageKey, String(this.muted));
    } catch {
      // Оставляем настройку в памяти, даже если запись запрещена.
    }
    if (this.muted) {
      this.stopAmbient();
      this.stopEffects();
    } else {
      void this.unlock();
    }
    return this.muted;
  }

  setAmbient(enabled) {
    this.wantsAmbient = enabled;
    this.syncAmbient();
  }

  syncAmbient() {
    const allowed = !this.destroyed && this.wantsAmbient && !this.muted && this.focused &&
      this.context?.state === 'running';
    if (!allowed) {
      this.stopAmbient();
      return;
    }
    if (this.ambient) return;

    // Один зацикленный буфер: лёгкий шум ветра и редкие стрекочущие импульсы.
    if (!this.forestBuffer) this.forestBuffer = this.createForestBuffer();
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.4);
    source.buffer = this.forestBuffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(this.master);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    this.ambient = { source, gain };
    source.start();
  }

  createForestBuffer() {
    const duration = 8;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let breeze = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / this.context.sampleRate;
      breeze = (breeze + (Math.random() * 2 - 1) * 0.015) / 1.02;
      const beat = time % 2;
      const chirp = beat < 0.16 ? Math.sin(Math.PI * beat / 0.16) ** 2 : 0;
      // Края буфера затихают, чтобы стык цикла не щёлкал.
      const fade = Math.min(1, time / 0.1, (duration - time) / 0.1);
      samples[index] = (breeze * 0.8 + Math.sin(time * Math.PI * 2 * 2400) * chirp * 0.08) * fade;
    }
    return buffer;
  }

  playNotes(notes) {
    if (this.destroyed || this.muted || !this.focused || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    for (const note of notes) {
      const source = this.context.createOscillator();
      const gain = this.context.createGain();
      const start = now + (note.delay ?? 0);
      source.type = note.type ?? 'sine';
      source.frequency.setValueAtTime(note.from, start);
      source.frequency.exponentialRampToValueAtTime(note.to ?? note.from, start + note.duration);
      // Плавная атака и затухание убирают резкие щелчки короткого сигнала.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(note.volume ?? 0.13, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
      source.connect(gain);
      gain.connect(this.master);
      const effect = { source, gain };
      this.effects.add(effect);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        this.effects.delete(effect);
      };
      source.start(start);
      source.stop(start + note.duration + 0.02);
    }
  }

  collect() {
    this.playNotes([
      { from: 880, to: 1320, duration: 0.1 },
      { from: 1320, to: 1760, duration: 0.14, delay: 0.07, volume: 0.09 },
    ]);
  }

  collision() {
    this.playNotes([{ from: 180, to: 55, duration: 0.22, type: 'triangle', volume: 0.18 }]);
  }

  newRecord() {
    this.playNotes([660, 880, 1100].map((frequency, index) => ({
      from: frequency, duration: 0.25, delay: 0.28 + index * 0.13, volume: 0.11,
    })));
  }

  stopAmbient() {
    if (!this.ambient) return;
    const { source, gain } = this.ambient;
    this.ambient = null;
    gain.gain.cancelScheduledValues(this.context.currentTime);
    gain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    source.stop(this.context.currentTime + 0.04);
  }

  stopEffects() {
    for (const effect of this.effects) {
      effect.gain.gain.cancelScheduledValues(this.context.currentTime);
      effect.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.005);
      effect.source.stop(this.context.currentTime + 0.02);
    }
  }

  destroy() {
    // Освобождение для завершения игры или тестов; при переходах контекст переиспользуется.
    if (this.destroyed) return;
    this.destroyed = true;
    this.wantsAmbient = false;
    const ambient = this.ambient;
    this.stopAmbient();
    this.stopEffects();
    // После закрытия контекста событие ended может не прийти: освобождаем узлы сами.
    if (ambient) {
      ambient.source.onended = null;
      ambient.source.disconnect();
      ambient.gain.disconnect();
    }
    for (const effect of this.effects) {
      effect.source.onended = null;
      effect.source.disconnect();
      effect.gain.disconnect();
    }
    this.effects.clear();
    this.forestBuffer = null;
    this.detachFocus?.();
    this.detachFocus = null;
    this.master?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
  }
}

export const gameAudio = new GameAudio();
