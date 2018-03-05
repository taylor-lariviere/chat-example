var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var clients = [];
var history = [];
var incr = 1;

function getUsers() {
    var users = [];
    for (var i = 0; i < clients.length; i++) {
        users[i] = clients[i].n;
    }
    return users;
}

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    socket.on('start', function () {
        socket.emit('nick', "guest" + incr)
        clients[clients.indexOf(socket)].n = "guest" + incr;
        incr++;
        io.emit('users', getUsers());
    });

    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('set nick', function (nick) {
        io.emit('info', "New user: " + nick);
        clients[clients.indexOf(socket)].n = nick;
        io.emit('users', getUsers());
    });

    socket.on('disconnect', function () {
        if (clients[clients.indexOf(socket)].n == null) {

        }
        else {
            io.emit('info', "User " + clients[clients.indexOf(socket)].n + " disconnected.");
        }
        clients.splice(clients.indexOf(socket), 1);
        io.emit('users', getUsers());
    });
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});
