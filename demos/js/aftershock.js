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
            firedTick = {},
            timeoutId;
        
        function delegator(evt) {
            var tick = new Date().getTime(),
                evtName = (opts.perProperty ? evt.propertyName : null) || 'transition',
                tickDiff = tick - (firedTick[evtName] || 0);
                
            // clear the timeout
            clearTimeout(timeoutId);
                
            // if the tick difference is great enough, then we have a discrete event, so fire.
            if (tickDiff >= opts.mindiff) {
                if (callback) {
                    callback.call(this, evt);
                }
                
                // update the fired tick
                firedTick[evtName] = tick;
            }
        } // delegator
        
        function stop() {
            for (ii = elements.length; ii--; ) {
                elements[ii].removeEventListener(transEndEvent, delegator);
            }
        }
        
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
        
        // if a timeout was set, then run a function in the specified amount of time
        if (opts.timeout) {
            timeoutId = setTimeout(function() {
                // stop monitoring for events
                stop();
                
                // run the delegator
                delegator();
            }, opts.timeout);
        }
        
        return {
            stop: stop
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
