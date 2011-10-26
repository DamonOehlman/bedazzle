(function() {
    classtweak('pre', '+prettyprint +lang-js');
    prettyPrint();
    
    $('.btn-run').live('click', function() {
        var codeBlock = $(this).next('pre')[0];

        if (codeBlock) {
            var script = document.createElement('script');

            // remove existing demo elements
            $('#bedazzle_demo').remove();
            $('#bedazzle_stage').remove();
            
            // create the stage
            $(this).before('<div id="bedazzle_stage"><div class="box"></div></div>');
            
            // add the script tag
            script.id = 'bedazzle_demo';
            script.text = codeBlock.textContent;
            
            setTimeout(function() {
                document.body.appendChild(script);
            }, 0);
        }
        
        return false;
    });
    
    $('pre').before('<a href="#" class="btn-run">run</a>');
})();