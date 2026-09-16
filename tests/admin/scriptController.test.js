process.env.ADMIN_MODE = 'production';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { list } = require('../../modules/admin/controllers/Script');

// Форма списка команд для C3 (кнопка подтверждения): каждая команда несёт
// булев confirm. ADMIN_MODE=production в этом файле процесса node --test —
// без него реестр отфильтровался бы в пустоту (ADMIN_MODE по умолчанию
// 'unknown', в списки режимов не входит). Запуск: npm test.

const runList = () =>
  new Promise((resolve, reject) => {
    const res = { json: (body) => resolve(body) };
    list({}, res, reject);
  });

describe('Script list (admin controller)', () => {
  it('every command carries a boolean confirm field', async () => {
    const { items } = await runList();
    assert.ok(items.length > 0);
    for (const script of items) {
      for (const command of script.commands) {
        assert.equal(typeof command.confirm, 'boolean');
      }
    }
  });

  it('a write command is confirm: true, a check command is confirm: false', async () => {
    const { items } = await runList();
    const gameCommon = items.find((script) => script.name === 'SCRIPT_GAME_COMMON');
    assert.ok(gameCommon, 'SCRIPT_GAME_COMMON should be visible in production mode');
    const remove = gameCommon.commands.find((c) => c.name === 'removeCodeHashLength');
    const check = gameCommon.commands.find((c) => c.name === 'checkCodeHashLength');
    assert.equal(remove.confirm, true);
    assert.equal(check.confirm, false);
  });
});
