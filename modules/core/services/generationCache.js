// Лениво собираемое значение со сбросом. Параллельные get() делят одну сборку;
// сборка, которую застал clear(), не записывается — ожидающие ждут новую.
const createGenerationCache = (build) => {
  let generation = 0;
  let ready = false;
  let value;
  let pending = null;

  const startBuild = () => {
    const started = generation;
    const attempt = Promise.resolve()
      .then(build)
      .then(
        (result) => {
          if (generation === started) {
            value = result;
            ready = true;
            pending = null;
          }
        },
        (error) => {
          if (generation === started) {
            pending = null;
            throw error;
          }
        }
      );
    pending = attempt;
    return attempt;
  };

  const get = async () => {
    while (!ready) {
      await (pending || startBuild());
    }
    return value;
  };

  const clear = () => {
    generation++;
    ready = false;
    value = undefined;
    pending = null;
  };

  return { get, clear };
};

module.exports = { createGenerationCache };
