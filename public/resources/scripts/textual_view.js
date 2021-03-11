'use strict';

// For each cell in the graph, create a list element in the textual graph representation
// Formatting is done with clunky innerHTML spacing but it works as a demo.
function load_textual_graph(cells_list) {
    var tcl = document.getElementById('textual_cells_list');
    tcl.innerHTML = '';

    for (var i = 0; i < cells_list.length; i++) {
        var item = document.createElement('li');
        item.innerHTML = cells_list[i].replace(/(?:\r\n|\r|\n)/g, '<br>');
        tcl.appendChild(item);
    }
};