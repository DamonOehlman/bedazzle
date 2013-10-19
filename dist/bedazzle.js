!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.bedazzle=e():"undefined"!=typeof global?global.bedazzle=e():"undefined"!=typeof self&&(self.bedazzle=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  # Bedazzle

  Bedazzle is a JS animation library that allows you to do some pretty
  tricky stuff without much effort.  It's quite similar to
  [move.js](https://github.com/visionmedia/move.js) but uses a frames rather
  than a `then` function.

  Additionally, bedazzle is more or less a pure CSS manipulation library
  and doesn't support the additional easing functions that move does. It does
  work in partnership with your CSS though and aligns animation frames with
  your transition delays in the CSS (which is pretty neat).

  ## Example Usage

  Consider the following example, which animates a series of divs.  First
  we have some stripped down html:

  <<< examples/simple.html

  Then some css which is used across most of the examples:

  <<< examples/demos.css

  Finally, a little bit of browserifiable css to make it all work:

  <<< examples/simple.js

  ## Reference

**/

var ratchet = require('ratchet');
var stylar = require('stylar');
var _ = require('underscore');
var extend = _.extend;

// define the property map
var transformProps = [
  'x',
  'y',
  'z',
  'rotate',
  'rx',
  'ry',
  'rz',
  'scale'
];
    
var percentageProps = [
  'opacity'
];

var standardProps = [
  'height',
  'width'
];

var reStripValue = /^\-?\d+/;

/**
  ### bedazzle(elements, opts?)

  Create a new `Bedazzler` instance which is used to orchestrate the
  animation of the supplied `elements` (or those elements matched by the
  selector referred to by elements if it is a string).

**/
function Bedazzler(elements, opts) {
  if (! (this instanceof Bedazzler)) {
    return new Bedazzler(elements, opts);
  }

  // if we have been given a string, then find the elements
  if (typeof elements == 'string' || (elements instanceof String)) {
    elements = ((opts || {}).scope || document).querySelectorAll(elements);
  }

  this.elements = [].slice.call(elements);
  this.rtid = 0;
  this.state = {};
  this.done = [];
  this.queued = [];

  // set some configurable options
  this._opts = {
    frameDelay: 1000 / 60,
    immediate: false
  };
}

module.exports = Bedazzler;
var p = Bedazzler.prototype;

/**
  ### Bedazzler#frame(action?)

  Define a new frame in the animation loop.  If an action function is
  supplied, then it will be called (with `this` bound to the Bedazzler) once
  the frame becomes active.

**/
p.frame = function(action) {
  var ii;
  var bedazzler = this;
  var props = {
    elements: [],
    manualHelpers: [],
    callbacks: []
  };

  // currentTransform = stylar(this.elements[0]).get('transform', true);
  props.transform = new ratchet.Transform(); // ratchet(currentTransform);
  
  // if we have current properties, then clone the values
  if (this.props) {
    // copy each of the elements
    for (ii = this.elements.length; ii--; ) {
      props.elements[ii] = _.clone(this.props.elements[ii]) || {};
    }
  }
  // otherwise create the new properties
  else {
    for (ii = this.elements.length; ii--; ) {
      props.elements[ii] = {};
    }
  }

  // queue the action
  this.queued.push(function() {
    bedazzler.props = props;

    // if we have the action, then run it
    if (typeof action == 'function') {
      action.call(bedazzler, bedazzler.elements);
    }

    // return the props after having being tweaked by this frame
    return props;
  });

  // queue it up
  if (this._opts.immediate) {
    this._applyChanges();
  }
  else {
    clearTimeout(this.rtid);
    this.rtid = setTimeout(function() {
      bedazzler._applyChanges();
    }, this._opts.frameDelay || 0);
  }

  return this;
};

/**
  ### Bedazzler#end(callback)

  Once the current frame has completed, trigger the supplied function.

**/
p.end = function(callback) {
  this.props.callbacks.push(callback);
  return this;
};

/**
  ### Bedazzler#loop()

  When all of the defined frames have completed, restart from the beginning.
  An example of using loop can be found in the 'loopy' example, shown below:

  <<< examples/loopy.js

**/
p.loop = function() {
  var lastFrame = this.queued[this.queued.length - 1];

  // if we have a last frame mark it as looping
  if (lastFrame) {
    lastFrame.loop = true;
  }

  return this;
};

/**
  ### Bedazzler#manual(helper)

  TBC

**/
p.manual = function(helper) {
  this.props.manualHelpers.push(helper);
  
  return this;
};

/**
  ### Bedazzler#opts(opts)

  TBC

**/
p.opts = function(opts) {
  extend(this._opts, opts);

  return this;
};

/**
  ### Bedazzler#set(name, value)

  TBC

**/
p.set = function(name, value) {
  var props = this.props;
  
  if (arguments.length === 1) {
    this.update(name, true);
  }
  else if (_.include(transformProps, name)) {
    this[name].call(this, value, true);
  }
  else if (name == 'transform') {
    props.transform = ratchet(value);
  }
  else {
    // iterate through the elements and set the values for the named property
    for (var ii = this.elements.length; ii--; ) {
      props.elements[ii][name] = value;
    }
  }

  return this;
};

/**
  ### Bedazzler#update(props, absolute?)

  TBC

**/
p.update = function(props, absolute) {
  // update the state of each of the properties
  if (props) {
    for (var key in props) {
      if (this[key]) {
        this[key](parseInt(props[key], 10) || props[key], absolute);
      }
    }
  }
  
  return this;
};

// create the prototype methods for each of the identified
// transform functions
transformProps.forEach(function(key) {
  var targetKeys = [key];
  var targetSection = 'translate';
  var reRotate = /^r(\w)?(?:otate)?$/;
  var reScale = /^scale(X|Y|Z)?$/;
  
  if (reRotate.test(key)) {
    targetKeys = [RegExp.$1 || 'z'];
    targetSection = 'rotate';
  }
  
  if (reScale.test(key)) {
    if (RegExp.$1) {
      targetKeys = RegExp.$1.toLowerCase();
    }
    else {
      targetKeys = ['x', 'y'];
    }
    
    targetSection = 'scale';
  }
    
  p[key] = function(value, absolute) {
    var xyz = this.props.transform[targetSection], currentVal;
    
    targetKeys.forEach(function(targetKey) {
      currentVal = xyz[targetKey].value || 0;

      // if we are applying an absolute value, then 
      if (absolute) {
        xyz[targetKey].value = value - currentVal;
      }
      else {
        xyz[targetKey].value = currentVal + value;
      }
    });

    return this;
  };
});

// implement the non-transform percentage (opacity, etc) properties
_.each(percentageProps, function(key) {
  p[key] = function(value) {
    for (var ii = this.elements.length; ii--; ) {
      var targetProp = this.props.elements[ii];

      // get the current value, if not defined default to 1 / 100%
      var currentVal = targetProp[key] || stylar(this.elements[ii], key) || 1;

      // multiply the current value by the new value
      targetProp[key] = currentVal * value;
    }
    
    return this;
  };
});

// implement prototype method for the standard properties
_.each(standardProps, function(key) {
  p[key] = function(value) {
    for (var ii = this.elements.length; ii--; ) {
      var targetProp = this.props.elements[ii];
      var currentVal = targetProp[key] ||
            stylar(this.elements[ii], key) ||
            '0px';

      var actualValue = parseFloat(currentVal) || 0;

      var units = value.toString().replace(reStripValue, '') ||
            currentVal.toString().replace(reStripValue, '') ||
            'px';

      targetProp[key] = (actualValue + parseFloat(value)) + units;
    }
    
    return this;
  };
});

/**
  ## Internal Methods
**/

/**
  ### _applyChanges()

**/
p._applyChanges = function() {
  var ii;
  var element;
  var props;
  var frame = this.queued.shift();
  var bedazzler = this;
  var transitionDuration;
  var transitioners = [];
  var timeout = 0;
  var currentTransform;
  var newTransform;

  // debugger;
      
  // if we don't have properties to apply, return
  if (typeof frame != 'function') {
    return;
  }

  // goto the next frame
  props = frame();
  
  // if we have manual helpers, then run then now
  props.manualHelpers.forEach(function(helper) {
    helper.call(bedazzler, bedazzler.elements);
  });
  
  // iterate through the elements and update
  for (ii = this.elements.length; ii--; ) {
    // get a stylar reference for the target element
    element = stylar(this.elements[ii]);
    
    // determine whether the current element has a transition on it
    transitionDuration = parseFloat(element.get('transition-duration'));
    
    // determine whether we have a transition on the element or not
    if (transitionDuration) {
      timeout = Math.max(timeout, transitionDuration * 1000);
      transitioners.push(this.elements[ii]);
    }
    
    // if we have a general transform apply that
    if (props.transform) {
      // read the transform
      currentTransform = element.get('transform', true);

      newTransform = currentTransform ?
        ratchet(currentTransform).add(props.transform) :
        props.transform;
      
      // update the transform taking into account the current transform
      element.set('transform', newTransform.toString({ all: true }));
    }
    
    // iterate through the values and apply then to the element
    element.set(props.elements[ii]);
  }
  
  // complete the frame
  this.rtid = 0;
  this.done.push(frame);

  // if the frame is looping, then copy done to queued
  if (frame.loop) {
    this.queued = this.done.splice(0);
    console.log(transitioners, timeout);
  }

  // next frame
  this._next(transitioners, timeout, props.callbacks || []);
};

/**
  ### _next(transitioners, timeout, callbacks)

**/
p._next = function(transitioners, timeout, callbacks) {
  var transitionsRemaining = transitioners.length;
  var bedazzler = this;
  var listener;
      
  function runNext() {
    if (listener) {
      listener.stop();
    }
    
    // trigger the callbacks
    _.each(callbacks, function(callback) {
      if (typeof callback == 'function') {
        callback.call(bedazzler, bedazzler.elements);
      }
    });
    
    // trigger the next update cycle
    bedazzler._applyChanges();
  }
  
  /*
  // if we have a transition, then on transition end, apply the changes
  if (transitionsRemaining > 0 && typeof aftershock == 'function') {
    listener = aftershock(transitioners, { timeout: timeout + 20 }, function() {
      runNext();
    });
  }
  else */
  if (transitionsRemaining > 0) {
    setTimeout(runNext, (timeout || 0) + 20);
  }
  else if (this.queued.length > 0) {
    runNext();
  }
};
},{"ratchet":2,"stylar":7,"underscore":8}],2:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  # Ratchet - CSS3 Transform Parser

  Ratchet assists with the process of dissecting CSS3 transform strings into
  javascript objects that you can then do something more intelligent with.

**/

var RatchetTransform = require('./types/transform');
var XYZ = require('./types/xyz');
var matchers = require('./matchers');

var unitTypes = {
  translate: 'px',
  rotate: 'deg',
  scale: ''
};

function fromString(inputString) {
  var props = new RatchetTransform();
  var data;

  function checkMatch(rule) {
    // reset the test string to the input string
    var testString = inputString;
    
    // get the initial match
    var match = rule.regex.exec(testString);
    
    while (match) {
      // ensure data has been initialized
      data = data || {};
      
      if (typeof rule.extract == 'function') {
        rule.extract(match, data);
      }
      else {
        for (var section in rule) {
          if (section !== 'regex' && typeof rule[section] == 'function') {
            data[section] = rule[section](match);
          }
        }
      }
      
      // update the data units
      data.units = unitTypes[key];
      
      // remove the match component from the input string
      testString = testString.slice(0, match.index) +
        testString.slice(match.index + match[0].length);
      
      // if this is a multimatch rule, then run the regex again
      if (rule.multi) {
        match = rule.regex.exec(testString);
      }
      // otherwise, clear the match to break the loop
      else {
        match = null;
      }
    }
    
    // initialise the properties (if we have data)
    if (data) {
      props[key] = new XYZ(key, data);
      
      // reset the data
      data = undefined;
    }
  }

  // iterate through the parsers
  for (var key in matchers) {
    matchers[key].forEach(checkMatch);
  }

  return props;
}

var ratchet = module.exports = function(input) {
  if (typeof input == 'string' || (input instanceof String)) {
    return fromString(input);
  }
};

// bind the internal helpers so we can test 
ratchet.fromString = fromString;
ratchet.Transform = RatchetTransform;
ratchet.XYZ = XYZ;
},{"./matchers":3,"./types/transform":4,"./types/xyz":6}],3:[function(require,module,exports){
/* jshint node: true */
'use strict';

var TransformValue = require('./types/value');

function extractVal(index, expectUnits) {
  return function(match) {
    var units = '';
    
    if (typeof expectUnits == 'undefined' || expectUnits) {
      // get the units
      // default to undefined if an empty string which means the 
      // default units for the XYZ value type will be used
      units = match[index + 1] || undefined;
    }

    // create the transform value
    return new TransformValue(match[index], units);
  };
}

function makeRegex(fnName, params) {
  var regex = fnName + '\\(';
  
  (params || '').split(/\s/).forEach(function(param) {
    regex += matchers[param];
  });
  
  // return the regex
  return new RegExp(regex + '\\)');
}

var matchers = {
  val: '(\\-?[\\d\\.]+)',
  unit: '([^\\s]*)',
  ',': '\\,\\s*'
};

exports.translate = [
  // standard 2d translation
  {
    regex: makeRegex('translate', 'val unit , val unit'),
    x: extractVal(1),
    y: extractVal(3)
  },

  // 2d/3d translation on a specific axis
  {
    regex: makeRegex('translate(X|Y|Z)', 'val unit'),
    extract: function(match, data) {
      data[match[1].toLowerCase()] = extractVal(2)(match);
    },
    multi: true
  },

  // 3d translation as the specific translate3d prop
  {
    regex: makeRegex('translate', 'val unit , val unit , val unit'),
    x: extractVal(1),
    y: extractVal(3),
    z: extractVal(5)
  }
];

exports.rotate = [
  // standard 2d rotation
  {
    regex: makeRegex('rotate', 'val unit'),
    z: extractVal(1)
  },

  // 3d rotations on a specific axis
  {
    regex:  makeRegex('rotate(X|Y|Z)', 'val unit'),
    extract: function(match, data) {
      data[match[1].toLowerCase()] = extractVal(2)(match);
    },
    multi: true
  }
];

exports.scale = [
  // standard 2d scaling (single parameter version)
  {
    regex: makeRegex('scale', 'val'),
    x: extractVal(1, false),
    y: extractVal(1, false)
  },

  // standard 2d scaling (two parameter version)
  {
    regex: makeRegex('scale', 'val , val'),
    x: extractVal(1, false),
    y: extractVal(2, false)
  },

  // 2d/3d translation on a specific axis
  {
    regex: makeRegex('scale(X|Y|Z)', 'val'),
    extract: function(match, data) {
      data[match[1].toLowerCase()] = extractVal(2, false)(match);
    },
    multi: true
  }
];
},{"./types/value":5}],4:[function(require,module,exports){
/* jshint node: true */
'use strict';

var XYZ = require('./xyz');

var scaleOps = {
  add: 'mul',
  sub: 'div'
};

function RatchetTransform(opts) {
  if (! (this instanceof RatchetTransform)) {
    return new RatchetTransform(opts);
  }

  opts = opts || {};
  
  // ensure the scale units are set to an empty string
  opts.scale = opts.scale || {};
  opts.scale.units = '';
  opts.scale.defaultValue = 1;
  
  // set the rotation units
  opts.rotate = opts.rotate || {};
  opts.rotate.units = 'deg';
  
  // create new translation rotation and scale values,
  // duplicating the value provided 
  this.translate = new XYZ('translate', opts.translate);
  this.rotate = new XYZ('rotate', opts.rotate);
  this.scale = new XYZ('scale', opts.scale);
}

module.exports = RatchetTransform;

RatchetTransform.prototype.clone = function() {
  return new RatchetTransform({
    translate: this.translate,
    scale: this.scale,
    rotate: this.rotate
  });
};

RatchetTransform.prototype.toString = function(opts) {
  var output = this.translate.toString(opts);
  var rotate = this.rotate.toString(opts);
  var scale = this.scale.toString(opts);
      
  if (rotate) {
    output += (output ? ' ' : '') + rotate;
  }
  
  if (scale) {
    output += (output ? ' ' : '') + scale;
  }
  
  return output;
};


['add', 'sub'].forEach(function(op) {
  RatchetTransform.prototype[op] = function() {
    // create new values to receive target values
    var newTransform = new RatchetTransform();
    
    // calculate the translation change
    newTransform.translate = XYZ.prototype[op].apply(
      this.translate,
      Array.prototype.map.call(
        arguments,
        function(item) { return item.translate; }
      )
    );
    
    // calculate the scale change (mapping add to mul)
    newTransform.scale = XYZ.prototype[scaleOps[op]].apply(
      this.scale,
      Array.prototype.map.call(
        arguments,
        function(item) { return item.scale; }
      )
    );
    
    // calculate the rotation update
    newTransform.rotate = XYZ.prototype[op].apply(
      this.rotate,
      Array.prototype.map.call(
        arguments,
        function(item) { return item.rotate; }
      )
    );
    
    return newTransform;
  };
});
},{"./xyz":6}],5:[function(require,module,exports){
/* jshint node: true */
'use strict';

function TransformValue(value, units) {
  var parsedVal = parseFloat(value);
  
  this.value = isNaN(parsedVal) ? value : parsedVal;
  this.units = units || '';
}

module.exports = TransformValue;

TransformValue.prototype.valueOf = function() {
  return this.value;
};

TransformValue.prototype.toString = function() {
  return this.value + this.units;
};

TransformValue.prototype.matchingUnits = function() {
  var match = true;
  for (var ii = arguments.length; ii--; ) {
    match = arguments[ii].units === this.units;
  }
  
  return match;
};
},{}],6:[function(require,module,exports){
/* jshint node: true */
'use strict';

var TransformValue = require('./value');

function XYZ(type, opts) {
  var defaultUnits;

  if (! (this instanceof XYZ)) {
    return new XYZ(type, opts);
  }
  
  opts = opts || {};
  
  this.type = type;
  this.defaultValue = opts.defaultValue || 0;
  
  // look for the default units
  defaultUnits = (opts.x || {}).units ||
    (opts.y || {}).units ||
    (opts.z || {}).units ||
    opts.units;
  
  // initialise the units
  this.units = typeof defaultUnits != 'undefined' ? defaultUnits : 'px';
  
  this.x = new TransformValue(typeof opts.x != 'undefined' ?
    opts.x : this.defaultValue, this.units);

  this.y = new TransformValue(typeof opts.y != 'undefined' ?
    opts.y : this.defaultValue, this.units);

  this.z = new TransformValue(typeof opts.z != 'undefined' ?
    opts.z : this.defaultValue, this.units);
}

module.exports = XYZ;

XYZ.prototype.add = function(value) {
  var x = this.x.valueOf();
  var y = this.y.valueOf();
  var z = this.z.valueOf();
  
  if (typeof value == 'number') {
    x += value;
    y += value;
    z = z ? z + value : 0;
  }
  else {
    for (var ii = arguments.length; ii--; ) {
      x += arguments[ii].x || 0;
      y += arguments[ii].y || 0;
      z = (z || arguments[ii].z) ? z + (arguments[ii].z || 0) : 0;
    }
  }
  
  return new XYZ(this.type, { x: x, y: y, z: z, units: this.units });
};

XYZ.prototype.mul = function(value) {
  var x = this.x.valueOf();
  var y = this.y.valueOf();
  var z = this.z ? this.z.valueOf() : 0;
  
  if (typeof value == 'number') {
    x *= value;
    y *= value;
    z = typeof this.z != 'undefined' ? z * value : 0;
  }
  else {
    for (var ii = arguments.length; ii--; ) {
      x *= arguments[ii].x;
      y *= arguments[ii].y;
      z *= arguments[ii].z;
    }
  }
  
  return new XYZ(this.type, { x: x, y: y, z: z, units: this.units });
};

['sub', 'div'].forEach(function(op) {
  var isSub = op === 'sub';
  var mappedKey = isSub ? 'add' : 'mul';
    
  XYZ.prototype[op] = function(value) {
    if (typeof value == 'number') {
      return this[mappedKey](isSub ? -value : 1 / value);
    }
    else {
      var xyz = this;
      var args = Array.prototype.map.call(arguments, function(item) {
        var inverted = new XYZ(xyz.type, item);
        
        if (isSub) {
          inverted.x = -inverted.x;
          inverted.y = -inverted.y;
          inverted.z = -inverted.z;
        }
        else {
          inverted.x = 1 / inverted.x;
          inverted.y = 1 / inverted.y;
          inverted.z = inverted.z ? 1 / inverted.z : 0;
        }
        
        return inverted;
      });

      return this[mappedKey].apply(this, args);
    }
  };
});

XYZ.prototype.toString = function(opts) {
  var output = [];
  
  // ensure options are defined
  opts = opts || {};
  
  if (opts.all || (this.x.value != this.defaultValue)) {
    output[output.length] = this.type + 'X(' + this.x.value +
      this.x.units + ')';
  }
  
  if (opts.all || (this.y.value != this.defaultValue)) {
    output[output.length] = this.type + 'Y(' + this.y.value +
      this.y.units + ')';
  }
  
  if (opts.all || (this.z.value != this.defaultValue)) {
    output[output.length] = this.type + 'Z(' + this.z.value +
      this.z.units + ')';
  }
  
  return output.join(' ');
};
},{"./value":5}],7:[function(require,module,exports){
/* ~stylar~
 * 
 * Simple Object Query Language
 * 
 * -meta---
 * version:    0.1.5
 * builddate:  2012-10-30T04:14:02.461Z
 * generator:  interleave@0.5.23
 * 
 * 
 * 
 */ 

// umdjs returnExports pattern: https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root['stylar'] = factory();
    }
}(this, function () {
    var prefixes = ['ms', 'o', 'Moz', 'webkit', ''],
        knownKeys = {},
        getComputed = null,
        reDash = /^(\w+)\-(\w)/,
        reVendorPrefixes = /^\-\w+\-/;
        
    if (document.defaultView && typeof document.defaultView.getComputedStyle == 'function') {
        getComputed = document.defaultView.getComputedStyle;
    }
        
    function sniffProperty(element, attribute) {
        var dashMatch, ii, prefix, prefixedAttr;
        
        // strip off css vendor prefixes
        attribute = attribute.replace(reVendorPrefixes, '');
        
        // convert delimiting dashes into camel case ids
        dashMatch = reDash.exec(attribute);
        while (dashMatch) {
            attribute = dashMatch[1] + dashMatch[2].toUpperCase() + attribute.slice(dashMatch[0].length);
            dashMatch = reDash.exec(attribute);
        }
        
        // search the known prefix
        for (ii = prefixes.length; ii--; ) {
            prefix = prefixes[ii];
            prefixedAttr = prefix ? (prefix + attribute[0].toUpperCase() + attribute.slice(1)) : attribute;
                
            if (typeof element.style[prefixedAttr] != 'undefined') {
                return knownKeys[attribute] = prefixedAttr;
            }
        }
        
        return attribute;
    }
    
    function stylar(elements, attribute, value) {
        var helpers = { get: getter, set: setter };
        
        if (typeof elements == 'string' || elements instanceof String) {
            elements = document.querySelectorAll(elements);
        }
        // if we don't have a splice function, then we don't have an array
        // make it one
        else if (typeof elements.length == 'undefined') {
            elements = [elements];
        } // if..else
        
        function getter(attr, ignoreComputed) {
            var readKey, style;
            
            // get the read key
            readKey = knownKeys[attr] || sniffProperty(elements[0], attr);
    
            // if we have the get computed function defined, and the opts.ignoreComputed is not set
            // then get the computed style fot eh element
            if (getComputed && (! ignoreComputed)) {
                style = getComputed.call(document.defaultView, elements[0]);
            }
            // otherwise, just return the style element 
            else {
                style = elements[0].style;
            }
                
            return style ? style[readKey] : '';
        }
        
        function setter(attr, val) {
            if (typeof attr == 'object' && (! (attr instanceof String))) {
                // if we have been passed an object, then iterate through the keys and update
                // each of the found values
                for (var key in attr) {
                    setter(key, attr[key]);
                }
            }
            else {
                var styleKey = knownKeys[attr] || sniffProperty(elements[0], attr);
    
                for (var ii = elements.length; ii--; ) {
                    elements[ii].style[styleKey] = val;
                }
            }
            
            return helpers;
        }
        
        // iterate through the elements
        
        // if we are in set mode, then update the attribute with the value
        if (typeof attribute == 'undefined') {
            return helpers;
        }
        else if (typeof value != 'undefined') {
            return setter(attribute, value);
        }
        else {
            return getter(attribute);
        }
    }
    
    stylar.sniffProperty = sniffProperty;
    
    return typeof stylar != 'undefined' ? stylar : undefined;
}));
},{}],8:[function(require,module,exports){
//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kYW1vL2NvZGUvRGFtb25PZWhsbWFuL2JlZGF6emxlL2luZGV4LmpzIiwiL2hvbWUvZGFtby9jb2RlL0RhbW9uT2VobG1hbi9iZWRhenpsZS9ub2RlX21vZHVsZXMvcmF0Y2hldC9pbmRleC5qcyIsIi9ob21lL2RhbW8vY29kZS9EYW1vbk9laGxtYW4vYmVkYXp6bGUvbm9kZV9tb2R1bGVzL3JhdGNoZXQvbWF0Y2hlcnMuanMiLCIvaG9tZS9kYW1vL2NvZGUvRGFtb25PZWhsbWFuL2JlZGF6emxlL25vZGVfbW9kdWxlcy9yYXRjaGV0L3R5cGVzL3RyYW5zZm9ybS5qcyIsIi9ob21lL2RhbW8vY29kZS9EYW1vbk9laGxtYW4vYmVkYXp6bGUvbm9kZV9tb2R1bGVzL3JhdGNoZXQvdHlwZXMvdmFsdWUuanMiLCIvaG9tZS9kYW1vL2NvZGUvRGFtb25PZWhsbWFuL2JlZGF6emxlL25vZGVfbW9kdWxlcy9yYXRjaGV0L3R5cGVzL3h5ei5qcyIsIi9ob21lL2RhbW8vY29kZS9EYW1vbk9laGxtYW4vYmVkYXp6bGUvbm9kZV9tb2R1bGVzL3N0eWxhci9pbmRleC5qcyIsIi9ob21lL2RhbW8vY29kZS9EYW1vbk9laGxtYW4vYmVkYXp6bGUvbm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUvdW5kZXJzY29yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIEJlZGF6emxlXG5cbiAgQmVkYXp6bGUgaXMgYSBKUyBhbmltYXRpb24gbGlicmFyeSB0aGF0IGFsbG93cyB5b3UgdG8gZG8gc29tZSBwcmV0dHlcbiAgdHJpY2t5IHN0dWZmIHdpdGhvdXQgbXVjaCBlZmZvcnQuICBJdCdzIHF1aXRlIHNpbWlsYXIgdG9cbiAgW21vdmUuanNdKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9tb3ZlLmpzKSBidXQgdXNlcyBhIGZyYW1lcyByYXRoZXJcbiAgdGhhbiBhIGB0aGVuYCBmdW5jdGlvbi5cblxuICBBZGRpdGlvbmFsbHksIGJlZGF6emxlIGlzIG1vcmUgb3IgbGVzcyBhIHB1cmUgQ1NTIG1hbmlwdWxhdGlvbiBsaWJyYXJ5XG4gIGFuZCBkb2Vzbid0IHN1cHBvcnQgdGhlIGFkZGl0aW9uYWwgZWFzaW5nIGZ1bmN0aW9ucyB0aGF0IG1vdmUgZG9lcy4gSXQgZG9lc1xuICB3b3JrIGluIHBhcnRuZXJzaGlwIHdpdGggeW91ciBDU1MgdGhvdWdoIGFuZCBhbGlnbnMgYW5pbWF0aW9uIGZyYW1lcyB3aXRoXG4gIHlvdXIgdHJhbnNpdGlvbiBkZWxheXMgaW4gdGhlIENTUyAod2hpY2ggaXMgcHJldHR5IG5lYXQpLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBDb25zaWRlciB0aGUgZm9sbG93aW5nIGV4YW1wbGUsIHdoaWNoIGFuaW1hdGVzIGEgc2VyaWVzIG9mIGRpdnMuICBGaXJzdFxuICB3ZSBoYXZlIHNvbWUgc3RyaXBwZWQgZG93biBodG1sOlxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuaHRtbFxuXG4gIFRoZW4gc29tZSBjc3Mgd2hpY2ggaXMgdXNlZCBhY3Jvc3MgbW9zdCBvZiB0aGUgZXhhbXBsZXM6XG5cbiAgPDw8IGV4YW1wbGVzL2RlbW9zLmNzc1xuXG4gIEZpbmFsbHksIGEgbGl0dGxlIGJpdCBvZiBicm93c2VyaWZpYWJsZSBjc3MgdG8gbWFrZSBpdCBhbGwgd29yazpcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG52YXIgcmF0Y2hldCA9IHJlcXVpcmUoJ3JhdGNoZXQnKTtcbnZhciBzdHlsYXIgPSByZXF1aXJlKCdzdHlsYXInKTtcbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xudmFyIGV4dGVuZCA9IF8uZXh0ZW5kO1xuXG4vLyBkZWZpbmUgdGhlIHByb3BlcnR5IG1hcFxudmFyIHRyYW5zZm9ybVByb3BzID0gW1xuICAneCcsXG4gICd5JyxcbiAgJ3onLFxuICAncm90YXRlJyxcbiAgJ3J4JyxcbiAgJ3J5JyxcbiAgJ3J6JyxcbiAgJ3NjYWxlJ1xuXTtcbiAgICBcbnZhciBwZXJjZW50YWdlUHJvcHMgPSBbXG4gICdvcGFjaXR5J1xuXTtcblxudmFyIHN0YW5kYXJkUHJvcHMgPSBbXG4gICdoZWlnaHQnLFxuICAnd2lkdGgnXG5dO1xuXG52YXIgcmVTdHJpcFZhbHVlID0gL15cXC0/XFxkKy87XG5cbi8qKlxuICAjIyMgYmVkYXp6bGUoZWxlbWVudHMsIG9wdHM/KVxuXG4gIENyZWF0ZSBhIG5ldyBgQmVkYXp6bGVyYCBpbnN0YW5jZSB3aGljaCBpcyB1c2VkIHRvIG9yY2hlc3RyYXRlIHRoZVxuICBhbmltYXRpb24gb2YgdGhlIHN1cHBsaWVkIGBlbGVtZW50c2AgKG9yIHRob3NlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlXG4gIHNlbGVjdG9yIHJlZmVycmVkIHRvIGJ5IGVsZW1lbnRzIGlmIGl0IGlzIGEgc3RyaW5nKS5cblxuKiovXG5mdW5jdGlvbiBCZWRhenpsZXIoZWxlbWVudHMsIG9wdHMpIHtcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBCZWRhenpsZXIpKSB7XG4gICAgcmV0dXJuIG5ldyBCZWRhenpsZXIoZWxlbWVudHMsIG9wdHMpO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBiZWVuIGdpdmVuIGEgc3RyaW5nLCB0aGVuIGZpbmQgdGhlIGVsZW1lbnRzXG4gIGlmICh0eXBlb2YgZWxlbWVudHMgPT0gJ3N0cmluZycgfHwgKGVsZW1lbnRzIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgIGVsZW1lbnRzID0gKChvcHRzIHx8IHt9KS5zY29wZSB8fCBkb2N1bWVudCkucXVlcnlTZWxlY3RvckFsbChlbGVtZW50cyk7XG4gIH1cblxuICB0aGlzLmVsZW1lbnRzID0gW10uc2xpY2UuY2FsbChlbGVtZW50cyk7XG4gIHRoaXMucnRpZCA9IDA7XG4gIHRoaXMuc3RhdGUgPSB7fTtcbiAgdGhpcy5kb25lID0gW107XG4gIHRoaXMucXVldWVkID0gW107XG5cbiAgLy8gc2V0IHNvbWUgY29uZmlndXJhYmxlIG9wdGlvbnNcbiAgdGhpcy5fb3B0cyA9IHtcbiAgICBmcmFtZURlbGF5OiAxMDAwIC8gNjAsXG4gICAgaW1tZWRpYXRlOiBmYWxzZVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJlZGF6emxlcjtcbnZhciBwID0gQmVkYXp6bGVyLnByb3RvdHlwZTtcblxuLyoqXG4gICMjIyBCZWRhenpsZXIjZnJhbWUoYWN0aW9uPylcblxuICBEZWZpbmUgYSBuZXcgZnJhbWUgaW4gdGhlIGFuaW1hdGlvbiBsb29wLiAgSWYgYW4gYWN0aW9uIGZ1bmN0aW9uIGlzXG4gIHN1cHBsaWVkLCB0aGVuIGl0IHdpbGwgYmUgY2FsbGVkICh3aXRoIGB0aGlzYCBib3VuZCB0byB0aGUgQmVkYXp6bGVyKSBvbmNlXG4gIHRoZSBmcmFtZSBiZWNvbWVzIGFjdGl2ZS5cblxuKiovXG5wLmZyYW1lID0gZnVuY3Rpb24oYWN0aW9uKSB7XG4gIHZhciBpaTtcbiAgdmFyIGJlZGF6emxlciA9IHRoaXM7XG4gIHZhciBwcm9wcyA9IHtcbiAgICBlbGVtZW50czogW10sXG4gICAgbWFudWFsSGVscGVyczogW10sXG4gICAgY2FsbGJhY2tzOiBbXVxuICB9O1xuXG4gIC8vIGN1cnJlbnRUcmFuc2Zvcm0gPSBzdHlsYXIodGhpcy5lbGVtZW50c1swXSkuZ2V0KCd0cmFuc2Zvcm0nLCB0cnVlKTtcbiAgcHJvcHMudHJhbnNmb3JtID0gbmV3IHJhdGNoZXQuVHJhbnNmb3JtKCk7IC8vIHJhdGNoZXQoY3VycmVudFRyYW5zZm9ybSk7XG4gIFxuICAvLyBpZiB3ZSBoYXZlIGN1cnJlbnQgcHJvcGVydGllcywgdGhlbiBjbG9uZSB0aGUgdmFsdWVzXG4gIGlmICh0aGlzLnByb3BzKSB7XG4gICAgLy8gY29weSBlYWNoIG9mIHRoZSBlbGVtZW50c1xuICAgIGZvciAoaWkgPSB0aGlzLmVsZW1lbnRzLmxlbmd0aDsgaWktLTsgKSB7XG4gICAgICBwcm9wcy5lbGVtZW50c1tpaV0gPSBfLmNsb25lKHRoaXMucHJvcHMuZWxlbWVudHNbaWldKSB8fCB7fTtcbiAgICB9XG4gIH1cbiAgLy8gb3RoZXJ3aXNlIGNyZWF0ZSB0aGUgbmV3IHByb3BlcnRpZXNcbiAgZWxzZSB7XG4gICAgZm9yIChpaSA9IHRoaXMuZWxlbWVudHMubGVuZ3RoOyBpaS0tOyApIHtcbiAgICAgIHByb3BzLmVsZW1lbnRzW2lpXSA9IHt9O1xuICAgIH1cbiAgfVxuXG4gIC8vIHF1ZXVlIHRoZSBhY3Rpb25cbiAgdGhpcy5xdWV1ZWQucHVzaChmdW5jdGlvbigpIHtcbiAgICBiZWRhenpsZXIucHJvcHMgPSBwcm9wcztcblxuICAgIC8vIGlmIHdlIGhhdmUgdGhlIGFjdGlvbiwgdGhlbiBydW4gaXRcbiAgICBpZiAodHlwZW9mIGFjdGlvbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhY3Rpb24uY2FsbChiZWRhenpsZXIsIGJlZGF6emxlci5lbGVtZW50cyk7XG4gICAgfVxuXG4gICAgLy8gcmV0dXJuIHRoZSBwcm9wcyBhZnRlciBoYXZpbmcgYmVpbmcgdHdlYWtlZCBieSB0aGlzIGZyYW1lXG4gICAgcmV0dXJuIHByb3BzO1xuICB9KTtcblxuICAvLyBxdWV1ZSBpdCB1cFxuICBpZiAodGhpcy5fb3B0cy5pbW1lZGlhdGUpIHtcbiAgICB0aGlzLl9hcHBseUNoYW5nZXMoKTtcbiAgfVxuICBlbHNlIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5ydGlkKTtcbiAgICB0aGlzLnJ0aWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgYmVkYXp6bGVyLl9hcHBseUNoYW5nZXMoKTtcbiAgICB9LCB0aGlzLl9vcHRzLmZyYW1lRGVsYXkgfHwgMCk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMgQmVkYXp6bGVyI2VuZChjYWxsYmFjaylcblxuICBPbmNlIHRoZSBjdXJyZW50IGZyYW1lIGhhcyBjb21wbGV0ZWQsIHRyaWdnZXIgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uLlxuXG4qKi9cbnAuZW5kID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdGhpcy5wcm9wcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyBCZWRhenpsZXIjbG9vcCgpXG5cbiAgV2hlbiBhbGwgb2YgdGhlIGRlZmluZWQgZnJhbWVzIGhhdmUgY29tcGxldGVkLCByZXN0YXJ0IGZyb20gdGhlIGJlZ2lubmluZy5cbiAgQW4gZXhhbXBsZSBvZiB1c2luZyBsb29wIGNhbiBiZSBmb3VuZCBpbiB0aGUgJ2xvb3B5JyBleGFtcGxlLCBzaG93biBiZWxvdzpcblxuICA8PDwgZXhhbXBsZXMvbG9vcHkuanNcblxuKiovXG5wLmxvb3AgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGxhc3RGcmFtZSA9IHRoaXMucXVldWVkW3RoaXMucXVldWVkLmxlbmd0aCAtIDFdO1xuXG4gIC8vIGlmIHdlIGhhdmUgYSBsYXN0IGZyYW1lIG1hcmsgaXQgYXMgbG9vcGluZ1xuICBpZiAobGFzdEZyYW1lKSB7XG4gICAgbGFzdEZyYW1lLmxvb3AgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIEJlZGF6emxlciNtYW51YWwoaGVscGVyKVxuXG4gIFRCQ1xuXG4qKi9cbnAubWFudWFsID0gZnVuY3Rpb24oaGVscGVyKSB7XG4gIHRoaXMucHJvcHMubWFudWFsSGVscGVycy5wdXNoKGhlbHBlcik7XG4gIFxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMgQmVkYXp6bGVyI29wdHMob3B0cylcblxuICBUQkNcblxuKiovXG5wLm9wdHMgPSBmdW5jdGlvbihvcHRzKSB7XG4gIGV4dGVuZCh0aGlzLl9vcHRzLCBvcHRzKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMgQmVkYXp6bGVyI3NldChuYW1lLCB2YWx1ZSlcblxuICBUQkNcblxuKiovXG5wLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBwcm9wcyA9IHRoaXMucHJvcHM7XG4gIFxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHRoaXMudXBkYXRlKG5hbWUsIHRydWUpO1xuICB9XG4gIGVsc2UgaWYgKF8uaW5jbHVkZSh0cmFuc2Zvcm1Qcm9wcywgbmFtZSkpIHtcbiAgICB0aGlzW25hbWVdLmNhbGwodGhpcywgdmFsdWUsIHRydWUpO1xuICB9XG4gIGVsc2UgaWYgKG5hbWUgPT0gJ3RyYW5zZm9ybScpIHtcbiAgICBwcm9wcy50cmFuc2Zvcm0gPSByYXRjaGV0KHZhbHVlKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGVsZW1lbnRzIGFuZCBzZXQgdGhlIHZhbHVlcyBmb3IgdGhlIG5hbWVkIHByb3BlcnR5XG4gICAgZm9yICh2YXIgaWkgPSB0aGlzLmVsZW1lbnRzLmxlbmd0aDsgaWktLTsgKSB7XG4gICAgICBwcm9wcy5lbGVtZW50c1tpaV1bbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMgQmVkYXp6bGVyI3VwZGF0ZShwcm9wcywgYWJzb2x1dGU/KVxuXG4gIFRCQ1xuXG4qKi9cbnAudXBkYXRlID0gZnVuY3Rpb24ocHJvcHMsIGFic29sdXRlKSB7XG4gIC8vIHVwZGF0ZSB0aGUgc3RhdGUgb2YgZWFjaCBvZiB0aGUgcHJvcGVydGllc1xuICBpZiAocHJvcHMpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gcHJvcHMpIHtcbiAgICAgIGlmICh0aGlzW2tleV0pIHtcbiAgICAgICAgdGhpc1trZXldKHBhcnNlSW50KHByb3BzW2tleV0sIDEwKSB8fCBwcm9wc1trZXldLCBhYnNvbHV0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGNyZWF0ZSB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZm9yIGVhY2ggb2YgdGhlIGlkZW50aWZpZWRcbi8vIHRyYW5zZm9ybSBmdW5jdGlvbnNcbnRyYW5zZm9ybVByb3BzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gIHZhciB0YXJnZXRLZXlzID0gW2tleV07XG4gIHZhciB0YXJnZXRTZWN0aW9uID0gJ3RyYW5zbGF0ZSc7XG4gIHZhciByZVJvdGF0ZSA9IC9ecihcXHcpPyg/Om90YXRlKT8kLztcbiAgdmFyIHJlU2NhbGUgPSAvXnNjYWxlKFh8WXxaKT8kLztcbiAgXG4gIGlmIChyZVJvdGF0ZS50ZXN0KGtleSkpIHtcbiAgICB0YXJnZXRLZXlzID0gW1JlZ0V4cC4kMSB8fCAneiddO1xuICAgIHRhcmdldFNlY3Rpb24gPSAncm90YXRlJztcbiAgfVxuICBcbiAgaWYgKHJlU2NhbGUudGVzdChrZXkpKSB7XG4gICAgaWYgKFJlZ0V4cC4kMSkge1xuICAgICAgdGFyZ2V0S2V5cyA9IFJlZ0V4cC4kMS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRhcmdldEtleXMgPSBbJ3gnLCAneSddO1xuICAgIH1cbiAgICBcbiAgICB0YXJnZXRTZWN0aW9uID0gJ3NjYWxlJztcbiAgfVxuICAgIFxuICBwW2tleV0gPSBmdW5jdGlvbih2YWx1ZSwgYWJzb2x1dGUpIHtcbiAgICB2YXIgeHl6ID0gdGhpcy5wcm9wcy50cmFuc2Zvcm1bdGFyZ2V0U2VjdGlvbl0sIGN1cnJlbnRWYWw7XG4gICAgXG4gICAgdGFyZ2V0S2V5cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldEtleSkge1xuICAgICAgY3VycmVudFZhbCA9IHh5elt0YXJnZXRLZXldLnZhbHVlIHx8IDA7XG5cbiAgICAgIC8vIGlmIHdlIGFyZSBhcHBseWluZyBhbiBhYnNvbHV0ZSB2YWx1ZSwgdGhlbiBcbiAgICAgIGlmIChhYnNvbHV0ZSkge1xuICAgICAgICB4eXpbdGFyZ2V0S2V5XS52YWx1ZSA9IHZhbHVlIC0gY3VycmVudFZhbDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB4eXpbdGFyZ2V0S2V5XS52YWx1ZSA9IGN1cnJlbnRWYWwgKyB2YWx1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xufSk7XG5cbi8vIGltcGxlbWVudCB0aGUgbm9uLXRyYW5zZm9ybSBwZXJjZW50YWdlIChvcGFjaXR5LCBldGMpIHByb3BlcnRpZXNcbl8uZWFjaChwZXJjZW50YWdlUHJvcHMsIGZ1bmN0aW9uKGtleSkge1xuICBwW2tleV0gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGZvciAodmFyIGlpID0gdGhpcy5lbGVtZW50cy5sZW5ndGg7IGlpLS07ICkge1xuICAgICAgdmFyIHRhcmdldFByb3AgPSB0aGlzLnByb3BzLmVsZW1lbnRzW2lpXTtcblxuICAgICAgLy8gZ2V0IHRoZSBjdXJyZW50IHZhbHVlLCBpZiBub3QgZGVmaW5lZCBkZWZhdWx0IHRvIDEgLyAxMDAlXG4gICAgICB2YXIgY3VycmVudFZhbCA9IHRhcmdldFByb3Bba2V5XSB8fCBzdHlsYXIodGhpcy5lbGVtZW50c1tpaV0sIGtleSkgfHwgMTtcblxuICAgICAgLy8gbXVsdGlwbHkgdGhlIGN1cnJlbnQgdmFsdWUgYnkgdGhlIG5ldyB2YWx1ZVxuICAgICAgdGFyZ2V0UHJvcFtrZXldID0gY3VycmVudFZhbCAqIHZhbHVlO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbn0pO1xuXG4vLyBpbXBsZW1lbnQgcHJvdG90eXBlIG1ldGhvZCBmb3IgdGhlIHN0YW5kYXJkIHByb3BlcnRpZXNcbl8uZWFjaChzdGFuZGFyZFByb3BzLCBmdW5jdGlvbihrZXkpIHtcbiAgcFtrZXldID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBmb3IgKHZhciBpaSA9IHRoaXMuZWxlbWVudHMubGVuZ3RoOyBpaS0tOyApIHtcbiAgICAgIHZhciB0YXJnZXRQcm9wID0gdGhpcy5wcm9wcy5lbGVtZW50c1tpaV07XG4gICAgICB2YXIgY3VycmVudFZhbCA9IHRhcmdldFByb3Bba2V5XSB8fFxuICAgICAgICAgICAgc3R5bGFyKHRoaXMuZWxlbWVudHNbaWldLCBrZXkpIHx8XG4gICAgICAgICAgICAnMHB4JztcblxuICAgICAgdmFyIGFjdHVhbFZhbHVlID0gcGFyc2VGbG9hdChjdXJyZW50VmFsKSB8fCAwO1xuXG4gICAgICB2YXIgdW5pdHMgPSB2YWx1ZS50b1N0cmluZygpLnJlcGxhY2UocmVTdHJpcFZhbHVlLCAnJykgfHxcbiAgICAgICAgICAgIGN1cnJlbnRWYWwudG9TdHJpbmcoKS5yZXBsYWNlKHJlU3RyaXBWYWx1ZSwgJycpIHx8XG4gICAgICAgICAgICAncHgnO1xuXG4gICAgICB0YXJnZXRQcm9wW2tleV0gPSAoYWN0dWFsVmFsdWUgKyBwYXJzZUZsb2F0KHZhbHVlKSkgKyB1bml0cztcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG59KTtcblxuLyoqXG4gICMjIEludGVybmFsIE1ldGhvZHNcbioqL1xuXG4vKipcbiAgIyMjIF9hcHBseUNoYW5nZXMoKVxuXG4qKi9cbnAuX2FwcGx5Q2hhbmdlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaWk7XG4gIHZhciBlbGVtZW50O1xuICB2YXIgcHJvcHM7XG4gIHZhciBmcmFtZSA9IHRoaXMucXVldWVkLnNoaWZ0KCk7XG4gIHZhciBiZWRhenpsZXIgPSB0aGlzO1xuICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uO1xuICB2YXIgdHJhbnNpdGlvbmVycyA9IFtdO1xuICB2YXIgdGltZW91dCA9IDA7XG4gIHZhciBjdXJyZW50VHJhbnNmb3JtO1xuICB2YXIgbmV3VHJhbnNmb3JtO1xuXG4gIC8vIGRlYnVnZ2VyO1xuICAgICAgXG4gIC8vIGlmIHdlIGRvbid0IGhhdmUgcHJvcGVydGllcyB0byBhcHBseSwgcmV0dXJuXG4gIGlmICh0eXBlb2YgZnJhbWUgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGdvdG8gdGhlIG5leHQgZnJhbWVcbiAgcHJvcHMgPSBmcmFtZSgpO1xuICBcbiAgLy8gaWYgd2UgaGF2ZSBtYW51YWwgaGVscGVycywgdGhlbiBydW4gdGhlbiBub3dcbiAgcHJvcHMubWFudWFsSGVscGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhlbHBlcikge1xuICAgIGhlbHBlci5jYWxsKGJlZGF6emxlciwgYmVkYXp6bGVyLmVsZW1lbnRzKTtcbiAgfSk7XG4gIFxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGVsZW1lbnRzIGFuZCB1cGRhdGVcbiAgZm9yIChpaSA9IHRoaXMuZWxlbWVudHMubGVuZ3RoOyBpaS0tOyApIHtcbiAgICAvLyBnZXQgYSBzdHlsYXIgcmVmZXJlbmNlIGZvciB0aGUgdGFyZ2V0IGVsZW1lbnRcbiAgICBlbGVtZW50ID0gc3R5bGFyKHRoaXMuZWxlbWVudHNbaWldKTtcbiAgICBcbiAgICAvLyBkZXRlcm1pbmUgd2hldGhlciB0aGUgY3VycmVudCBlbGVtZW50IGhhcyBhIHRyYW5zaXRpb24gb24gaXRcbiAgICB0cmFuc2l0aW9uRHVyYXRpb24gPSBwYXJzZUZsb2F0KGVsZW1lbnQuZ2V0KCd0cmFuc2l0aW9uLWR1cmF0aW9uJykpO1xuICAgIFxuICAgIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIGhhdmUgYSB0cmFuc2l0aW9uIG9uIHRoZSBlbGVtZW50IG9yIG5vdFxuICAgIGlmICh0cmFuc2l0aW9uRHVyYXRpb24pIHtcbiAgICAgIHRpbWVvdXQgPSBNYXRoLm1heCh0aW1lb3V0LCB0cmFuc2l0aW9uRHVyYXRpb24gKiAxMDAwKTtcbiAgICAgIHRyYW5zaXRpb25lcnMucHVzaCh0aGlzLmVsZW1lbnRzW2lpXSk7XG4gICAgfVxuICAgIFxuICAgIC8vIGlmIHdlIGhhdmUgYSBnZW5lcmFsIHRyYW5zZm9ybSBhcHBseSB0aGF0XG4gICAgaWYgKHByb3BzLnRyYW5zZm9ybSkge1xuICAgICAgLy8gcmVhZCB0aGUgdHJhbnNmb3JtXG4gICAgICBjdXJyZW50VHJhbnNmb3JtID0gZWxlbWVudC5nZXQoJ3RyYW5zZm9ybScsIHRydWUpO1xuXG4gICAgICBuZXdUcmFuc2Zvcm0gPSBjdXJyZW50VHJhbnNmb3JtID9cbiAgICAgICAgcmF0Y2hldChjdXJyZW50VHJhbnNmb3JtKS5hZGQocHJvcHMudHJhbnNmb3JtKSA6XG4gICAgICAgIHByb3BzLnRyYW5zZm9ybTtcbiAgICAgIFxuICAgICAgLy8gdXBkYXRlIHRoZSB0cmFuc2Zvcm0gdGFraW5nIGludG8gYWNjb3VudCB0aGUgY3VycmVudCB0cmFuc2Zvcm1cbiAgICAgIGVsZW1lbnQuc2V0KCd0cmFuc2Zvcm0nLCBuZXdUcmFuc2Zvcm0udG9TdHJpbmcoeyBhbGw6IHRydWUgfSkpO1xuICAgIH1cbiAgICBcbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHZhbHVlcyBhbmQgYXBwbHkgdGhlbiB0byB0aGUgZWxlbWVudFxuICAgIGVsZW1lbnQuc2V0KHByb3BzLmVsZW1lbnRzW2lpXSk7XG4gIH1cbiAgXG4gIC8vIGNvbXBsZXRlIHRoZSBmcmFtZVxuICB0aGlzLnJ0aWQgPSAwO1xuICB0aGlzLmRvbmUucHVzaChmcmFtZSk7XG5cbiAgLy8gaWYgdGhlIGZyYW1lIGlzIGxvb3BpbmcsIHRoZW4gY29weSBkb25lIHRvIHF1ZXVlZFxuICBpZiAoZnJhbWUubG9vcCkge1xuICAgIHRoaXMucXVldWVkID0gdGhpcy5kb25lLnNwbGljZSgwKTtcbiAgICBjb25zb2xlLmxvZyh0cmFuc2l0aW9uZXJzLCB0aW1lb3V0KTtcbiAgfVxuXG4gIC8vIG5leHQgZnJhbWVcbiAgdGhpcy5fbmV4dCh0cmFuc2l0aW9uZXJzLCB0aW1lb3V0LCBwcm9wcy5jYWxsYmFja3MgfHwgW10pO1xufTtcblxuLyoqXG4gICMjIyBfbmV4dCh0cmFuc2l0aW9uZXJzLCB0aW1lb3V0LCBjYWxsYmFja3MpXG5cbioqL1xucC5fbmV4dCA9IGZ1bmN0aW9uKHRyYW5zaXRpb25lcnMsIHRpbWVvdXQsIGNhbGxiYWNrcykge1xuICB2YXIgdHJhbnNpdGlvbnNSZW1haW5pbmcgPSB0cmFuc2l0aW9uZXJzLmxlbmd0aDtcbiAgdmFyIGJlZGF6emxlciA9IHRoaXM7XG4gIHZhciBsaXN0ZW5lcjtcbiAgICAgIFxuICBmdW5jdGlvbiBydW5OZXh0KCkge1xuICAgIGlmIChsaXN0ZW5lcikge1xuICAgICAgbGlzdGVuZXIuc3RvcCgpO1xuICAgIH1cbiAgICBcbiAgICAvLyB0cmlnZ2VyIHRoZSBjYWxsYmFja3NcbiAgICBfLmVhY2goY2FsbGJhY2tzLCBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwoYmVkYXp6bGVyLCBiZWRhenpsZXIuZWxlbWVudHMpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIC8vIHRyaWdnZXIgdGhlIG5leHQgdXBkYXRlIGN5Y2xlXG4gICAgYmVkYXp6bGVyLl9hcHBseUNoYW5nZXMoKTtcbiAgfVxuICBcbiAgLypcbiAgLy8gaWYgd2UgaGF2ZSBhIHRyYW5zaXRpb24sIHRoZW4gb24gdHJhbnNpdGlvbiBlbmQsIGFwcGx5IHRoZSBjaGFuZ2VzXG4gIGlmICh0cmFuc2l0aW9uc1JlbWFpbmluZyA+IDAgJiYgdHlwZW9mIGFmdGVyc2hvY2sgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGxpc3RlbmVyID0gYWZ0ZXJzaG9jayh0cmFuc2l0aW9uZXJzLCB7IHRpbWVvdXQ6IHRpbWVvdXQgKyAyMCB9LCBmdW5jdGlvbigpIHtcbiAgICAgIHJ1bk5leHQoKTtcbiAgICB9KTtcbiAgfVxuICBlbHNlICovXG4gIGlmICh0cmFuc2l0aW9uc1JlbWFpbmluZyA+IDApIHtcbiAgICBzZXRUaW1lb3V0KHJ1bk5leHQsICh0aW1lb3V0IHx8IDApICsgMjApO1xuICB9XG4gIGVsc2UgaWYgKHRoaXMucXVldWVkLmxlbmd0aCA+IDApIHtcbiAgICBydW5OZXh0KCk7XG4gIH1cbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgUmF0Y2hldCAtIENTUzMgVHJhbnNmb3JtIFBhcnNlclxuXG4gIFJhdGNoZXQgYXNzaXN0cyB3aXRoIHRoZSBwcm9jZXNzIG9mIGRpc3NlY3RpbmcgQ1NTMyB0cmFuc2Zvcm0gc3RyaW5ncyBpbnRvXG4gIGphdmFzY3JpcHQgb2JqZWN0cyB0aGF0IHlvdSBjYW4gdGhlbiBkbyBzb21ldGhpbmcgbW9yZSBpbnRlbGxpZ2VudCB3aXRoLlxuXG4qKi9cblxudmFyIFJhdGNoZXRUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL3R5cGVzL3RyYW5zZm9ybScpO1xudmFyIFhZWiA9IHJlcXVpcmUoJy4vdHlwZXMveHl6Jyk7XG52YXIgbWF0Y2hlcnMgPSByZXF1aXJlKCcuL21hdGNoZXJzJyk7XG5cbnZhciB1bml0VHlwZXMgPSB7XG4gIHRyYW5zbGF0ZTogJ3B4JyxcbiAgcm90YXRlOiAnZGVnJyxcbiAgc2NhbGU6ICcnXG59O1xuXG5mdW5jdGlvbiBmcm9tU3RyaW5nKGlucHV0U3RyaW5nKSB7XG4gIHZhciBwcm9wcyA9IG5ldyBSYXRjaGV0VHJhbnNmb3JtKCk7XG4gIHZhciBkYXRhO1xuXG4gIGZ1bmN0aW9uIGNoZWNrTWF0Y2gocnVsZSkge1xuICAgIC8vIHJlc2V0IHRoZSB0ZXN0IHN0cmluZyB0byB0aGUgaW5wdXQgc3RyaW5nXG4gICAgdmFyIHRlc3RTdHJpbmcgPSBpbnB1dFN0cmluZztcbiAgICBcbiAgICAvLyBnZXQgdGhlIGluaXRpYWwgbWF0Y2hcbiAgICB2YXIgbWF0Y2ggPSBydWxlLnJlZ2V4LmV4ZWModGVzdFN0cmluZyk7XG4gICAgXG4gICAgd2hpbGUgKG1hdGNoKSB7XG4gICAgICAvLyBlbnN1cmUgZGF0YSBoYXMgYmVlbiBpbml0aWFsaXplZFxuICAgICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgICBcbiAgICAgIGlmICh0eXBlb2YgcnVsZS5leHRyYWN0ID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcnVsZS5leHRyYWN0KG1hdGNoLCBkYXRhKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBzZWN0aW9uIGluIHJ1bGUpIHtcbiAgICAgICAgICBpZiAoc2VjdGlvbiAhPT0gJ3JlZ2V4JyAmJiB0eXBlb2YgcnVsZVtzZWN0aW9uXSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBkYXRhW3NlY3Rpb25dID0gcnVsZVtzZWN0aW9uXShtYXRjaCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHVwZGF0ZSB0aGUgZGF0YSB1bml0c1xuICAgICAgZGF0YS51bml0cyA9IHVuaXRUeXBlc1trZXldO1xuICAgICAgXG4gICAgICAvLyByZW1vdmUgdGhlIG1hdGNoIGNvbXBvbmVudCBmcm9tIHRoZSBpbnB1dCBzdHJpbmdcbiAgICAgIHRlc3RTdHJpbmcgPSB0ZXN0U3RyaW5nLnNsaWNlKDAsIG1hdGNoLmluZGV4KSArXG4gICAgICAgIHRlc3RTdHJpbmcuc2xpY2UobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgXG4gICAgICAvLyBpZiB0aGlzIGlzIGEgbXVsdGltYXRjaCBydWxlLCB0aGVuIHJ1biB0aGUgcmVnZXggYWdhaW5cbiAgICAgIGlmIChydWxlLm11bHRpKSB7XG4gICAgICAgIG1hdGNoID0gcnVsZS5yZWdleC5leGVjKHRlc3RTdHJpbmcpO1xuICAgICAgfVxuICAgICAgLy8gb3RoZXJ3aXNlLCBjbGVhciB0aGUgbWF0Y2ggdG8gYnJlYWsgdGhlIGxvb3BcbiAgICAgIGVsc2Uge1xuICAgICAgICBtYXRjaCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIGluaXRpYWxpc2UgdGhlIHByb3BlcnRpZXMgKGlmIHdlIGhhdmUgZGF0YSlcbiAgICBpZiAoZGF0YSkge1xuICAgICAgcHJvcHNba2V5XSA9IG5ldyBYWVooa2V5LCBkYXRhKTtcbiAgICAgIFxuICAgICAgLy8gcmVzZXQgdGhlIGRhdGFcbiAgICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwYXJzZXJzXG4gIGZvciAodmFyIGtleSBpbiBtYXRjaGVycykge1xuICAgIG1hdGNoZXJzW2tleV0uZm9yRWFjaChjaGVja01hdGNoKTtcbiAgfVxuXG4gIHJldHVybiBwcm9wcztcbn1cblxudmFyIHJhdGNoZXQgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIGlmICh0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycgfHwgKGlucHV0IGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKGlucHV0KTtcbiAgfVxufTtcblxuLy8gYmluZCB0aGUgaW50ZXJuYWwgaGVscGVycyBzbyB3ZSBjYW4gdGVzdCBcbnJhdGNoZXQuZnJvbVN0cmluZyA9IGZyb21TdHJpbmc7XG5yYXRjaGV0LlRyYW5zZm9ybSA9IFJhdGNoZXRUcmFuc2Zvcm07XG5yYXRjaGV0LlhZWiA9IFhZWjsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHJhbnNmb3JtVmFsdWUgPSByZXF1aXJlKCcuL3R5cGVzL3ZhbHVlJyk7XG5cbmZ1bmN0aW9uIGV4dHJhY3RWYWwoaW5kZXgsIGV4cGVjdFVuaXRzKSB7XG4gIHJldHVybiBmdW5jdGlvbihtYXRjaCkge1xuICAgIHZhciB1bml0cyA9ICcnO1xuICAgIFxuICAgIGlmICh0eXBlb2YgZXhwZWN0VW5pdHMgPT0gJ3VuZGVmaW5lZCcgfHwgZXhwZWN0VW5pdHMpIHtcbiAgICAgIC8vIGdldCB0aGUgdW5pdHNcbiAgICAgIC8vIGRlZmF1bHQgdG8gdW5kZWZpbmVkIGlmIGFuIGVtcHR5IHN0cmluZyB3aGljaCBtZWFucyB0aGUgXG4gICAgICAvLyBkZWZhdWx0IHVuaXRzIGZvciB0aGUgWFlaIHZhbHVlIHR5cGUgd2lsbCBiZSB1c2VkXG4gICAgICB1bml0cyA9IG1hdGNoW2luZGV4ICsgMV0gfHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSB0aGUgdHJhbnNmb3JtIHZhbHVlXG4gICAgcmV0dXJuIG5ldyBUcmFuc2Zvcm1WYWx1ZShtYXRjaFtpbmRleF0sIHVuaXRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZVJlZ2V4KGZuTmFtZSwgcGFyYW1zKSB7XG4gIHZhciByZWdleCA9IGZuTmFtZSArICdcXFxcKCc7XG4gIFxuICAocGFyYW1zIHx8ICcnKS5zcGxpdCgvXFxzLykuZm9yRWFjaChmdW5jdGlvbihwYXJhbSkge1xuICAgIHJlZ2V4ICs9IG1hdGNoZXJzW3BhcmFtXTtcbiAgfSk7XG4gIFxuICAvLyByZXR1cm4gdGhlIHJlZ2V4XG4gIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4ICsgJ1xcXFwpJyk7XG59XG5cbnZhciBtYXRjaGVycyA9IHtcbiAgdmFsOiAnKFxcXFwtP1tcXFxcZFxcXFwuXSspJyxcbiAgdW5pdDogJyhbXlxcXFxzXSopJyxcbiAgJywnOiAnXFxcXCxcXFxccyonXG59O1xuXG5leHBvcnRzLnRyYW5zbGF0ZSA9IFtcbiAgLy8gc3RhbmRhcmQgMmQgdHJhbnNsYXRpb25cbiAge1xuICAgIHJlZ2V4OiBtYWtlUmVnZXgoJ3RyYW5zbGF0ZScsICd2YWwgdW5pdCAsIHZhbCB1bml0JyksXG4gICAgeDogZXh0cmFjdFZhbCgxKSxcbiAgICB5OiBleHRyYWN0VmFsKDMpXG4gIH0sXG5cbiAgLy8gMmQvM2QgdHJhbnNsYXRpb24gb24gYSBzcGVjaWZpYyBheGlzXG4gIHtcbiAgICByZWdleDogbWFrZVJlZ2V4KCd0cmFuc2xhdGUoWHxZfFopJywgJ3ZhbCB1bml0JyksXG4gICAgZXh0cmFjdDogZnVuY3Rpb24obWF0Y2gsIGRhdGEpIHtcbiAgICAgIGRhdGFbbWF0Y2hbMV0udG9Mb3dlckNhc2UoKV0gPSBleHRyYWN0VmFsKDIpKG1hdGNoKTtcbiAgICB9LFxuICAgIG11bHRpOiB0cnVlXG4gIH0sXG5cbiAgLy8gM2QgdHJhbnNsYXRpb24gYXMgdGhlIHNwZWNpZmljIHRyYW5zbGF0ZTNkIHByb3BcbiAge1xuICAgIHJlZ2V4OiBtYWtlUmVnZXgoJ3RyYW5zbGF0ZScsICd2YWwgdW5pdCAsIHZhbCB1bml0ICwgdmFsIHVuaXQnKSxcbiAgICB4OiBleHRyYWN0VmFsKDEpLFxuICAgIHk6IGV4dHJhY3RWYWwoMyksXG4gICAgejogZXh0cmFjdFZhbCg1KVxuICB9XG5dO1xuXG5leHBvcnRzLnJvdGF0ZSA9IFtcbiAgLy8gc3RhbmRhcmQgMmQgcm90YXRpb25cbiAge1xuICAgIHJlZ2V4OiBtYWtlUmVnZXgoJ3JvdGF0ZScsICd2YWwgdW5pdCcpLFxuICAgIHo6IGV4dHJhY3RWYWwoMSlcbiAgfSxcblxuICAvLyAzZCByb3RhdGlvbnMgb24gYSBzcGVjaWZpYyBheGlzXG4gIHtcbiAgICByZWdleDogIG1ha2VSZWdleCgncm90YXRlKFh8WXxaKScsICd2YWwgdW5pdCcpLFxuICAgIGV4dHJhY3Q6IGZ1bmN0aW9uKG1hdGNoLCBkYXRhKSB7XG4gICAgICBkYXRhW21hdGNoWzFdLnRvTG93ZXJDYXNlKCldID0gZXh0cmFjdFZhbCgyKShtYXRjaCk7XG4gICAgfSxcbiAgICBtdWx0aTogdHJ1ZVxuICB9XG5dO1xuXG5leHBvcnRzLnNjYWxlID0gW1xuICAvLyBzdGFuZGFyZCAyZCBzY2FsaW5nIChzaW5nbGUgcGFyYW1ldGVyIHZlcnNpb24pXG4gIHtcbiAgICByZWdleDogbWFrZVJlZ2V4KCdzY2FsZScsICd2YWwnKSxcbiAgICB4OiBleHRyYWN0VmFsKDEsIGZhbHNlKSxcbiAgICB5OiBleHRyYWN0VmFsKDEsIGZhbHNlKVxuICB9LFxuXG4gIC8vIHN0YW5kYXJkIDJkIHNjYWxpbmcgKHR3byBwYXJhbWV0ZXIgdmVyc2lvbilcbiAge1xuICAgIHJlZ2V4OiBtYWtlUmVnZXgoJ3NjYWxlJywgJ3ZhbCAsIHZhbCcpLFxuICAgIHg6IGV4dHJhY3RWYWwoMSwgZmFsc2UpLFxuICAgIHk6IGV4dHJhY3RWYWwoMiwgZmFsc2UpXG4gIH0sXG5cbiAgLy8gMmQvM2QgdHJhbnNsYXRpb24gb24gYSBzcGVjaWZpYyBheGlzXG4gIHtcbiAgICByZWdleDogbWFrZVJlZ2V4KCdzY2FsZShYfFl8WiknLCAndmFsJyksXG4gICAgZXh0cmFjdDogZnVuY3Rpb24obWF0Y2gsIGRhdGEpIHtcbiAgICAgIGRhdGFbbWF0Y2hbMV0udG9Mb3dlckNhc2UoKV0gPSBleHRyYWN0VmFsKDIsIGZhbHNlKShtYXRjaCk7XG4gICAgfSxcbiAgICBtdWx0aTogdHJ1ZVxuICB9XG5dOyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBYWVogPSByZXF1aXJlKCcuL3h5eicpO1xuXG52YXIgc2NhbGVPcHMgPSB7XG4gIGFkZDogJ211bCcsXG4gIHN1YjogJ2Rpdidcbn07XG5cbmZ1bmN0aW9uIFJhdGNoZXRUcmFuc2Zvcm0ob3B0cykge1xuICBpZiAoISAodGhpcyBpbnN0YW5jZW9mIFJhdGNoZXRUcmFuc2Zvcm0pKSB7XG4gICAgcmV0dXJuIG5ldyBSYXRjaGV0VHJhbnNmb3JtKG9wdHMpO1xuICB9XG5cbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIFxuICAvLyBlbnN1cmUgdGhlIHNjYWxlIHVuaXRzIGFyZSBzZXQgdG8gYW4gZW1wdHkgc3RyaW5nXG4gIG9wdHMuc2NhbGUgPSBvcHRzLnNjYWxlIHx8IHt9O1xuICBvcHRzLnNjYWxlLnVuaXRzID0gJyc7XG4gIG9wdHMuc2NhbGUuZGVmYXVsdFZhbHVlID0gMTtcbiAgXG4gIC8vIHNldCB0aGUgcm90YXRpb24gdW5pdHNcbiAgb3B0cy5yb3RhdGUgPSBvcHRzLnJvdGF0ZSB8fCB7fTtcbiAgb3B0cy5yb3RhdGUudW5pdHMgPSAnZGVnJztcbiAgXG4gIC8vIGNyZWF0ZSBuZXcgdHJhbnNsYXRpb24gcm90YXRpb24gYW5kIHNjYWxlIHZhbHVlcyxcbiAgLy8gZHVwbGljYXRpbmcgdGhlIHZhbHVlIHByb3ZpZGVkIFxuICB0aGlzLnRyYW5zbGF0ZSA9IG5ldyBYWVooJ3RyYW5zbGF0ZScsIG9wdHMudHJhbnNsYXRlKTtcbiAgdGhpcy5yb3RhdGUgPSBuZXcgWFlaKCdyb3RhdGUnLCBvcHRzLnJvdGF0ZSk7XG4gIHRoaXMuc2NhbGUgPSBuZXcgWFlaKCdzY2FsZScsIG9wdHMuc2NhbGUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJhdGNoZXRUcmFuc2Zvcm07XG5cblJhdGNoZXRUcmFuc2Zvcm0ucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgUmF0Y2hldFRyYW5zZm9ybSh7XG4gICAgdHJhbnNsYXRlOiB0aGlzLnRyYW5zbGF0ZSxcbiAgICBzY2FsZTogdGhpcy5zY2FsZSxcbiAgICByb3RhdGU6IHRoaXMucm90YXRlXG4gIH0pO1xufTtcblxuUmF0Y2hldFRyYW5zZm9ybS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbihvcHRzKSB7XG4gIHZhciBvdXRwdXQgPSB0aGlzLnRyYW5zbGF0ZS50b1N0cmluZyhvcHRzKTtcbiAgdmFyIHJvdGF0ZSA9IHRoaXMucm90YXRlLnRvU3RyaW5nKG9wdHMpO1xuICB2YXIgc2NhbGUgPSB0aGlzLnNjYWxlLnRvU3RyaW5nKG9wdHMpO1xuICAgICAgXG4gIGlmIChyb3RhdGUpIHtcbiAgICBvdXRwdXQgKz0gKG91dHB1dCA/ICcgJyA6ICcnKSArIHJvdGF0ZTtcbiAgfVxuICBcbiAgaWYgKHNjYWxlKSB7XG4gICAgb3V0cHV0ICs9IChvdXRwdXQgPyAnICcgOiAnJykgKyBzY2FsZTtcbiAgfVxuICBcbiAgcmV0dXJuIG91dHB1dDtcbn07XG5cblxuWydhZGQnLCAnc3ViJ10uZm9yRWFjaChmdW5jdGlvbihvcCkge1xuICBSYXRjaGV0VHJhbnNmb3JtLnByb3RvdHlwZVtvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBjcmVhdGUgbmV3IHZhbHVlcyB0byByZWNlaXZlIHRhcmdldCB2YWx1ZXNcbiAgICB2YXIgbmV3VHJhbnNmb3JtID0gbmV3IFJhdGNoZXRUcmFuc2Zvcm0oKTtcbiAgICBcbiAgICAvLyBjYWxjdWxhdGUgdGhlIHRyYW5zbGF0aW9uIGNoYW5nZVxuICAgIG5ld1RyYW5zZm9ybS50cmFuc2xhdGUgPSBYWVoucHJvdG90eXBlW29wXS5hcHBseShcbiAgICAgIHRoaXMudHJhbnNsYXRlLFxuICAgICAgQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKFxuICAgICAgICBhcmd1bWVudHMsXG4gICAgICAgIGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGl0ZW0udHJhbnNsYXRlOyB9XG4gICAgICApXG4gICAgKTtcbiAgICBcbiAgICAvLyBjYWxjdWxhdGUgdGhlIHNjYWxlIGNoYW5nZSAobWFwcGluZyBhZGQgdG8gbXVsKVxuICAgIG5ld1RyYW5zZm9ybS5zY2FsZSA9IFhZWi5wcm90b3R5cGVbc2NhbGVPcHNbb3BdXS5hcHBseShcbiAgICAgIHRoaXMuc2NhbGUsXG4gICAgICBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwoXG4gICAgICAgIGFyZ3VtZW50cyxcbiAgICAgICAgZnVuY3Rpb24oaXRlbSkgeyByZXR1cm4gaXRlbS5zY2FsZTsgfVxuICAgICAgKVxuICAgICk7XG4gICAgXG4gICAgLy8gY2FsY3VsYXRlIHRoZSByb3RhdGlvbiB1cGRhdGVcbiAgICBuZXdUcmFuc2Zvcm0ucm90YXRlID0gWFlaLnByb3RvdHlwZVtvcF0uYXBwbHkoXG4gICAgICB0aGlzLnJvdGF0ZSxcbiAgICAgIEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChcbiAgICAgICAgYXJndW1lbnRzLFxuICAgICAgICBmdW5jdGlvbihpdGVtKSB7IHJldHVybiBpdGVtLnJvdGF0ZTsgfVxuICAgICAgKVxuICAgICk7XG4gICAgXG4gICAgcmV0dXJuIG5ld1RyYW5zZm9ybTtcbiAgfTtcbn0pOyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRyYW5zZm9ybVZhbHVlKHZhbHVlLCB1bml0cykge1xuICB2YXIgcGFyc2VkVmFsID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIFxuICB0aGlzLnZhbHVlID0gaXNOYU4ocGFyc2VkVmFsKSA/IHZhbHVlIDogcGFyc2VkVmFsO1xuICB0aGlzLnVuaXRzID0gdW5pdHMgfHwgJyc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtVmFsdWU7XG5cblRyYW5zZm9ybVZhbHVlLnByb3RvdHlwZS52YWx1ZU9mID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnZhbHVlO1xufTtcblxuVHJhbnNmb3JtVmFsdWUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnZhbHVlICsgdGhpcy51bml0cztcbn07XG5cblRyYW5zZm9ybVZhbHVlLnByb3RvdHlwZS5tYXRjaGluZ1VuaXRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtYXRjaCA9IHRydWU7XG4gIGZvciAodmFyIGlpID0gYXJndW1lbnRzLmxlbmd0aDsgaWktLTsgKSB7XG4gICAgbWF0Y2ggPSBhcmd1bWVudHNbaWldLnVuaXRzID09PSB0aGlzLnVuaXRzO1xuICB9XG4gIFxuICByZXR1cm4gbWF0Y2g7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBUcmFuc2Zvcm1WYWx1ZSA9IHJlcXVpcmUoJy4vdmFsdWUnKTtcblxuZnVuY3Rpb24gWFlaKHR5cGUsIG9wdHMpIHtcbiAgdmFyIGRlZmF1bHRVbml0cztcblxuICBpZiAoISAodGhpcyBpbnN0YW5jZW9mIFhZWikpIHtcbiAgICByZXR1cm4gbmV3IFhZWih0eXBlLCBvcHRzKTtcbiAgfVxuICBcbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIFxuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmRlZmF1bHRWYWx1ZSA9IG9wdHMuZGVmYXVsdFZhbHVlIHx8IDA7XG4gIFxuICAvLyBsb29rIGZvciB0aGUgZGVmYXVsdCB1bml0c1xuICBkZWZhdWx0VW5pdHMgPSAob3B0cy54IHx8IHt9KS51bml0cyB8fFxuICAgIChvcHRzLnkgfHwge30pLnVuaXRzIHx8XG4gICAgKG9wdHMueiB8fCB7fSkudW5pdHMgfHxcbiAgICBvcHRzLnVuaXRzO1xuICBcbiAgLy8gaW5pdGlhbGlzZSB0aGUgdW5pdHNcbiAgdGhpcy51bml0cyA9IHR5cGVvZiBkZWZhdWx0VW5pdHMgIT0gJ3VuZGVmaW5lZCcgPyBkZWZhdWx0VW5pdHMgOiAncHgnO1xuICBcbiAgdGhpcy54ID0gbmV3IFRyYW5zZm9ybVZhbHVlKHR5cGVvZiBvcHRzLnggIT0gJ3VuZGVmaW5lZCcgP1xuICAgIG9wdHMueCA6IHRoaXMuZGVmYXVsdFZhbHVlLCB0aGlzLnVuaXRzKTtcblxuICB0aGlzLnkgPSBuZXcgVHJhbnNmb3JtVmFsdWUodHlwZW9mIG9wdHMueSAhPSAndW5kZWZpbmVkJyA/XG4gICAgb3B0cy55IDogdGhpcy5kZWZhdWx0VmFsdWUsIHRoaXMudW5pdHMpO1xuXG4gIHRoaXMueiA9IG5ldyBUcmFuc2Zvcm1WYWx1ZSh0eXBlb2Ygb3B0cy56ICE9ICd1bmRlZmluZWQnID9cbiAgICBvcHRzLnogOiB0aGlzLmRlZmF1bHRWYWx1ZSwgdGhpcy51bml0cyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWFlaO1xuXG5YWVoucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciB4ID0gdGhpcy54LnZhbHVlT2YoKTtcbiAgdmFyIHkgPSB0aGlzLnkudmFsdWVPZigpO1xuICB2YXIgeiA9IHRoaXMuei52YWx1ZU9mKCk7XG4gIFxuICBpZiAodHlwZW9mIHZhbHVlID09ICdudW1iZXInKSB7XG4gICAgeCArPSB2YWx1ZTtcbiAgICB5ICs9IHZhbHVlO1xuICAgIHogPSB6ID8geiArIHZhbHVlIDogMDtcbiAgfVxuICBlbHNlIHtcbiAgICBmb3IgKHZhciBpaSA9IGFyZ3VtZW50cy5sZW5ndGg7IGlpLS07ICkge1xuICAgICAgeCArPSBhcmd1bWVudHNbaWldLnggfHwgMDtcbiAgICAgIHkgKz0gYXJndW1lbnRzW2lpXS55IHx8IDA7XG4gICAgICB6ID0gKHogfHwgYXJndW1lbnRzW2lpXS56KSA/IHogKyAoYXJndW1lbnRzW2lpXS56IHx8IDApIDogMDtcbiAgICB9XG4gIH1cbiAgXG4gIHJldHVybiBuZXcgWFlaKHRoaXMudHlwZSwgeyB4OiB4LCB5OiB5LCB6OiB6LCB1bml0czogdGhpcy51bml0cyB9KTtcbn07XG5cblhZWi5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIHggPSB0aGlzLngudmFsdWVPZigpO1xuICB2YXIgeSA9IHRoaXMueS52YWx1ZU9mKCk7XG4gIHZhciB6ID0gdGhpcy56ID8gdGhpcy56LnZhbHVlT2YoKSA6IDA7XG4gIFxuICBpZiAodHlwZW9mIHZhbHVlID09ICdudW1iZXInKSB7XG4gICAgeCAqPSB2YWx1ZTtcbiAgICB5ICo9IHZhbHVlO1xuICAgIHogPSB0eXBlb2YgdGhpcy56ICE9ICd1bmRlZmluZWQnID8geiAqIHZhbHVlIDogMDtcbiAgfVxuICBlbHNlIHtcbiAgICBmb3IgKHZhciBpaSA9IGFyZ3VtZW50cy5sZW5ndGg7IGlpLS07ICkge1xuICAgICAgeCAqPSBhcmd1bWVudHNbaWldLng7XG4gICAgICB5ICo9IGFyZ3VtZW50c1tpaV0ueTtcbiAgICAgIHogKj0gYXJndW1lbnRzW2lpXS56O1xuICAgIH1cbiAgfVxuICBcbiAgcmV0dXJuIG5ldyBYWVoodGhpcy50eXBlLCB7IHg6IHgsIHk6IHksIHo6IHosIHVuaXRzOiB0aGlzLnVuaXRzIH0pO1xufTtcblxuWydzdWInLCAnZGl2J10uZm9yRWFjaChmdW5jdGlvbihvcCkge1xuICB2YXIgaXNTdWIgPSBvcCA9PT0gJ3N1Yic7XG4gIHZhciBtYXBwZWRLZXkgPSBpc1N1YiA/ICdhZGQnIDogJ211bCc7XG4gICAgXG4gIFhZWi5wcm90b3R5cGVbb3BdID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gdGhpc1ttYXBwZWRLZXldKGlzU3ViID8gLXZhbHVlIDogMSAvIHZhbHVlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgeHl6ID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGFyZ3VtZW50cywgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICB2YXIgaW52ZXJ0ZWQgPSBuZXcgWFlaKHh5ei50eXBlLCBpdGVtKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc1N1Yikge1xuICAgICAgICAgIGludmVydGVkLnggPSAtaW52ZXJ0ZWQueDtcbiAgICAgICAgICBpbnZlcnRlZC55ID0gLWludmVydGVkLnk7XG4gICAgICAgICAgaW52ZXJ0ZWQueiA9IC1pbnZlcnRlZC56O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGludmVydGVkLnggPSAxIC8gaW52ZXJ0ZWQueDtcbiAgICAgICAgICBpbnZlcnRlZC55ID0gMSAvIGludmVydGVkLnk7XG4gICAgICAgICAgaW52ZXJ0ZWQueiA9IGludmVydGVkLnogPyAxIC8gaW52ZXJ0ZWQueiA6IDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnZlcnRlZDtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdGhpc1ttYXBwZWRLZXldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfTtcbn0pO1xuXG5YWVoucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24ob3B0cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIFxuICAvLyBlbnN1cmUgb3B0aW9ucyBhcmUgZGVmaW5lZFxuICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgXG4gIGlmIChvcHRzLmFsbCB8fCAodGhpcy54LnZhbHVlICE9IHRoaXMuZGVmYXVsdFZhbHVlKSkge1xuICAgIG91dHB1dFtvdXRwdXQubGVuZ3RoXSA9IHRoaXMudHlwZSArICdYKCcgKyB0aGlzLngudmFsdWUgK1xuICAgICAgdGhpcy54LnVuaXRzICsgJyknO1xuICB9XG4gIFxuICBpZiAob3B0cy5hbGwgfHwgKHRoaXMueS52YWx1ZSAhPSB0aGlzLmRlZmF1bHRWYWx1ZSkpIHtcbiAgICBvdXRwdXRbb3V0cHV0Lmxlbmd0aF0gPSB0aGlzLnR5cGUgKyAnWSgnICsgdGhpcy55LnZhbHVlICtcbiAgICAgIHRoaXMueS51bml0cyArICcpJztcbiAgfVxuICBcbiAgaWYgKG9wdHMuYWxsIHx8ICh0aGlzLnoudmFsdWUgIT0gdGhpcy5kZWZhdWx0VmFsdWUpKSB7XG4gICAgb3V0cHV0W291dHB1dC5sZW5ndGhdID0gdGhpcy50eXBlICsgJ1ooJyArIHRoaXMuei52YWx1ZSArXG4gICAgICB0aGlzLnoudW5pdHMgKyAnKSc7XG4gIH1cbiAgXG4gIHJldHVybiBvdXRwdXQuam9pbignICcpO1xufTsiLCIvKiB+c3R5bGFyflxuICogXG4gKiBTaW1wbGUgT2JqZWN0IFF1ZXJ5IExhbmd1YWdlXG4gKiBcbiAqIC1tZXRhLS0tXG4gKiB2ZXJzaW9uOiAgICAwLjEuNVxuICogYnVpbGRkYXRlOiAgMjAxMi0xMC0zMFQwNDoxNDowMi40NjFaXG4gKiBnZW5lcmF0b3I6ICBpbnRlcmxlYXZlQDAuNS4yM1xuICogXG4gKiBcbiAqIFxuICovIFxuXG4vLyB1bWRqcyByZXR1cm5FeHBvcnRzIHBhdHRlcm46IGh0dHBzOi8vZ2l0aHViLmNvbS91bWRqcy91bWQvYmxvYi9tYXN0ZXIvcmV0dXJuRXhwb3J0cy5qc1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3RbJ3N0eWxhciddID0gZmFjdG9yeSgpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBwcmVmaXhlcyA9IFsnbXMnLCAnbycsICdNb3onLCAnd2Via2l0JywgJyddLFxuICAgICAgICBrbm93bktleXMgPSB7fSxcbiAgICAgICAgZ2V0Q29tcHV0ZWQgPSBudWxsLFxuICAgICAgICByZURhc2ggPSAvXihcXHcrKVxcLShcXHcpLyxcbiAgICAgICAgcmVWZW5kb3JQcmVmaXhlcyA9IC9eXFwtXFx3K1xcLS87XG4gICAgICAgIFxuICAgIGlmIChkb2N1bWVudC5kZWZhdWx0VmlldyAmJiB0eXBlb2YgZG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGdldENvbXB1dGVkID0gZG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZTtcbiAgICB9XG4gICAgICAgIFxuICAgIGZ1bmN0aW9uIHNuaWZmUHJvcGVydHkoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgICAgIHZhciBkYXNoTWF0Y2gsIGlpLCBwcmVmaXgsIHByZWZpeGVkQXR0cjtcbiAgICAgICAgXG4gICAgICAgIC8vIHN0cmlwIG9mZiBjc3MgdmVuZG9yIHByZWZpeGVzXG4gICAgICAgIGF0dHJpYnV0ZSA9IGF0dHJpYnV0ZS5yZXBsYWNlKHJlVmVuZG9yUHJlZml4ZXMsICcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNvbnZlcnQgZGVsaW1pdGluZyBkYXNoZXMgaW50byBjYW1lbCBjYXNlIGlkc1xuICAgICAgICBkYXNoTWF0Y2ggPSByZURhc2guZXhlYyhhdHRyaWJ1dGUpO1xuICAgICAgICB3aGlsZSAoZGFzaE1hdGNoKSB7XG4gICAgICAgICAgICBhdHRyaWJ1dGUgPSBkYXNoTWF0Y2hbMV0gKyBkYXNoTWF0Y2hbMl0udG9VcHBlckNhc2UoKSArIGF0dHJpYnV0ZS5zbGljZShkYXNoTWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICAgIGRhc2hNYXRjaCA9IHJlRGFzaC5leGVjKGF0dHJpYnV0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHNlYXJjaCB0aGUga25vd24gcHJlZml4XG4gICAgICAgIGZvciAoaWkgPSBwcmVmaXhlcy5sZW5ndGg7IGlpLS07ICkge1xuICAgICAgICAgICAgcHJlZml4ID0gcHJlZml4ZXNbaWldO1xuICAgICAgICAgICAgcHJlZml4ZWRBdHRyID0gcHJlZml4ID8gKHByZWZpeCArIGF0dHJpYnV0ZVswXS50b1VwcGVyQ2FzZSgpICsgYXR0cmlidXRlLnNsaWNlKDEpKSA6IGF0dHJpYnV0ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5zdHlsZVtwcmVmaXhlZEF0dHJdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGtub3duS2V5c1thdHRyaWJ1dGVdID0gcHJlZml4ZWRBdHRyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYXR0cmlidXRlO1xuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBzdHlsYXIoZWxlbWVudHMsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGhlbHBlcnMgPSB7IGdldDogZ2V0dGVyLCBzZXQ6IHNldHRlciB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBlbGVtZW50cyA9PSAnc3RyaW5nJyB8fCBlbGVtZW50cyBpbnN0YW5jZW9mIFN0cmluZykge1xuICAgICAgICAgICAgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGVsZW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiB3ZSBkb24ndCBoYXZlIGEgc3BsaWNlIGZ1bmN0aW9uLCB0aGVuIHdlIGRvbid0IGhhdmUgYW4gYXJyYXlcbiAgICAgICAgLy8gbWFrZSBpdCBvbmVcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGVsZW1lbnRzLmxlbmd0aCA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZWxlbWVudHMgPSBbZWxlbWVudHNdO1xuICAgICAgICB9IC8vIGlmLi5lbHNlXG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiBnZXR0ZXIoYXR0ciwgaWdub3JlQ29tcHV0ZWQpIHtcbiAgICAgICAgICAgIHZhciByZWFkS2V5LCBzdHlsZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gZ2V0IHRoZSByZWFkIGtleVxuICAgICAgICAgICAgcmVhZEtleSA9IGtub3duS2V5c1thdHRyXSB8fCBzbmlmZlByb3BlcnR5KGVsZW1lbnRzWzBdLCBhdHRyKTtcbiAgICBcbiAgICAgICAgICAgIC8vIGlmIHdlIGhhdmUgdGhlIGdldCBjb21wdXRlZCBmdW5jdGlvbiBkZWZpbmVkLCBhbmQgdGhlIG9wdHMuaWdub3JlQ29tcHV0ZWQgaXMgbm90IHNldFxuICAgICAgICAgICAgLy8gdGhlbiBnZXQgdGhlIGNvbXB1dGVkIHN0eWxlIGZvdCBlaCBlbGVtZW50XG4gICAgICAgICAgICBpZiAoZ2V0Q29tcHV0ZWQgJiYgKCEgaWdub3JlQ29tcHV0ZWQpKSB7XG4gICAgICAgICAgICAgICAgc3R5bGUgPSBnZXRDb21wdXRlZC5jYWxsKGRvY3VtZW50LmRlZmF1bHRWaWV3LCBlbGVtZW50c1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGp1c3QgcmV0dXJuIHRoZSBzdHlsZSBlbGVtZW50IFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc3R5bGUgPSBlbGVtZW50c1swXS5zdHlsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBzdHlsZSA/IHN0eWxlW3JlYWRLZXldIDogJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIHNldHRlcihhdHRyLCB2YWwpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXR0ciA9PSAnb2JqZWN0JyAmJiAoISAoYXR0ciBpbnN0YW5jZW9mIFN0cmluZykpKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgd2UgaGF2ZSBiZWVuIHBhc3NlZCBhbiBvYmplY3QsIHRoZW4gaXRlcmF0ZSB0aHJvdWdoIHRoZSBrZXlzIGFuZCB1cGRhdGVcbiAgICAgICAgICAgICAgICAvLyBlYWNoIG9mIHRoZSBmb3VuZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cikge1xuICAgICAgICAgICAgICAgICAgICBzZXR0ZXIoa2V5LCBhdHRyW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBzdHlsZUtleSA9IGtub3duS2V5c1thdHRyXSB8fCBzbmlmZlByb3BlcnR5KGVsZW1lbnRzWzBdLCBhdHRyKTtcbiAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IGVsZW1lbnRzLmxlbmd0aDsgaWktLTsgKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzW2lpXS5zdHlsZVtzdHlsZUtleV0gPSB2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gaGVscGVycztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBlbGVtZW50c1xuICAgICAgICBcbiAgICAgICAgLy8gaWYgd2UgYXJlIGluIHNldCBtb2RlLCB0aGVuIHVwZGF0ZSB0aGUgYXR0cmlidXRlIHdpdGggdGhlIHZhbHVlXG4gICAgICAgIGlmICh0eXBlb2YgYXR0cmlidXRlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gaGVscGVycztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBzZXR0ZXIoYXR0cmlidXRlLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0dGVyKGF0dHJpYnV0ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgc3R5bGFyLnNuaWZmUHJvcGVydHkgPSBzbmlmZlByb3BlcnR5O1xuICAgIFxuICAgIHJldHVybiB0eXBlb2Ygc3R5bGFyICE9ICd1bmRlZmluZWQnID8gc3R5bGFyIDogdW5kZWZpbmVkO1xufSkpOyIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuNS4yXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBFc3RhYmxpc2ggdGhlIG9iamVjdCB0aGF0IGdldHMgcmV0dXJuZWQgdG8gYnJlYWsgb3V0IG9mIGEgbG9vcCBpdGVyYXRpb24uXG4gIHZhciBicmVha2VyID0ge307XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIGNvbmNhdCAgICAgICAgICAgPSBBcnJheVByb3RvLmNvbmNhdCxcbiAgICB0b1N0cmluZyAgICAgICAgID0gT2JqUHJvdG8udG9TdHJpbmcsXG4gICAgaGFzT3duUHJvcGVydHkgICA9IE9ialByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8vIEFsbCAqKkVDTUFTY3JpcHQgNSoqIG5hdGl2ZSBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvbnMgdGhhdCB3ZSBob3BlIHRvIHVzZVxuICAvLyBhcmUgZGVjbGFyZWQgaGVyZS5cbiAgdmFyXG4gICAgbmF0aXZlRm9yRWFjaCAgICAgID0gQXJyYXlQcm90by5mb3JFYWNoLFxuICAgIG5hdGl2ZU1hcCAgICAgICAgICA9IEFycmF5UHJvdG8ubWFwLFxuICAgIG5hdGl2ZVJlZHVjZSAgICAgICA9IEFycmF5UHJvdG8ucmVkdWNlLFxuICAgIG5hdGl2ZVJlZHVjZVJpZ2h0ICA9IEFycmF5UHJvdG8ucmVkdWNlUmlnaHQsXG4gICAgbmF0aXZlRmlsdGVyICAgICAgID0gQXJyYXlQcm90by5maWx0ZXIsXG4gICAgbmF0aXZlRXZlcnkgICAgICAgID0gQXJyYXlQcm90by5ldmVyeSxcbiAgICBuYXRpdmVTb21lICAgICAgICAgPSBBcnJheVByb3RvLnNvbWUsXG4gICAgbmF0aXZlSW5kZXhPZiAgICAgID0gQXJyYXlQcm90by5pbmRleE9mLFxuICAgIG5hdGl2ZUxhc3RJbmRleE9mICA9IEFycmF5UHJvdG8ubGFzdEluZGV4T2YsXG4gICAgbmF0aXZlSXNBcnJheSAgICAgID0gQXJyYXkuaXNBcnJheSxcbiAgICBuYXRpdmVLZXlzICAgICAgICAgPSBPYmplY3Qua2V5cyxcbiAgICBuYXRpdmVCaW5kICAgICAgICAgPSBGdW5jUHJvdG8uYmluZDtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QgdmlhIGEgc3RyaW5nIGlkZW50aWZpZXIsXG4gIC8vIGZvciBDbG9zdXJlIENvbXBpbGVyIFwiYWR2YW5jZWRcIiBtb2RlLlxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBfO1xuICAgIH1cbiAgICBleHBvcnRzLl8gPSBfO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuXyA9IF87XG4gIH1cblxuICAvLyBDdXJyZW50IHZlcnNpb24uXG4gIF8uVkVSU0lPTiA9ICcxLjUuMic7XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyBvYmplY3RzIHdpdGggdGhlIGJ1aWx0LWluIGBmb3JFYWNoYCwgYXJyYXlzLCBhbmQgcmF3IG9iamVjdHMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmb3JFYWNoYCBpZiBhdmFpbGFibGUuXG4gIHZhciBlYWNoID0gXy5lYWNoID0gXy5mb3JFYWNoID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuO1xuICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdG9yIHRvIGVhY2ggZWxlbWVudC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYG1hcGAgaWYgYXZhaWxhYmxlLlxuICBfLm1hcCA9IF8uY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZU1hcCAmJiBvYmoubWFwID09PSBuYXRpdmVNYXApIHJldHVybiBvYmoubWFwKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXN1bHRzLnB1c2goaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICB2YXIgcmVkdWNlRXJyb3IgPSAnUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZSc7XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlYCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlICYmIG9iai5yZWR1Y2UgPT09IG5hdGl2ZVJlZHVjZSkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZShpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlKGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSB2YWx1ZTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gVGhlIHJpZ2h0LWFzc29jaWF0aXZlIHZlcnNpb24gb2YgcmVkdWNlLCBhbHNvIGtub3duIGFzIGBmb2xkcmAuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VSaWdodGAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZVJpZ2h0ICYmIG9iai5yZWR1Y2VSaWdodCA9PT0gbmF0aXZlUmVkdWNlUmlnaHQpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IpO1xuICAgIH1cbiAgICB2YXIgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoICE9PSArbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGluZGV4ID0ga2V5cyA/IGtleXNbLS1sZW5ndGhdIDogLS1sZW5ndGg7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IG9ialtpbmRleF07XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgb2JqW2luZGV4XSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZmlsdGVyYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVGaWx0ZXIgJiYgb2JqLmZpbHRlciA9PT0gbmF0aXZlRmlsdGVyKSByZXR1cm4gb2JqLmZpbHRlcihpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiAhaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZXZlcnlgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yIHx8IChpdGVyYXRvciA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlRXZlcnkgJiYgb2JqLmV2ZXJ5ID09PSBuYXRpdmVFdmVyeSkgcmV0dXJuIG9iai5ldmVyeShpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCEocmVzdWx0ID0gcmVzdWx0ICYmIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHNvbWVgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgdmFyIGFueSA9IF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yIHx8IChpdGVyYXRvciA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZVNvbWUgJiYgb2JqLnNvbWUgPT09IG5hdGl2ZVNvbWUpIHJldHVybiBvYmouc29tZShpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHJlc3VsdCB8fCAocmVzdWx0ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIG9iai5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gb2JqLmluZGV4T2YodGFyZ2V0KSAhPSAtMTtcbiAgICByZXR1cm4gYW55KG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiB2YWx1ZVtrZXldOyB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzLCBmaXJzdCkge1xuICAgIGlmIChfLmlzRW1wdHkoYXR0cnMpKSByZXR1cm4gZmlyc3QgPyB2b2lkIDAgOiBbXTtcbiAgICByZXR1cm4gX1tmaXJzdCA/ICdmaW5kJyA6ICdmaWx0ZXInXShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cnMpIHtcbiAgICAgICAgaWYgKGF0dHJzW2tleV0gIT09IHZhbHVlW2tleV0pIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbmRgOiBnZXR0aW5nIHRoZSBmaXJzdCBvYmplY3RcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5maW5kV2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8ud2hlcmUob2JqLCBhdHRycywgdHJ1ZSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgb3IgKGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICAvLyBDYW4ndCBvcHRpbWl6ZSBhcnJheXMgb2YgaW50ZWdlcnMgbG9uZ2VyIHRoYW4gNjUsNTM1IGVsZW1lbnRzLlxuICAvLyBTZWUgW1dlYktpdCBCdWcgODA3OTddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD04MDc5NylcbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzRW1wdHkob2JqKSkgcmV0dXJuIC1JbmZpbml0eTtcbiAgICB2YXIgcmVzdWx0ID0ge2NvbXB1dGVkIDogLUluZmluaXR5LCB2YWx1ZTogLUluZmluaXR5fTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgY29tcHV0ZWQgPiByZXN1bHQuY29tcHV0ZWQgJiYgKHJlc3VsdCA9IHt2YWx1ZSA6IHZhbHVlLCBjb21wdXRlZCA6IGNvbXB1dGVkfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0VtcHR5KG9iaikpIHJldHVybiBJbmZpbml0eTtcbiAgICB2YXIgcmVzdWx0ID0ge2NvbXB1dGVkIDogSW5maW5pdHksIHZhbHVlOiBJbmZpbml0eX07XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGNvbXB1dGVkIDwgcmVzdWx0LmNvbXB1dGVkICYmIChyZXN1bHQgPSB7dmFsdWUgOiB2YWx1ZSwgY29tcHV0ZWQgOiBjb21wdXRlZH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQudmFsdWU7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhbiBhcnJheSwgdXNpbmcgdGhlIG1vZGVybiB2ZXJzaW9uIG9mIHRoZSBcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmFuZDtcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzaHVmZmxlZCA9IFtdO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKGluZGV4KyspO1xuICAgICAgc2h1ZmZsZWRbaW5kZXggLSAxXSA9IHNodWZmbGVkW3JhbmRdO1xuICAgICAgc2h1ZmZsZWRbcmFuZF0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2h1ZmZsZWQ7XG4gIH07XG5cbiAgLy8gU2FtcGxlICoqbioqIHJhbmRvbSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudCBmcm9tIHRoZSBhcnJheS5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyIHx8IGd1YXJkKSB7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgbG9va3VwIGl0ZXJhdG9ycy5cbiAgdmFyIGxvb2t1cEl0ZXJhdG9yID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlIDogZnVuY3Rpb24ob2JqKXsgcmV0dXJuIG9ialt2YWx1ZV07IH07XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdG9yLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgdmFsdWUsIGNvbnRleHQpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcih2YWx1ZSk7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIHZhbHVlLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICB2YXIgaXRlcmF0b3IgPSB2YWx1ZSA9PSBudWxsID8gXy5pZGVudGl0eSA6IGxvb2t1cEl0ZXJhdG9yKHZhbHVlKTtcbiAgICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIGtleSwgdmFsdWUpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgKF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldIDogKHJlc3VsdFtrZXldID0gW10pKS5wdXNoKHZhbHVlKTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldKysgOiByZXN1bHRba2V5XSA9IDE7XG4gIH0pO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGl0ZXJhdG9yID09IG51bGwgPyBfLmlkZW50aXR5IDogbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcbiAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgYXJyYXlbbWlkXSkgPCB2YWx1ZSA/IGxvdyA9IG1pZCArIDEgOiBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIFNhZmVseSBjcmVhdGUgYSByZWFsLCBsaXZlIGFycmF5IGZyb20gYW55dGhpbmcgaXRlcmFibGUuXG4gIF8udG9BcnJheSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghb2JqKSByZXR1cm4gW107XG4gICAgaWYgKF8uaXNBcnJheShvYmopKSByZXR1cm4gc2xpY2UuY2FsbChvYmopO1xuICAgIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgcmV0dXJuIF8ubWFwKG9iaiwgXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIF8udmFsdWVzKG9iaik7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gYW4gb2JqZWN0LlxuICBfLnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAwO1xuICAgIHJldHVybiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBBcnJheSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBmaXJzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYGhlYWRgIGFuZCBgdGFrZWAuIFRoZSAqKmd1YXJkKiogY2hlY2tcbiAgLy8gYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmZpcnN0ID0gXy5oZWFkID0gXy50YWtlID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgcmV0dXJuIChuID09IG51bGwpIHx8IGd1YXJkID8gYXJyYXlbMF0gOiBzbGljZS5jYWxsKGFycmF5LCAwLCBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBhcnJheS5sZW5ndGggLSAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbikpO1xuICB9O1xuXG4gIC8vIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBsYXN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkge1xuICAgICAgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgTWF0aC5tYXgoYXJyYXkubGVuZ3RoIC0gbiwgMCkpO1xuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBmaXJzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYHRhaWxgIGFuZCBgZHJvcGAuXG4gIC8vIEVzcGVjaWFsbHkgdXNlZnVsIG9uIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nIGFuICoqbioqIHdpbGwgcmV0dXJuXG4gIC8vIHRoZSByZXN0IE4gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKlxuICAvLyBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKTtcbiAgfTtcblxuICAvLyBUcmltIG91dCBhbGwgZmFsc3kgdmFsdWVzIGZyb20gYW4gYXJyYXkuXG4gIF8uY29tcGFjdCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBfLmlkZW50aXR5KTtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBvZiBhIHJlY3Vyc2l2ZSBgZmxhdHRlbmAgZnVuY3Rpb24uXG4gIHZhciBmbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQsIHNoYWxsb3csIG91dHB1dCkge1xuICAgIGlmIChzaGFsbG93ICYmIF8uZXZlcnkoaW5wdXQsIF8uaXNBcnJheSkpIHtcbiAgICAgIHJldHVybiBjb25jYXQuYXBwbHkob3V0cHV0LCBpbnB1dCk7XG4gICAgfVxuICAgIGVhY2goaW5wdXQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgICBzaGFsbG93ID8gcHVzaC5hcHBseShvdXRwdXQsIHZhbHVlKSA6IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIFtdKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSB2ZXJzaW9uIG9mIHRoZSBhcnJheSB0aGF0IGRvZXMgbm90IGNvbnRhaW4gdGhlIHNwZWNpZmllZCB2YWx1ZShzKS5cbiAgXy53aXRob3V0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGFycmF5LCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRvcjtcbiAgICAgIGl0ZXJhdG9yID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgaW5pdGlhbCA9IGl0ZXJhdG9yID8gXy5tYXAoYXJyYXksIGl0ZXJhdG9yLCBjb250ZXh0KSA6IGFycmF5O1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgdmFyIHNlZW4gPSBbXTtcbiAgICBlYWNoKGluaXRpYWwsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgaWYgKGlzU29ydGVkID8gKCFpbmRleCB8fCBzZWVuW3NlZW4ubGVuZ3RoIC0gMV0gIT09IHZhbHVlKSA6ICFfLmNvbnRhaW5zKHNlZW4sIHZhbHVlKSkge1xuICAgICAgICBzZWVuLnB1c2godmFsdWUpO1xuICAgICAgICByZXN1bHRzLnB1c2goYXJyYXlbaW5kZXhdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKF8uZmxhdHRlbihhcmd1bWVudHMsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoXy51bmlxKGFycmF5KSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIF8uZXZlcnkocmVzdCwgZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIF8uaW5kZXhPZihvdGhlciwgaXRlbSkgPj0gMDtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFRha2UgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBvbmUgYXJyYXkgYW5kIGEgbnVtYmVyIG9mIG90aGVyIGFycmF5cy5cbiAgLy8gT25seSB0aGUgZWxlbWVudHMgcHJlc2VudCBpbiBqdXN0IHRoZSBmaXJzdCBhcnJheSB3aWxsIHJlbWFpbi5cbiAgXy5kaWZmZXJlbmNlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpeyByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpOyB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsZW5ndGggPSBfLm1heChfLnBsdWNrKGFyZ3VtZW50cywgXCJsZW5ndGhcIikuY29uY2F0KDApKTtcbiAgICB2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdHNbaV0gPSBfLnBsdWNrKGFyZ3VtZW50cywgJycgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydHMgbGlzdHMgaW50byBvYmplY3RzLiBQYXNzIGVpdGhlciBhIHNpbmdsZSBhcnJheSBvZiBgW2tleSwgdmFsdWVdYFxuICAvLyBwYWlycywgb3IgdHdvIHBhcmFsbGVsIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGggLS0gb25lIG9mIGtleXMsIGFuZCBvbmUgb2ZcbiAgLy8gdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICBfLm9iamVjdCA9IGZ1bmN0aW9uKGxpc3QsIHZhbHVlcykge1xuICAgIGlmIChsaXN0ID09IG51bGwpIHJldHVybiB7fTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1dID0gdmFsdWVzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1bMF1dID0gbGlzdFtpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBJZiB0aGUgYnJvd3NlciBkb2Vzbid0IHN1cHBseSB1cyB3aXRoIGluZGV4T2YgKEknbSBsb29raW5nIGF0IHlvdSwgKipNU0lFKiopLFxuICAvLyB3ZSBuZWVkIHRoaXMgZnVuY3Rpb24uIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW5cbiAgLy8gaXRlbSBpbiBhbiBhcnJheSwgb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgIGkgPSAoaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIGFycmF5LmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0sIGlzU29ydGVkKTtcbiAgICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbGFzdEluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgXy5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBmcm9tKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaGFzSW5kZXggPSBmcm9tICE9IG51bGw7XG4gICAgaWYgKG5hdGl2ZUxhc3RJbmRleE9mICYmIGFycmF5Lmxhc3RJbmRleE9mID09PSBuYXRpdmVMYXN0SW5kZXhPZikge1xuICAgICAgcmV0dXJuIGhhc0luZGV4ID8gYXJyYXkubGFzdEluZGV4T2YoaXRlbSwgZnJvbSkgOiBhcnJheS5sYXN0SW5kZXhPZihpdGVtKTtcbiAgICB9XG4gICAgdmFyIGkgPSAoaGFzSW5kZXggPyBmcm9tIDogYXJyYXkubGVuZ3RoKTtcbiAgICB3aGlsZSAoaS0tKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gYXJndW1lbnRzWzJdIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciBpZHggPSAwO1xuICAgIHZhciByYW5nZSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgd2hpbGUoaWR4IDwgbGVuZ3RoKSB7XG4gICAgICByYW5nZVtpZHgrK10gPSBzdGFydDtcbiAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV1c2FibGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHByb3RvdHlwZSBzZXR0aW5nLlxuICB2YXIgY3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICB2YXIgYXJncywgYm91bmQ7XG4gICAgaWYgKG5hdGl2ZUJpbmQgJiYgZnVuYy5iaW5kID09PSBuYXRpdmVCaW5kKSByZXR1cm4gbmF0aXZlQmluZC5hcHBseShmdW5jLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGZ1bmMpKSB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgYm91bmQpKSByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICB2YXIgc2VsZiA9IG5ldyBjdG9yO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQmluZCBhbGwgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0XG4gIC8vIGFsbCBjYWxsYmFja3MgZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgZnVuY3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKFwiYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lc1wiKTtcbiAgICBlYWNoKGZ1bmNzLCBmdW5jdGlvbihmKSB7IG9ialtmXSA9IF8uYmluZChvYmpbZl0sIG9iaik7IH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW8gPSB7fTtcbiAgICBoYXNoZXIgfHwgKGhhc2hlciA9IF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBfLmhhcyhtZW1vLCBrZXkpID8gbWVtb1trZXldIDogKG1lbW9ba2V5XSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpeyByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTsgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIF8uZGVsYXkuYXBwbHkoXywgW2Z1bmMsIDFdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcHJldmlvdXMgPSBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlID8gMCA6IG5ldyBEYXRlO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRpbWVvdXQgJiYgb3B0aW9ucy50cmFpbGluZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICAvLyBiZSB0cmlnZ2VyZWQuIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBpdCBzdG9wcyBiZWluZyBjYWxsZWQgZm9yXG4gIC8vIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICAvLyBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICBfLmRlYm91bmNlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgdmFyIHRpbWVvdXQsIGFyZ3MsIGNvbnRleHQsIHRpbWVzdGFtcCwgcmVzdWx0O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XG4gICAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGxhc3QgPSAobmV3IERhdGUoKSkgLSB0aW1lc3RhbXA7XG4gICAgICAgIGlmIChsYXN0IDwgd2FpdCkge1xuICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbE5vdykgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmFuKSByZXR1cm4gbWVtbztcbiAgICAgIHJhbiA9IHRydWU7XG4gICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgZnVuYyA9IG51bGw7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IFtmdW5jXTtcbiAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB3cmFwcGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgZm9yICh2YXIgaSA9IGZ1bmNzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGFyZ3MgPSBbZnVuY3NbaV0uYXBwbHkodGhpcywgYXJncyldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgYWZ0ZXIgYmVpbmcgY2FsbGVkIE4gdGltZXMuXG4gIF8uYWZ0ZXIgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV0cmlldmUgdGhlIG5hbWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gbmF0aXZlS2V5cyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqICE9PSBPYmplY3Qob2JqKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBvYmplY3QnKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIHRoZSB2YWx1ZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgXy52YWx1ZXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIENvbnZlcnQgYW4gb2JqZWN0IGludG8gYSBsaXN0IG9mIGBba2V5LCB2YWx1ZV1gIHBhaXJzLlxuICBfLnBhaXJzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHBhaXJzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbmx5IGNvbnRhaW5pbmcgdGhlIHdoaXRlbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ucGljayA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBlYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKGtleSBpbiBvYmopIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgd2l0aG91dCB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5vbWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmICghXy5jb250YWlucyhrZXlzLCBrZXkpKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgLy8gRmlsbCBpbiBhIGdpdmVuIG9iamVjdCB3aXRoIGRlZmF1bHQgcHJvcGVydGllcy5cbiAgXy5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAob2JqW3Byb3BdID09PSB2b2lkIDApIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgKHNoYWxsb3ctY2xvbmVkKSBkdXBsaWNhdGUgb2YgYW4gb2JqZWN0LlxuICBfLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIF8uaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBfLmV4dGVuZCh7fSwgb2JqKTtcbiAgfTtcblxuICAvLyBJbnZva2VzIGludGVyY2VwdG9yIHdpdGggdGhlIG9iaiwgYW5kIHRoZW4gcmV0dXJucyBvYmouXG4gIC8vIFRoZSBwcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBtZXRob2QgaXMgdG8gXCJ0YXAgaW50b1wiIGEgbWV0aG9kIGNoYWluLCBpblxuICAvLyBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgXy50YXAgPSBmdW5jdGlvbihvYmosIGludGVyY2VwdG9yKSB7XG4gICAgaW50ZXJjZXB0b3Iob2JqKTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PSAxIC8gYjtcbiAgICAvLyBBIHN0cmljdCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGBudWxsID09IHVuZGVmaW5lZGAuXG4gICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAgIC8vIFVud3JhcCBhbnkgd3JhcHBlZCBvYmplY3RzLlxuICAgIGlmIChhIGluc3RhbmNlb2YgXykgYSA9IGEuX3dyYXBwZWQ7XG4gICAgaWYgKGIgaW5zdGFuY2VvZiBfKSBiID0gYi5fd3JhcHBlZDtcbiAgICAvLyBDb21wYXJlIGBbW0NsYXNzXV1gIG5hbWVzLlxuICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICAgIGlmIChjbGFzc05hbWUgIT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgU3RyaW5nXSc6XG4gICAgICAgIC8vIFByaW1pdGl2ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgb2JqZWN0IHdyYXBwZXJzIGFyZSBlcXVpdmFsZW50OyB0aHVzLCBgXCI1XCJgIGlzXG4gICAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgICAgcmV0dXJuIGEgPT0gU3RyaW5nKGIpO1xuICAgICAgY2FzZSAnW29iamVjdCBOdW1iZXJdJzpcbiAgICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS4gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvclxuICAgICAgICAvLyBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuIGEgIT0gK2EgPyBiICE9ICtiIDogKGEgPT0gMCA/IDEgLyBhID09IDEgLyBiIDogYSA9PSArYik7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT0gK2I7XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb21wYXJlZCBieSB0aGVpciBzb3VyY2UgcGF0dGVybnMgYW5kIGZsYWdzLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgICAgcmV0dXJuIGEuc291cmNlID09IGIuc291cmNlICYmXG4gICAgICAgICAgICAgICBhLmdsb2JhbCA9PSBiLmdsb2JhbCAmJlxuICAgICAgICAgICAgICAgYS5tdWx0aWxpbmUgPT0gYi5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgICAgIGEuaWdub3JlQ2FzZSA9PSBiLmlnbm9yZUNhc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PSBiO1xuICAgIH1cbiAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiAoYUN0b3IgaW5zdGFuY2VvZiBhQ3RvcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiAoYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcikpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcbiAgICB2YXIgc2l6ZSA9IDAsIHJlc3VsdCA9IHRydWU7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGNsYXNzTmFtZSA9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHNpemUgPSBhLmxlbmd0aDtcbiAgICAgIHJlc3VsdCA9IHNpemUgPT0gYi5sZW5ndGg7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBlcShhW3NpemVdLCBiW3NpemVdLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgb2JqZWN0cy5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhKSB7XG4gICAgICAgIGlmIChfLmhhcyhhLCBrZXkpKSB7XG4gICAgICAgICAgLy8gQ291bnQgdGhlIGV4cGVjdGVkIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICAvLyBEZWVwIGNvbXBhcmUgZWFjaCBtZW1iZXIuXG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEVuc3VyZSB0aGF0IGJvdGggb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBmb3IgKGtleSBpbiBiKSB7XG4gICAgICAgICAgaWYgKF8uaGFzKGIsIGtleSkgJiYgIShzaXplLS0pKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSAhc2l6ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIsIFtdLCBbXSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiBhcnJheSwgc3RyaW5nLCBvciBvYmplY3QgZW1wdHk/XG4gIC8vIEFuIFwiZW1wdHlcIiBvYmplY3QgaGFzIG5vIGVudW1lcmFibGUgb3duLXByb3BlcnRpZXMuXG4gIF8uaXNFbXB0eSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKF8uaXNBcnJheShvYmopIHx8IF8uaXNTdHJpbmcob2JqKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBET00gZWxlbWVudD9cbiAgXy5pc0VsZW1lbnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gISEob2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhbiBhcnJheT9cbiAgLy8gRGVsZWdhdGVzIHRvIEVDTUE1J3MgbmF0aXZlIEFycmF5LmlzQXJyYXlcbiAgXy5pc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cC5cbiAgZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFKSwgd2hlcmVcbiAgLy8gdGhlcmUgaXNuJ3QgYW55IGluc3BlY3RhYmxlIFwiQXJndW1lbnRzXCIgdHlwZS5cbiAgaWYgKCFfLmlzQXJndW1lbnRzKGFyZ3VtZW50cykpIHtcbiAgICBfLmlzQXJndW1lbnRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gISEob2JqICYmIF8uaGFzKG9iaiwgJ2NhbGxlZScpKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLlxuICBpZiAodHlwZW9mICgvLi8pICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGVxdWFsIHRvIG51bGw/XG4gIF8uaXNOdWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gbnVsbDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIHVuZGVmaW5lZD9cbiAgXy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfTtcblxuICAvLyBTaG9ydGN1dCBmdW5jdGlvbiBmb3IgY2hlY2tpbmcgaWYgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHByb3BlcnR5IGRpcmVjdGx5XG4gIC8vIG9uIGl0c2VsZiAoaW4gb3RoZXIgd29yZHMsIG5vdCBvbiBhIHByb3RvdHlwZSkuXG4gIF8uaGFzID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gIH07XG5cbiAgLy8gVXRpbGl0eSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSdW4gVW5kZXJzY29yZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgX2AgdmFyaWFibGUgdG8gaXRzXG4gIC8vIHByZXZpb3VzIG93bmVyLiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcm9vdC5fID0gcHJldmlvdXNVbmRlcnNjb3JlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEtlZXAgdGhlIGlkZW50aXR5IGZ1bmN0aW9uIGFyb3VuZCBmb3IgZGVmYXVsdCBpdGVyYXRvcnMuXG4gIF8uaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlbnRpdHlNYXAgPSB7XG4gICAgZXNjYXBlOiB7XG4gICAgICAnJic6ICcmYW1wOycsXG4gICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICc+JzogJyZndDsnLFxuICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICBcIidcIjogJyYjeDI3OydcbiAgICB9XG4gIH07XG4gIGVudGl0eU1hcC51bmVzY2FwZSA9IF8uaW52ZXJ0KGVudGl0eU1hcC5lc2NhcGUpO1xuXG4gIC8vIFJlZ2V4ZXMgY29udGFpbmluZyB0aGUga2V5cyBhbmQgdmFsdWVzIGxpc3RlZCBpbW1lZGlhdGVseSBhYm92ZS5cbiAgdmFyIGVudGl0eVJlZ2V4ZXMgPSB7XG4gICAgZXNjYXBlOiAgIG5ldyBSZWdFeHAoJ1snICsgXy5rZXlzKGVudGl0eU1hcC5lc2NhcGUpLmpvaW4oJycpICsgJ10nLCAnZycpLFxuICAgIHVuZXNjYXBlOiBuZXcgUmVnRXhwKCcoJyArIF8ua2V5cyhlbnRpdHlNYXAudW5lc2NhcGUpLmpvaW4oJ3wnKSArICcpJywgJ2cnKVxuICB9O1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgXy5lYWNoKFsnZXNjYXBlJywgJ3VuZXNjYXBlJ10sIGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIF9bbWV0aG9kXSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgaWYgKHN0cmluZyA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gKCcnICsgc3RyaW5nKS5yZXBsYWNlKGVudGl0eVJlZ2V4ZXNbbWV0aG9kXSwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGVudGl0eU1hcFttZXRob2RdW21hdGNoXTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEFkZCB5b3VyIG93biBjdXN0b20gZnVuY3Rpb25zIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5taXhpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIGZ1bmMuYXBwbHkoXywgYXJncykpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBpbnRlZ2VyIGlkICh1bmlxdWUgd2l0aGluIHRoZSBlbnRpcmUgY2xpZW50IHNlc3Npb24pLlxuICAvLyBVc2VmdWwgZm9yIHRlbXBvcmFyeSBET00gaWRzLlxuICB2YXIgaWRDb3VudGVyID0gMDtcbiAgXy51bmlxdWVJZCA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gIH07XG5cbiAgLy8gQnkgZGVmYXVsdCwgVW5kZXJzY29yZSB1c2VzIEVSQi1zdHlsZSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzLCBjaGFuZ2UgdGhlXG4gIC8vIGZvbGxvd2luZyB0ZW1wbGF0ZSBzZXR0aW5ncyB0byB1c2UgYWx0ZXJuYXRpdmUgZGVsaW1pdGVycy5cbiAgXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICAgIGV2YWx1YXRlICAgIDogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgICBpbnRlcnBvbGF0ZSA6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZSAgICAgIDogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgfTtcblxuICAvLyBXaGVuIGN1c3RvbWl6aW5nIGB0ZW1wbGF0ZVNldHRpbmdzYCwgaWYgeW91IGRvbid0IHdhbnQgdG8gZGVmaW5lIGFuXG4gIC8vIGludGVycG9sYXRpb24sIGV2YWx1YXRpb24gb3IgZXNjYXBpbmcgcmVnZXgsIHdlIG5lZWQgb25lIHRoYXQgaXNcbiAgLy8gZ3VhcmFudGVlZCBub3QgdG8gbWF0Y2guXG4gIHZhciBub01hdGNoID0gLyguKV4vO1xuXG4gIC8vIENlcnRhaW4gY2hhcmFjdGVycyBuZWVkIHRvIGJlIGVzY2FwZWQgc28gdGhhdCB0aGV5IGNhbiBiZSBwdXQgaW50byBhXG4gIC8vIHN0cmluZyBsaXRlcmFsLlxuICB2YXIgZXNjYXBlcyA9IHtcbiAgICBcIidcIjogICAgICBcIidcIixcbiAgICAnXFxcXCc6ICAgICAnXFxcXCcsXG4gICAgJ1xccic6ICAgICAncicsXG4gICAgJ1xcbic6ICAgICAnbicsXG4gICAgJ1xcdCc6ICAgICAndCcsXG4gICAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ3UyMDI5J1xuICB9O1xuXG4gIHZhciBlc2NhcGVyID0gL1xcXFx8J3xcXHJ8XFxufFxcdHxcXHUyMDI4fFxcdTIwMjkvZztcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICBfLnRlbXBsYXRlID0gZnVuY3Rpb24odGV4dCwgZGF0YSwgc2V0dGluZ3MpIHtcbiAgICB2YXIgcmVuZGVyO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IG5ldyBSZWdFeHAoW1xuICAgICAgKHNldHRpbmdzLmVzY2FwZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuaW50ZXJwb2xhdGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmV2YWx1YXRlIHx8IG5vTWF0Y2gpLnNvdXJjZVxuICAgIF0uam9pbignfCcpICsgJ3wkJywgJ2cnKTtcblxuICAgIC8vIENvbXBpbGUgdGhlIHRlbXBsYXRlIHNvdXJjZSwgZXNjYXBpbmcgc3RyaW5nIGxpdGVyYWxzIGFwcHJvcHJpYXRlbHkuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc291cmNlID0gXCJfX3ArPSdcIjtcbiAgICB0ZXh0LnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZSwgaW50ZXJwb2xhdGUsIGV2YWx1YXRlLCBvZmZzZXQpIHtcbiAgICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgICAgIC5yZXBsYWNlKGVzY2FwZXIsIGZ1bmN0aW9uKG1hdGNoKSB7IHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTsgfSk7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChpbnRlcnBvbGF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGludGVycG9sYXRlICsgXCIpKT09bnVsbD8nJzpfX3QpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyBcInJldHVybiBfX3A7XFxuXCI7XG5cbiAgICB0cnkge1xuICAgICAgcmVuZGVyID0gbmV3IEZ1bmN0aW9uKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonLCAnXycsIHNvdXJjZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChkYXRhKSByZXR1cm4gcmVuZGVyKGRhdGEsIF8pO1xuICAgIHZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiByZW5kZXIuY2FsbCh0aGlzLCBkYXRhLCBfKTtcbiAgICB9O1xuXG4gICAgLy8gUHJvdmlkZSB0aGUgY29tcGlsZWQgZnVuY3Rpb24gc291cmNlIGFzIGEgY29udmVuaWVuY2UgZm9yIHByZWNvbXBpbGF0aW9uLlxuICAgIHRlbXBsYXRlLnNvdXJjZSA9ICdmdW5jdGlvbignICsgKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonKSArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGRlbGVnYXRlIHRvIHRoZSB3cmFwcGVyLlxuICBfLmNoYWluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8ob2JqKS5jaGFpbigpO1xuICB9O1xuXG4gIC8vIE9PUFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cbiAgLy8gSWYgVW5kZXJzY29yZSBpcyBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgaXQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRoYXRcbiAgLy8gY2FuIGJlIHVzZWQgT08tc3R5bGUuIFRoaXMgd3JhcHBlciBob2xkcyBhbHRlcmVkIHZlcnNpb25zIG9mIGFsbCB0aGVcbiAgLy8gdW5kZXJzY29yZSBmdW5jdGlvbnMuIFdyYXBwZWQgb2JqZWN0cyBtYXkgYmUgY2hhaW5lZC5cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY29udGludWUgY2hhaW5pbmcgaW50ZXJtZWRpYXRlIHJlc3VsdHMuXG4gIHZhciByZXN1bHQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdGhpcy5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgYWxsIG9mIHRoZSBVbmRlcnNjb3JlIGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlciBvYmplY3QuXG4gIF8ubWl4aW4oXyk7XG5cbiAgLy8gQWRkIGFsbCBtdXRhdG9yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PSAnc2hpZnQnIHx8IG5hbWUgPT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICBfLmV4dGVuZChfLnByb3RvdHlwZSwge1xuXG4gICAgLy8gU3RhcnQgY2hhaW5pbmcgYSB3cmFwcGVkIFVuZGVyc2NvcmUgb2JqZWN0LlxuICAgIGNoYWluOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2NoYWluID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgICB9XG5cbiAgfSk7XG5cbn0pLmNhbGwodGhpcyk7XG4iXX0=
(1)
});
;