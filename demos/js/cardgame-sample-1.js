
// req: 
function fanCards() {
    var cards = $('#player1 .card'),
        rotateAmount = 40 / cards.length;
    
    _.each(cards, function(card, index) {
        var transform = ratchet('translateX(' + (3 * index) + 'px) rotate(' + (rotateAmount * index) + ')');
        
        stylar(card, 'transform', transform.toString());
    });
}

$(function() {
    var inHand = deck.next(7);
    
    // add some cards to the html
    $('#player1 .hand').html(_.reduce(inHand, function(memo, card) {
        return memo + card.html();
    }, ''));
    
    fanCards();
    
    $('.card').on('click', function() {
        bedazzle(this)
            .manual(function(elements) {
                stylar(elements, 'transform', ratchet('translate(75px, -350px) rotate(20deg)'));
            })
            .end(function(elements) {
                $('#cardtable').append(elements);
                stylar(elements, 'transform', '');
                fanCards();
            });
    });
});