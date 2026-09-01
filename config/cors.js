// Глобальный CORS API.
//
// Историческое поведение — `cors()` без опций, то есть `Access-Control-Allow-Origin: *`
// для всех: с API ходят и клиент, и лобби, и локальные сборки с разных портов.
// Прод от этого открыт любому сайту, поэтому его можно сузить списком:
// CORS_ORIGINS — origin'ы через запятую (`https://brain-dance.net,https://www.brain-dance.net`).
//
// Переменная не задана (или пуста) → поведение прежнее, дев-стенды не ломаются.
// Задана → заголовки получают только перечисленные origin'ы.
//
// Публичные GET /lobby/* под ограничение не попадают: у них свой открытый cors()
// в modules/lobby/routes/lobby.js — на них опирается агрегация лобби с чужих сайтов.
const parseCorsOrigins = (raw) => {
  if (typeof raw !== 'string') {
    return null;
  }
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : null;
};

// Опции для cors(): пустой объект = дефолт пакета (открыто всем).
const getCorsOptions = () => {
  const origins = parseCorsOrigins(process.env.CORS_ORIGINS);

  return origins ? { origin: origins } : {};
};

module.exports = {
  parseCorsOrigins,
  getCorsOptions,
};
