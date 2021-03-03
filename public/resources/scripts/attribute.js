"use strict";

var attributes_list = []

function AddAttribute(attributeName = "UNDEF",
                      default_val = 0, min_val = 0, max_val = Infinity,
                      AND_rule = function(current, child) { return current + child; },
                      OR_rule = function(current, child) { return Math.min(current, child); })
{
    if (AttributeAlreadyExists(attributeName)) { return; }
    const attr = {};
    attr.name = attributeName;
    attr.AND_rule = AND_rule;
    attr.OR_rule = OR_rule;
    attr.default_val = default_val;
    attr.min_val = min_val;
    attr.max_val = max_val;

    attributes_list.push(attr);
    console.log(attributes_list);
    return attr;
};

function AttributeAlreadyExists(attributeName) {
    var alreadyExists = false;
    attributes_list.forEach(function(attr) {
        if (attr.name == attributeName) alreadyExists = true;
    });
    return alreadyExists;
};

AddAttribute("cost", 100, 0, Infinity);
AddAttribute("cost", 100, 0, Infinity);
AddAttribute("probability", 0, 0, 1,
             function(current, child) {
                return current * child;
             },
             function(current, child) {
                return current + child - (current * child);
             });
