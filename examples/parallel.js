var bedazzle = require('..');

window.onload = function() {
  bedazzle('.spinner')
    .rotate(180)
    .frame
    .frame.rotate(-180);
      
  bedazzle('.fader')
    .opacity(0.5)
    .frame.set('opacity', 1.0);
      
  bedazzle('.mover')
    .x(100)
    .frame
    .frame.x(-100);
      
  bedazzle('.stretcher')
    .frame
    .frame.height(100)
    .frame
    .frame.height(-100);
};
