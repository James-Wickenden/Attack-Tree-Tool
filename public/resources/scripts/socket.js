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
    for (var key in tree_data.attributes) {
      tree_data.attributes[key].AND_rule = tree_data.attributes[key].AND_rule.toString();
      tree_data.attributes[key].OR_rule = tree_data.attributes[key].OR_rule.toString();
    }
    socket.emit('tree_data', tree_data);
};

// Iterates through the data dictionary built in the EmitTree function and defines and xmlnode and sets values accordingly.
function GetXMLNode(data) {
  var xmlnode = doc.createElement('cell');
  for (var key in data) {
    xmlnode.setAttribute(key, data[key]);
  }
  return xmlnode;
};

// Wipes the graph of all cells, then rebuilds it from scratch with the cells received from socket.io
// This is not efficient in any way, but should reduce complexity enough for an effective implementation.
function UpdateGraphCells(graph, cells) {
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

// Updates the attributes in a similar fashion to how the graph is updated.
// Complexity here comes from socket.io not packing functions into the JS objects it sends.
// The workaround used here is to transmit attribute rules as strings, then rebuild them here as below.
function UpdateGraphAttributes(newAttributes) {
  for (var key in newAttributes) {
    newAttributes[key].AND_rule = new Function('return ' + newAttributes[key].AND_rule)();
    newAttributes[key].OR_rule = new Function('return ' + newAttributes[key].OR_rule)();
  }
  attributes = newAttributes;
};

// Catches messages from the server containing trees, and unpacks them
socket.on('tree_data', function(data) {
  UpdateGraphAttributes(data.attributes);
  UpdateGraphCells(ReturnGraph(), data.cells);
});