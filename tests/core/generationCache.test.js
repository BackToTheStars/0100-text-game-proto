const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  createGenerationCache,
} = require('../../modules/core/services/generationCache');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Сборка, которой тест управляет вручную: каждая следующая ждёт своего resolve.
const controlledBuild = () => {
  const builds = [];
  const build = () => {
    const d = deferred();
    builds.push(d);
    return d.promise;
  };
  return { build, builds };
};

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('createGenerationCache', () => {
  it('parallel calls share one build', async () => {
    const { build, builds } = controlledBuild();
    const cache = createGenerationCache(build);

    const calls = Array.from({ length: 30 }, () => cache.get());
    await tick();
    assert.equal(builds.length, 1);

    const index = { name: 'index' };
    builds[0].resolve(index);
    const results = await Promise.all(calls);
    assert.ok(results.every((result) => result === index));
    assert.equal(await cache.get(), index);
    assert.equal(builds.length, 1);
  });

  it('a build that started before clear is not stored: the waiter gets the next build', async () => {
    const { build, builds } = controlledBuild();
    const cache = createGenerationCache(build);

    const early = cache.get();
    await tick();
    assert.equal(builds.length, 1);

    cache.clear();
    builds[0].resolve('stale');
    await tick();
    assert.equal(builds.length, 2);

    builds[1].resolve('fresh');
    assert.equal(await early, 'fresh');
    assert.equal(await cache.get(), 'fresh');
    assert.equal(builds.length, 2);
  });

  it('calls before and after clear share the rebuild', async () => {
    const { build, builds } = controlledBuild();
    const cache = createGenerationCache(build);

    const early = cache.get();
    await tick();
    cache.clear();
    const late = cache.get();
    await tick();
    assert.equal(builds.length, 2);

    builds[0].resolve('stale');
    builds[1].resolve('fresh');
    assert.deepEqual(await Promise.all([early, late]), ['fresh', 'fresh']);
    assert.equal(builds.length, 2);
  });

  it('clear after a finished build makes the next call rebuild', async () => {
    let count = 0;
    const cache = createGenerationCache(async () => ++count);

    assert.equal(await cache.get(), 1);
    assert.equal(await cache.get(), 1);
    cache.clear();
    assert.equal(await cache.get(), 2);
  });

  it('a failed build is not cached and the next call retries', async () => {
    let count = 0;
    const cache = createGenerationCache(async () => {
      count++;
      if (count === 1) {
        throw new Error('db down');
      }
      return 'ok';
    });

    await assert.rejects(cache.get(), /db down/);
    assert.equal(await cache.get(), 'ok');
    assert.equal(count, 2);
  });

  it('a failure of a build that clear made stale does not reach the waiter', async () => {
    const { build, builds } = controlledBuild();
    const cache = createGenerationCache(build);

    const early = cache.get();
    await tick();
    cache.clear();
    builds[0].reject(new Error('stale failure'));
    await tick();
    assert.equal(builds.length, 2);

    builds[1].resolve('fresh');
    assert.equal(await early, 'fresh');
  });
});
