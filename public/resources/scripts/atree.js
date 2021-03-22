/*
    This is the main mxgraph form that handles graph creation and mxgraph variable declaring and function overriding.
    Cell creation, deletion, editing, overlays, and the navigator are all defined in this form.
*/

var doc;
// TODO: replace this with a list of user-constructed objects containing default values, combination rules, name/description, etc.

function main(container) {
    // Checks if browser is supported, throws an error if not.
    if (!mxClient.isBrowserSupported()) {
        mxUtils.error('Browser not supported', 200, false)
    }
    else {
        var graph = new mxGraph(container);
        doc = mxUtils.createXmlDocument();

        // Disables the default right clicking menu
        mxEvent.disableContextMenu(container);

        graph.setCellsMovable(false);                        // Disabled dragging to move cells around
        graph.setAutoSizeCells(true);                        // Resizes cells after changing labels automatically
        graph.setPanning(true);                              // Enables panning
        graph.centerZoom = false;                            // Sets to zoom from the top left, not the center
        graph.panningHandler.useLeftButtonForPanning = true; // Pans by holding left mouse
        graph.setTooltips(!mxClient.IS_TOUCH);               // Disables tooltips on touch devices
        graph.enterStopsCellEditing = true;                  // Pressing enter stops text editing in cells

        // Instantiates the keyhandler
		var keyHandler = new mxKeyHandler(graph);
        // Sets up a handler for the event of deleting a subtree with the Delete key (keycode 46)
        keyHandler.bindKey(46, function(evt) {
            var cell = graph.getSelectionCell();
            if (cell === undefined) return;
            if (cell.getId() != 'root') DeleteSubtree(graph, cell);
        });

        // When editing a cell, ensures a minimum size for legibility
        // by overriding the getPreferredSizeForCell function
        var oldGetPreferredSizeForCell = graph.getPreferredSizeForCell;
        graph.getPreferredSizeForCell = function(cell) {
            var result = oldGetPreferredSizeForCell.apply(this, arguments);
            if (result != null) {
                result.width = Math.max(120, result.width - 40);
                result.height = Math.max(60, result.height - 40);
            }
            return result;
        };

        // Overrides the graph.refresh method to also update the textual display
        var defaultRefresh = graph.refresh;
        graph.refresh = function() {
            Load_textual_graph(ParseTextually(graph), graph);
            return defaultRefresh.apply(this, arguments);
        };

        // Renders the label attribute on nodes
        // This is done as attack tree nodes are XML structures instead of simple mxcells
        graph.convertValueToString = function(cell) {
                if (mxUtils.isNode(cell.value)) {
                    return cell.getAttribute('label');
                }
            };

        // Updates the node label when changed
        // Similarly done due to using XML cell structures
        // Code from https://jgraph.github.io/mxgraph/docs/js-api/files/model/mxCell-js.html
        var cellLabelChanged = graph.cellLabelChanged;
        graph.cellLabelChanged = function(cell, newValue, autoSize) {
                if (mxUtils.isNode(cell.value)) {
                    // Clones the value for correct undo/redo
                    var elt = cell.value.cloneNode(true);
                    elt.setAttribute('label', newValue);
                    newValue = elt;
                }
                cellLabelChanged.apply(this, arguments);
                Load_textual_graph(ParseTextually(graph), graph);
            };
        
        // Prevents selecting edges
        graph.isCellSelectable = function(cell) {
            if (graph.getModel().isEdge(cell)) {
               return false;
            }
            return true;
        };

        // Enables automatic layout on the graph and installs
        // a tree layout for all groups who's children are
        // being changed, added or removed.
        var layout = new mxCompactTreeLayout(graph, false);
        layout.useBoundingBox = false;
        layout.edgeRouting = false;
        layout.levelDistance = 60;
        layout.nodeDistance = 16;

        // Allows the layout to move cells even though cells aren't movable in the graph
        layout.isVertexMovable = function(cell) { return true; };

        // When adding a new node, update the tree geometry to make space for it
        var layoutMgr = new mxLayoutManager(graph);
        layoutMgr.getLayout = function(cell) {
            if (cell.getChildCount() > 0) { return layout; }
        };

        // Overrides the popupMenuHandler method to the defined context-sensitive one.
        graph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
            return CreateContextMenu(graph, menu, cell, evt);
        };

        // Renders attribute values on cells as a temporary display method
        graph.cellRenderer.getLabelValue = function(state) {
            if (!state.view.graph.getModel().isVertex(state.cell)) return;
			var result = state.cell.getAttribute('label');
            result += '\n' + state.cell.getId();
            if (cur_attribute_index == -1) {
                for (var key in attributes) {
                    result += '\n' + key + ':' + state.cell.getAttribute(key); 
                }
            }
            else if (cur_attribute_index != -2) {
                var attr_name = GetIndexFromAttributes()[cur_attribute_index];
                result += '\n' + attr_name + ':' + state.cell.getAttribute(attr_name); 
            }
            
            return result;
		};

        // Gets the default parent for inserting new cells.
        var parent = graph.getDefaultParent();
        
        // Adds the root vertex of the tree
        graph.getModel().beginUpdate();
        try {
            var w = graph.container.offsetWidth;
            var rootxml = doc.createElement('cell');
            rootxml.setAttribute('label', 'Root Goal');
            rootxml.setAttribute('nodetype', 'OR');
            for (var key in attributes) {
                var attr = attributes[key];
                rootxml.setAttribute(attr.name, attr.default_val);
            }

            var root = graph.insertVertex(parent, 'root', rootxml, w / 3, 20, 140, 60);
            graph.updateCellSize(root);
            AddOverlays(graph, root);
        }
        finally {
            graph.getModel().endUpdate();
        }

        AddNavigator(container, graph);
        graph.refresh();
    }
};

// Adds a navigator to scroll through attributes.
// TODO: add another fixed toolbar in another div with overarching functionality eg attribute control, XML/Yaml handling, File controls etc.
function AddNavigator(container, graph) {
    var navigator_div = document.createElement('div');
    var wnd;
    navigator_div.style.padding = '4px';
	var tb = new mxToolbar(navigator_div);
    var box = container.getBoundingClientRect();
    tb.addItem("Previous attribute", 'resources/img/arrow_left_40.png', function(evt) {
        cur_attribute_index += -1;
        if (cur_attribute_index < -2) cur_attribute_index = Object.keys(attributes).length-1;
        wnd.setTitle("Showing Attribute: " + GetIndexFromAttributes()[cur_attribute_index]);
        graph.refresh();
    });
    tb.addItem("Next attribute", 'resources/img/arrow_right_40.png', function(evt){ 
        cur_attribute_index += 1;
        if (cur_attribute_index >= Object.keys(attributes).length) cur_attribute_index = -2;
        wnd.setTitle("Showing Attribute: " + GetIndexFromAttributes()[cur_attribute_index]);
        graph.refresh();
    });
    
    wnd = new mxWindow('Attribute Navigator', navigator_div, box.left+1, box.top+1, 200, 66, true, false);
	wnd.setScrollable(false);
	wnd.setResizable(false);
	wnd.setVisible(true);
};

// Adds buttons to a node with key node functions:
// creating a new child from that node and deleting nodes and their subtree.
function AddOverlays(graph, cell) {
    return; // Currently disabled to only use right-click context menu.
    
    // Draw the button to create a new child for that node
    var overlay_addchild = new mxCellOverlay(new mxImage('resources/img/mxgraph_images/add.png', 24, 24), 'Add Child');
    overlay_addchild.cursor = 'hand';
    overlay_addchild.align = mxConstants.ALIGN_CENTER;
    overlay_addchild.verticalAlign = mxConstants.ALIGN_BOTTOM;
    overlay_addchild.addListener(mxEvent.CLICK, mxUtils.bind(this, function(sender, evt) {
        AddChild(graph, cell);
    }));
    
    graph.addCellOverlay(cell, overlay_addchild);

    // Draw the button to delete that node
    // The root node must never be deleted, thus the extra case is needed.
    if (!cell.getTerminal(true) === null) {
        var overlay_delete = new mxCellOverlay(new mxImage('resources/img/mxgraph_images/close.png', 30, 30), 'Delete');
        overlay_delete.cursor = 'hand';
        overlay_delete.offset = new mxPoint(-4, 8);
        overlay_delete.align = mxConstants.ALIGN_RIGHT;
        overlay_delete.verticalAlign = mxConstants.ALIGN_TOP;
        overlay_delete.addListener(mxEvent.CLICK, mxUtils.bind(this, function(sender, evt) {
            DeleteSubtree(graph, cell);
        }));
    
        graph.addCellOverlay(cell, overlay_delete);
    }
};

// Draw the AND/OR indicator on non-leaf nodes
function Add_AND_OR_Overlay(graph, cell) {
    graph.removeCellOverlays(cell);
    var nodetype = cell.getAttribute('nodetype')
    var img_src = 'resources/img/' + nodetype + '.png';
    
    var overlay_andor = new mxCellOverlay(new mxImage(img_src, 24, 24), nodetype);
    overlay_andor.align = mxConstants.ALIGN_CENTER;
    overlay_andor.verticalAlign = mxConstants.ALIGN_BOTTOM;

    graph.addCellOverlay(cell, overlay_andor);
    AddOverlays(graph, cell);
};

// Creates and handles the right click pop-up context menu
// Allows for inserting new child nodes, deleting subtrees, and zooming
function CreateContextMenu(graph, menu, cell, evt) {
    var model = graph.getModel();

    // Context: node right clicked
    if (cell != null) {
        if (model.isVertex(cell)) {
            // Add a new leaf node as a child of that node
            menu.addItem('Add child', 'resources/scripts/editors/images/overlays/check.png', function() {
                    AddChild(graph, cell);
                });

            // Delete the subtree with that node as its root
            // Cannot be called on the root node to prevent deleting the whole tree
            if (cell.id != 'root') {
                menu.addItem('Delete', 'resources/scripts/editors/images/delete.gif', function() {
                        DeleteSubtree(graph, cell);
                    });
            }

            // Edit attributes of the cell;
            // will need to reference and edit the active attribute once attribute navigation is added.
            if (GetChildren(cell).length == 0) {
                menu.addItem('Edit cost', 'resources/img/mxgraph_images/copy.png', function() {
                    EditAttribute(graph, cell, 'cost');
                });
                menu.addItem('Edit probability', 'resources/img/mxgraph_images/copy.png', function() {
                    EditAttribute(graph, cell, 'probability');
                });
            }

            // Print the cell's children to the console. Used for debug.
            menu.addItem('Get Children', 'resources/img/mxgraph_images/connector.gif', function() {
                console.log(GetChildren(cell));
            });

            // Toggle the node between AND and OR states
            if (GetChildren(cell).length > 1) {
                var nodetype = cell.getAttribute('nodetype');
                menu.addItem('Toggle AND/OR', 'resources/img/' + nodetype + '.png', function() {
                    graph.removeCellOverlays(cell);
                    var new_nodetype = {"AND": "OR", "OR": "AND"}[nodetype];
                    cell.setAttribute('nodetype', new_nodetype);
                    Add_AND_OR_Overlay(graph, cell);
                    AddOverlays(graph, cell);
                    for (var key in attributes) {
                        PropagateChangeUpTree(graph, cell, attributes[key]);
                    }
                    graph.refresh();
                });
            }

            // Only show the option to propagate on leaf cells
            // Propgate an attribute and its changes up the tree to the root, from the selected node.
            // This is for debug purposes; propagation should happen automatically after each graph update:
            // eg Adding or deleting nodes, editing attributes, toggling a node state...
            if (GetChildren(cell).length == 0) {
                menu.addItem('Propogate cost', 'resources/img/mxgraph_images/check.png', function() {
                    PropagateChangeUpTree(graph, cell, attributes['cost']);
                    graph.refresh();
                });
                menu.addItem('Propogate probability', 'resources/img/mxgraph_images/check.png', function() {
                    PropagateChangeUpTree(graph, cell, attributes['probability']);
                    graph.refresh();
                });
            }

            menu.addSeparator();
        }
    }

    // Context: global
    menu.addItem('Zoom in', 'resources/img/mxgraph_images/zoom_in.png', function() {
        graph.zoomIn();
    });

    menu.addItem('Zoom out', 'resources/img/mxgraph_images/zoom_out.png', function() {
        graph.zoomOut();
    });

    menu.addItem('Add cost', 'resources/img/mxgraph_images/navigate_plus.png', function() {
        //AddAttribute(graph);
    });

    menu.addItem('Traverse', 'resources/img/mxgraph_images/redo.png', function() {
        TraverseTree(graph, function(vertex) { console.log(vertex); });
    });

    menu.addItem('Parse Text', 'resources/img/mxgraph_images/printer.png', function() {
        Load_textual_graph(ParseTextually(graph), graph);
    });

    menu.addItem('Emit Tree', 'resources/img/mxgraph_images/dot.gif', function() {
        EmitTree(graph);
    });
};

// Create a new leaf node with cell as its parent node
function AddChild(graph, cell) {
    var parent = graph.getDefaultParent();

    graph.getModel().beginUpdate();
    try {
        var xmlnode = doc.createElement('cell');
        xmlnode.setAttribute('nodetype', 'OR');

        var newnode = graph.insertVertex(parent, null, xmlnode);
        var geometry = graph.getModel().getGeometry(newnode);

        // Updates the geometry of the vertex with the preferred size computed in the graph
        var size = graph.getPreferredSizeForCell(newnode);
        geometry.width = size.width;
        geometry.height = size.height;
        
        // Adds the edge between the existing cell and the new vertex
        var edge = graph.insertEdge(parent, null, '', cell, newnode);
        newnode.setTerminal(cell, true);
        
        if (GetChildren(cell).length > 1) Add_AND_OR_Overlay(graph, cell);
        AddOverlays(graph, newnode);

        // Any tree attributes need to be added
        // the new child will be a leaf by definition, so we can assign default values
        // TODO: set the parent [cell] to no longer render using default values?
        for (var key in attributes) {
            var attr = attributes[key];
            xmlnode.setAttribute(attr.name, attr.default_val);
            cell.setAttribute(attr.name, attr.default_val);
            PropagateChangeUpTree(graph, cell, attr);
        }
        xmlnode.setAttribute('label', 'New Cell[' + newnode.getId() / 2 + ']');
        graph.refresh();
    }
    finally {
        graph.getModel().endUpdate();
    }
};

// Delete the subtree with cell as its root
function DeleteSubtree(graph, cell) {
    if (cell.getId == 'root') return;

    // Gets the subtree from cell downwards
    var cells = [];
    graph.traverse(cell, true, function(vertex) {
        cells.push(vertex);
    });

    // Check to see if the parent becomes a leaf; if so, remove the AND/OR overlay
    var parent = cell.getTerminal(true);
    var siblings = GetChildren(parent);
    if (siblings.length == 2) {
        graph.removeCellOverlays(parent);
        AddOverlays(graph, parent);
    }

    graph.removeCells(cells);

    for (var key in attributes) {
        var attr = attributes[key];
        parent.setAttribute(attr.name, attr.default_val);
        PropagateChangeUpTree(graph, parent, attr);
    }
    graph.refresh();
};

// Performs depth-first traversal from the fixed root goal node
function TraverseTree(graph, vertex_function) {
    //console.log("Traversing tree:\n" + vertex_function.toString());
    var root = graph.getModel().getCell('root');
    graph.traverse(root, true, vertex_function);
};

// Modify the cost attribute for that cell
// should only be possible to modify leaves that already have a cost attribute
function EditAttribute(graph, cell, attributeName) {
    var attr = attributes[attributeName];
    var newValue = parseFloat(prompt("Enter new " + attributeName + " value for cell:", 0));
    if (!NewAttributeIsValid(newValue, attr)) newValue = attr.default_val;
    cell.setAttribute(attributeName, newValue);

    PropagateChangeUpTree(graph, cell, attr);
    graph.refresh();
};

// Given a new attribute value, use the given attribute domain to determine whether its valid or not.
function NewAttributeIsValid(newValue, attribute) {
    if (newValue === null || isNaN(newValue) || newValue > attribute.max_val || newValue < attribute.min_val) return false;
    return true;
};

// When an attribute is edited or a child is added or deleted,
// the change must propagate up the tree to the root (or until a node is unaffected in every attribute)
function PropagateChangeUpTree(graph, cell, attribute) {
    var parent = cell.getTerminal(true);
    var children = GetChildren(cell);

    if (children.length == 1) {
        cell.setAttribute(attribute.name, parseFloat(children[0].getAttribute(attribute.name)));
    }
    else if (children.length > 1) {
        var func = ((cell.getAttribute('nodetype') == 'AND') ? attribute.AND_rule : attribute.OR_rule);
        var cumulativeValue = parseFloat(children[0].getAttribute(attribute.name));
        for (i = 1; i < children.length; i++) {
            cumulativeValue = func(cumulativeValue, parseFloat(children[i].getAttribute(attribute.name)));
        }
        cell.setAttribute(attribute.name, cumulativeValue);
    }
    
    if (parent === null) {
        return;
    }
    else {
        PropagateChangeUpTree(graph, parent, attribute);
    }
};

// Due to the mxCompositeLayout model, nodes must use the default parent
// So, the internal representation of parents and children must be used creatively
// The cell parent is stored in the Source attribute (usually reserved for edges)
// The children must be calculated by iterating through edges,
// and filtering out the edge pointing at the node.
// A similar approach could be used as an alternative for finding the parent should using Terminals prove a bad idea.
function GetChildren(cell) {
    var children = [];
    var noEdges = cell.getEdgeCount();

    // Iterate through every edge connected to the cell
    for (i = 0; i < noEdges; i++) {
        var edge = cell.getEdgeAt(i);
        // If the edge has a terminal different to the cell calling;
        // then this implies the terminal of that edge is a child of the cell
        if (cell === edge.getTerminal(true)) {
            children.push(edge.getTerminal(false)); 
        }
    }
    
    return children;
}