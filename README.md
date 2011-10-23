# Bedazzle

Bedazzle is designed as a JavaScript wrapper to CSS3 [Transforms](http://www.w3.org/TR/css3-2d-transforms/), [Transitions](http://www.w3.org/TR/css3-transitions/), etc.  It draws inspiration from the excellent [move.js](https://github.com/visionmedia/move.js) library which operates in a similar way, but bedazzle takes a slightly different approach...

__NOTE:__ This is a very early alpha release and you _should_ expect things to change.  Feedback is definitely appreciated.

## Example Usage

In the simplest case, you can use bedazzle to update object properties using a chainable syntax, and then run the animation:

```js
bedazzle('.box')
    .set('x', 100)
    .set('r', 45)
    .set('y', 100)
    .run('go', function() {
        alert('finished');
    });
```

In general though, I prefer writing as little text as possible, so the example shown below is also equivalent to the simple example above:

```js
bedazzle('.box')
    .run('x100 y100 r90 go', function() {
        alert('finished');
    });
```

In both cases, a `go` command is required to trigger the animation.

In addition to the `go` command, bedazzle also includes an `undo` command which while not complete, is designed to rollback the change, e.g:

```js
bedazzle('.box')
    .run('x100 y100 r90 go undo go', function() {
        alert('finished');
    });
```

With these features you can start to create some [reasonably interesting animations](/DamonOehlman/bedazzle/blob/master/demos/simple-stateful.html):

```js
bedazzle('.box', '', { transition: '0.5s ease-in-out'})
    .run('x100 y100 r90 scale0.5 background:green opacity:0.5 go', function() {
        this.run('x100 y-100 r-270 scale0.5 go undo go undo go', function() {
            alert('finished');
        });
    });
```

Finally, some effort has gone into making bedazzle animations [play nice with parallel animations](/DamonOehlman/bedazzle/blob/master/demos/parallel.html) (bedazzle controlled or otherwise).  More effort is required here, but things are looking reasonably good:

```
bedazzle('.fader', 'opacity0.5 go', { transition: '2s ease-in-out' });
bedazzle('.mover', 'x100 go');
bedazzle('.spinner', 'r180 go');
```

## Selectors API

Like [classtweak](/DamonOehlman/classtweak) bedazzle makes use of the selectors API to apply animations.  You can however, pass through a reference to a DOM element (or an array of elements)  as the selector string and that element will be used instead.

## Old Browser Support Roadmap

Bedazzle will strive to work on old browsers, but by work, I don't move move stuff around the screen in a lovely animated way.  My personal view is that you should be able to include bedazzle into your page and if a browser supports transitions, transforms, etc it will do everything you expect.  If not, it will fire completion callbacks as required and allow your application to continue without error.

At this stage, however, bedazzle has only been tested in Chrome but implements [Modernizr](http://modernizr.com/) style detection so conceptually will work with other browsers supporting transforms and transitions.

_No work has yet been done in this area as bedazzle is still only a Proof of Concept_