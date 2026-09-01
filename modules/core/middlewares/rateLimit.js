const { rateLimit } = require('express-rate-limit');

const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_LIMIT = 10;

// Ограничитель для ручек логина: 10 запросов в минуту с одного IP
// (защита от перебора паролей и кодов игр). Вешается точечно на POST /admin/auth/login
// и POST /codes/login, глобального лимита нет.
//
// Фабрика, а не готовый middleware: каждый маршрут получает свой счётчик, чтобы
// перебор админского пароля не отбирал лимит у входа по коду игры. Счётчики
// живут в памяти процесса — сервер запускается в одном экземпляре — и
// обнуляются при рестарте.
const createLoginRateLimit = () =>
  rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    limit: LOGIN_LIMIT,
    standardHeaders: 'draft-7', // RateLimit / RateLimit-Policy
    legacyHeaders: false,
    // 429 в общем конверте отказов: { message }
    message: { message: 'Too many login attempts. Try again in a minute.' },
  });

module.exports = {
  createLoginRateLimit,
};
