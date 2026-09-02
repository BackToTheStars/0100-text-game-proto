const { rateLimit } = require('express-rate-limit');

// Дефолты: окно минута, 10 попыток. Переопределяются переменными окружения
// LOGIN_RATE_WINDOW_MS / LOGIN_RATE_LIMIT — читаются один раз при старте
// (см. assertEnvLoginRateLimit ниже; server.js вызывает её до создания
// приложения, как assertEnvCodeHashLength).
const LOGIN_WINDOW_MS_DEFAULT = 60 * 1000;
const LOGIN_LIMIT_DEFAULT = 10;

// Целое и больше нуля — иначе express-rate-limit получит мусор (NaN/0/отрицательное
// окно или лимит) и барьер логина будет пускать или блокировать не так, как задумано.
const parsePositiveInt = (raw) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const readEnvInt = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = parsePositiveInt(raw);
  return n === null ? NaN : n;
};

// Отказ старта при некорректном значении — по образцу assertEnvCodeHashLength.
const assertEnvLoginRateLimit = () => {
  [
    ['LOGIN_RATE_WINDOW_MS', process.env.LOGIN_RATE_WINDOW_MS],
    ['LOGIN_RATE_LIMIT', process.env.LOGIN_RATE_LIMIT],
  ].forEach(([name, raw]) => {
    if (raw === undefined || raw === '') {
      return;
    }
    if (parsePositiveInt(raw) === null) {
      throw new Error(
        `${name} должен быть целым числом больше 0, получено: ${raw}`
      );
    }
  });
};

const LOGIN_WINDOW_MS = readEnvInt('LOGIN_RATE_WINDOW_MS', LOGIN_WINDOW_MS_DEFAULT);
const LOGIN_LIMIT = readEnvInt('LOGIN_RATE_LIMIT', LOGIN_LIMIT_DEFAULT);

// Ограничитель для ручек логина (защита от перебора паролей и кодов игр).
// Вешается точечно на POST /admin/auth/login и POST /codes/login, глобального
// лимита нет.
//
// Фабрика, а не готовый middleware: каждый маршрут получает свой счётчик, чтобы
// перебор админского пароля не отбирал лимит у входа по коду игры. Счётчики
// живут в памяти процесса — сервер запускается в одном экземпляре — и
// обнуляются при рестарте.
//
// skipSuccessfulRequests: в счёт идут только ответы со статусом ≥ 400. Типовой
// сценарий продукта — группа людей в одной аудитории за одним NAT вводит код
// игры; без этого флага одиннадцатый успешный вход в минуту получал бы 429
// наравне с отказом. Перебор паролей/кодов по-прежнему ловится: перебор — это
// и есть отказы, а они считаются как раньше.
const createLoginRateLimit = () =>
  rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    limit: LOGIN_LIMIT,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7', // RateLimit / RateLimit-Policy
    legacyHeaders: false,
    // 429 в общем конверте отказов: { message }
    message: { message: 'Too many login attempts. Try again in a minute.' },
  });

module.exports = {
  createLoginRateLimit,
  assertEnvLoginRateLimit,
};
