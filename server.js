var dump = require('./dump.js');
var msgpack = require('msgpack-js');
var WebSocketServer = require('ws').Server;
var send = require('send');
var http = require('http');
var urlParse = require('url').parse;
var pathJoin = require('path').join;

var server = http.createServer(handler);
var root = pathJoin(__dirname, "www");
function handler(req, res) {
  send(req, urlParse(req.url).pathname)
    .root(root)
    .pipe(res);
}
server.listen(8080, function () {
  console.log("Go to http://localhost:8080/ to watch events");
});

var wss = new WebSocketServer({server: server});
wss.broadcast = function(data) {
  for(var i in this.clients) {
    this.clients[i].send(data);
  }
};

function emit(event) {
  var out;
//   console.log("EVENT", event);
  if (event.type === "setup") {
    out = [1, event.id, event.parentId, event.name];
  }
  else if (event.type === "before") {
    out = [2, event.id];
  }
  else if (event.type === "after") {
    out = [3, event.id];
  }
  else if (event.type === "error") {
    out = [4, event.id];
  }
  else if (event.type === "root") {
    out = [5, event.id, event.name];
  }
  var message = msgpack.encode(out);
  wss.broadcast(message);
}

var repl = require('repl');

function tracedEval(cmd, context, filename, callback) {
  dump.start(emit);
  var res;
  try {
    res = eval(cmd);
  }
  catch (err) {
    return callback(err);
  }
  dump.stop();
  callback(null, res);
}

http.createServer(function (req, res) {
  // Trace this request
  dump.start(emit);
  handler(req, res);
}).listen(3000, function () {
  console.log("hit http://localhost:3000/ to generate events");

  console.log("or use this repl");
  repl.start({
    prompt: "> ",
    input: process.stdin,
    output: process.stdout,
    eval: tracedEval
  });
});

