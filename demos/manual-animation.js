var bedazzle = require('..');
var key = require('keymaster');

window.onload = function() {
  var car = bedazzle('.car').opts({ immediate: true });

  key('up', function(){ car.x(5) });
  key('down', function(){ car.x(-5) });
  key('left', function() { car.rotate(-5); });
  key('right', function() { car.rotate(5); });
};