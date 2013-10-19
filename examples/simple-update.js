window.onload = function() {
  require('..')('.box')
    .frame.update({ x: 200, y: 200, rotate: 360 }) // 'x200 y200 rotate-360')
    .frame.update({ x: -200 }) // 'x-200')
    .frame.update({ x: 200, y: 50, rotate: 360 }) // 'x200 y50 rotate360');
};