"use strict";

const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 5000;
const http = require('http').createServer(app);
const io = require('socket.io')(http);

var groups = {};
var clients = {};

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
            res.sendFile(path.join(__dirname, '/public/main.html'));
        })
        .get('/example_tree', (req, res) => {
            res.sendFile(path.join(__dirname, '/public/resources/exampletree.json'));
        })
        .get('/about', (req, res) => {
            res.sendFile(path.join(__dirname, '/public/about.html'));
        })
        .get('/help', (req, res) => {
            res.sendFile(path.join(__dirname, '/public/help.html'));
        })
        .get('/tree_builder', (req, res) => {
            res.sendFile(path.join(__dirname, '/public/tree_builder.html'));
        });
    //.listen(PORT, () => console.log(`Listening on port ${ PORT }`));
};

// Sets up the socket.io events and handlers
function setup_socket_io() {
    io.on('connection', (socket) => {
        socket.on('disconnect', () => {
            RemoveUserFromGroup(socket.id);
        });
        socket.on('tree_data', (tree_data) => {
            UpdateGroup(tree_data, socket);
        });
        socket.on('tree_req', (msg) => {
            ReturnRequestedTree(socket.id);
        });
        socket.on('create_group', (group_req) => {
            CreateGroup(group_req, socket);
        });
        socket.on('join_group', (group_req) => {
            JoinGroup(group_req, socket);
        });
        socket.on('group_key_avl_req', (group_req) => {
            switch (group_req.joincreate) {
                case 'create_group':
                    CreateGroup(group_req, socket);
                    break;
                case 'join_group':
                    if (groups[group_req.proposed_key] === undefined) {
                        io.to(socket.id).emit('group_key_avl', {OK: 'KEY_NOT_FOUND', group_key: group_req.proposed_key});
                    }
                    else {
                        io.to(socket.id).emit('group_key_avl', {OK: 'OK', group_key: group_req.proposed_key});
                    }
                    break;
            };
        });
        socket.on('server_dump', function() {
            console.log('CLIENTS:');
            console.log(clients);
            console.log('GROUPS:');
            console.log(groups);
        });
    });
};

// When a client disconnects, use their id to remove them from the group they were in,
// and remove them from the clients dict
// If they leave a group empty, delete it.
function RemoveUserFromGroup(socket_id) {
    var group_key = clients[socket_id];
    if (group_key === undefined) return;
    var members = groups[group_key].members;
    members.splice(members.indexOf(socket_id), 1);

    // if the group is empty, delete it to free up the key.
    if (members.length == 0) delete groups[group_key];
    delete clients[socket_id];
};

// Returns a list of all the connected socket IDs.
function GetSocketClientIDs() {
    var client_ids = [];
    io.sockets.sockets.forEach((socket,key)=>{
        client_ids.push(socket.id);
    });

    return client_ids;
};

// Tries to create a new group given a key
function CreateGroup(group_req, socket) {
    var key = group_req.proposed_key;
    if (key === undefined) return;
    
    if (groups[key] === undefined) {
        // Adds an object to the groups dictionary for the new group
        // This contains a list of member socket ids, and the tree object used in socket emissions.
        var group_data = {};
        group_data.members = [];
        group_data.tree_data = { uninit: true };

        groups[key] = group_data;
        io.to(socket.id).emit('group_key_avl', {OK: 'OK', group_key: key});
    }
    else {
        io.to(socket.id).emit('group_key_avl', {OK: 'KEY_IN_USE', group_key: key});
    }
};

// Tries to join an existing group given a key
function JoinGroup(group_req, socket) {
    var key = group_req.group_key;
    var socket_id = socket.id;
    if (key === undefined) return;

    if (groups[key] === undefined) {
        io.to(socket_id).emit('joined', {OK: 'KEY_NOT_FOUND', group_key: key});
    }
    else {
        // Add the new client id to the list of members,
        // Then have the server send the tree to the new client
        var group_data = groups[key];
        group_data.members.push(socket_id);
        clients[socket_id] = key;

        io.to(socket_id).emit('tree_data', group_data.tree_data);
        io.to(socket_id).emit('joined', {OK: 'OK', group_key: key});
    }
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
        io.to(socket_id).emit('tree_data', tree_data);
    }
};

// Called when a user requests to refresh their tree.
// Pulls the group key from the client dictionary, and gets the corresponding group, then returns their tree.
function ReturnRequestedTree(socket_id) {
    var group = groups[clients[socket_id]];
    io.to(socket_id).emit('tree_data', group.tree_data);
};
