var bedazzle = (function() {
    
    var _parseprops = (function() {
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

    
    // initialise property mappings
    var pMap = {
            rotate: 'r'
        },
        prefixes = ['-webkit-', '-moz-', '-o-'],
        prefixCount = prefixes.length,
        browserProps = {},
        transEndEventNames = {
            '-webkit-transition' : 'webkitTransitionEnd',
            '-moz-transition'    : 'transitionend',
            '-o-transition'      : 'oTransitionEnd',
            'transition'         : 'transitionEnd'
        },
        transformProps = ['x', 'y', 'z', 'r', 'ry', 'rz', 'scale'],
        multiplicatives = {
            scale: 1
        },
        transformPropCount = transformProps.length,
        transEndEvent;
            
    var _bedazzle = function(elements, dscript, opts, scope) {

        // initialise options
        opts = opts || {};
        opts.transition = opts.transition || '1s linear';

        // internals

        var chain = [],
            undoStack = [],
            propData = {},
            isUndo = false,
            commandHandlers = {
                undo: function() {
                    isUndo = true;
                    chain = [].concat(undoStack.pop());
                }
            };

        function addToChain(prop, propValue) {
            if (typeof propValue != 'undefined') {
                chain.push({
                    p: prop,
                    v: propValue
                });
            }
            else {
                for (var key in prop) {
                    if (prop.hasOwnProperty(key)) {
                        chain.push({
                            p: key,
                            v: prop[key]
                        });
                    }
                }
            }
        } // addToChain
        
        function applyProperties(transition, callback) {
            var ii, key, propName, propValue, realProps,
                transitionProps = '';
                
            function transitionEnd(evt) {
                elements[0].removeEventListener(transEndEvent, transitionEnd);
                if (callback) {
                    callback();
                }
            } // transitionEnd
            
            // create transform where appropriate
            realProps = convertProps();

            // create the combined property list
            for (key in realProps) {
                transitionProps += key + ' ';
            }
            
            // iterate through the elements and apply the properties
            for (ii = 0; ii < elements.length; ii++) {
                // iterate through the properties and apply
                for (key in realProps) {
                    elements[ii].style[key] = realProps[key];
                } // for
                
                // apply the transition
                elements[ii].style[getBrowserProp('transition')] = transitionProps + transition;
            } // for
            
            // watch for the transition end event on the first item
            if (elements[0]) {
                elements[0].addEventListener(transEndEvent, transitionEnd, false);
            }
        } // applyProperties
        
        function createUndoChain(items) {
            // create a command list based on the items listed
            var reversed = [], ii, propName, propVal;
            
            for (ii = items.length; ii--; ) {
                propName = items[ii].p;
                propVal = items[ii].v;
                
                // if a numeric value, then reverse it
                if (! isNaN(propVal)) {
                    reversed.push({
                        p: propName,
                        v: multiplicatives[propName] ? 1 / propVal : -propVal
                    });
                } // if
            } // for
            
            return reversed;
        } // createUndoChain
        
        function getBrowserProp(propName) {
            if (browserProps[propName]) {
                return browserProps[propName];
            } // if
            
            // map the property name if applicable
            var browserProp = pMap[propName] || propName,
                ii, prefixed;
            
            // iterate through the prefixes and look for the relevant property
            for (ii = 0; ii < prefixCount; ii++) {
                prefixed = prefixes[ii] + browserProp;
                if (typeof elements[0].style[prefixed] != 'undefined') {
                    browserProp = prefixed;
                    break;
                } // if
            } // for
            
            return browserProps[propName] = browserProp;
        } // getTransitionEndEvent
        
        function convertProps() {
            var realProps = {}, key;
            
            // copy the property data
            for (key in propData) {
                realProps[key] = propData[key];
            } // for
            
            // make the transform prop
            realProps[getBrowserProp('transform')] = 
                'translate(' + (realProps.x || 0) + 'px, ' + (realProps.y || 0) + 'px) ' + 
                'rotate(' + (realProps.r || 0) + 'deg) rotateY(' + (realProps.ry || 0) + 'deg) ' +
                'scale(' + (realProps.scale || 1) + ') ' + 
                'translateZ(' + (realProps.z || 0) + 'px)';

            // clear the transform props
            for (var ii = 0; ii < transformPropCount; ii++) {
                delete realProps[transformProps[ii]];
            } // for
            
            return realProps;
        } // makeTransforms
        
        function updatePropData(name, value) {
            var browserProp = getBrowserProp(name);
            
            if (! propData[browserProp]) {
                propData[browserProp] = value;
            }
            else if (! isNaN(propData[browserProp]) || isNaN(value)) {
                if (multiplicatives[name]) {
                    propData[browserProp] *= value;
                }
                else {
                    propData[browserProp] += value;
                }
            }
        } // updatePropData
        
        function walkChain(items, transition) {
            var item = items[0], match, propName, propVal;
            
            // if we have a function, then wait for the transition end
            // then call the function
            if ((! item) || typeof item == 'function') {
                applyProperties(transition, function() {
                    // create the undo chain
                    if (! isUndo) {
                        undoStack.push(createUndoChain(chain));
                    } // if
                    
                    // reset the chain
                    chain = [];
                    isUndo = false;
                    
                    // if we have a callback, then fire it
                    if (item) {
                        item.call(dazzle);
                    } // if
                });
            }
            // if we have an item, then apply the property
            else {
                // get the property name
                updatePropData(item.p, item.v);
                
                // process the remaining items in the chain
                walkChain(items.slice(1), transition);
            } // if..else
        } // walkChain

        function dazzle(prop, propVal) {
            if (typeof propVal != 'undefined') {
                addToChain(prop, propVal);
            }
            else if (typeof prop == 'string' || prop instanceof String) {
                // check if the property is a command
                var command = commandHandlers[prop], props;
                
                if (command) {
                    command(prop, propVal);
                }
                else {
                    props = _parseprops(prop);

                    // if we have properties, then add to the chain, otherwise
                    // check for a state changer
                    if (props) {
                        addToChain(props);
                    } // if
                }
            }
            else if (typeof prop == 'function') {
                walkChain(chain.concat(prop), opts.transition);
            }
            else if (typeof prop == 'object') {
                addToChain(prop);
            }
            else {
                var transition = (typeof this == 'string' || this instanceof String) ? 
                        this.toString() : opts.transition;
                
                // walk the chain        
                walkChain(
                    // if we have been called with a function as this, then pass it as a callback
                    typeof this == 'function' ? chain.concat(this) : chain, 
                    transition
                );
            } // if..else

            return dazzle;
        } // dazzle

        // check the elements
        if (typeof elements == 'string' || elements instanceof String) {
            elements = (scope || document).querySelectorAll(elements);
        }
        // if we don't have a splice function, then we don't have an array
        // make it one
        else if (! elements.splice) {
            elements = [elements];
        } // if..else

        if (elements) {
            // determine the transitionend event name
            transEndEvent = transEndEvent || transEndEventNames[getBrowserProp('transition')];

            // apply the requested action
            if (dscript) {
                dazzle(dscript)();
            } // if
        } // if

        return dazzle;
    };
    
    // on load look for bedazzle scripts
    
    return _bedazzle;
})();