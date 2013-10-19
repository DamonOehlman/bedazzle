var bedazzle = require('..');
var stylar = require('stylar');

function nextColor(elements) {
  stylar(elements[0]).set('background', 'blue');
}

bedazzle('.spinner').set('x', 50).rotate(180).end(nextColor).loop();