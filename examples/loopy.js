var bedazzle = require('..');
var stylar = require('stylar');

function nextColor(elements) {
  stylar(elements[0]).set('background', 'blue');
}

bedazzle('.spinner')
  .frame(function(elements) {
    this.x(50).rotate(180);
    nextColor(elements);
  })
  .loop();