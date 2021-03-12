
/*
  var socket = io();
      
        var messages = document.getElementById('messages');
        var form = document.getElementById('form');
        var input = document.getElementById('input');
      
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          if (input.value) {
            socket.emit('chat message', input.value);
            input.value = '';
          }
        });
      
        socket.on('chat message', function(msg) {
          var item = document.createElement('li');
          item.textContent = msg;
          messages.appendChild(item);
          window.scrollTo(0, document.body.scrollHeight);
        });
*/

'use strict';

// Starts a clienside socket connection
var socket = io();

function EmitTree(graph) {
    var tree_data = {};
    var cells = [];
    TraverseTree(graph, function(vertex) {
        var cell = {};
        cell.data = vertex.value;
        cell.id = vertex.id;
        cell.parent = null;
        if (vertex.source != null) cell.parent = vertex.source.id;
        cells.push(cell);
    });
    tree_data.cells = cells;
    tree_data.attributes = attributes;
    console.log(tree_data);
    socket.emit('tree_data', tree_data);
};