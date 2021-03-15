'use strict';

// Parse the tree in a depth-first manner, building a list of the textual representation.
function ParseTextually(graph) {
    var root = graph.getModel().getCell('root');
    var graph_list = DepthFirst_ParseToTextual(root, '1.');

    //console.log(graph_list);
    return graph_list;
};

// Depth first algorithm that parses the tree and recursively builds a list of strings
// Each string contains the relevant textual data for a cell.
// Each alternating element in the generated list is the id of the preceding cell.
function DepthFirst_ParseToTextual(cell, cell_path_str) {
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
    res.push(cell.getId());

    // Then, concatenate this list with the result of recursively getting a list of the child cells, and return it for depth-first recursing.
    var children = GetChildren(cell);
    for (var i = 0; i < children.length; i++) {
        res = res.concat(DepthFirst_ParseToTextual(children[i], cell_path_str + (i + 1).toString() + '.'));
    }
    return res;
};

// Returns the selected cell's id. If no cell is selected, returns -1
function GetSelectedId(graph) {
    var selectedCell = graph.getSelectionCell();
    var selectedId = -1;
    if (selectedCell != undefined) selectedId = selectedCell.getId();
    return selectedId;
};

// Generates a list of selected cells in the list view.
// This code is messy and inefficient, but returns a list of ids that have been selected
// This allows us to keep selected list items selected after remaking the list.
function GetSelectedTextualCells(tcl) {
    var cellsWithOperationDivs = [];
    var lis = tcl.children;

    // i is the index for different list elements, ie cells in the graph
    // j is the index for children of the li elements; selected li elements have a div with the name flex_operations.
    for (var i = 0; i < lis.length; i++) {
        for (var j = 0; j < lis[i].children.length; j++) {
            var child = lis[i].children[j];
            if (child.getAttribute('name') == 'flex_operations') {
                cellsWithOperationDivs.push(lis[i].getAttribute('name'));
            }
        }
    }

    return cellsWithOperationDivs;
};

// For each cell in the graph, create a list element in the textual graph representation
// Formatting is done with clunky innerHTML spacing but it works as a demo.
function Load_textual_graph(cells_list, graph) {
    var tcl = document.getElementById('textual_cells_list');
    //var selectedId = GetSelectedId(graph);
    var cellsWithOperationDivs = GetSelectedTextualCells(tcl);
    tcl.innerHTML = '';
    
    // Iterates through the list of cells, creating list elements for each, and styling them
    for (var i = 0; i < cells_list.length/2; i++) {
        var li = document.createElement('li');
        var id = cells_list[(i*2)+1]
        li.style.cursor = 'pointer';
        li.onclick = function() { CreateTextCellButtons(this, graph); };
        li.innerHTML = cells_list[i*2];
        li.setAttribute('name', id);
        //if (id == selectedId) li.style.border = '1px solid darkblue';
        if (cellsWithOperationDivs.includes(id)) CreateTextCellButtons(li, graph);

        tcl.appendChild(li);
    }
};

// When a textual list node is clicked, bring up a set of buttons for performing operations on that cell.
function CreateTextCellButtons(li, graph) {
    // Look at the items children;
    // if the operations div already exists, delete it and return to 'deselect' the cell
    for (let i = 0; i < li.children.length; i++) {
        if (li.children[i].getAttribute('name') == 'flex_operations') {
            li.children[i].remove();
            graph.setSelectionCells([]);
            return;
        }
    }

    // Now, we can (re)create the operations div
    // First, create the flexbox div that contains the buttons
    var flexbox_celloptions = document.createElement('div');
    flexbox_celloptions.setAttribute('name', 'flex_operations');
    flexbox_celloptions.style.display = 'flex';
    flexbox_celloptions.style.padding = '6px';
    li.appendChild(flexbox_celloptions);

    // Next, create the buttons for the three main operations to do on cells
    const editButton = AddButton_List('Edit cell', EditCell_Textual, flexbox_celloptions, graph);
    const addChildButton = AddButton_List('Add child', AddChild_Textual, flexbox_celloptions, graph);
    const deleteButton = AddButton_List('Delete subtree', DeleteSubtree_Textual, flexbox_celloptions, graph);

    if (li.getAttribute('name') == 'root') DisableButton(deleteButton);

    // Now, select the cell in the graph view for visual clarity!
    graph.setSelectionCell(graph.getModel().getCell(li.getAttribute('name')));
};

// Disables the button visually and functionally
function DisableButton(button) {
    button.disabled = true;
    button.style.backgroundColor = 'gray';
    button.style.cursor = 'default';
};

// Given the li DOM element, return the graph cell it represents
function GetCellFromLi(li, graph) {
    var cell_id = li.getAttribute('name');
    return graph.getModel().getCell(cell_id);
};

// Edit a cell from the list view.
function EditCell_Textual(evt, graph) {
    evt.stopPropagation();
    var li = evt.target.parentElement.parentElement;
    var cell = GetCellFromLi(li, graph);
};

// Add a child from the list view.
function AddChild_Textual(evt, graph) {
    evt.stopPropagation();
    var li = evt.target.parentElement.parentElement;
    var cell = GetCellFromLi(li, graph);
    AddChild(graph, cell);
};

// Delete a subtree from the list view.
function DeleteSubtree_Textual(evt, graph) {
    evt.stopPropagation();
    var li = evt.target.parentElement.parentElement;
    var cell = GetCellFromLi(li, graph);
    DeleteSubtree(graph, cell);
};

// Create a button for modifying a selected cell on the graph list.
function AddButton_List(text, handler, parent, graph) {
    const res = document.createElement('button');
    res.innerText = text;
    res.style.flex = 1;
    res.style.marginLeft = '6px';
    res.style.marginRight = '6px';
    res.style.cursor = 'pointer';
    res.style.backgroundColor = 'darkblue';
    res.style.color = 'white';
    res.addEventListener('click', function(evt) { handler(evt, graph); });
    parent.appendChild(res);

    return res;
};