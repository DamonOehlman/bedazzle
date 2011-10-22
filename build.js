var interleave = require('interleave'),
    fs = require('fs'),
    config = {
        aliases: {
            cog: 'github://DamonOehlman/cog/cogs/$1'
        }
    };

// build each of the builds
interleave('src', {
    multi: 'pass',
    path: '.',
    config: config
});