(function() {
    classtweak('pre', '+prettyprint +lang-js');
    prettyPrint();
    
    $('.btn-run').live('click', function() {
        var codeBlock = $(this).next('pre')[0];

        if (codeBlock) {
            // create a script tag
            $('#bedazzle_demo').remove();
            $('#bedazzle_stage').remove();
            
            $(this).before('<div id="bedazzle_stage"><div class="box"></div></div>');
            
            setTimeout(function() {
                var script = document.createElement('script');
                script.id = 'bedazzle_demo';
                script.text = codeBlock.textContent;
                
                document.body.appendChild(script);
            }, 100);
        }
        
        return false;
    });
    
    $('pre').before('<a href="#" class="btn-run">run</a>');
})();