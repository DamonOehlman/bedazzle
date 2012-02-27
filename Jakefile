var interleave = require('interleave');

task('build-demos', function() {
    interleave('demos/src/js', {
        path: 'demos/js'
    });
    
    interleave('demos/src/css', {
        path: 'demos',
        stylus: {
            plugins: {
                nib: require('nib')
            },
            
            urlEmbed: true
        }
    });
});

task('default', function() {
    interleave('src', {
        path: '.'
    });    
});