window.onload = function() {
  require('..')('.box')
    .frame.x(200).y(200).rotate(-45)
    .frame.x(-200).opacity(0.2)
    .frame.x(200).y(50).rotate(315).height(-100).set('opacity', 1);
};
