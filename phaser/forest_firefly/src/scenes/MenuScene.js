/*
 * Главное меню: название, рекорд и начало новой попытки.
 * Блокировка перехода защищает от нескольких быстрых нажатий на кнопку.
 * На заднем плане медленно движется лес, над названием анимируется светлячок.
 */
import Phaser from 'phaser';
import { settings } from '../settings.js';
import { loadHighScore } from '../highScore.js';
import { addButton, addScreenPanel, addSoundButton } from '../ui.js';
import { gameAudio } from '../GameAudio.js';
import { ForestBackdrop } from '../visuals/ForestBackdrop.js';
import { createFirefly, animateFirefly } from '../visuals/gameArt.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.leaving = false;
    gameAudio.setAmbient(false);
    this.visualSeconds = 0;
    this.backdrop = new ForestBackdrop(this);
    addScreenPanel(this);
    const centerX = settings.width / 2;
    this.firefly = createFirefly(this, centerX, 80);
    this.firefly.object.setScale(1.5);
    this.add.text(centerX, 140, 'Лесной светлячок', {
      fontFamily: 'Arial, sans-serif', fontSize: '42px', color: '#ffd84a',
    }).setOrigin(0.5);
    this.add.text(centerX, 215, `Рекорд: ${loadHighScore()}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '26px', color: '#7fffd4',
    }).setOrigin(0.5);

    addButton(this, centerX, 305, 'Начать игру', () => {
      if (this.leaving) return;
      this.leaving = true;
      // Первый клик разрешает браузеру запустить звук. Переход не ждёт результата аудио.
      gameAudio.stopEffects();
      void gameAudio.unlock();
      // start останавливает меню и запускает игровую сцену с новой попыткой.
      this.scene.start('GameScene');
    });
    this.add.text(centerX, 400, 'Удерживай ПРОБЕЛ — вверх\nОтпусти — вниз · Esc — пауза', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#d4dce8', align: 'center',
    }).setOrigin(0.5);
    addSoundButton(this, centerX, 475);
  }

  update(time, delta) {
    const seconds = Math.min(delta, 50) / 1000;
    this.visualSeconds += seconds;
    this.backdrop.update(seconds, 25);
    animateFirefly(this.firefly, this.visualSeconds);
    this.firefly.object.y = 80 + Math.sin(this.visualSeconds * 2) * 4;
  }
}
