function fanCards() {
    var cards = $('#player1 .card'),
        rotateAmount = 40 / cards.length;
    
    _.each(cards, function(card, index) {
        bedazzle(card).x(3 * index, true).rotate(rotateAmount * index, true);
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
            .set('rotate20 y-350 x75').end(function(elements) {
                $('#cardtable').append(elements);
                stylar(elements, 'transform', '');
                fanCards();
            });
    });
});