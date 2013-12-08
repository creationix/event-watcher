if (!process.addAsyncListener) require('async-listener');

var current = null;
var next = 1;
var stopped = {};

process.addAsyncListener(setup, {
  before: before,
  after: after,
  error: error
});

function setup() {
  if (!current) return;
  if (stopped[current.root]) return;
  var id = next++;
  current.emit({
    type: "setup",
    id: id,
    parentId: current.id,
    name: guessName()
  });
  return {
    emit: current.emit,
    id: id,
    root: current.root
  };
}

function before(_, source) {
  if (!source) {
    current = null;
    return;
  }
  source.emit({
    type: "before",
    id: source.id
  });
  current = source;
}

function after(_, source) {
  if (!source) return;
  source.emit({
    type: "after",
    id: source.id,
  });
  current = null;
}

function error(source, err) {
  if (!source) return false;
  source.emit({
    type: "error",
    id: source.id,
    error: err.stack
  });
  return true;
}

module.exports = {
  start: start,
  stop: stop,
  skip: skip,
  stopAll: stopAll
};

function guessName() {
  var stack = (new Error()).stack.split("\n");
  var seen = false;
  var next = false;
  var line;
  for (var i = 1; i < stack.length; i++) {
    line = stack[i];
    var isLib = /node_modules\/async-listener/.test(line);
    if (/runAsyncQueue/.test(line)) {
      next = true;
      continue;
    }
    if (next) break;
    if (!seen) {
      if (isLib) seen = true;
      continue;
    }
    if (isLib) continue;
    break;
  }
  var match = line.match(/at ([^ ]*).*\(([^)]*)\)/);
  return match && match[1];
}

function start(emit) {
  var id = next++;
  current = {
    emit: skip(emit),
    id: id,
    root: id,
  };
  current.emit({
    type: "root",
    id: id,
    name: guessName()
  });
  return id;
}

function stop() {
  current = null;
}

function skip(fn) {
  return function () {
    var old = current;
    current = null;
    var ret = fn.apply(this, arguments);
    current = old;
    return ret;
  };
}

function stopAll(root) {
  stopped[root] = true;
  current = null;
}
