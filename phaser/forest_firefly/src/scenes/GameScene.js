/*
 * Игровой экран: полёт, генерация веток и паутины, частицы и счёт. Пауза блокирует обновление,
 * но оставляет доступным интерфейс. После столкновения результат передаётся отдельной сцене.
 * Лес, крылья и короткие эффекты обновляются игровым временем и замирают на паузе.
 * GameAudio озвучивает события; пауза и остановка сцены выключают лесной фон.
 */
import Phaser from 'phaser';
import { settings } from '../settings.js';
import { loadHighScore, saveHighScore } from '../highScore.js';
import { addButton, addSoundButton } from '../ui.js';
import { gameAudio } from '../GameAudio.js';
import { ObstacleGenerator, getDifficulty } from '../ObstacleGenerator.js';
import { ForestBackdrop } from '../visuals/ForestBackdrop.js';
import { createFirefly, animateFirefly, createBranch, createCollectible } from '../visuals/gameArt.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    // Ключ GameScene нужен Phaser для обращения к этой сцене.
    super('GameScene');
  }

  create() {
    // create выполняется при запуске и повторе сцены: создаём игрока и сбрасываем попытку.
    const config = settings.player;
    this.backdrop = new ForestBackdrop(this);
    this.firefly = createFirefly(this, config.startX, config.startY);
    this.player = this.firefly.object;
    this.collectEffects = [];
    this.velocityY = 0;
    this.gameOver = false;
    this.paused = false;
    gameAudio.setAmbient(true);
    this.flightSeconds = 0;
    this.score = 0;
    this.bonusScore = 0;
    this.collectibles = [];
    this.obstacles = [];
    // Создаём первую пару. Следующую держим как виртуальную координату справа за экраном.
    this.generator = new ObstacleGenerator();
    const firstSpacing = this.spawnObstacleSet(settings.obstacles.firstX);
    this.nextObstacleX = settings.obstacles.firstX + firstSpacing;
    // HUD поверх мира без сплошных подложек. Тень сохраняет читаемость текста на деревьях.
    const textShadow = { offsetX: 1, offsetY: 2, color: '#030a14', blur: 4, fill: true };
    this.scoreText = this.add.text(20, 12, 'Счёт: 0', {
      fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#ffd84a',
      shadow: textShadow,
    }).setDepth(10);
    this.bestScore = loadHighScore();
    this.bestText = this.add.text(settings.width - 20, 12, `Рекорд: ${this.bestScore}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#7fffd4',
      shadow: textShadow,
    }).setOrigin(1, 0).setDepth(10);
    this.add.text(20, settings.height - 30, 'Удерживай ПРОБЕЛ — вверх', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#a8bfcb',
      shadow: textShadow,
    }).setDepth(10);
    this.add.text(settings.width - 20, settings.height - 30, 'Esc — пауза', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#a8bfcb',
      shadow: textShadow,
    }).setOrigin(1, 0).setDepth(10);

    this.createPauseOverlay();

    // Регистрируем клавиши один раз, а не каждый кадр.
    this.flyKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // События Phaser охватывают потерю фокуса окна и скрытие вкладки.
    // Подписки на игру глобальные, поэтому обязательно снимаем их при уходе со сцены.
    const pauseOnFocusLoss = () => this.setPaused(true);
    this.game.events.on(Phaser.Core.Events.BLUR, pauseOnFocusLoss);
    this.game.events.on(Phaser.Core.Events.HIDDEN, pauseOnFocusLoss);
    this.events.once('shutdown', () => {
      gameAudio.setAmbient(false);
      this.game.events.off(Phaser.Core.Events.BLUR, pauseOnFocusLoss);
      this.game.events.off(Phaser.Core.Events.HIDDEN, pauseOnFocusLoss);
      this.input.keyboard.removeKey(this.flyKey);
      this.input.keyboard.removeKey(this.pauseKey);
    });
  }

  update(time, delta) {
    if (this.gameOver) return;
    // Проверяем Esc до раннего выхода: паузу можно снять той же клавишей.
    // JustDown срабатывает один раз на новое нажатие, а не на каждом кадре удержания.
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.setPaused(!this.paused);
    }
    if (this.paused) return;
    const config = settings.player;
    // delta приходит в миллисекундах. Ограничиваем задержку до 50 мс и переводим в секунды.
    const seconds = Math.min(delta, 50) / 1000;
    this.flightSeconds += seconds;
    // Одна скорость применяется ко всему миру: ветки, паутина и частицы не разъезжаются.
    const worldSpeed = getDifficulty(this.flightSeconds).speed;
    this.backdrop.update(seconds, worldSpeed);
    // floor отбрасывает дробь: 3.7 секунды дают 3 очка. Текст меняем только при новом очке.
    this.updateScore();
    // Удержание задаёт целевую скорость вверх, отпускание — вниз. Ось Y направлена вниз.
    const lifting = this.flyKey.isDown;
    const targetSpeed = lifting ? -config.liftSpeed : config.fallSpeed;
    const acceleration = lifting ? config.liftAcceleration : config.gravity;

    // Clamp ограничивает изменение скорости допустимым ускорением за кадр.
    // Так направление меняется плавно; путь равен скорости, умноженной на время.
    const difference = targetSpeed - this.velocityY;
    const change = Phaser.Math.Clamp(difference, -acceleration * seconds, acceleration * seconds);
    this.velocityY += change;
    this.player.y += this.velocityY * seconds;

    // На границах возвращаем центр игрока в допустимый диапазон и гасим скорость.
    const limitedY = Phaser.Math.Clamp(this.player.y, config.minY, config.maxY);
    if (limitedY !== this.player.y) {
      this.player.y = limitedY;
      this.velocityY = 0;
    }
    animateFirefly(this.firefly, this.flightSeconds, this.velocityY);

    // Хитбокс меньше изображения. Прямоугольник задаётся от левого верхнего угла.
    const hitbox = new Phaser.Geom.Rectangle(
      this.player.x - config.hitboxSize / 2,
      this.player.y - config.hitboxSize / 2,
      config.hitboxSize, config.hitboxSize,
    );
    // Двигаем ветки влево и завершаем полёт при пересечении их границ с хитбоксом.
    for (const obstacle of this.obstacles) {
      obstacle.x -= worldSpeed * seconds;
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, obstacle.getBounds())) {
        this.finishFlight();
        return;
      }
    }
    // Удаляем ушедшие ветки со сцены и из массива, чтобы не обрабатывать их дальше.
    this.obstacles = this.obstacles.filter((obstacle) => {
      if (obstacle.getBounds().right < -100) {
        obstacle.destroy();
        return false;
      }
      return true;
    });

    // Виртуальная следующая пара движется вместе с миром. Создаём её только при приближении.
    // После поражения генерация останавливается до перезапуска сцены.
    if (!this.gameOver) {
      // filter оставляет только несобранные частицы, которые ещё не ушли за экран.
      this.collectibles = this.collectibles.filter((collectible) => {
        collectible.x -= worldSpeed * seconds;
        // Пульсация меняет только внешний вид, размер зоны сбора по-прежнему постоянный.
        collectible.setScale(1 + Math.sin(this.flightSeconds * 5 + collectible.y) * 0.1);
        const size = settings.collectible.hitboxSize;
        const pickupArea = new Phaser.Geom.Rectangle(
          collectible.x - size / 2, collectible.y - size / 2, size, size,
        );
        if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, pickupArea)) {
          gameAudio.collect();
          this.bonusScore += settings.collectible.reward;
          this.showCollectEffect(collectible.x, collectible.y);
          collectible.destroy();
          return false;
        }
        if (collectible.x + size / 2 < -100) {
          collectible.destroy();
          return false;
        }
        return true;
      });
      this.updateCollectEffects(seconds);
      this.updateScore();
      this.nextObstacleX -= worldSpeed * seconds;
      while (this.nextObstacleX <= settings.obstacles.firstX) {
        this.nextObstacleX += this.spawnObstacleSet(this.nextObstacleX);
      }
    }
  }

  spawnObstacleSet(x) {
    // Генератор выбирает безопасный коридор; сцена превращает описание в видимые объекты.
    const config = settings.obstacles;
    const layout = this.generator.next(this.flightSeconds);
    const web = layout.pattern === 'web';
    const topEnd = layout.safeTop - (web && layout.webAtTop ? config.webDepth : 0);
    const bottomStart = layout.safeBottom + (web && !layout.webAtTop ? config.webDepth : 0);

    // У паутины отступает соседняя ветка: опасность не сужает уже рассчитанный проход.
    if (layout.pattern !== 'bottom') {
      this.obstacles.push(
        createBranch(this, x, 0, config.width, topEnd, true),
      );
    }
    if (layout.pattern !== 'top') {
      this.obstacles.push(
        createBranch(this, x, bottomStart, config.width, settings.height - bottomStart, false),
      );
    }
    if (web) {
      const webY = layout.webAtTop ? topEnd : layout.safeBottom;
      this.obstacles.push(this.createWeb(x, webY, config.width, config.webDepth));
    }

    // Центр безопасного коридора не пересекается ни с веткой, ни с паутиной.
    if (layout.hasCollectible) {
      const particle = settings.collectible;
      this.collectibles.push(
        createCollectible(this, x, layout.center, particle),
      );
    }
    return layout.spacing;
  }

  createWeb(x, y, width, height) {
    // Контейнер объединяет подложку и нити: весь рисунок движется как одно препятствие.
    // Его прямоугольные границы используются для столкновения, как у обычных веток.
    const web = this.add.container(x, y);
    web.add(this.add.rectangle(0, 0, width, height, settings.obstacles.webColor, 0.18)
      .setOrigin(0.5, 0));
    const threads = this.add.graphics();
    threads.lineStyle(1, settings.obstacles.webColor, 0.9);
    threads.strokeRect(-width / 2, 0, width, height);
    threads.lineBetween(-width / 2, 0, width / 2, height);
    threads.lineBetween(width / 2, 0, -width / 2, height);
    threads.lineBetween(0, 0, 0, height);
    threads.lineBetween(-width / 2, height / 2, width / 2, height / 2);
    // Вложенные ромбы образуют нити вокруг центра; рисунок не выходит за опасную область.
    for (let ring = 1; ring <= 3; ring += 1) {
      const halfWidth = width * ring / 6;
      const halfHeight = height * ring / 6;
      threads.lineBetween(0, height / 2 - halfHeight, halfWidth, height / 2);
      threads.lineBetween(halfWidth, height / 2, 0, height / 2 + halfHeight);
      threads.lineBetween(0, height / 2 + halfHeight, -halfWidth, height / 2);
      threads.lineBetween(-halfWidth, height / 2, 0, height / 2 - halfHeight);
    }
    web.add(threads);
    return web;
  }

  updateScore() {
    // Бонусы храним отдельно, чтобы пересчёт времени не стирал награду за сбор.
    const score = Math.floor(this.flightSeconds) + this.bonusScore;
    if (score !== this.score) {
      this.score = score;
      this.scoreText.setText(`Счёт: ${this.score}`);
      this.bestText.setText(`Рекорд: ${Math.max(this.bestScore, this.score)}`);
    }
  }

  showCollectEffect(x, y) {
    // Кольцо и подпись живут недолго; обновляем их вручную, чтобы пауза замораживала эффект.
    const ring = this.add.circle(x, y, 8).setStrokeStyle(2, 0x7fffd4).setDepth(4);
    const label = this.add.text(x, y - 16, `+${settings.collectible.reward}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#b8ffe0',
    }).setOrigin(0.5).setDepth(11);
    this.collectEffects.push({ ring, label, age: 0 });
  }

  updateCollectEffects(seconds) {
    this.collectEffects = this.collectEffects.filter((effect) => {
      effect.age += seconds;
      const progress = Math.min(effect.age / 0.5, 1);
      effect.ring.setScale(1 + progress * 3).setAlpha(1 - progress);
      effect.label.y -= seconds * 35;
      effect.label.setAlpha(1 - progress);
      if (progress === 1) {
        effect.ring.destroy();
        effect.label.destroy();
        return false;
      }
      return true;
    });
  }

  createPauseOverlay() {
    // Контейнер позволяет одним вызовом показать или скрыть все элементы паузы.
    const centerX = settings.width / 2;
    this.pauseOverlay = this.add.container(0, 0).setDepth(100).setVisible(false);
    this.pauseOverlay.add([
      this.add.rectangle(0, 0, settings.width, settings.height, 0x050b18, 0.9).setOrigin(0),
      this.add.text(centerX, 175, 'Пауза', {
        fontFamily: 'Arial, sans-serif', fontSize: '40px', color: '#ffd84a',
      }).setOrigin(0.5),
      addButton(this, centerX, 275, 'Продолжить (Esc)', () => this.setPaused(false)),
      addButton(this, centerX, 355, 'В меню', () => {
        if (this.gameOver) return;
        this.gameOver = true;
        saveHighScore(this.score);
        this.scene.start('MenuScene');
      }),
      addSoundButton(this, centerX, 430),
    ]);
  }

  setPaused(paused) {
    if (this.gameOver) return;
    this.paused = paused;
    this.flyKey.reset();
    this.pauseOverlay.setVisible(paused);
    // При продолжении пробуем разблокировать звук, но движение от этого не зависит.
    if (!paused) void gameAudio.unlock();
    gameAudio.setAmbient(!paused);
    if (paused) gameAudio.stopEffects();
  }

  finishFlight() {
    // Сохраняем рекорд до перехода. Данные вторым аргументом попадут в create экрана результатов.
    if (this.gameOver) return;
    this.gameOver = true;
    gameAudio.setAmbient(false);
    gameAudio.collision();
    const newRecord = saveHighScore(this.score);
    this.scene.start('ResultScene', { score: this.score, newRecord });
  }
}
