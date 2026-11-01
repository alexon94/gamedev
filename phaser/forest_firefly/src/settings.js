/*
 * Параметры поля, игрока, собираемых частиц, генерации и роста сложности.
 */
export const settings = {
  // Логическое разрешение и фон; масштабирование окна настраивается в main.js.
  width: 960,
  height: 540,
  backgroundColor: '#08152d',
  player: {
    // Координаты центра, размер изображения и меньшего хитбокса — в пикселях.
    startX: 240,
    startY: 270,
    size: 32,
    hitboxSize: 22,
    color: 0xffd84a,
    // Скорости в px/с, ускорения в px/с². Знак направления задаёт игровая сцена.
    liftSpeed: 260,
    fallSpeed: 320,
    liftAcceleration: 1200,
    gravity: 720,
    // Допустимые координаты центра по вертикали, с отступами от краёв экрана.
    minY: 64,
    maxY: 476,
  },
  collectible: {
    // Радиус изображения и размер зоны сбора в пикселях; награда — в очках.
    radius: 7,
    hitboxSize: 24,
    color: 0x7fffd4,
    reward: 10,
    spawnChance: 0.6,
  },
  obstacles: {
    // Размеры в пикселях. Шаг между наборами всегда больше ширины препятствия.
    width: 48,
    firstX: 1150,
    color: 0x527c69,
    webColor: 0xc3a4ef,
    webDepth: 36,
    maxCenterShift: 55,
    safetyMargin: 16,
    maxRepeats: 2,
  },
  difficulty: {
    // Ключевые точки роста скорости: между ними используется плавная интерполяция.
    speedStages: [
      { time: 0, speed: 220 },
      { time: 15, speed: 220 },
      { time: 35, speed: 245 },
      { time: 60, speed: 275 },
      { time: 90, speed: 310 },
    ],
    webUnlockTime: 15,
    // Сужение проходов начинается позже появления паутины.
    tightenStart: 35,
    tightenEnd: 90,
    startGap: 190,
    minGap: 150,
    startSpacing: 380,
    minSpacing: 340,
  },
};
