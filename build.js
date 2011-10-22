var interleave = require('interleave'),
    fs = require('fs'),
    config = {
        aliases: {
        }
    };

// build each of the builds
interleave('src', {
    multi: 'pass',
    path: '.',
    config: config
});