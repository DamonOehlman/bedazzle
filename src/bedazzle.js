var bedazzle = (function() {
    
    //= helpers/multiprop
    
    // initialise property mappings
    var pMap = {
            x:      '!translateX',
            y:      '!translateY',
            r:      '!rotate',
            ry:     '!rotateY'
        };
            
    // some property aliases
    pMap.rotate = pMap.r;
    
    var _bedazzle = function(elements, dscript, opts, scope) {

        // initialise options
        opts = opts || {};
        opts.easing = opts.easing || 'linear';
        opts.duration = opts.duration || '1s';

        // internals

        var prefixes = ['-webkit-', '-moz-', '-o-'],
            activePrefixes,
            chain = [],
            activeChain = chain;

        function addToChain(prop, propValue) {
            if (typeof propValue != 'undefined') {
                activeChain.push({
                    p: prop,
                    v: propValue
                });
            }
            else {
                for (var key in prop) {
                    if (prop.hasOwnProperty(key)) {
                        activeChain.push({
                            p: key,
                            v: prop[key]
                        });
                    }
                }
            }
        } // addToChain
        
        function walkChain(items) {
            // iterate through the items
            for (var ii = 0, itemCount = items.length; ii < itemCount; ii++) {
                console.log(items[ii]);
            } // for
        } // walkChain

        function dazzle(prop, propVal) {
            if (typeof propVal != 'undefined') {
                addToChain(prop, propVal);
            }
            else if (typeof prop == 'string' || prop instanceof String) {
                var props = parseMultiProp(prop);
                
                // if we have properties, then add to the chain, otherwise
                // check for a state changer
                if (props) {
                    addToChain();
                } // if
            }
            else if (typeof prop == 'function') {
                // add the function call
            }
            else if (typeof prop == 'object') {
                // add each of the object properties to the chain
            }
            else {
                walkChain(chain);
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

        // apply the requested action
        if (dscript) {
            dazzle(dscript)();
        } // if

        return dazzle;
    };
    
    // on load look for bedazzle scripts
    
    return _bedazzle;
})();