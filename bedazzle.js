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

    // Aftershock function provides a cross-browser wrapper to transitionEnd events.
    //
    //      aftershock(elements, opts*, callback)
    // 
    // ### Parameters:
    // 
    // - elements - the elements (or single element) that we will bind the event listener to
    // - opts - aftershock options, which can be omitted
    // - callback - the handler to fire when a transitionEnd event is detected
    // 
    // ### Options
    // 
    // The following options are supported by aftershock:
    // 
    // - mindiff (default: 10ms) - The amount of time between events on elements to be considered
    //     a discrete transitionEnd event for the group of elements being watched.  In my normal usage
    //     I really only want to know when the group of elements transitioning have finished not each
    //     discrete element
    // 
    // - perProperty (default: false) - Whether or not discrete events should be fired when different
    //     properties have been transitioned.
    // 
    var aftershock = (function() {
        var transEndEventNames = {
                '-webkit-transition' : 'webkitTransitionEnd',
                '-moz-transition'    : 'transitionend',
                '-o-transition'      : 'oTransitionEnd',
                'transition'         : 'transitionEnd'
            },
            transEndEvent;
            
        /*
         * ## getBrowserProp(propName, testElement, customMappings)
         * 
         * This function is used to return the current vendor specific property for the requested
         * property. The property is determined by iterating through dom prefixes on the element
         * and looking for support of the property on the elements style attribute.  If the version
         * of the browser has support for the property in it's raw form then that will be returned
         * first (as it is tested first).
         */
        var getBrowserProp = (function() {
            var knownProps = {},
                prefixes = ['', '-webkit-', '-moz-', '-o-'],
                domPrefixes = ['', 'Webkit', 'Moz', 'O'],
                prefixCount = prefixes.length;
                
            
            return function(propName, testEl, mappings) {
                var ii, testProps = [], browserProp;
                
                // if we already know the property mapping, then return it
                if (knownProps[propName]) return knownProps[propName];
                
                // ensure the mappings are valid
                mappings = mappings || {};
                
                // initialise the browser property to the default property, run through the custom mappings
                browserProp = {
                    css: mappings[propName] || propName,
                    dom: mappings[propName] || propName
                };
                
                // create the test properties
                for (ii = 0; ii < prefixCount; ii++) {
                    testProps.push({
                        css: prefixes[ii] + propName,
                        dom: ii === 0 ? propName : domPrefixes[ii] + propName.slice(0, 1).toUpperCase() + propName.slice(1)
                    });
                } // for
                
                // check for the existence of the property on the element
                for (ii = 0; ii < testProps.length; ii++) {
                    if (typeof testEl.style[testProps[ii].dom] != 'undefined') {
                        browserProp = testProps[ii];
                        break;
                    }
                }
                
                // update the known props and return the property
                return knownProps[propName] = browserProp;
            };
        })();
    
        
        function _aftershock(elements, opts, callback) {
            
            var ii,
                firedTick = {};
            
            function delegator(evt) {
                var tick = new Date().getTime(),
                    evtName = opts.perProperty ? evt.propertyName : 'transition',
                    tickDiff = tick - (firedTick[evtName] || 0);
                    
                // if the tick difference is great enough, then we have a discrete event, so fire.
                if (tickDiff >= opts.mindiff) {
                    if (callback) {
                        callback.call(this, evt);
                    }
                    
                    // update the fired tick
                    firedTick[evtName] = tick;
                }
            } // delegator
            
            // if we don't have elements, return
            if (! elements) return null;
            
            // if the opts is a function, then it's probably the callback
            if (typeof opts == 'function' && arguments.length == 2) {
                callback = opts;
                opts = {};
            }
            
            // ensure we have options
            opts = opts || {};
            opts.mindiff = opts.mindiff || 10;
    
            // elements is not an array, then make it one
            if (elements && (typeof elements.length == 'undefined')) {
                elements = [elements];
            }
    
            // if we have at least one element and no transEndEvent name, find it
            if (elements.length > 0 && (! transEndEvent)) {
                transEndEvent = transEndEventNames[getBrowserProp('transition', elements[0]).css];
            }
            
            // add the listener to each of the elements
            for (ii = elements.length; ii--;  ) {
                elements[ii].addEventListener(transEndEvent, delegator);
            }
            
            return {
                stop: function() {
                    for (ii = elements.length; ii--; ) {
                        elements[ii].removeEventListener(transEndEvent, delegator);
                    }
                }
            };
        };
        
        if (typeof jQuery != 'undefined') {
            jQuery.fn.aftershock = function(opts, callback) {
                return _aftershock.apply(this, [this].concat(Array.prototype.slice.apply(arguments)));
            };
        }
    
        // export the get browser prop utility function for other libraries to use
        _aftershock.getBrowserProp = getBrowserProp;
        
        return _aftershock;
    })();

    
    // initialise property mappings
    var getBrowserProp = aftershock.getBrowserProp,
        transformProps = ['x', 'y', 'z', 'r', 'ry', 'rz', 'scale'],
        transformPropCount = transformProps.length,
        transformParsers = [
            { regex: /translate\((\d+)px\,\s+(\d+)px\)/, x: 1, y: 2 }
        ],
        transformParserCount = transformParsers.length,
        transforms3d = false,
        multiplicatives = {
            scale: 1,
            opacity: 1
        },
        reSpace = /\s+/,
        reScriptBedazzle = /.*?\/bedazzle$/i,
        reCommaSep = /\s*?\,\s*/,
        reTransition = /([\w\-]+)\s*(.*)/,
        elementCounter = 0,
        
    _bedazzle = function(elements, dscript, opts, scope) {

        // initialise options
        opts = opts || {};
        opts.transition = opts.transition || '1s linear';

        // internals

        var chain = [],
            undoStack = [],
            propData = {},
            changed = {},
            isUndo = false,
            dazzler = {
                run: run,
                // add move aliases
                move: run
            },
            // listener,
            commandHandlers = {
                undo: function(callback) {
                    isUndo = true;
                    chain = [].concat(undoStack.pop());
                    
                    callback();
                },
                
                go: run
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
        
        function applyTransitions(element, transitionProps, transition) {
            var transitions = [],
                propName = getBrowserProp('transition', elements[0]).dom,
                existing = (element.style[propName] || '').split(reCommaSep),
                ii, key, match;
                
            // iterate through the existing transitions
            for (ii = existing.length; ii--; ) {
                match = reTransition.exec(existing[ii]);
                if (match) {
                    transitionProps[match[1]] = transitionProps[match[1]] || match[2];
                } // if
            } // for
            
            // read the existing transition properties
            for (key in transitionProps) {
                transitions.push(key + ' ' + transition);
            } // for
            
            element.style[propName] = transitions.join(', ');
        } // applyTransitions
        
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
        
        function getUpdatedProps(element) {
            // read the transform props
            var transformData = parseTransform(element),
                key, elementData = {}, changedData = {};
                
            // iterate through the prop data and make a copy
            for (key in propData) {
                elementData[key] = propData[key];
            } // for
            
            // now apply and transform data that hasn't been set
            // by existing properties
            for (key in transformData) {
                if (transformData[key] && typeof propData[key] == 'undefined') {
                    elementData[key] = transformData[key];
                    changed[key] = true;
                }
            } // for
            
            // copy the property data
            for (key in elementData) {
                if (changed[key]) {
                    changedData[key] = elementData[key];
                } // if
            } // for
            
            // make the transform prop
            changedData.transform = 
                'translate(' + (changedData.x || 0) + 'px, ' + (changedData.y || 0) + 'px) ' +
                'rotate(' + (changedData.r || 0) + 'deg) ' +
                (transforms3d ? 'rotateY(' + (changedData.ry || 0) + 'deg) ' : '') + 
                'scale(' + (changedData.scale || 1) + ') ' + 
                (transforms3d ? 'translateZ(' + (changedData.z || 0) + 'px)' : '');

            // clear the transform props
            for (var ii = 0; ii < transformPropCount; ii++) {
                delete changedData[transformProps[ii]];
            } // for
            
            return changedData;
        } // getUpdatedProps        
        
        function parseTransform(element) {
            var transform = element.style[getBrowserProp('transform', elements[0]).dom] || '',
                ii, match, key, parser, 
                data = {};
                
            // iterate through the transform parsers
            for (ii = 0; ii < transformParserCount; ii++) {
                parser = transformParsers[ii];
                
                match = parser.regex.exec(transform);
                if (match) {
                    for (key in parser) {
                        if (key !== 'regex') {
                            data[key] = match[parser[key]];
                        }
                    }
                }
            } // for
            
            return data;
        } // parseTransform

        function prefixProps(props, attr) {
            var out = {};
            
            for (var key in props) {
                out[getBrowserProp(key, elements[0])[attr || 'dom']] = props[key];
            }
            
            return out;
        } // prefixProps
        
        function processCommands(commands, callback) {
            var command = commands[0];
            if (command) {
                // if it is an actual command rather than a property, then process
                if (commandHandlers[command]) {
                    commandHandlers[command].call(this, function() {
                        processCommands(commands.slice(1), callback);
                    });
                }
                // otherwise, process the property
                else {
                    var data = parseProps(command);
                    for (var key in data) {
                        addToChain(key, data[key]);
                    } // for
                    
                    processCommands(commands.slice(1), callback);
                }
            }
            else if (callback) {
                callback.call(dazzler);
            } // if..else
        } // processCommands
        
        function processProperties(transition, callback) {
            var ii, key, propName, propValue, realProps,
                transitionComplete = false,
                startTick = new Date().getTime(),
                fireCount = 0,
                
                applyProps = function() {
                    // iterate through the elements and apply the properties
                    for (ii = elements.length; ii--; ) {
                        var updatedProps = getUpdatedProps(elements[ii]);

                        // apply the transition
                        applyTransitions(elements[ii], prefixProps(updatedProps, 'css'), transition);

                        // update the properties
                        for (key in updatedProps) {
                            if (key) {
                                elements[ii].style[getBrowserProp(key, elements[0]).dom] = updatedProps[key];
                            }
                        }
                    } // for
                };

            // fire the callback once the transition has completed
            aftershock(elements, callback);
            
            /*
            // add the new listener
            listener.add(
                callback, 
                prefixProps(getUpdatedProps(listener.element), 'css')
            );
            */
            
            // TODO: Moz prefers no settimeout, but chrome seems to require it...
            setTimeout(applyProps, 0);
            // applyProps();
        } // processProperties
        
        function updatePropData(name, value) {
            var browserProp = getBrowserProp(name, elements[0]), newVal = value,
                currentValue = propData[browserProp.dom];
            
            if (typeof currentValue != 'undefined' && (! isNaN(currentValue) || isNaN(value))) {
                if (multiplicatives[name]) {
                    newVal = currentValue * value;
                }
                else {
                    newVal = currentValue + value;
                }
            } // if
            
            // update the property value
            changed[name] = currentValue !== newVal;
            propData[name] = newVal;
        } // updatePropData
        
        function walkChain(items, transition) {
            var item = items[0], match, propName, propVal;
            
            // if we have a function, then wait for the transition end
            // then call the function
            if ((! item) || typeof item == 'function') {
                // process properties
                processProperties(transition, function() {
                    // create the undo chain
                    if (! isUndo) {
                        undoStack.push(createUndoChain(chain));
                    } // if
                    
                    // reset the chain
                    chain = [];
                    isUndo = false;
                    changed = {};
                    
                    // if we have a callback, then fire it
                    if (item) {
                        item.call(dazzler);
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
        
        // exports 
        
        function findScripts() {
            var scripts = document.scripts || [];
            
            for (var ii = 0; ii < scripts.length; ii++) {
                // if the script is a bedazzle script, then parse it
                if (reScriptBedazzle.test(scripts[ii].type)) {
                    parse(scripts[ii].innerText);
                }
            }
        } // findScripts
        
        function parse(text) {
            
        } // parse
        
        function run(prop, propVal) {
            if (typeof propVal == 'function') {
                processCommands(prop.split(reSpace), propVal);
            }
            else if (typeof propVal != 'undefined') {
                addToChain(prop, propVal);
            }
            else if (typeof prop == 'string' || prop instanceof String) {
                processCommands(prop.split(reSpace), opts.callback);
                
                /*
                // check if the property is a command
                prop = extractCommands(prop, commands);
                
                if (command) {
                    command(prop, propVal);
                }
                else {
                    props = parseProps(prop);

                    // if we have properties, then add to the chain, otherwise
                    // check for a state changer
                    if (props) {
                        addToChain(props);
                    } // if
                }
                */
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

            return dazzler;
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

        if (elements && elements[0]) {
            // listener = _getListener(elements);
            
            // apply the requested action
            if (dscript) {
                run(dscript);
            } // if
        } // if

        // find the bedazzle scripts
        findScripts();

        return dazzler;
    };
    
    // if we have modernizr, then do so tests
    if (typeof Modernizr != 'undefined') {
        transforms3d = Modernizr.csstransforms3d;
    }
    
    return _bedazzle;
})();