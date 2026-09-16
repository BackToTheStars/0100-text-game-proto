const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { check, run } = require('../../modules/admin/services/scripts/SyncDatabase');

// На стенде BACKUP_MONGO_URL / RESTORE_MONGO_URL не заданы — check() раньше
// бросал необработанный TypeError: Invalid URL (голый 500 через runCommand).
// Запуск: npm test.

describe('SyncDatabase without BACKUP_MONGO_URL / RESTORE_MONGO_URL', () => {
  it('check() answers with a message, not a thrown TypeError', async () => {
    const [success, message] = await check();
    assert.equal(success, false);
    assert.match(message, /BACKUP_MONGO_URL/);
    assert.match(message, /RESTORE_MONGO_URL/);
  });

  it('run() answers the same way instead of shelling out with "undefined"', async () => {
    const [success, message] = await run();
    assert.equal(success, false);
    assert.match(message, /BACKUP_MONGO_URL/);
  });
});
