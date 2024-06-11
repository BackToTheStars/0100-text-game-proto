const { getError } = require('../../core/services/errors');
const { runCommand, scripts } = require('../services/scripts');

const list = async (req, res, next) => {
  try {
    res.json({ items: scripts });
  } catch (err) {
    next(err);
  }
};

const run = async (req, res, next) => {
  try {
    const { scriptName, commandName, params } = req.body;

    const script = scripts.find((item) => item.name === scriptName);

    if (!script) {
      throw getError(`Script ${scriptName} not found`, 404);
    }

    const command = script.commands.find((item) => item.name === commandName);
    if (!command) {
      throw getError(`Command ${commandName} not found`, 404);
    }
    const [success, result] = await runCommand(scriptName, commandName, params);

    res.json({
      success,
      result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, run };
