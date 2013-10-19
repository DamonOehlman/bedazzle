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

```
ERROR: could not find: 
```

Finally, a little bit of browserifiable css to make it all work:

```js
require('bedazzle')('.box')
  .frame.x(200).y(200).rotate(-45)
  .frame.x(-200).opacity(0.2)
  .frame.x(200).y(50).rotate(315).height(-100).set('opacity', 1);
```

## Bedazzler prototype

### end(callback)

### loop()

### manual(helper)

### opts(opts)

### set(name, value)

### update(props, absolute?)

### @frame

### @props

### _applyChanges()

### _createFrame

Create a new animation frame

### _changed()

### _next(transitioners, timeout, callbacks)

## License(s)

### MIT

Copyright (c) 2013 Damon Oehlman <damon.oehlman@sidelab.com>

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
