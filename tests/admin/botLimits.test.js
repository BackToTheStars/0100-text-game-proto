const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  describeBotLimits,
  TELEGRAM_CLOUD_FILE_LIMIT,
  TELEGRAM_LOCAL_FILE_LIMIT,
} = require('../../modules/admin/services/botLimits');

// Конфигурация — так, как её собирает config/bot.js из данного окружения.
const configFor = (env) => ({
  BOT_UPLOAD_DAILY_LIMIT: env.BOT_UPLOAD_DAILY_LIMIT || 200000000,
  BOT_UPLOAD_FILE_TIME_LOCK: env.BOT_UPLOAD_FILE_TIME_LOCK || 10000,
  BOT_XCOM_VIDEO_MAX_FILE_SIZE: Number(env.BOT_XCOM_VIDEO_MAX_FILE_SIZE) || 100000000,
  BOT_PDF_MAX_FILE_SIZE: Number(env.BOT_PDF_MAX_FILE_SIZE) || 50 * 1024 * 1024,
  BOT_IMPORT_FILE_MAX_SIZE: Number(env.BOT_IMPORT_FILE_MAX_SIZE) || 256 * 1024,
});

const report = (env) => describeBotLimits(configFor(env), env);

describe('describeBotLimits', () => {
  it('reports code defaults when nothing is set', () => {
    const r = report({});
    assert.deepEqual(r.dailyUpload, {
      bytes: 200000000,
      value: 200000000,
      source: 'code',
      env: 'BOT_UPLOAD_DAILY_LIMIT',
    });
    assert.deepEqual(r.fileTimeLock, {
      ms: 10000,
      value: 10000,
      source: 'code',
      env: 'BOT_UPLOAD_FILE_TIME_LOCK',
    });
    assert.equal(r.pdf.bytes, 50 * 1024 * 1024);
    assert.equal(r.pdf.source, 'code');
    assert.equal(r.xcomVideo.bytes, 100000000);
    assert.equal(r.importFile.bytes, 256 * 1024);
    assert.equal('ignoredEnv' in r.pdf, false);
  });

  it('takes numbers from env and names env as the source', () => {
    const r = report({
      BOT_UPLOAD_DAILY_LIMIT: '1000000000',
      BOT_UPLOAD_FILE_TIME_LOCK: '5000',
      BOT_PDF_MAX_FILE_SIZE: '1048576',
    });
    assert.equal(r.dailyUpload.bytes, 1000000000);
    assert.equal(r.dailyUpload.value, '1000000000');
    assert.equal(r.dailyUpload.source, 'env');
    assert.equal(r.fileTimeLock.ms, 5000);
    assert.equal(r.fileTimeLock.source, 'env');
    assert.equal(r.pdf.bytes, 1048576);
    assert.equal(r.pdf.source, 'env');
  });

  it('shows a non-number daily limit as is, without a number', () => {
    const r = report({ BOT_UPLOAD_DAILY_LIMIT: '200MB', BOT_UPLOAD_FILE_TIME_LOCK: 'soon' });
    assert.equal(r.dailyUpload.value, '200MB');
    assert.equal(r.dailyUpload.bytes, null);
    assert.equal(r.dailyUpload.source, 'env');
    assert.equal(r.fileTimeLock.value, 'soon');
    assert.equal(r.fileTimeLock.ms, null);
  });

  it('marks an env value the config silently replaced with the default', () => {
    const r = report({ BOT_XCOM_VIDEO_MAX_FILE_SIZE: '100MB', BOT_IMPORT_FILE_MAX_SIZE: '0' });
    assert.equal(r.xcomVideo.bytes, 100000000);
    assert.equal(r.xcomVideo.source, 'code');
    assert.equal(r.xcomVideo.ignoredEnv, '100MB');
    assert.equal(r.importFile.source, 'code');
    assert.equal(r.importFile.ignoredEnv, '0');
  });

  it('derives the Telegram file ceiling from BOT_BASE_API_URL', () => {
    assert.deepEqual(report({}).telegram, {
      bytes: TELEGRAM_CLOUD_FILE_LIMIT,
      mode: 'cloud',
      source: 'code',
      env: 'BOT_BASE_API_URL',
    });
    const local = report({ BOT_BASE_API_URL: 'http://tg-api:8081' }).telegram;
    assert.equal(local.bytes, TELEGRAM_LOCAL_FILE_LIMIT);
    assert.equal(local.mode, 'local');
    assert.equal(local.source, 'env');
  });

  it('says whose configuration it is', () => {
    assert.match(report({}).hint, /отдельным процессом/);
    assert.match(report({ BOT_MODE: 'hook' }).hint, /BOT_MODE=hook/);
  });
});
