function main(container) {
    // Checks if browser is supported, throws an error if not.
    if (!mxClient.isBrowserSupported()) {
        mxUtils.error('Broswer not supported', 200, false)
    }
    else {
        var graph = new mxGraph(container);

        // Prevents the right clicking menu
        mxEvent.disableContextMenu(container);

        graph.setCellsMovable(false);                        // Disabled dragging to move cells around
        graph.setAutoSizeCells(true);                      // Resizes cells after changing labels automatically
        graph.setPanning(true);                              // Enables panning
        graph.centerZoom = false;                            // Sets to zoom from the top left, not the center
        graph.panningHandler.useLeftButtonForPanning = true; // Pans by holding left mouse
        graph.setTooltips(!mxClient.IS_TOUCH);               // Disables tooltips on touch devices

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

        // Installs a popupmenu handler using local function (see below).
        graph.popupMenuHandler.factoryMethod = function(menu, cell, evt)
        {
            return CreateContextMenu(graph, menu, cell, evt);
        };

        // Gets the default parent for inserting new cells.
        var parent = graph.getDefaultParent();
        
        // Adds the root vertex of the tree
        graph.getModel().beginUpdate();
        try {
            var w = graph.container.offsetWidth;
            var root = graph.insertVertex(parent, 'root', "Root goal", (w/2)-30, 20, 140, 60);
            graph.updateCellSize(root);
            AddOverlays(graph, root, true);
        }
        finally {
            graph.getModel().endUpdate();
        }

        //AddToolbar(container, graph);
    }
};

// Adds a toolbar with zoom controls.
// Currently not used as it creates a toolbar not constrained to the tree div.
// I might replace this model with a fixed toolbar in another div with overarching functionality eg attribute control, XML/Yaml handling, File controls etc.
function AddToolbar(container, graph) {
    var toolbarContainer = document.createElement('div');

    container.appendChild(toolbarContainer);
    var tb = new mxToolbar(toolbarContainer);
    
    tb.addItem('Zoom In', 'resources/img/mxgraph_images/zoom_in32.png',function(evt) { graph.zoomIn(); });
    tb.addItem('Zoom Out', 'resources/img/mxgraph_images/zoom_out32.png',function(evt) { graph.zoomOut(); });
    
    wnd = new mxWindow('Tools', toolbarContainer, 0, 0, 200, 66, false);
    wnd.setVisible(true);
};

// Adds buttons to a node with key node functions:
// creating a new child from that node and deleting nodes and their subtree.
function AddOverlays(graph, cell, isRoot) {
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
    if (!isRoot) {
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

// Creates and handles the right click pop-up context menu
// Allows for inserting new child nodes, deleting subtrees, and zooming
function CreateContextMenu(graph, menu, cell, evt) {
    var model = graph.getModel();

    // Context: node right clicked
    if (cell != null) {
        if (model.isVertex(cell)) {
            menu.addItem('Add child', 'resources/scripts/editors/images/overlays/check.png', function() {
                    AddChild(graph, cell);
                });

            if (cell.id != 'root') {
                menu.addItem('Delete', 'resources/scripts/editors/images/delete.gif', function() {
                        DeleteSubtree(graph, cell);
                    });
            }

            menu.addSeparator();
        }
    }

    // Context: global
    menu.addItem('Zoom to fit', 'resources/scripts/editors/images/zoom.gif', function() {
        graph.fit();
    });

    menu.addItem('Zoom out', 'resources/scripts/editors/images/zoomactual.gif', function() {
        graph.zoomActual();
    });
};

// Create a new leaf node with cell as its parent node
function AddChild(graph, cell) {
    var parent = graph.getDefaultParent();

    graph.getModel().beginUpdate();
    try {
        var newnode = graph.insertVertex(parent, null, '');
        var geometry = graph.getModel().getGeometry(newnode);

        // Updates the geometry of the vertex with the preferred size computed in the graph
        var size = graph.getPreferredSizeForCell(newnode);
        geometry.width = size.width;
        geometry.height = size.height;
        
        // Adds the edge between the existing cell and the new vertex
        var edge = graph.insertEdge(parent, null, '', cell, newnode);

        AddOverlays(graph, newnode, false);
    }
    finally {
        graph.getModel().endUpdate();
    }
};

// Delete the subtree with cell as its root
function DeleteSubtree(graph, cell) {
    // Gets the subtree from cell downwards
    var cells = [];
    graph.traverse(cell, true, function(vertex) {
        cells.push(vertex);
    });

    graph.removeCells(cells);
};
