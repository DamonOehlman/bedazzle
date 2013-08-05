var bedazzle = require('../');
var stylar = require('stylar');

window.onload = function() {
  bedazzle('.spinner').x(50).rotate(180).end(function(elements) {
      stylar(elements[0]).set('background', 'blue');
  }).loop();
};