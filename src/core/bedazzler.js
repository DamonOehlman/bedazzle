function Bedazzler(elements) {
    this.elements = elements;
    this.rtid = 0;
    this.state = {};
    this.queued = [];
}

Bedazzler.prototype = {
    applyChanges: function() {
        var ii, element, key, styleKey,
            props = this.queued.shift(),
            bedazzler = this,
            transitionDuration, transitioners = [], transitionsRemaining;
            
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
            
            // if we have a transform then apply it to the element
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
        
        // if we have a transition, then on transition end, apply the changes
        transitionsRemaining = transitioners.length;
        if (transitionsRemaining && typeof aftershock == 'function') {
            transitioners.forEach(function(transitioner) {
                aftershock(transitioner, function() {
                    transitionsRemaining--;
                    
                    if (transitionsRemaining <= 0) {
                        bedazzler.changed();
                    }
                });
            });
        }
        else if (this.queued.length > 0) {
            this.applyChanges();
        }
    },
    
    changed: function() {
        var bedazzler = this;

        clearTimeout(this.rtid);
        this.rtid = setTimeout(function() {
            bedazzler.applyChanges();
        }, 1000 / 60);
        
        return this;
    },
    
    set: function(name, value) {
        var props = this.props;
        
        if (name == 'transform') {
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
    
    update: function(props) {
        if (typeof props == 'string' || props instanceof String) {
            props = parseProps(props);
        }

        // update the state of each of the properties
        if (props) {
            for (var key in props) {
                if (this[key]) {
                    this[key](parseInt(props[key], 10) || props[key]);
                }
            }
        }
        
        return this;
    }
};

Object.defineProperty(Bedazzler.prototype, 'frame', { 
    get: function () {
        var props = {
            transform: transforms ? new ratchet.Transform() : null,
            elements: []
        }, key, ii;
        
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
    
    Bedazzler.prototype[key] = function(value) {
        var xyz = this.props.transform[targetSection],
            currentVal = xyz[targetKey].value || 0;
        
        xyz[targetKey].value = currentVal + value;
        return this.changed();
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
        
        return this.changed();
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
        
        return this.changed();
    };
});
