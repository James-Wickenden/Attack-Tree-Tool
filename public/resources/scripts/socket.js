/*
        This handles the tree builder socket connection for enabling live collaboration.
        On events, the tree is parsed and emitted as a JS object to the server, which sends it to other connected users.
        The receiving handler is also defined here.

        Handlers for joining and creating groups and related logic is also here.
*/

'use strict';
var socket;

// Parses the tree into a JS object and sends it via the socket to the server
function EmitTree(graph) {
    if (sessionStorage.getItem('editor_mode') == 'private') return;
    if (sessionStorage.getItem('group_key') === null) {
        console.error('No group key in session storage.');
        return;
    };
    var tree_data = GetTreeData(graph);
    tree_data.socket_id = socket.id;
    tree_data.group_key = sessionStorage.getItem('group_key');
    socket.emit('tree_data', tree_data);
};

// If a group is joined when loading, join it
// Done because socket ids change between the index page and this one.
function TryJoinGroup() {
    if (sessionStorage.getItem('editor_mode') == 'join_group') {
        var group_req = {};
        group_req.group_key = sessionStorage.getItem('group_key');
        socket.emit('join_group', group_req);
    }
};

// Given a graph, parse it into a JSON object.
function GetTreeData(graph) {
    var tree_data = {};
    var cells = [];
    TraverseTree(graph, function (vertex) {
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
    return tree_data;
};

// Iterates through the data dictionary built in the EmitTree function and defines and xmlnode and sets values accordingly.
function GetXMLNode(data) {
    var xmlnode = doc.createElement('cell');
    for (var key in data) {
        if (data[key] == 'DELETED') continue;
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
        graph.insertVertex(defaultParent, 'root', GetXMLNode(cells[0].data), graph.container.offsetWidth / 3, 20, 140, 70);

        for (var i = 1; i < cells.length; i++) {
            var parentCell = graph.getModel().getCell(cells[i].parent);
            var xmlnode = GetXMLNode(cells[i].data);
            var newnode = graph.insertVertex(defaultParent, cells[i].id, xmlnode);

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
    for (var key in attributes) {
        if (key in newAttributes) newAttributes[key].display = attributes[key].display;
    }
    attributes = newAttributes;
};

// Starts a clienside socket connection and sets up the handlers for receiving from the server
function SetupSocket_Editor() {
    socket = io();

    // Catches messages from the server containing trees, and unpacks them
    socket.on('tree_data', function (data) {
        if (data.uninit === true) return;
        UpdateGraphAttributes(data.attributes);
        UpdateGraphCells(ReturnGraph(), data.cells);
        LoadAttributeListDisplay(ReturnGraph());
    });

    socket.on('joined', function (data) {
        console.log(data);
        if (data.OK != 'OK') {
            sessionStorage.removeItem('group_key');
            console.error('Failed to join group.');
        }
        else {
            document.getElementById('curgroup').innerText = 'Group code: ' + data.group_key;
        }
    });
};