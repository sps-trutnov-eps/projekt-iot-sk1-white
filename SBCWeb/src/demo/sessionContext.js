const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

function run(store, fn) {
  return als.run(store, fn);
}

function current() {
  return als.getStore() || null;
}

function getCurrentDb() {
  const store = als.getStore();
  return store ? store.db : null;
}

function getCurrentSessionId() {
  const store = als.getStore();
  return store ? store.sessionId : null;
}

module.exports = { als, run, current, getCurrentDb, getCurrentSessionId };
