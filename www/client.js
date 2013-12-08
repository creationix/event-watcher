/*global d3, msgpack*/
var url = (document.location.protocol + "//" + document.location.host + "/").replace(/^http/, "ws");
var ws = new WebSocket(url, "tcp");
ws.binaryType = 'arraybuffer';
ws.onmessage = handle;

function handle(evt) {
  var msg = msgpack.decode(evt.data);
  handlers[msg[0]].apply(null, msg.slice(1));
}
var handlers = [null, onSetup, onBefore, onAfter, onError, onRoot];

var nextId = 1;
var refs, conns, evtId;
clear();

function onSetup(id, parentId, name) {
  if (!refs[parentId]) onRoot(parentId);
  var node = {
    start: Date.now(),
    id: id,
    name: name,
    size: 10,
    events: []
  };
  refs[id] = node;
  var events = refs[parentId].events;
  conns.push({
    source: events ? events[events.length - 1].id : parentId,
    target: id
  });
  update();
}

function onBefore(parentId) {
  var events = refs[parentId].events;
  start = Date.now();
  evtId = "e" + (nextId++);
  var event ={
    id: evtId,
    size: 5,
    name: "event"
  };
  refs[evtId] = event;
  events.push(event);
  conns.push({
    source: parentId,
    target: evtId
  });
}

function onAfter(parentId) {
  var delta = Date.now() - start;
  refs[evtId].size = Math.sqrt(delta) * 5;
  update();
}

function onError(parentId, error) {
}

function onRoot(id, name) {
  refs[id] = {
    start: Date.now(),
    id: id,
    name: name,
    size: 20
  };
  update();
}

var width = window.innerWidth;
var height = window.innerHeight;
var start;

var timeout;

var force = d3.layout.force()
    .gravity(0.05)
    .distance(50)
    .charge(-100)
    .size([width, height])
    .on("tick", tick);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var link = svg.selectAll(".link"),
    node = svg.selectAll(".node"),
    label = svg.selectAll(".label");

function clear() {
  refs = {};
  conns = [];
  timeout = null;
}

function update() {

  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(clear, 2000);

  var nodes = Object.keys(refs).map(function (key) {
    return refs[key];
  });
  var links = conns.map(function (conn) {
    return {
      source: refs[conn.source],
      target: refs[conn.target]
    };
  });

  // Restart the force layout
  force
    .nodes(nodes)
    .links(links)
    .start();

  // Update the links
  link = link.data(links, function (d) { return d.target.id; });

  // Exit any old links
  link.exit().remove();

  // Enter any new links
  link.enter().insert("line", ".node")
    .attr("class", "link")
    .attr("x1", function (d) { return d.source.x; })
    .attr("y1", function (d) { return d.source.y; })
    .attr("x2", function (d) { return d.target.x; })
    .attr("y2", function (d) { return d.target.y; });

  // Update the nodes…
  node = node.data(nodes);
  // , function(d) { return d.id; }).style("fill", "#3182bd");

  // Exit any old nodes.
  node.exit().remove();

  // Enter any new nodes.
  node.enter().append("circle")
      .attr("class", "node")
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("r", function(d) { return d.size || 4.5; })
      .style("fill", "#3182bd");

  label = label.data(nodes);

  label.exit().remove();

  label.enter().append("text")
      .attr("class", "label")
      .attr("dx", function(d) { return d.x + 12; })
      .attr("dy", function(d) { return d.y + 6; })
      .text(function(d) { return d.name });

}

function tick() {
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });

  label.attr("dx", function(d) { return d.x + 12; })
       .attr("dy", function(d) { return d.y + 6; });
}

