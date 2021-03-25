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
        cell.data = {};
        var vertex_Attributes = Array.prototype.slice.call(vertex.value.attributes);
        for (var i = 0; i < vertex_Attributes.length; i++) {
          cell.data[vertex_Attributes[i].nodeName] = vertex_Attributes[i].nodeValue;
        }

        cell.id = vertex.id;
        cell.parent = null;
        if (vertex.source != null) cell.parent = vertex.source.id;
        cells.push(cell);
    });
    tree_data.cells = cells;
    tree_data.attributes = attributes;
    socket.emit('tree_data', tree_data);
};

function GetXMLNode(data) {
  var xmlnode = doc.createElement('cell');
  for (var key in data) {
    xmlnode.setAttribute(key, data[key]);
  }
  return xmlnode;
};

function UpdateGraphCells(graph, cells) {
  console.log(cells);
  graph.removeCells(graph.getChildVertices(graph.getDefaultParent()));
  var defaultParent = graph.getDefaultParent();

  graph.getModel().beginUpdate();
  try {
    // The root node must be re-added first and separately to preserve tree structure.
    graph.insertVertex(defaultParent, 'root', GetXMLNode(cells[0].data), graph.container.offsetWidth / 3, 20, 140, 60);
    
    for (var i = 1; i < cells.length; i++) {
      var parentCell = graph.getModel().getCell(cells[i].parent);
      var xmlnode = GetXMLNode(cells[i].data);
      var newnode = graph.insertVertex(defaultParent, null, xmlnode);

      // Updates the geometry of the vertex with the preferred size computed in the graph
      var geometry = graph.getModel().getGeometry(newnode);
      var size = graph.getPreferredSizeForCell(newnode);
      geometry.width = size.width;
      geometry.height = size.height;

      // Adds the edge between the existing cell and the new vertex
      var edge = graph.insertEdge(defaultParent, null, '', parentCell, newnode);
      newnode.setTerminal(parentCell, true);

      // If needed, add a graphical AND/OR overlay to the parent
      if (GetChildren(parentCell).length > 1) Add_AND_OR_Overlay(graph, parentCell);
      AddOverlays(graph, newnode);
    }
  }
  finally {
    graph.getModel().endUpdate();
  }
  graph.refresh();
};

// Catches messages from the server containing trees, and unpacks them
socket.on('tree_data', function(data) {
  var graph = ReturnGraph();
  var recv_cells = data.cells;
  attributes = data.attributes;
  UpdateGraphCells(graph, recv_cells);
});