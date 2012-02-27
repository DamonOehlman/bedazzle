//+ ratchet
//+ stylar

var bedazzle = (function() {
    
    var parseProps = (function() {
        var rePropValue = /^([a-z]+|[a-z\-]+(?=\:))([\d\%\.\-\!]+|\:[\"\'].*?[\"\']|\:[^\s]+)(\s|\,|$)/i,
            reQuotes = /(^[\"\']|[\"\']$)/g,
            reLeadingColon = /^\:/,
            reTrailingPerc = /\%$/;
    
        return function(text) {
            // first tokenize
            var match, propValue, props;
    
            // check for a property value
            match = rePropValue.exec(text);
            while (match) {
                // extract the property value
                propValue = match[2].replace(reLeadingColon, '').replace(reQuotes, '');
    
                // initialise the properties
                props = props || {};
    
                // define the property
                props[match[1]] = reTrailingPerc.test(propValue) ? propValue : parseFloat(propValue) || propValue;
    
                // remove the match
                text = text.slice(match[0].length);
    
                // find the next match
                match = rePropValue.exec(text);
            }
    
            return props;
        };
    })();

    
    var modAvail = typeof Modernizr != 'undefined',
        transforms = modAvail && Modernizr.csstransforms && typeof ratchet != 'undefined',
        transforms3d = transforms && Modernizr.csstransforms3d,
        reStripValue = /^\-?\d+/,
        
        // define the property map
        transformProps = transforms ? [
            'x',
            'y',
            'z',
            'rotate',
            'rx',
            'ry',
            'rz',
            'scale'
        ] : [],
        
        percentageProps = [
            'opacity'
        ],
        
        standardProps = [
            'height',
            'width'
        ].concat(transforms ? [] : ['x', 'y']);    

    function Bedazzler(elements) {
        this.elements = elements;
        this.rtid = 0;
        this.state = {};
        this.queued = [];
        
        // set some configurable options
        this.opts = {
            frameDelay: 1000 / 60
        };
    }
    
    Bedazzler.prototype = {
        _applyChanges: function() {
            var ii, element, key, styleKey,
                props = this.queued.shift(),
                transitionDuration, transitioners = [];
                
            // if we don't have properties to apply, return
            if (! props) {
                return;
            }
            
            // iterate through the elements and update
            for (ii = this.elements.length; ii--; ) {
                // get a stylar reference for the target element
                element = stylar(this.elements[ii]);
                
                // determine whether the current element has a transition on it
                transitionDuration = parseFloat(element.get('transition-duration'));
                
                // determine whether we have a transition on the element or not
                if (transitionDuration) {
                    transitioners.push(this.elements[ii]);
                }
                
                // if we have a general transform apply that
                if (props.transform) {
                    // read the transform
                    var currentTransform = element.get('transform', true),
                        newTransform = currentTransform ? ratchet(currentTransform).add(props.transform) : props.transform;
                    
                    // update the transform taking into account the current transform
                    element.set('transform', newTransform.toString({ all: true }));
                }
                
                // iterate through the values and apply then to the element
                element.set(props.elements[ii]);
            }
            
            this._next(transitioners, props.callbacks || []);
        },
        
        _changed: function() {
            var bedazzler = this;
    
            clearTimeout(this.rtid);
            this.rtid = setTimeout(function() {
                bedazzler._applyChanges();
            }, this.opts.frameDelay || 0);
            
            return this;
        },
        
        _next: function(transitioners, callbacks) {
            var transitionsRemaining = transitioners.length,
                bedazzler = this;
    
            // if we have a transition, then on transition end, apply the changes
            if (transitionsRemaining && typeof aftershock == 'function') {
                transitioners.forEach(function(transitioner) {
                    var listener = aftershock(transitioner, function() {
                        transitionsRemaining--;
                        
                        if (transitionsRemaining <= 0) {
                            // stop the aftershock listener
                            listener.stop();
    
                            // trigger the callbacks
                            _.each(callbacks, function(callback) {
                                if (typeof callback == 'function') {
                                    callback.call(bedazzler, bedazzler.elements);
                                }
                            });
                            
                            // trigger the next update cycle
                            bedazzler._changed();
                        }
                    });
                });
            }
            else if (this.queued.length > 0) {
                this._applyChanges();
            }
        },
        
        end: function(callback) {
            this.props.callbacks.push(callback);
            
            return this;
        },
        
        set: function(name, value) {
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
        },
        
        update: function(props, absolute) {
            if (typeof props == 'string' || props instanceof String) {
                props = parseProps(props);
            }
    
            // update the state of each of the properties
            if (props) {
                for (var key in props) {
                    if (this[key]) {
                        this[key](parseInt(props[key], 10) || props[key], absolute);
                    }
                }
            }
            
            return this;
        }
    };
    
    Object.defineProperty(Bedazzler.prototype, 'frame', { 
        get: function () {
            var props = {
                elements: [],
                elementTransforms: [],
                callbacks: []
            }, key, ii, currentTransform;
            
            if (transforms) {
                currentTransform = stylar(this.elements[0]).get('transform', true);
                props.transform = ratchet(currentTransform);
            }
            
            // if we have current properties, then clone the values
            if (this._props) {
                // copy each of the elements
                for (ii = this.elements.length; ii--; ) {
                    props.elements[ii] = _.clone(this._props.elements[ii]) || {};
                }
            }
            // otherwise create the new properties
            else {
                for (ii = this.elements.length; ii--; ) {
                    props.elements[ii] = {};
                }
            }
            
            // initialise the current properties that we are modifying
            this.queued.push(this._props = props);
    
            return this;
        },
        
        configurable: true
    });
    
    Object.defineProperty(Bedazzler.prototype, 'props', {
        get: function() {
            if (! this._props) {
                this.frame;
            }
            
            return this._props;
        }
    });
    
    // create the prototype methods for each of the identified
    // transform functions
    _.each(transformProps, function(key) {
        var targetKey = key,
            targetSection = 'translate',
            reRotate = /^r(\w)?(?:otate)?$/,
            reScale = /^scale%/;
        
        if (reRotate.test(key)) {
            targetKey = RegExp.$1 || 'z';
            targetSection = 'rotate';
        }
        
        if (reScale.test(key)) {
            targetKey = 'x';
            targetSection = 'scale';
        }
        
        Bedazzler.prototype[key] = function(value, absolute) {
            var xyz = this.props.transform[targetSection],
                currentVal = xyz[targetKey].value || 0;
                
            // if we are applying an absolute value, then 
            if (absolute) {
                xyz[targetKey].value = value - currentVal;
            }
            else {
                xyz[targetKey].value = currentVal + value;
            }
    
            return this._changed();
        };
    });
    
    // implement the non-transform percentage (opacity, etc) properties
    _.each(percentageProps, function(key) {
        Bedazzler.prototype[key] = function(value) {
            for (var ii = this.elements.length; ii--; ) {
                var targetProp = this.props.elements[ii],
                    // get the current value, if not defined default to 1 / 100%
                    currentVal = targetProp[key] || stylar(this.elements[ii], key) || 1;
    
                // multiply the current value by the new value
                targetProp[key] = currentVal * value;
            }
            
            return this._changed();
        };
    });
    
    // implement prototype method for the standard properties
    _.each(standardProps, function(key) {
        Bedazzler.prototype[key] = function(value) {
            for (var ii = this.elements.length; ii--; ) {
                var targetProp = this.props.elements[ii],
                    currentVal = targetProp[key] || 
                        stylar(this.elements[ii], key) || 
                        '0px',
    
                    actualValue = parseFloat(currentVal) || 0,
    
                    units = value.toString().replace(reStripValue, '') || 
                        currentVal.toString().replace(reStripValue, '') || 
                        'px';
    
                targetProp[key] = (actualValue + parseFloat(value)) + units;
            }
            
            return this._changed();
        };
    });
    

    
    var _bedazzle = function(elements, scope) {

        // check the elements
        if (typeof elements == 'string' || elements instanceof String) {
            elements = (scope || document).querySelectorAll(elements);
        }
        // if we don't have a splice function, then we don't have an array
        // make it one
        else if (! elements.splice) {
            elements = [elements];
        } // if..else

        return new Bedazzler(elements);
    };
    
    if (typeof jQuery != 'undefined') {
        $.fn.bedazzle = function() {
            return _bedazzle(this);
        };
    }
    
    return _bedazzle;
})();