var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var port = process.env.PORT || 3000;

// from https://github.com/tomsmeding/circular-buffer/blob/master/index.js
CircularBuffer.prototype = {
    size: function () { return this._size; },
    capacity: function () { return this._capacity; },
    enq: function (value) {
        if (this._first > 0) this._first--; else this._first = this._capacity - 1;
        this._buffer[this._first] = value;
        if (this._size < this._capacity) this._size++;
    },
    push: function (value) {
        if (this._size == this._capacity) {
            this._buffer[this._first] = value;
            this._first = (this._first + 1) % this._capacity;
        } else {
            this._buffer[(this._first + this._size) % this._capacity] = value;
            this._size++;
        }
    },
    deq: function () {
        if (this._size == 0) throw new RangeError("dequeue on empty buffer");
        var value = this._buffer[(this._first + this._size - 1) % this._capacity];
        this._size--;
        return value;
    },
    pop: function () { return this.deq(); },
    shift: function () {
        if (this._size == 0) throw new RangeError("shift on empty buffer");
        var value = this._buffer[this._first];
        if (this._first == this._capacity - 1) this._first = 0; else this._first++;
        this._size--;
        return value;
    },
    get: function (start, end) {
        if (this._size == 0 && start == 0 && (end == undefined || end == 0)) return [];
        if (typeof start != "number" || start % 1 != 0 || start < 0) throw new TypeError("Invalid start");
        if (start >= this._size) throw new RangeError("Index past end of buffer: " + start);

        if (end == undefined) return this._buffer[(this._first + start) % this._capacity];

        if (typeof end != "number" || end % 1 != 0 || end < 0) throw new TypeError("Invalid end");
        if (end >= this._size) throw new RangeError("Index past end of buffer: " + end);

        if (this._first + start >= this._capacity) {
            //make sure first+start and first+end are in a normal range
            start -= this._capacity; //becomes a negative number
            end -= this._capacity;
        }
        if (this._first + end < this._capacity)
            return this._buffer.slice(this._first + start, this._first + end + 1);
        else
            return this._buffer.slice(this._first + start, this._capacity).concat(this._buffer.slice(0, this._first + end + 1 - this._capacity));
    },
    toarray: function () {
        if (this._size == 0) return [];
        return this.get(0, this._size - 1);
    }
};

var clients = [];
var history = new CircularBuffer(200);
var incr = 1;

function getUsers() {
    var users = [];
    for (var k = 0; k < clients.length; k++) {
        users[k] = clients[k].n;
    }
    return users;
}

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

io.on("connection", function (socket) {
    clients.push(socket);

    socket.on("start", function () {
        socket.emit("nick", "guest" + incr);
        console.log("nickname sent");

        var histStr = "";
        var histArr = history.toarray();
        console.log("assembling history");
        for (var i = 0; i < histArr.length; i++) {
            histStr += ("<li><b>" + histArr[i][0] + ":</b> " + histArr[i][1] + "</li>");
        }
        if (histStr != "")  {
            socket.emit("history", histStr);
            console.log("history sent");
        }

        clients[clients.indexOf(socket)].n = "guest" + incr;
        incr++;
        io.emit("users", getUsers());
        console.log("users sent");
    });

    socket.on("send chat message", function (msg) {
        io.emit("chat message", msg);
        history.enq(msg)
    });

    socket.on("set nick", function (nick) {
        io.emit("info", "New user: " + nick);
        clients[clients.indexOf(socket)].n = nick;
        io.emit("users", getUsers());
    });

    socket.on("disconnect", function () {
        if (clients[clients.indexOf(socket)].n == null) { }
        else {
            io.emit("info", "User " + clients[clients.indexOf(socket)].n + " disconnected.");
        }
        clients.splice(clients.indexOf(socket), 1);
        io.emit("users", getUsers());
    });
});

http.listen(port, function () {
    console.log("listening on *:" + port);
});

