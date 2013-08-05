target: function(element) {
    if (! element) {
        return this;
    }
    
    function getPos(targetElement, pos) {
        var transform = stylar(targetElement).get('transform', true),
            parsedTransform;
        
        pos = pos || { x: 0, y: 0 };
        pos.x += targetElement.offsetLeft || 0;
        pos.y += targetElement.offsetTop || 0;
        
        if (transform) {
            parsedTransform = ratchet(transform);
            
            pos.x += parsedTransform.translate.x;
            pos.y += parsedTransform.translate.y;
        }
        
        if (targetElement.parentNode) {
            return getPos(targetElement.parentNode, pos);
        }
        
        return pos;
    }
    
    var targetPos = getPos(element),
        ii, elementPos;
    
    // iterate through the elements and determine what is required to hit that target
    console.log(targetPos);
    
    // iterate through the elements and determine the change required
    for (ii = this.elements.length; ii--; ) {
        elementPos = getPos(this.elements[ii]);

        // create the element specific transform
        this.props.elementTransforms[ii] = new ratchet.Transform({
            translate: {
                x: targetPos.x - elementPos.x,
                y: targetPos.y - elementPos.y
            }
        });
    }
    
    return this;
}