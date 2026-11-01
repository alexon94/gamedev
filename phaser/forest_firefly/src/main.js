/*
 * Точка входа: создаёт игру Phaser в HTML-контейнере game и запускает меню.
 * Размеры и фон берутся из settings; поле вписывается в окно с сохранением пропорций.
 */
import Phaser from 'phaser';
import { settings } from './settings.js';
import { GameScene } from './scenes/GameScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { gameAudio } from './GameAudio.js';
import './style.css';

const game = new Phaser.Game({
  // AUTO выбирает WebGL или Canvas; parent — ID контейнера из index.html.
  type: Phaser.AUTO,
  parent: 'game',
  width: settings.width,
  height: settings.height,
  backgroundColor: settings.backgroundColor,
  // Звуком управляет GameAudio через Web Audio; второй аудиоконтекст Phaser не нужен.
  audio: { noAudio: true },
  scale: {
    // FIT сохраняет пропорции поля, CENTER_BOTH центрирует его в окне.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Первая сцена в списке запускается при старте игры.
  scene: [MenuScene, GameScene, ResultScene],
});

// При полном завершении Phaser освобождаем наш отдельный аудиоконтекст и глобальные подписки.
game.events.once(Phaser.Core.Events.DESTROY, () => gameAudio.destroy());
