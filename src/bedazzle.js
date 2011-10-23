var bedazzle = (function() {
    
    //= cog!parseprops
    
    // initialise property mappings
    var pMap = {
            rotate: 'r'
        },
        prefixes = ['', '-webkit-', '-moz-', '-o-'],
        prefixCount = prefixes.length,
        browserProps = {},
        transEndEventNames = {
            '-webkit-transition' : 'webkitTransitionEnd',
            '-moz-transition'    : 'transitionend',
            '-o-transition'      : 'oTransitionEnd',
            'transition'         : 'transitionEnd'
        },
        transformProps = ['x', 'y', 'z', 'r', 'ry', 'rz', 'scale'],
        transformPropCount = transformProps.length,
        transformParsers = [
            { regex: /translate\((\d+)px\,\s+(\d+)px\)/, x: 1, y: 2 }
        ],
        transformParserCount = transformParsers.length,
        multiplicatives = {
            scale: 1,
            opacity: 1
        },
        reSpace = /\s+/,
        reCommaSep = /\s*?\,\s*/,
        reTransition = /([\w\-]+)\s*(.*)/,
        transEndEvent;
            
    var _bedazzle = function(elements, dscript, opts, scope) {

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
                // add run aliases
                set: run
            },
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
                propName = getBrowserProp('transition'),
                existing = element.style[propName].split(reCommaSep),
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
                'rotate(' + (changedData.r || 0) + 'deg) rotateY(' + (changedData.ry || 0) + 'deg) ' +
                'scale(' + (changedData.scale || 1) + ') ' + 
                'translateZ(' + (changedData.z || 0) + 'px)';

            // clear the transform props
            for (var ii = 0; ii < transformPropCount; ii++) {
                delete changedData[transformProps[ii]];
            } // for
            
            return changedData;
        } // getUpdatedProps        
        
        function parseTransform(element) {
            var transform = element.style[getBrowserProp('transform')] || '',
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

        function prefixProps(props) {
            var out = {};
            
            for (var key in props) {
                out[getBrowserProp(key)] = props[key];
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
                    var data = _parseprops(command);
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
                transitionProps = {},
                transitionComplete = false,
                startTick = new Date().getTime(),
                fireCount = 0,
                
                transitionEnd = function(evt) {
                    var transProp = evt.propertyName || '',
                        tickDiff = (evt.timeStamp || new Date().getTime()) - startTick;
                        
                    if (transitionProps[transProp] && tickDiff > 50) {
                        elements[0].removeEventListener(transEndEvent, transitionEnd);
                        // elements[0].style[getBrowserProp('transition')] = '';
                        
                        if (callback) {
                            // console.log(evt.timeStamp - startTick, fireCount++, evt);
                            callback();
                        }
                    }
                };
                
            // iterate through the elements and apply the properties
            for (ii = 0; ii < elements.length; ii++) {
                var updatedProps = getUpdatedProps(elements[ii]);
                
                // FIXME: hacky
                if (ii === 0) {
                    transitionProps = prefixProps(updatedProps);
                }
                
                // apply the transition
                applyTransitions(elements[ii], prefixProps(updatedProps), transition);
                
                // update the properties
                for (key in updatedProps) {
                    elements[ii].style[getBrowserProp(key)] = updatedProps[key];
                }
            } // for
            
            // watch for the transition end event on the first item
            if (elements[0]) {
                elements[0].addEventListener(transEndEvent, transitionEnd, false);
            }
        } // processProperties
        
        function updatePropData(name, value) {
            var browserProp = getBrowserProp(name), newVal = value,
                currentValue = propData[browserProp];
            
            if (typeof currentValue != 'undefined' && (! isNaN(currentValue) || isNaN(value))) {
                if (multiplicatives[name]) {
                    newVal = currentValue * value;
                }
                else {
                    newVal = currentValue + value;
                }
            } // if
            
            // update the property value
            changed[browserProp] = currentValue !== newVal;
            propData[browserProp] = newVal;
        } // updatePropData
        
        function walkChain(items, transition) {
            var item = items[0], match, propName, propVal;
            
            // if we have a function, then wait for the transition end
            // then call the function
            if ((! item) || typeof item == 'function') {
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
                    props = _parseprops(prop);

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

        if (elements) {
            // determine the transitionend event name
            transEndEvent = transEndEvent || transEndEventNames[getBrowserProp('transition')];

            // apply the requested action
            if (dscript) {
                run(dscript);
            } // if
        } // if

        return dazzler;
    };
    
    // on load look for bedazzle scripts
    
    return _bedazzle;
})();