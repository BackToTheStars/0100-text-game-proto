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
// Публичные ручки лобби (см. PUBLIC_PATHS) под ограничение не попадают ни при
// каком значении CORS_ORIGINS — почему открыто: прямая агрегация лобби с чужих
// сайтов, см. lobby-split.md в brain-platform.
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

// Опции для cors(): пустой объект = дефолт пакета (открыто всем). Ключ origin
// появляется в опциях только при непустом списке — иначе cors/object-assign
// увидит origin: undefined и закроет доступ всем вместо дефолтного открытого.
const getCorsOptions = () => {
  const origins = parseCorsOrigins(process.env.CORS_ORIGINS);

  return origins ? { origin: origins } : {};
};

// Публичные ручки лобби, ранее открытые собственным cors() внутри
// modules/lobby/routes/lobby.js. Проверяются по любому методу (не только GET),
// чтобы preflight (OPTIONS) тоже получал открытые заголовки — иначе
// раньше срабатывал этот глобальный cors() по CORS_ORIGINS, preflight с
// чужого origin ответа без Access-Control-Allow-Origin не получал, и настоящий
// запрос вслед за ним не проходил бы, если бы это были не простые GET.
const PUBLIC_PATHS = ['/lobby/games', '/lobby/turns', '/lobby/games-by-hashes'];

// Опции по CORS_ORIGINS считаются один раз при загрузке модуля, а не на
// каждый запрос.
const restrictedOptions = getCorsOptions();

// req.path в app-level middleware — путь без query-строки, поэтому
// /lobby/games?codes=... тоже попадает под правило.
const corsOptionsDelegate = (req, callback) => {
  callback(null, PUBLIC_PATHS.includes(req.path) ? {} : restrictedOptions);
};

module.exports = {
  parseCorsOrigins,
  getCorsOptions,
  corsOptionsDelegate,
};
