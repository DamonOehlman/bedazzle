// dep: ratchet, stylar

//= block://sidelab/parseProps

//= core/detection
//= core/bedazzler

var bedazzle = function(elements, scope) {

    // check the elements
    if (typeof elements == 'string' || elements instanceof String) {
        elements = (scope || document).querySelectorAll(elements);
    }
    // if we don't have a splice function, then we don't have an array
    // make it one
    else if (! elements.splice) {
        elements = [elements];
    } // if..else

    return new Bedazzler(elements);
};

if (typeof jQuery != 'undefined') {
    $.fn.bedazzle = function() {
        return bedazzle(this);
    };
}