function TransitionListener(el) {
    this.element = el;
    this.handlers = [];
    this.props = [];
}

TransitionListener.prototype.add = function(handler, props) {
    this.handlers.push(handler);
    this.props.push(props);
};

TransitionListener.prototype.fire = function(evt) {
    var transProp = evt.propertyName || '';
        
    for (var ii = this.handlers.length; ii--; ) {
        if (this.props[ii][transProp]) {
            // run the handler
            this.run(this.handlers[ii]);
            
            // remove the handler
            this.handlers.splice(ii, 1);
            this.props.splice(ii, 1);
        }
    }
};

TransitionListener.prototype.run = function(handler) {
    setTimeout(handler, 5);
};