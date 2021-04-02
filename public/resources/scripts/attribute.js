/*
    This form handles creating new attributes and their params.
    Attributes are JS objects that have a name, two rules for how they are combined, and a domain eg [0,1] or [0..].
    Also handles the attribute navigator, including creating and updating attributes, and creating these forms dyamically.
*/

"use strict";

// Dictionary of the current graph attributes
// The keys are attribute names, and the values are objects holding the attribute data
var attributes = {};
//var cur_attribute_index = -1;

const domains = {
    TRUE_FALSE: 0,
    UNIT_INTERVAL: 1,
    RATIONAL: 3,
    POSITIVE_RATIONAL: 2,
    INTEGER: 4,
    POSITIVE_INTEGER: 5
}

// Adds a new attribute to the dictionary, its rules, and its domain.
// rules should be functions of the form: function(current, child) { return [some new current value]; }
// domains should be taken from the domains object, defined above.
function AddAttribute(attributeName, attributeDesc,
    domain, default_val,
    AND_rule, OR_rule) {

    const attr = {};
    attr.name = attributeName;
    attr.desc = attributeDesc;
    attr.AND_rule = AND_rule;
    attr.OR_rule = OR_rule;
    attr.domain = domain;
    attr.default_val = default_val;
    attr.display = true;

    attributes[attributeName] = attr;
    return attr;
};

function ShowHideAttribute(cb, graph) {
    var key = cb.id.split('adl_cb_')[1];
    attributes[key].display = cb.checked;
    graph.refresh();
};

// Given a new attribute value, use the given attribute domain to determine whether its valid or not.
// Returns a list containing two elements:
// First, a boolean value whether the given attribute value is valid or not.
// If this is true, the second element is the parsed and typed value to be used. This could be a boolean, a float, an int, etc.
function ValidateAttribute(newValue, attribute) {
    if (newValue === null || newValue === undefined || newValue == '') return [false];
    switch (attribute.domain) {
        case domains.TRUE_FALSE:
            var newValue_UC = newValue.toUpperCase();
            if (newValue_UC == 'TRUE') return [true, 1];
            if (newValue_UC == 'FALSE') return [true, 0];
            break;
        case domains.UNIT_INTERVAL:
            var newValue_float = parseFloat(newValue);
            if (isNaN(newValue_float)) return [false];
            if (newValue_float >= 0 && newValue_float <= 1) return [true, newValue_float];
            break;
        case domains.RATIONAL:
            var newValue_float = parseFloat(newValue);
            if (isNaN(newValue_float)) return [false];
            if (newValue_float > -Infinity && newValue_float < Infinity) return [true, newValue_float];
            break;
        case domains.POSITIVE_RATIONAL:
            var newValue_float = parseFloat(newValue);
            if (isNaN(newValue_float)) return [false];
            if (newValue_float >= 0 && newValue_float < Infinity) return [true, newValue_float];
            break;
        case domains.INTEGER:
            var newValue_int = parseInt(newValue);
            if (isNaN(newValue_float)) return [false];
            if (newValue_int > -Infinity && newValue_int < Infinity) return [true, newValue_int];
            break;
        case domains.POSITIVE_INTEGER:
            var newValue_int = parseInt(newValue);
            if (isNaN(newValue_float)) return [false];
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
    var validatedAttribute = ValidateAttribute(str_newValue, attributes[attr_key]);

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
        var id = 'adl_cb_' + key;
        attr_cb.id = id;
        attr_cb.type = "checkbox";
        attr_cb.checked = attributes[key].display;
        attr_cb.style.cursor = 'pointer';
        attr_cb.onclick = function () { ShowHideAttribute(this, graph); };
        attr_lb.innerHTML = key;
        adl.appendChild(attr_cb);
        adl.appendChild(attr_lb);
        adl.appendChild(document.createElement("br"));
    }
};

// Called when a cell's attributes are to be updated via the cell;s attribute navigator form.
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
        var validatedAttribute = ValidateAttribute(newValue, attributes[key]);
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

// A pair of sample attributes for testing
AddAttribute('cost', '',
    domains.POSITIVE_RATIONAL, 0,
    function (current, child) {
        return current + child;
    },
    function (current, child) {
        return Math.min(current, child);
    });

AddAttribute('probability', '',
    domains.UNIT_INTERVAL, 0,
    function (current, child) {
        return current * child;
    },
    function (current, child) {
        return current + child - (current * child);
    });

AddAttribute('possible', '',
    domains.TRUE_FALSE, 1.0,
    function (current, child) {
        if (current == 0 || child == 0) return 0;
        return 1;
    },
    function (current, child) {
        if (current == 1 || child == 1) return 1;
        return 0;
    });
