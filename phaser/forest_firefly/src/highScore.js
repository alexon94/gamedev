/*
 * Рекорд игры: проверка значения, чтение и запись localStorage.
 * Если хранилище недоступно, рекорд остаётся в памяти до перезагрузки страницы.
 */
const storageKey = 'forest_firefly.high_score';
let highScore = 0;
let loaded = false;

export function loadHighScore() {
  // Читаем один раз: переходы между сценами не должны терять рекорд из памяти.
  if (!loaded) {
    loaded = true;
    try {
      const value = Number(globalThis.localStorage.getItem(storageKey));
      if (Number.isSafeInteger(value) && value >= 0) highScore = value;
    } catch {
      // Браузер может запретить доступ к хранилищу; игре это не мешает.
    }
  }
  return highScore;
}

export function saveHighScore(score) {
  const previous = loadHighScore();
  if (!Number.isSafeInteger(score) || score <= previous) return false;

  // Сначала обновляем память: новый рекорд доступен даже при ошибке записи.
  highScore = score;
  try {
    globalThis.localStorage.setItem(storageKey, String(highScore));
  } catch {
    // При недоступной записи значение сохранено только в текущем запуске.
  }
  return true;
}
