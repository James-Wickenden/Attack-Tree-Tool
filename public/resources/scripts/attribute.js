/*
    This form handles creating new attributes and their params.
    Attributes are JS objects that have a name, two rules for how they are combined, and a domain eg [0,1] or [0..].
*/

"use strict";

// Dictionary of the current graph attributes
// The keys are attribute names, and the values are objects holding the attribute data
var attributes = {};
var cur_attribute_index = -1;

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

    attributes[attributeName] = attr;
    return attr;
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
