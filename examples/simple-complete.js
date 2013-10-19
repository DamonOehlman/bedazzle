var bedazzle = require('..');
var crel = require('crel');

window.onload = function() {
  bedazzle('.box')
    .frame(function() {
      this.x(200).y(200).rotate(-45);
    })
    .frame(function() {
      this.x(-200).opacity(0.2)
    })
    .frame(function() {
      this.x(200).y(50).rotate(315).height(-100).set('opacity', 1)
    });
};

// create some boxes
var boxes = [1, 2, 3, 4, 5].map(function(text) {
  var box = crel('div', { class: 'box' });
  document.body.appendChild(box);
  return box;
});

document.body.appendChild(crel('style', [
  '.box {',
  '  width: 40px;',
  '  height: 40px;',
  '  padding: 5px;',
  '  margin: 0 5px 5px 0;',
  '  background: #f00;',
  '  transition: all ease-in-out 0.5s;',
  '}'
].join('\n')));