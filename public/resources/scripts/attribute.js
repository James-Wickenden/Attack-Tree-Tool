"use strict";

// Dictionary of the current graph attributes
// The keys are attribute names, and the values are objects holding the attribute data
var attributes = {};

// Adds a new attribute to the dictionary, its rules, and its domain.
function AddAttribute(attributeName = "UNDEF",
                      default_val = 0, min_val = 0, max_val = Infinity,
                      AND_rule = function(current, child) { return current + child; },
                      OR_rule = function(current, child) { return Math.min(current, child); })
{
    const attr = {};
    attr.name = attributeName;
    attr.AND_rule = AND_rule;
    attr.OR_rule = OR_rule;
    attr.default_val = default_val;
    attr.min_val = min_val;
    attr.max_val = max_val;

    attributes[attributeName] = attr;
    return attr;
};

// A pair of sample attributes for testing
AddAttribute("cost", 0, 0, Infinity);
AddAttribute("probability", 0, 0, 1,
             function(current, child) {
                return current * child;
             },
             function(current, child) {
                return current + child - (current * child);
             });
