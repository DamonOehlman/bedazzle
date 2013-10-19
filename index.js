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

/* internal methods */

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