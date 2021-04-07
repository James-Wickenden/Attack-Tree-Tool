/*
    Handles the textual view component of the tool.
    This includes generating the HTML list elements from a parsed graph,
    as well as handling click events and events that update the graph.
*/

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
    for (var sp = 0; sp <= cell_path_str.length; sp++) {
        spacecount += '&nbsp;';
    }

    // Build the string textually representing each cell:
    // The numerical representation of the cell's location in the tree, the cell label, the AND/OR label (if a parent to 2+ cells), and the attributes.
    cell_str += cell.getAttribute('label');
    if (GetChildren(cell).length >= 2) cell_str += ' (' + cell.getAttribute('nodetype') + ')';
    cell_str += '<br>';

    for (var key in attributes) {
        var attr_val = GetReadableAttributeValue(key, cell.getAttribute(key));
        cell_str += spacecount + key + ': ' + attr_val + '<br>';
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
    for (var i = 0; i < cells_list.length / 2; i++) {
        var li = document.createElement('li');
        var id = cells_list[(i * 2) + 1];
        li.style.cursor = 'pointer';
        li.onclick = function () { CreateTextCellButtons(this, id, graph); };
        li.innerHTML = cells_list[i * 2];
        li.setAttribute('name', id);
        //if (id == selectedId) li.style.border = '1px solid darkblue';
        if (cellsWithOperationDivs.includes(id)) CreateTextCellButtons(li, id, graph);

        tcl.appendChild(li);
    }
};

function RemoveFlexOperations(li, graph) {
    for (let i = 0; i < li.children.length; i++) {
        if (li.children[i].getAttribute('name') == 'flex_operations') {
            li.children[i].remove();
            graph.setSelectionCells([]);
            return true;
        }
    }
    return false;
};

// When a textual list node is clicked, bring up a set of buttons for performing operations on that cell.
function CreateTextCellButtons(li, id, graph) {
    // Look at the items children;
    // if the operations div already exists, delete it and return to 'deselect' the cell
    if (RemoveFlexOperations(li, graph)) return;

    // Now, we can (re)create the operations div
    // First, create the flexbox div that contains the buttons
    var flexbox_celloptions = document.createElement('div');
    flexbox_celloptions.setAttribute('name', 'flex_operations');
    flexbox_celloptions.style.display = 'flex';
    flexbox_celloptions.style.padding = '6px';
    li.appendChild(flexbox_celloptions);

    // Next, create the buttons for the three main operations to do on cells
    const editButton = AddButton_List('Edit cell', id + '_edit', EditCell_Textual, flexbox_celloptions, graph);
    const addChildButton = AddButton_List('Add child', id + '_addChild', AddChild_Textual, flexbox_celloptions, graph);
    const deleteButton = AddButton_List('Delete subtree', id + '_delete', DeleteSubtree_Textual, flexbox_celloptions, graph);

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
    TurnListIntoEditableForm(li, cell, graph);
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

// When editing, replace the list element with an interactive form to edit cell parameters.
// The cell label, AND/OR typing, and each attribute can be edited.
// Options should be hidden if not editable; for example, non-leaf attributes or AND/OR values for cells with <2 children.
// Consider reformatting with https://stackoverflow.com/questions/9686538/align-labels-in-form-next-to-input
function TurnListIntoEditableForm(li, cell, graph) {
    var li_HTML_old = li.innerHTML;

    // First, we create the form element and empty the list element HTML.
    // A linebreak is used to clone later on to save redefining it again and again.
    li.innerHTML = '';
    var cellForm = document.createElement('form');
    var br = document.createElement("br");

    cellForm.addEventListener('click', function (evt) { evt.stopPropagation(); });
    // You can still click on the list element padding, so the click handler is temporarily disabled.
    li.style.cursor = 'default';
    li.onclick = function () { return; };
    cellForm.style.cursor = 'default';
    cellForm.setAttribute('name', 'cellForm');

    // The textual path is gotten from the list element text and used to help the user identify the node being changed.
    // This is added to the form as a label.
    var cellForm_Path = document.createElement('label');
    cellForm_Path.innerHTML = li_HTML_old.split('&')[0] + '&nbsp;';
    cellForm.appendChild(cellForm_Path);

    // Next, add an input node to change the cell's text label.
    // The current label is used as a placeholder.
    var cellForm_Name = document.createElement('input');
    cellForm_Name.placeholder = cell.getAttribute('label');
    cellForm_Name.setAttribute('name', 'cellForm_Name');
    cellForm.appendChild(cellForm_Name);
    cellForm.innerHTML += '&nbsp;';

    // If the node has >=2 children, add a combobox to edit this value.
    // This is located right where it is represented textually to create a mental map for the user.
    if (GetChildren(cell).length >= 2) {
        var cellForm_ANDOR = document.createElement('select');
        var andOption = document.createElement('option');
        var orOption = document.createElement('option');
        andOption.text = 'AND';
        orOption.text = 'OR';

        cellForm_ANDOR.add(andOption);
        cellForm_ANDOR.add(orOption);
        cellForm_ANDOR.style.cursor = 'pointer';
        cellForm_ANDOR.value = cell.getAttribute('nodetype');
        cellForm_ANDOR.setAttribute('name', 'cellForm_ANDOR');

        cellForm.appendChild(cellForm_ANDOR);
    }

    cellForm.appendChild(br.cloneNode());

    // For each attribute, create a label and input pair of nodes to change them.
    // I tried to introduce aligning for simplicity with flexboxes but this code became illegible fast...
    var childCount = GetChildren(cell).length;
    for (var key in attributes) {
        var cellForm_Attr_lbl = document.createElement('label');
        var cellForm_Attr_txt = document.createElement('input');

        cellForm_Attr_lbl.innerHTML = key + ':&nbsp;';
        cellForm_Attr_lbl.style.marginLeft = '10%';

        var attr_val = GetReadableAttributeValue(key, cell.getAttribute(key));
        cellForm_Attr_txt.placeholder = attr_val;
        cellForm_Attr_txt.style.marginTop = '8px';
        cellForm_Attr_txt.setAttribute('name', 'cellForm_' + key);
        if (childCount > 0) cellForm_Attr_txt.disabled = true;

        cellForm.appendChild(cellForm_Attr_lbl);
        cellForm.appendChild(cellForm_Attr_txt);
        cellForm.appendChild(br.cloneNode());
    }

    if (childCount > 0) {
        cellForm.appendChild(document.createElement("br"));
        var disableAttributeEditingMessage = document.createElement('label');
        disableAttributeEditingMessage.style.color = 'red';
        disableAttributeEditingMessage.innerHTML = 'Only leaf nodes can have their attributes changed.';
        cellForm.appendChild(disableAttributeEditingMessage);
        cellForm.appendChild(document.createElement("br"));
    }

    // Add a submit and cancel button to navigate out of the form
    // On clicking either, we must also restore the li onclick handler.
    var cellForm_submit = document.createElement('input');
    cellForm_submit.setAttribute('type', 'submit');
    cellForm_submit.setAttribute('value', 'Update Cell');
    cellForm_submit.style.cursor = 'pointer';
    cellForm_submit.style.marginTop = '6px';
    cellForm_submit.addEventListener('click', function (evt) {
        evt.preventDefault();
        HandleFormSubmit(cellForm, graph, cell, childCount);
        li.style.cursor = 'pointer';
        li.onclick = function () { CreateTextCellButtons(this, cell_id, graph); };
        return false;
    });
    cellForm.appendChild(cellForm_submit);

    var cellForm_cancel = document.createElement('input');
    cellForm_cancel.setAttribute('type', 'submit');
    cellForm_cancel.setAttribute('value', 'Cancel Changes');
    cellForm_cancel.style.cursor = 'pointer';
    cellForm_cancel.style.marginTop = '6px';
    cellForm_cancel.style.marginLeft = '6px';
    cellForm_cancel.addEventListener('click', function (evt) {
        evt.preventDefault();
        li.innerHTML = li_HTML_old;
        var cell_id = li.getAttribute('name');
        RemoveFlexOperations(li, graph);
        CreateTextCellButtons(li, cell_id, graph);
        li.style.cursor = 'pointer';
        li.onclick = function () { CreateTextCellButtons(this, cell_id, graph); };
        return;
    });
    cellForm.appendChild(cellForm_cancel);

    // Finally, render the form in the list element.
    li.appendChild(cellForm);
};

// Called when the 'Updaate Cell' button is clicked.
// Handles updating the graph model, including propagating and refreshing the graph.
function HandleFormSubmit(cellForm, graph, cell, childCount) {
    // First, build a dictionary for easy access to the form responses.
    // Dictionary keys are the names given to the form elements as defined above.
    var formInputs = {};
    for (var i = 0; i < cellForm.children.length; i++) {
        var childName = cellForm.children[i].getAttribute('name');
        if (childName != null) formInputs[childName] = cellForm.children[i];
    }

    // Update the form name. More validation here may be required, e.g. to prevent XML escaping.
    var newCellLabel = formInputs['cellForm_Name'].value;
    if (newCellLabel != '') cell.setAttribute('label', newCellLabel);

    // If a leaf node, update the attributes.
    // Each attribute should be checked to see if its valid for that attribute; ie within the attribute domain.
    if (childCount == 0) {
        for (var key in attributes) {
            var newValue = formInputs['cellForm_' + key].value;
            var validatedAttribute = ValidateAttribute(newValue, attributes[key]);
            if (validatedAttribute[0] == false) {
                continue;
            }
            else {
                cell.setAttribute(key, validatedAttribute[1]);
                PropagateChangeUpTree(graph, cell, attributes[key]);
            }
        }
    }
    else if (childCount >= 2) {
        var newCellANDOR = formInputs['cellForm_ANDOR'].value;
        cell.setAttribute('nodetype', newCellANDOR);
        Add_AND_OR_Overlay(graph, cell);
    }

    graph.refresh();
};

// Create a button for modifying a selected cell on the graph list.
function AddButton_List(text, id, handler, parent, graph) {
    const res = document.createElement('button');
    res.innerText = text;
    res.setAttribute('name', id);
    res.style.flex = 1;
    res.style.marginLeft = '6px';
    res.style.marginRight = '6px';
    res.style.cursor = 'pointer';
    res.style.backgroundColor = 'darkblue';
    res.style.color = 'white';
    res.addEventListener('click', function (evt) { handler(evt, graph); });
    parent.appendChild(res);

    return res;
};