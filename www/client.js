/*global d3, msgpack, forceVisual*/
var url = (document.location.protocol + "//" + document.location.host + "/").replace(/^http/, "ws");
var ws = new WebSocket(url, "tcp");
ws.binaryType = 'arraybuffer';
ws.onmessage = handle;

function handle(evt) {
  var msg = msgpack.decode(evt.data);
  handlers[msg[0]].apply(null, msg.slice(1));
}
var handlers = [null, onSetup, onBefore, onAfter, onError, onRoot];

var roots = [];
var refs = {};
var nextId = 1, start;
var update = forceVisual(roots);
update();

function onRoot(id, name) {
  console.log("ROOT", {id:id,name:name})
  roots.push(refs[id] = {
    id: id,
    name: name,
    sum: 0,
    size: 15,
    children: []
  });
  update();
}

function onSetup(id, parentId, name) {
  console.log("SETUP", {id:id,parentId: parentId,name:name})
  var parent = refs[parentId] || root;
  parent.children.push(refs[id] = {
    id: id,
    name: name,
    children: [],
    sum: 0,
    time: Date.now()
  });
  update();
}

function onBefore(parentId) {
  console.log("BEFORE", {parentId: parentId})
  start = Date.now();
}

function onAfter(parentId) {
  console.log("AFTER", {parentId: parentId})
  var parent = refs[parentId];
  var id = "e" + nextId++;
  var now = Date.now();
  var delta = now - start;
  var delay = start - parent.time;
  parent.children.push(refs[id] = {
    id: id,
    name: delay + "ms - " + delta + "ms",
    size: Math.sqrt((delta) + 1) * 5
  });
  while (parent) {
    parent.sum += delta;
    parent.width = Math.sqrt(parent.sum) + 1;
    parent = parent.parent;
  }
  update();
}

function onError(parentId, error) {
  console.log("ERROR", {parentId: parentId})
  onAfter(parentId);
}

