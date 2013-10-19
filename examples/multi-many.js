var bedazzle = require('..');

for (var ii = 0; ii < 200; ii++) {
  var box = document.createElement('div');
  box.className = 'box float';
  box.innerText = ii;

  if (ii % 2 === 0) {
    box.className += ' spinner';
  }

  if (ii % 4 === 0) {
    box.className += ' fader';
  }

  document.body.appendChild(box);
}

bedazzle('.fader')
  .frame(function() {
    this.opacity(0.5);
  });

bedazzle('.spinner')
  .frame(function() {
    this.ry(180);
  })
  .frame(function() {
    this.ry(180).set('background-color', 'gray');
  });
    
bedazzle('.scaler')
  .frame(function() {
    this.scale(0.5);
  });
