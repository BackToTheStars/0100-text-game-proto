const TELEGRAM_CLOUD_FILE_LIMIT = 20 * 1024 * 1024;
// Локальный Bot API сам скачивание не ограничивает; 2000 МБ — предел файла в клиенте Telegram (у Premium — 4 ГБ).
const TELEGRAM_LOCAL_FILE_LIMIT = 2000 * 1024 * 1024;

// То же приведение, что делает сравнение и setTimeout в коде бота.
const toNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// `env || default`: строка из окружения используется как есть и числом не проверяется.
const rawSetting = (name, value, env, unit) => ({
  [unit]: toNumberOrNull(value),
  value,
  source: env[name] ? 'env' : 'code',
  env: name,
});

// `Number(env) || default`: не число или ноль в окружении молча заменяются значением из кода.
const numericSetting = (name, value, env, unit) => {
  const raw = env[name];
  const fromEnv = Boolean(Number(raw));
  return {
    [unit]: value,
    value,
    source: fromEnv ? 'env' : 'code',
    env: name,
    ...(raw !== undefined && raw !== '' && !fromEnv ? { ignoredEnv: raw } : {}),
  };
};

const describeBotLimits = (config, env) => {
  const localApi = Boolean(env.BOT_BASE_API_URL);
  const hookMode = env.BOT_MODE === 'hook';

  return {
    dailyUpload: rawSetting('BOT_UPLOAD_DAILY_LIMIT', config.BOT_UPLOAD_DAILY_LIMIT, env, 'bytes'),
    fileTimeLock: rawSetting('BOT_UPLOAD_FILE_TIME_LOCK', config.BOT_UPLOAD_FILE_TIME_LOCK, env, 'ms'),
    pdf: numericSetting('BOT_PDF_MAX_FILE_SIZE', config.BOT_PDF_MAX_FILE_SIZE, env, 'bytes'),
    xcomVideo: numericSetting('BOT_XCOM_VIDEO_MAX_FILE_SIZE', config.BOT_XCOM_VIDEO_MAX_FILE_SIZE, env, 'bytes'),
    importFile: numericSetting('BOT_IMPORT_FILE_MAX_SIZE', config.BOT_IMPORT_FILE_MAX_SIZE, env, 'bytes'),
    telegram: {
      bytes: localApi ? TELEGRAM_LOCAL_FILE_LIMIT : TELEGRAM_CLOUD_FILE_LIMIT,
      mode: localApi ? 'local' : 'cloud',
      source: localApi ? 'env' : 'code',
      env: 'BOT_BASE_API_URL',
    },
    hint: hookMode
      ? 'Бот работает внутри процесса server (BOT_MODE=hook), значения — его. Суточный счётчик загрузок живёт в памяти процесса и обнуляется при перезапуске.'
      : 'Это конфигурация процесса server. Бот запущен отдельным процессом (node bot.js) и читает тот же .env — значения совпадают, если оба процесса созданы из одного файла (не проверяется). Суточный счётчик загрузок живёт в памяти процесса бота, отсюда не виден и обнуляется при его перезапуске.',
  };
};

module.exports = {
  TELEGRAM_CLOUD_FILE_LIMIT,
  TELEGRAM_LOCAL_FILE_LIMIT,
  describeBotLimits,
};
