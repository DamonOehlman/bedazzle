var reWhitespace = /[\s\,]/,
    rePropValue = /^([a-z]+|[a-z\-]+(?=\:))([\d\%\.\-\!]+|\:.+)$/i,
    reLeadingColon = /^\:/,
    reTrailingPerc = /\%$/;

function parseMultiProp(text) {
    // first tokenize
    var items = text.split(reWhitespace),
        ii, itemCount = items.length, match,
        propValue, props;
    
    // iterate through the items
    for (ii = 0; ii < itemCount; ii++) {
        // check for a property value
        match = rePropValue.exec(items[ii]);
        if (match) {
            // extract the property value
            propValue = match[2].replace(reLeadingColon, '');
            
            // initialise the properties
            props = props || {};
            
            // define the property
            props[match[1]] = reTrailingPerc.test(propValue) ? propValue : parseFloat(propValue) || propValue;
        } // if
    } // for

    return props;
} // parseMultiProp