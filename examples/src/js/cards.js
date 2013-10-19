function PlayingCard(suit, value) {
    this.suit = suit;
    this.value = value;
    this.filename = 'cards/' + value + '_of_' + suit + '.svg';
}

PlayingCard.prototype.html = function() {
    return '<div class="card"><img src="' + this.filename + '" /></div>';
};

function Deck(opts) {
    var cardNames = [],
        deck = this;
        
    // initialise options
    opts = opts || {};

    // initialise some card names
    cardNames[1] = 'ace';
    cardNames[11] = 'jack';
    cardNames[12] = 'queen';
    cardNames[13] = 'king';
    
    // initialise the cards
    this.cards = [];
    
    // create the cards
    ['spades', 'clubs', 'hearts', 'diamonds'].forEach(function(suit) {
        for (var ii = 1; ii <= 13; ii++) {
            deck.cards.push(new PlayingCard(suit, cardNames[ii] || ii));
        }
    });
    
    if (opts.shuffle) {
        this.shuffle();
    }
}

Deck.prototype.next = function(count) {
    return this.cards.splice(0, count || 1);
};

Deck.prototype.shuffle = function() {
    var ii = this.cards.length, jj, tmp1, tmp2;
    
    if (ii === 0) {
        return;
    }
    
    while (--ii) {
        jj = Math.floor(Math.random() * (ii + 1));
        
        // get references to the cards
        tmp1 = this.cards[ii];
        tmp2 = this.cards[jj];
        
        // swap the cards
        this.cards[ii] = tmp2;
        this.cards[jj] = tmp1;
    }
};

var deck = new Deck({ shuffle: true });