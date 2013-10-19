var bedazzle = require('..');

bedazzle('.spinner')
  .rotate(180)
  .frame()
  .frame(function() {
    this.rotate(-180);
  });
    
bedazzle('.fader')
  .opacity(0.5)
  .frame(function() {
    this.set('opacity', 1.0);
  });
    
bedazzle('.mover')
  .x(100)
  .frame()
  .frame(function() {
    this.x(-100)
  });
    
bedazzle('.stretcher')
  .frame()
  .frame(function() {
    this.height(100);
  })
  .frame()
  .frame(function() {
    this.height(-100);
  });
