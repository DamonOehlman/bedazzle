var transforms = typeof ratchet != 'undefined',
    transforms3d = typeof Modernizr != 'undefined' && Modernizr.csstransforms3d,
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