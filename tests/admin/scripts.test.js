const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { scripts, runCommand } = require('../../modules/admin/services/scripts');

// Статический реестр команд и обработка ошибок runCommand — без базы: живые
// команды не зовутся, только ошибка неизвестного скрипта/команды и подстава
// временной команды, которая гарантированно бросает. Запуск: npm test.

describe('runCommand', () => {
  it('reports an unknown script name', async () => {
    assert.deepEqual(await runCommand('NOPE', 'x'), [false, 'Script NOPE not found']);
  });

  it('reports an unknown command name', async () => {
    assert.deepEqual(await runCommand('SCRIPT_GAME_COMMON', 'nope'), [
      false,
      'Command nope not found',
    ]);
  });

  it('turns any thrown command error into [false, message] instead of propagating', async () => {
    const testScript = {
      name: '__TEST_SCRIPT__',
      description: 'test',
      commands: [
        {
          name: 'boom',
          description: 'test',
          modes: [],
          callback: async () => {
            throw new Error('boom');
          },
        },
      ],
    };
    scripts.push(testScript);
    try {
      assert.deepEqual(await runCommand('__TEST_SCRIPT__', 'boom'), [false, 'boom']);
    } finally {
      scripts.splice(scripts.indexOf(testScript), 1);
    }
  });
});

describe('command confirm flag', () => {
  const flatCommands = () =>
    scripts.flatMap((script) =>
      script.commands.map((command) => ({ script: script.name, ...command }))
    );

  it('every write command (name not starting with "check") requires confirmation', () => {
    for (const command of flatCommands()) {
      if (/^check/.test(command.name)) {
        continue;
      }
      assert.equal(
        command.confirm,
        true,
        `${command.script}.${command.name} should require confirmation`
      );
    }
  });

  it('check commands carry no confirm flag', () => {
    for (const command of flatCommands()) {
      if (/^check/.test(command.name)) {
        assert.ok(
          !command.confirm,
          `${command.script}.${command.name} should not require confirmation`
        );
      }
    }
  });
});
