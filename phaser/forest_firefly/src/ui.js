/*
 * Общий интерфейс: текстовые кнопки, переключатель звука и панель экранов.
 * Кнопка возвращается как объект Phaser, который можно добавить в контейнер.
 */
import { settings } from './settings.js';
import { gameAudio } from './GameAudio.js';

export function addButton(scene, x, y, label, onClick) {
  const button = scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif', fontSize: '24px',
    color: '#e8fff1', backgroundColor: '#285547',
    padding: { x: 24, y: 12 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  // pointerup активирует действие после отпускания мыши или касания.
  button.on('pointerup', onClick);
  button.on('pointerover', () => button.setBackgroundColor('#356b60'));
  button.on('pointerout', () => button.setBackgroundColor('#285547'));
  return button;
}

export function addScreenPanel(scene) {
  // Затемняем центральную область: текст читается независимо от рисунка леса за ним.
  scene.add.rectangle(settings.width / 2, settings.height / 2, 580, 490, 0x071522, 0.9)
    .setStrokeStyle(1, 0x5e8e7a, 0.65);
}

export function addSoundButton(scene, x, y) {
  const label = () => !gameAudio.supported ? 'Звук недоступен' :
    gameAudio.muted ? 'Звук: выкл' : 'Звук: вкл';
  const button = addButton(scene, x, y, label(), () => gameAudio.toggleMuted())
    .setFontSize(18).setPadding(16, 8);
  if (!gameAudio.supported) button.disableInteractive();

  // Надпись отражает общую настройку даже при переходе с другого экрана.
  const refresh = () => {
    const nextLabel = label();
    if (button.text !== nextLabel) button.setText(nextLabel);
  };
  scene.events.on('update', refresh);
  scene.events.once('shutdown', () => scene.events.off('update', refresh));
  return button;
}
