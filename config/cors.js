// Клиентский контракт открыт любому origin любым методом, preflight тоже: доступ даёт
// токен в заголовке, cookie у API нет. CORS_ORIGINS (через запятую) сужает только
// /admin*; не задана — открыто всё. По тому же списку сокет /ws сверяет Origin сам.
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

// Ключ origin — только при непустом списке: { origin: undefined } пакет cors
// понимает как «никому», а не как дефолт.
const getCorsOptions = (raw = process.env.CORS_ORIGINS) => {
  const origins = parseCorsOrigins(raw);

  return origins ? { origin: origins } : {};
};

// Express сопоставляет маршруты без учёта регистра: /ADMIN/games — тоже админка.
const isAdminPath = (path) => /^\/admin(\/|$)/i.test(path);

const createCorsOptionsDelegate = (raw) => {
  const adminOptions = getCorsOptions(raw);

  return (req, callback) => {
    callback(null, isAdminPath(req.path) ? adminOptions : {});
  };
};

const corsOptionsDelegate = createCorsOptionsDelegate(process.env.CORS_ORIGINS);

module.exports = {
  parseCorsOrigins,
  getCorsOptions,
  isAdminPath,
  createCorsOptionsDelegate,
  corsOptionsDelegate,
};
