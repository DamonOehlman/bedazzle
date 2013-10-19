var bedazzle = require('..');

bedazzle('.spinner')
  .frame(function() {
    this.rotate(180);
  })
  .frame()
  .frame(function() {
    this.rotate(-180);
  });
    
bedazzle('.fader')
  .frame(function() {
    this.opacity(0.5);
  })
  .frame(function() {
    this.set('opacity', 1.0);
  });
    
bedazzle('.mover')
  .frame(function() {
    this.x(100);
  })
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
