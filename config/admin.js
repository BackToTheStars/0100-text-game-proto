const ADMIN_MODE = process.env.ADMIN_MODE || 'unknown';

const MODE_LOCAL = 'local';
const MODE_DEVELOPMENT = 'development';
const MODE_PRODUCTION = 'production';

module.exports = {
  ADMIN_MODE,

  MODE_LOCAL,
  MODE_DEVELOPMENT,
  MODE_PRODUCTION,
};
