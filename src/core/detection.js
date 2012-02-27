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