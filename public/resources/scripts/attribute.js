"use strict";

// Dictionary of the current graph attributes
// The keys are attribute names, and the values are objects holding the attribute data
var attributes = {};
var cur_attribute_index = -1;

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

// Navigating througha ttributes requires that we index them; this is done by iterating through keys and assigning sequenctial indices to them.
// The result is a second dictionary that has index keys and attribute name values, which is returned.
function GetIndexFromAttributes() {
   var attribute_indices = {};
   attribute_indices[-1] = "all";
   attribute_indices[-2] = "none";
   var i = 0;
   for (var key in attributes) {
      attribute_indices[i] = key;
      i++;
   }
   return attribute_indices;
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
