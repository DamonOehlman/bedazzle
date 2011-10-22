# Bedazzle

Bedazzle is designed as a JavaScript wrapper to CSS3 [Transforms](http://www.w3.org/TR/css3-2d-transforms/), [Transitions](http://www.w3.org/TR/css3-transitions/), etc.  It draws inspiration from the excellent [move.js](https://github.com/visionmedia/move.js) library which operates in a similar way, but bedazzle takes a slightly different approach to 
transition layering and vendor prefix detection.

## Example Usage



## Old Browser Support

Bedazzle strives to work on old browsers, but by work, I don't move move stuff around the screen in a lovely animated way.  My personal view is that you should be able to include bedazzle into your page and if a browser supports transitions, transforms, etc it will do everything you expect.  If not, it will fire completion callbacks as required and allow your application to continue without error.