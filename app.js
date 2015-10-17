process.on('uncaughtException', function(err) {
    console.log('Caught exception!: ' + err);
    console.log(err.stack);
});


// http
var http = require('http');
var server = http.createServer();
var port = process.env.PORT || 30043;
var host = process.env.HOST || '0.0.0.0';
server.listen(port, host, function () {
    var host = server.address();
    console.log(process.env.PORT);
    console.log('Listening!!! on %s:%s', host.address, host.port);
});


// socket
var WebSocketServer = require('./modules/socket-server');
var ws = new WebSocketServer({
    http: server,
    prefix: '/socket'
});


// lobby
var Lobby = require('./modules/lobby');
var lobby = new Lobby();


// socket connection
ws.on('connection', function(client) {
    // console.log('connected', client.id);

    client.send('init', {
        id: client.id
    });

    lobby.join(client);
});
