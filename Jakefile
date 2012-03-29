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

task('build-demo-deps', function() {
    interleave('demos/src/js/deps', { 
        path: 'demos/js'
    });
});

task('default', function() {
    interleave('src', {
        path: '.',
        'package': true
    });    
});