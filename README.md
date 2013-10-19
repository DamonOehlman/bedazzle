# Bedazzle

Bedazzle is a JS animation library that allows you to do some pretty
tricky stuff without much effort.  It's quite similar to
[move.js](https://github.com/visionmedia/move.js) but uses a frames rather
than a `then` function.

Additionally, bedazzle is more or less a pure CSS manipulation library
and doesn't support the additional easing functions that move does. It does
work in partnership with your CSS though and aligns animation frames with
your transition delays in the CSS (which is pretty neat).


[![NPM](https://nodei.co/npm/bedazzle.png)](https://nodei.co/npm/bedazzle/)


## Example Usage

Consider the following example, which animates a series of divs.  First
we have some stripped down html:

```html
<html>
<body>
<link rel="stylesheet" type="text/css" href="demos.css" />
<div class="box"></div>
<div class="box"></div>
<div class="box"></div>
<div class="box"></div>
<div class="box"></div>
<script src="simple-bundle.js"></script>
</body>
</html>
```

Then some css which is used across most of the examples:

```css
.box {
  width: 40px;
  height: 40px;
  padding: 5px;
  margin: 0 5px 5px 0;
  background: #f00;
  transition: all ease-in-out 0.5s;
}

.spinner {
  transition: all linear 0.5s;
}
```

Finally, a little bit of browserifiable css to make it all work:

```js
var bedazzle = require('bedazzle');

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
```

## Running the Examples

Running the examples is probably easiest done with
[bde](https://github.com/DamonOehlman/bde) given custom HTML is used in
the demos.  Install `bde` using the following command:

```
npm install -g bde
```

You can then run bde using the following command:

```
bde examples
```

If all is well, you should be able to fire up some of the 
[examples](https://github.com/DamonOehlman/bedazzle/tree/master/examples)
in your browser (although I'm still converting somee over).  If you are
running bde using the default port, you should be able to access the simple
example from above at the following url:

<http://localhost:8080/simple.html>

## Reference

### bedazzle(elements, opts?)

Create a new `Bedazzler` instance which is used to orchestrate the
animation of the supplied `elements` (or those elements matched by the
selector referred to by elements if it is a string).

### Bedazzler#frame(action?)

Define a new frame in the animation loop.  If an action function is
supplied, then it will be called (with `this` bound to the Bedazzler) once
the frame becomes active.

### Bedazzler#end(callback)

Once the current frame has completed, trigger the supplied function.

### Bedazzler#loop()

When all of the defined frames have completed, restart from the beginning.
An example of using loop can be found in the 'loopy' example, shown below:

```js
var bedazzle = require('bedazzle');
var stylar = require('stylar');

function nextColor(elements) {
  stylar(elements[0]).set('background', 'blue');
}

bedazzle('.spinner')
  .frame(function(elements) {
    this.x(50).rotate(180);
    nextColor(elements);
  })
  .loop();
```

### Bedazzler#manual(helper)

TBC

### Bedazzler#opts(opts)

TBC

### Bedazzler#set(name, value)

TBC

### Bedazzler#update(props, absolute?)

TBC

## Internal Methods

### _applyChanges()

### _next(transitioners, timeout, callbacks)

## License(s)

### MIT

Copyright (c) 2013 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
