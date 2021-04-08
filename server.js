"use strict";

const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 5000;
const http = require('http').createServer(app);
const io = require('socket.io')(http);

var groups = {};

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
            console.log(tree_data);
            UpdateGroup(tree_data);
            //io.emit('tree_data', tree_data);
        });
        socket.on('chat message', (msg) => {
            //console.log(msg);
            io.emit('chat message', msg);
        });
        socket.on('create_group', (group_req) => {
            //console.log(group_req);
            CreateGroup(group_req);
        });
        socket.on('join_group', (group_req) => {
            //console.log(group_req);
            JoinGroup(group_req);
        });
    });
};

/*
// Returns a list of all the connected socket IDs.
function GetSocketClientIDs() {
    var client_ids = [];
    io.sockets.sockets.forEach((socket,key)=>{
        client_ids.push(socket.id);
    });

    return client_ids;
};
*/

// Tries to create a new group given a key
function CreateGroup(group_req) {
    var key = group_req.group_key;
    var socket_id = group_req.socket_id;
    if (key === undefined) return;
    
    if (groups[key] === undefined) {
        // Save a string JSON object to represent the group.
        // This contains a list of member socket ids, and the tree object used in socket emissions
        // This is the value with the corresponding redis key of the user-defined group key string
        var group_data = {};
        group_data.members = [socket_id];
        group_data.tree_data = group_req.tree_data;

        groups[key] = group_data;
        //client.set(group_req.group_key, JSON.stringify(group_data));
        io.to(socket_id).emit('created', {OK: 'OK', group_key: key});
    }
    else {
        //console.log('Already a group with that key.');
        io.to(socket_id).emit('created', {OK: 'KEY_IN_USE', group_key: key});
    }

    /*
    client.get(group_req.group_key, function(err, value) {
        if (err) throw err;
        if (value === null) {
            
        }
        else {
            //console.log('Already a group with that key.');
            io.to(group_req.socket_id).emit('created', {OK: 'KEY_IN_USE', group_key: group_req.group_key});
        };
    });
    */
};

// Tries to join an existing group given a key
function JoinGroup(group_req) {
    var key = group_req.group_key;
    var socket_id = group_req.socket_id;
    if (key === undefined) return;

    if (groups[key] === undefined) {
        //console.log('No group with that key.');
        io.to(socket_id).emit('joined', {OK: 'KEY_NOT_FOUND', group_key: key});
    }
    else {
        // Add the new client id to the list of members,
        // Then have the server send the tree to the new client
        var group_data = groups[key];
        group_data.members.push(socket_id);

        //client.set(group_req.group_key, JSON.stringify(redis_data));
        io.to(socket_id).emit('tree_data', group_data.tree_data);
        io.to(socket_id).emit('joined', {OK: 'OK', group_key: key});
    }

/*
    client.get(group_req.group_key, function(err, value) {
        if (err) throw err;
        if (value === null) {
            
        }
        else {
            
        }
    });
    */
};

// Updates the dictionary value for that tree, and sends the updated tree to all the members in that group.
function UpdateGroup(tree_data) {
    var key = tree_data.group_key;
    if (key === undefined) return;
    if (groups[key] === undefined) return;

    // First, update the group object to the new tree version
    groups[key].tree_data = tree_data;
    // Then, send the new tree to all the group members
    for (var i in groups[key].members) {
        var socket_id = groups[key].members[i];
        console.log('sending to ' + socket_id);
        io.to(socket_id).emit('tree_data', tree_data);
    }

    /*
    client.get(tree_data.group_key, function(err, value) {
        if (err) throw err;
        // First, parse the redis object for the group
        var redis_data = JSON.parse(value);
        // Then, update the redis group to have the new tree version
        redis_data.tree_data = tree_data;
        client.set(tree_data.group_key, JSON.stringify(redis_data));
        console.log('setting the redis data to:');
        console.log(JSON.stringify(redis_data));
       
        // Then, send the new tree to all the group members
        for (var i in redis_data.members) {
            var socket_id = redis_data.members[i];
            console.log('sending to ' + socket_id);
            io.to(socket_id).emit('tree_data', tree_data);
        }
    });

    */
};