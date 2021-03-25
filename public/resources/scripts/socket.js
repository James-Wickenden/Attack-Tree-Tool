/*
        This handles the tree builder socket connection for enabling live collaboration.
        On events, the tree is parsed and emitted as a JS object to the server, which sends it to other connected users.
        The receiving handler is also defined here.
*/

'use strict';

// Starts a clienside socket connection
var socket = io();

// Parses the tree into a JS object and sends it via the socket to the server
function EmitTree(graph) {
    var tree_data = {};
    var cells = [];
    TraverseTree(graph, function(vertex) {
        var cell = {};
        cell.data = vertex.value.outerHTML;
        cell.id = vertex.id;
        cell.parent = null;
        if (vertex.source != null) cell.parent = vertex.source.id;
        cells.push(cell);
    });
    tree_data.cells = cells;
    tree_data.attributes = attributes;
    socket.emit('tree_data', tree_data);
};

// Catches messages from the server containing trees, and unpacks them
socket.on('tree_data', function(data) {
  var graph = ReturnGraph();
  var cells = data.cells;
  
  console.log(cells);
  attributes = data.attributes;
});