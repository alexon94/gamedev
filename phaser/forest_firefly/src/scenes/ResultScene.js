/*
 * Экран результатов принимает итог попытки и предлагает повтор или меню.
 * Клавиша R регистрируется заново при запуске и удаляется при уходе со сцены.
 * Общий лесной фон и панель связывают оформление с главным меню.
 */
import Phaser from 'phaser';
import { settings } from '../settings.js';
import { loadHighScore } from '../highScore.js';
import { addButton, addScreenPanel, addSoundButton } from '../ui.js';
import { gameAudio } from '../GameAudio.js';
import { ForestBackdrop } from '../visuals/ForestBackdrop.js';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data) {
    this.leaving = false;
    gameAudio.setAmbient(false);
    this.backdrop = new ForestBackdrop(this);
    addScreenPanel(this);
    const centerX = settings.width / 2;
    this.add.text(centerX, 110, 'Полёт окончен', {
      fontFamily: 'Arial, sans-serif', fontSize: '40px', color: '#ffd84a',
    }).setOrigin(0.5);
    this.add.text(centerX, 205,
      `Счёт: ${data.score ?? 0}\nРекорд: ${loadHighScore()}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#ffffff', align: 'center',
      }).setOrigin(0.5);
    if (data.newRecord) {
      gameAudio.newRecord();
      this.add.text(centerX, 275, 'Новый рекорд!', {
        fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#7fffd4',
      }).setOrigin(0.5);
    }
    addButton(this, centerX, 340, 'Повторить (R)', () => this.goTo('GameScene'));
    addButton(this, centerX, 415, 'В меню', () => this.goTo('MenuScene'));
    addSoundButton(this, centerX, 480);

    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.restartKey.reset();
    this.events.once('shutdown', () => this.input.keyboard.removeKey(this.restartKey));
  }

  update(time, delta) {
    this.backdrop.update(Math.min(delta, 50) / 1000, 18);
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.goTo('GameScene');
  }

  goTo(sceneKey) {
    // Переход происходит на следующем шаге Phaser, поэтому блокируем повторный запрос.
    if (this.leaving) return;
    this.leaving = true;
    gameAudio.stopEffects();
    void gameAudio.unlock();
    this.scene.start(sceneKey);
  }
}
