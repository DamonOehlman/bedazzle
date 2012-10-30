var interleave = require('interleave');

task('build-demos', function() {
    interleave('demos/src/js/*.js', {
        output: 'demos/js'
    });
    
    interleave('demos/src/css/*.*', {
        output: 'demos',
        stylus: {
            plugins: [ require('nib') ],
            urlEmbed: true
        }
    });
});

task('build-demo-deps', function() {
    interleave('demos/src/js/deps/*.js', { 
        output: 'demos/js'
    });
});