var bedazzle = require('..');

window.onload = function() {
  var container = document.getElementById('container');

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

    container.appendChild(box);
  }

  bedazzle('.fader').opacity(0.5);

  bedazzle('.spinner')
      .ry(180)
      .frame.ry(180).set('background-color', 'gray');
      
  bedazzle('.scaler').scale(0.5);
};
