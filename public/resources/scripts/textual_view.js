'use strict';

// Parse the tree in a depth-first manner, building a list of the textual representation.
function ParseTextually(graph) {
    var root = graph.getModel().getCell('root');
    var graph_list = DepthFirst(root, '1.');

    //console.log(graph_list);
    return graph_list;
};

// Depth first algorithm that parses the tree and recursively builds a list of strings
// Each string contains the relevant textual data for a cell.
function DepthFirst(cell, cell_path_str) {
    var res = [];
    var cell_str = cell_path_str + '&nbsp;';
    var spacecount = "";
    for (var sp=0;sp<=cell_path_str.length;sp++) {
        spacecount += '&nbsp;';
    }

    // Build the string textually representing each cell:
    // The numerical representation of the cell's location in the tree, the cell label, the AND/OR label (if a parent to 2+ cells), and the attributes.
    cell_str += cell.getAttribute('label');
    if (GetChildren(cell).length >=2) cell_str += ' (' + cell.getAttribute('nodetype') + ')';
    cell_str += '<br>';

    for (var key in attributes) {
        cell_str += spacecount + key + ': ' + cell.getAttribute(key) + '<br>';
    }
    res.push(cell_str);

    // Then, concatenate this list with the result of recursively getting a list of the child cells, and return it for depth-first recursing.
    var children = GetChildren(cell);
    for (var i = 0; i < children.length; i++) {
        res = res.concat(DepthFirst(children[i], cell_path_str + (i + 1).toString() + '.'));
    }
    return res;
};

// For each cell in the graph, create a list element in the textual graph representation
// Formatting is done with clunky innerHTML spacing but it works as a demo.
function load_textual_graph(cells_list) {
    var tcl = document.getElementById('textual_cells_list');
    tcl.innerHTML = '';

    for (var i = 0; i < cells_list.length; i++) {
        var item = document.createElement('li');
        item.innerHTML = cells_list[i];
        tcl.appendChild(item);
    }
};