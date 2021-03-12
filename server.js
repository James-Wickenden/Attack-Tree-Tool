"use strict";

const express = require('express');
const app = express(); 
const path = require('path');
const PORT = process.env.PORT || 5000;
const http = require('http').createServer(app);
const io = require('socket.io')(http);

setup_express();
setup_socket_io();

http.listen(PORT, () => {
  console.log(`Listening on port ${ PORT }`);
});


// Sets up express and its /GET page handlers
function setup_express() {
  app
  .use(express.static(path.join(__dirname, 'public')))
  .get('/', (req, res) => {
    console.log("Loading main...")
    res.sendFile(path.join(__dirname, '/public/main.html'))
  })
  .get('/socketchat', (req, res) => {
    console.log("Loading socket.io test chat...")
    res.sendFile(path.join(__dirname, '/public/socketchat.html'))
  })
  .get('/tree_builder', (req, res) => {
    console.log("Loading tree builder...")
    res.sendFile(path.join(__dirname, '/public/tree_builder.html'))
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
    socket.on('chat message', (msg) => {
      console.log('message: ' + msg);
      io.emit('chat message', msg);
    });
  });

  io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' }); // This will emit the event to all connected sockets
};