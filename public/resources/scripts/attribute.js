/*
    This form handles creating new attributes and their params.
    Attributes are JS objects that have a name, two rules for how they are combined, and a domain eg [0,1] or [0..].
    Also handles the attribute navigator, including creating and updating attributes, and creating these forms dyamically.
*/

"use strict";

// Dictionary of the current graph attributes
// The keys are attribute names, and the values are objects holding the attribute data
var attributes = {};

// Many domains have the same base rules for how they combine.
function AND_rule_realnumbers(current, child) {
    return current + child;
};
function OR_rule_realnumbers(current, child) {
    return Math.min(current, child);
};

const domains = {
    TRUE_FALSE: {
        AND_rule: function (current, child) {
            if (current == 1 && child == 1) return 1;
            return 0;
        },
        OR_rule: function (current, child) {
            if (current == 1 || child == 1) return 1;
            return 0;
        },
        default_val: 1
    },
    UNIT_INTERVAL: {
        AND_rule: function (current, child) {
            return current * child;
        },
        OR_rule: function (current, child) {
            return current + child - (current * child);
        },
        default_val: 0
    },
    RATIONAL: {
        AND_rule: AND_rule_realnumbers,
        OR_rule: OR_rule_realnumbers,
        default_val: 0
    },
    POSITIVE_RATIONAL: {
        AND_rule: AND_rule_realnumbers,
        OR_rule: OR_rule_realnumbers,
        default_val: 0
    },
    INTEGER: {
        AND_rule: AND_rule_realnumbers,
        OR_rule: OR_rule_realnumbers,
        default_val: 0
    },
    POSITIVE_INTEGER: {
        AND_rule: AND_rule_realnumbers,
        OR_rule: OR_rule_realnumbers,
        default_val: 0
    }
};

// Adds a new attribute to the dictionary, its rules, and its domain.
// rules should be functions of the form: function(current, child) { return [some new current value]; }
// domains should be taken from the domains object, defined above.
function AddAttribute(attributeName, attributeDesc,
    domain, default_val) {
    
    const attr = {};
    attr.name = attributeName;
    attr.desc = attributeDesc;
    attr.domain = domain;
    attr.default_val = default_val;
    attr.display = true;

    attributes[attributeName] = attr;
    return attr;
};

// Deletes an attribute from the dictionary, and wipes the model's cells values for that attribute.
// On rebuilding the graph, cells with a wiped attribute are not given it back.
function DeleteAttribute(evt, graph, sender) {
    evt.preventDefault();
    var key = sender.id.split('adl_de_')[1];
    if (!confirm("Are you sure you want to delete the attribute '" + key + "'?")) return;
    
    delete attributes[key];
    TraverseTree(graph, function(vertex) {
        vertex.setAttribute(key, 'DELETED');
    });
    graph.refresh();
    EmitTree(graph);
    LoadAttributeListDisplay(graph);
};

// Toggles between showing and hiding attributes on the visual graph view.
function ShowHideAttribute(cb, graph) {
    var key = cb.id.split('adl_cb_')[1];
    attributes[key].display = cb.checked;
    graph.refresh();
};

// Given a new attribute value, use the given attribute domain to determine whether its valid or not.
// Returns a list containing two elements:
// First, a boolean value whether the given attribute value is valid or not.
// If this is true, the second element is the parsed and typed value to be used. This could be a boolean, a float, an int, etc.
function ValidateAttribute(newValue, domain) {
    if (newValue === null || newValue === undefined || newValue == '') return [false];
    switch (domain) {
        case 'TRUE_FALSE':
            var newValue_UC = newValue.toUpperCase();
            if (newValue_UC == 'TRUE') return [true, 1];
            if (newValue_UC == 'FALSE') return [true, 0];
            break;
        case 'UNIT_INTERVAL':
            var newValue_float = parseFloat(newValue);
            if (isNaN(newValue_float)) return [false];
            if (newValue_float >= 0 && newValue_float <= 1) return [true, newValue_float];
            break;
        case 'RATIONAL':
            var newValue_float = parseFloat(newValue);
            if (isNaN(newValue_float)) return [false];
            if (newValue_float > -Infinity && newValue_float < Infinity) return [true, newValue_float];
            break;
        case 'POSITIVE_RATIONAL':
            var newValue_float = parseFloat(newValue);
            if (isNaN(newValue_float)) return [false];
            if (newValue_float >= 0 && newValue_float < Infinity) return [true, newValue_float];
            break;
        case 'INTEGER':
            var newValue_int = parseInt(newValue);
            if (isNaN(newValue_int)) return [false];
            if (newValue_int > -Infinity && newValue_int < Infinity) return [true, newValue_int];
            break;
        case 'POSITIVE_INTEGER':
            var newValue_int = parseInt(newValue);
            if (isNaN(newValue_int)) return [false];
            if (newValue_int >= 0 && newValue_int < Infinity) return [true, newValue_int];
            break;
    };
    return [false];
};

// Navigating through attributes requires that we index them; this is done by iterating through keys and assigning sequenctial indices to them.
// The result is a second dictionary that has index keys and attribute name values, which is returned.
function GetIndexFromAttributes() {
    var attribute_indices = {};
    attribute_indices[-1] = 'all';
    attribute_indices[-2] = 'none';
    var i = 0;
    for (var key in attributes) {
        attribute_indices[i] = key;
        i++;
    }
    return attribute_indices;
};

// Validate and then update the edited attribute in the attribute editor for that cell.
function UpdateCellAttribute(graph, cell, attrInput) {
    var str_newValue = attrInput.value;
    var attr_key = attrInput.name.split('acf_')[1];
    var validatedAttribute = ValidateAttribute(str_newValue, attributes[attr_key].domain);

    if (validatedAttribute[0] == false) {
        return;
    }
    else {
        cell.setAttribute(attr_key, validatedAttribute[1]);
    }

    PropagateChangeUpTree(graph, cell, attributes[attr_key]);
    EmitTree(graph);
    graph.refresh();
};

// When a cell is clicked, display its attributes in a form in the attribute navigator.
function SetUpClickedCellAttributeDisplay(graph, cell) {
    var acf = document.getElementById('attributeCellForm');
    acf.innerHTML = '';

    var attributeForm = document.createElement('form');

    // Add a title for the form
    var acf_title = document.createElement('h3');
    acf_title.innerHTML = 'Cell Attribute Value Editor';
    acf_title.style.marginBottom = '0px';
    acf_title.style.fontFamily = 'Arial, Helvetica, sans-serif';
    attributeForm.appendChild(acf_title);
    attributeForm.appendChild(document.createElement("br"));

    // For each attribute, create a label and input pair of nodes to change them.
    var childCount = GetChildren(cell).length;
    for (var key in attributes) {
        var cellForm_Attr_lbl = document.createElement('label');
        var cellForm_Attr_txt = document.createElement('input');

        cellForm_Attr_lbl.innerHTML = key + ':&nbsp;';

        var attr_val = GetReadableAttributeValue(key, cell.getAttribute(key));
        cellForm_Attr_txt.placeholder = attr_val;
        cellForm_Attr_txt.style.marginTop = '8px';
        cellForm_Attr_txt.setAttribute('name', 'acf_' + key);
        if (childCount > 0) {
            cellForm_Attr_txt.disabled = true;
        }
        else {
            cellForm_Attr_txt.onkeypress = function (evt) { if(evt.key == 'Enter') UpdateCellAttribute(graph, cell, this); };
        }

        attributeForm.appendChild(cellForm_Attr_lbl);
        attributeForm.appendChild(cellForm_Attr_txt);
        attributeForm.appendChild(document.createElement("br"));
    }

    if (childCount > 0) {
        attributeForm.appendChild(document.createElement("br"));
        var disableAttributeEditingMessage = document.createElement('label');
        disableAttributeEditingMessage.style.color = 'red';
        disableAttributeEditingMessage.innerHTML = 'Only leaf nodes can have their attributes changed.';
        attributeForm.appendChild(disableAttributeEditingMessage);
    }
    else {
        // Add a submit and cancel button to navigate out of the form
        // On clicking either, we must also restore the li onclick handler.
        var cellForm_attr_sub = document.createElement('input');
        cellForm_attr_sub.setAttribute('type', 'submit');
        cellForm_attr_sub.setAttribute('value', 'Update Cell');
        cellForm_attr_sub.style.cursor = 'pointer';
        cellForm_attr_sub.style.marginTop = '6px';
        cellForm_attr_sub.addEventListener('click', function (evt) {
            evt.preventDefault();
            HandleCellAttrSubmit(attributeForm, graph, cell, childCount);
            return false;
        });
        attributeForm.appendChild(cellForm_attr_sub);

        /*
        var cellForm_attr_ccl = document.createElement('input');
        cellForm_attr_ccl.setAttribute('type', 'submit');
        cellForm_attr_ccl.setAttribute('value', 'Cancel Changes');
        cellForm_attr_ccl.style.cursor = 'pointer';
        cellForm_attr_ccl.style.marginTop = '6px';
        cellForm_attr_ccl.style.marginLeft = '6px';
        cellForm_attr_ccl.addEventListener('click', function (evt) {
            evt.preventDefault();
            acf.innerHTML = '';
            return;
        });
        attributeForm.appendChild(cellForm_attr_ccl);
        */
    }

    acf.appendChild(attributeForm);
};

// Creates a list of attributes with the option to display/hide their values on nodes
function LoadAttributeListDisplay(graph) {
    var adl = document.getElementById('attribute_display_list');
    adl.innerHTML = '';

    for (var key in attributes) {
        var attr_cb = document.createElement('input');
        var attr_lb = document.createElement('label');
        var attr_de = document.createElement('button');

        attr_cb.id = 'adl_cb_' + key;
        attr_cb.type = "checkbox";
        attr_cb.checked = attributes[key].display;
        attr_cb.style.cursor = 'pointer';
        attr_cb.onclick = function () { ShowHideAttribute(this, graph); };

        attr_lb.innerHTML = key;
        if (attributes[key].desc != '') attr_lb.title = attributes[key].desc;

        attr_de.id = 'adl_de_' + key;
        attr_de.innerHTML = '<img src="resources/img/mxgraph_images/delete2.png" />';
        attr_de.style.cursor = 'pointer';
        attr_de.style.padding = '0px';
        attr_de.title = 'Delete attribute: ' + key;
        attr_de.onclick = function(evt) { DeleteAttribute(evt, graph, this); };
        
        adl.appendChild(attr_cb);
        adl.appendChild(attr_de);
        adl.appendChild(attr_lb);
        adl.appendChild(document.createElement("br"));
    }

    var newAttribute_but = document.createElement('button');
    newAttribute_but.innerHTML = 'New Attribute';
    newAttribute_but.style.cursor = 'pointer';
    newAttribute_but.onclick = function(evt) {
        evt.preventDefault();
        SetUpAttributeEditor();
    };
    adl.appendChild(newAttribute_but);
};

// Called when a cell's attributes are to be updated via the cell's attribute navigator form.
// Changed attributes must be validated, updated, and propagated.
// Almost identical to the HandleFormSubmit() method in textual_view.js
function HandleCellAttrSubmit(attributeForm, graph, cell, childCount) {
    if (childCount > 0) return;

    // First, build a dictionary for easy access to the form responses.
    // Dictionary keys are the names given to the form elements as defined above.
    var formAttributes = {};
    for (var i = 0; i < attributeForm.children.length; i++) {
        var childName = attributeForm.children[i].getAttribute('name');
        if (childName != null) formAttributes[childName] = attributeForm.children[i];
    }

    // If a leaf node, update the attributes.
    // Each attribute should be checked to see if its valid for that attribute; ie within the attribute domain.
    for (var key in attributes) {
        var newValue = formAttributes['acf_' + key].value;
        var validatedAttribute = ValidateAttribute(newValue, attributes[key].domain);
        if (validatedAttribute[0] == false) {
            continue;
        }
        else {
            cell.setAttribute(key, validatedAttribute[1]);
            PropagateChangeUpTree(graph, cell, attributes[key]);
        }
    }

    graph.refresh();
};

// Used to create new attributes, or edit existing ones.
// Attributes have a name, a description, a domain, and a default value.
// Domains contain rules for how they propagate up the tree.
function SetUpAttributeEditor() {
    var aef = document.getElementById('attribute_editor_form');
    aef.innerHTML = '';

    // Add a title for the form
    var aef_title = document.createElement('h3');
    aef_title.innerHTML = 'Attribute Editor';
    aef_title.style.marginBottom = '0px';
    aef.appendChild(aef_title);
    aef.appendChild(document.createElement("br"));

    // First, add the form element for the attribute name and its label
    var attr_name_lbl = document.createElement('label');
    var attr_name_txt = document.createElement('input');

    attr_name_lbl.innerHTML = 'Attribute name: ';
    attr_name_txt.name = 'aef_name';

    aef.appendChild(attr_name_lbl);
    aef.appendChild(attr_name_txt);
    aef.appendChild(document.createElement("br"));

    // For the attribute description:
    var attr_desc_lbl = document.createElement('label');
    var attr_desc_txt = document.createElement('textarea');

    attr_desc_lbl.innerHTML = 'Attribute description: ';
    attr_desc_txt.style.marginTop = '8px';
    attr_desc_txt.name = 'aef_desc';

    aef.appendChild(attr_desc_lbl);
    aef.appendChild(attr_desc_txt);
    aef.appendChild(document.createElement("br"));

    // For the attribute domain:
    var attr_domain_lbl = document.createElement('label');
    var attr_domain_sel = document.createElement('select');

    attr_domain_lbl.innerHTML = 'Attribute domain: ';
    attr_domain_sel.style.marginTop = '8px';
    attr_domain_sel.name = 'aef_domain';
    for (var key in domains) {
        var domainOption = document.createElement('option');
        domainOption.text = key;
        attr_domain_sel.add(domainOption);
    }

    aef.appendChild(attr_domain_lbl);
    aef.appendChild(attr_domain_sel);
    aef.appendChild(document.createElement("br"));

    // For the attribute default value:
    var attr_default_lbl = document.createElement('label');
    var attr_default_txt = document.createElement('input');

    attr_default_lbl.innerHTML = 'Attribute default value: ';
    attr_default_txt.style.marginTop = '8px';
    attr_default_txt.name = 'aef_default';
    attr_default_txt.placeholder = '0';

    aef.appendChild(attr_default_lbl);
    aef.appendChild(attr_default_txt);
    aef.appendChild(document.createElement("br"));

    // Add a submit and cancel button to navigate out of the form
    var aef_submit = document.createElement('input');
    aef_submit.setAttribute('type', 'submit');
    aef_submit.setAttribute('value', 'Create Attribute');
    aef_submit.style.cursor = 'pointer';
    aef_submit.style.marginTop = '6px';
    aef_submit.addEventListener('click', function(evt) {
        evt.preventDefault();
        HandleAttributeEditorSubmit(aef);
        return false;
    });
    aef.appendChild(aef_submit);

    var aef_cancel = document.createElement('input');
    aef_cancel.setAttribute('type', 'submit');
    aef_cancel.setAttribute('value', 'Cancel');
    aef_cancel.style.cursor = 'pointer';
    aef_cancel.style.marginTop = '6px';
    aef_cancel.style.marginLeft = '6px';
    aef_cancel.addEventListener('click', function(evt) {
        evt.preventDefault();
        aef.innerHTML = '';
        return false;
    });
    aef.appendChild(aef_cancel);
};

// Called when an attribute is added
// New attributes must have their default values validated or set to the domain default
// Cells in the graph must then be given that default value and a socket emission made.
function HandleAttributeEditorSubmit(aef) {
    // First, build a dictionary for easy access to the form responses.
    // Dictionary keys are the names given to the form elements as defined above.
    var values = {};
    for (var i = 0; i < aef.children.length; i++) {
        var childName = aef.children[i].getAttribute('name');
        if (childName != null) values[childName] = aef.children[i].value;
    }

    // Some validation for non-empty names and invalid default values
    if (attributes[values['aef_name']] != undefined) return;
    if (values['aef_name'] == '') return;
    var isDefaultValid = ValidateAttribute(values['aef_default'], values['aef_domain']);
    if (!isDefaultValid[0]) {
        values['aef_default'] = 0;
    }
    else {
        values['aef_default'] = isDefaultValid[1];
    }

    if (values['aef_name'] == 'label' || values['aef_name'] == 'nodetype') return;
    AddAttribute(values['aef_name'], values['aef_desc'], values['aef_domain'], values['aef_default']);
    UpdateExistingCellAttributes(values['aef_name'], values['aef_default']);
    LoadAttributeListDisplay();
    EmitTree(ReturnGraph());
};

// When adding attributes, update all the existing cells to reflect the change
function UpdateExistingCellAttributes(attr_name, value) {
    var graph = ReturnGraph();
    TraverseTree(graph, function(vertex) {
        vertex.setAttribute(attr_name, value);
    });
    graph.refresh();
};

// A set of sample attributes for testing
function AddAttributes() {
    AddAttribute('cost', '',
        'POSITIVE_RATIONAL', 0);

    AddAttribute('probability', '',
        'UNIT_INTERVAL', 0);

    AddAttribute('possible', '',
        'TRUE_FALSE', 1.0);
};