"use strict";

const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 5000;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const redis = require("redis");

const client = redis.createClient();

client.on('error', function(error) {
    console.log('redis encountered an error');
    console.error(error);
});
client.on('connect', function() {
    console.log('connected to redis');
});

setup_express();
setup_socket_io();

http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

// Sets up express and its /GET page handlers
function setup_express() {
    app
        .use(express.static(path.join(__dirname, 'public')))
        .get('/', (req, res) => {
            console.log("Loading main...");
            res.sendFile(path.join(__dirname, '/public/main.html'));
        })
        .get('/socketchat', (req, res) => {
            console.log("Loading socket.io test chat...");
            res.sendFile(path.join(__dirname, '/public/socketchat.html'));
        })
        .get('/tree_builder', (req, res) => {
            console.log("Loading tree builder...");
            res.sendFile(path.join(__dirname, '/public/tree_builder.html'));
        });
    //.listen(PORT, () => console.log(`Listening on port ${ PORT }`));
};

// Sets up the socket.io events and handlers
function setup_socket_io() {
    io.on('connection', (socket) => {
        console.log('a user connected');
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
        socket.on('tree_data', (tree_data) => {
            //console.log(tree_data);
            UpdateRedis(tree_data);
            //io.emit('tree_data', tree_data);
        });
        socket.on('chat message', (msg) => {
            console.log(msg);
            io.emit('chat message', msg);
        });
        socket.on('join_group', (groupkey) => {
            //console.log(groupkey);
            JoinGroup(groupkey);
        });
    });
};

// Returns a list of all the connected socket IDs.
function GetSocketClientIDs() {
    var client_ids = [];
    io.sockets.sockets.forEach((socket,key)=>{
        client_ids.push(socket.id);
    });

    return client_ids;
};

// Tries to join an existing group given a key
function JoinGroup(groupkey) {
    client.get(groupkey, function(err, value) {
        if (err) throw err;
    });
};

// Updates the redis value for that tree, and sends the updated tree to all the members in that group.
function UpdateRedis(tree_data) {
    var key = tree_data.key;
    client.set(key, '{}');

    client.get(key, function(err, value) {
        if (err) throw err;
        var redis_data = JSON.parse(value);
        
        redis_data.tree_data = tree_data;
        redis_data.members = [ 'James' ];

        console.log('setting the redis data to:');
        console.log(JSON.stringify(redis_data));
        client.set(key, JSON.stringify(redis_data));
       
        io.emit('tree_data', tree_data);

        console.log('successfully updated and pushed change');
    });

    
};