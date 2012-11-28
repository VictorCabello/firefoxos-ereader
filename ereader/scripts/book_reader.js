define([
    'utils',
    'vendor/gaia/gesture_detector'
], function(utils, GestureDetector) {

function Component(index, componentId, bookDataComponent, lengthOffset,
ownLength) {
    this.index = index;
    this.id = componentId;
    this.src = bookDataComponent;
    this.lengthOffset = lengthOffset;
    this.ownLength = ownLength;
    this.puta = Math.floor(Math.random() * 10000);
}

Component.prototype.loadToFrame = function(frameName, frame, callback) {
    var src = '<html><head><style>' +
    'body { font-family: "Open Sans", Arial, sans-serif; margin: 0px; padding: 0px; width: 100%; height: 100%; -webkit-column-width: 280px;     -webkit-column-gap: 0px; -webkit-column-fill: auto; -moz-column-width: 280px;        -moz-column-gap: 0px; -moz-column-fill: auto; position: absolute; font-size: 12pt; color: #5a3120;}' +
    'body * { overflow: visible !important; word-wrap: break-word !important;        line-height: 1.25em; }' +
    'p { margin: 0px;  text-indent: 1.5em; text-align: justify;}' +
    '</style></head><body>' +
    this.src +
    '</body></html>';
    var frameNode = frame.node;
    frame.componentIndex = this.index;
    frameNode.contentDocument.open('text/html', 'replace');
    frameNode.contentDocument.write(src);
    frameNode.contentDocument.close();

    console.log('[' + frameName + '] <- ' + this.index);
    if (this.pageCount == undefined) {
        this._refreshDimensions(frameNode, callback);
    }
    else {
        if (callback) callback();
    }
};

Component.prototype.goToPage = function(frameName, frame, page) {
    var doc = frame.node.contentWindow.document;
    var self = this;

    var goTo = function() {
        if (typeof page == 'function') page = page();

        if (page < 0) {
            page = self.pageCount + page;
        }
        var offset = -(page * self.pageWidth);

        console.log('[' + frameName + '] -> ' + self.index + '#' + page + ' of ' + self.pageCount + ' (' + offset + ' px)');

        doc.body.setAttribute('style',
            '-moz-transform: translateX(' + offset + 'px); ' +
            '-webkit-transform: translateX(' + offset + 'px)');
    };

    if (frame.componentIndex != this.index) {
        this.loadToFrame(frameName, frame, function() {
            goTo();
        });
    }
    else {
       goTo();
    }
};

Component.prototype._refreshDimensions = function(frame, callback) {
    this.pageWidth = frame.offsetWidth;

    // hack for browsers changing scrollWidth when a translate is applied
    // to it
    try {
        var correction = -1 * parseFloat(/translateX\((-?\d+)px/.exec(
            frame.contentDocument.body.style.cssText)[1]);
    }
    catch (e) {
        var correction = 0;
    }

    this.totalWidth = frame.contentDocument.body.scrollWidth + correction;
    this.pageCount = Math.ceil(this.totalWidth / this.pageWidth);

    if (callback) callback();
    document.dispatchEvent(new CustomEvent('dimensionschanged'));

};

Component.prototype.currentPosition = function(cursor) {
    if (this.pageCount == undefined) return 0;
    var partialLength = this.ownLength * (cursor / this.pageCount);
    return (partialLength + this.lengthOffset);
};

// -----------------------
// Reader (the main thing)
// -----------------------

function BookReader(container, bookData, location) {
    this.container = container;
    this.bookData = bookData;
    this.gestures = new GestureDetector(this.container);

    var template =
    '<div class="reader-wrapper">' +
    '<div class="reader-page central main">' +
    '  <iframe frameborder="0" scrolling="no" style="' +
    '   width: 100%; height: 100%; -moz-user-select: none"></iframe>' +
    '</div>' +
    '<div class="reader-page other right">' +
    '  <iframe frameborder="0" scrolling="no" style="' +
    '   width: 100%; height: 100%; -moz-user-select: none"></iframe>' +
    '</div>' +
    '</div><!-- wrapper -->' +
    '<div class="reader-overlay"></a></div>'
    ;

    var overlayTemplate =
    '<a href="#" class="panel left"></a>' +
    '<a href="#" class="panel central"></a>' +
    '<a href="#" class="panel right"></a>'
    ;

    this.container.innerHTML = template;
    this.frames = this._findFrames();
    this.framesContainer = this.container.getElementsByClassName(
        'reader-wrapper')[0];
    this.overlay = this.container.getElementsByClassName('reader-overlay')[0];
    this.overlay.innerHTML = overlayTemplate;

    this.isChangingPage = false;
    this.cursor = undefined;

    this.components = new Array(this.bookData.getComponentCount());
    this.componentLoadQueue = [];

    this.controlsEnabled = true;

    this._updateComponentLengths();
    this._bindEvents();

    this.goToComponentLocation(location);
}

BookReader.prototype.enableGestures = function() {
    this.gestures.startDetecting();
    this.controlsEnabled = true;
};

BookReader.prototype.disableGestures = function() {
    this.gestures.stopDetecting();
    this.controlsEnabled = false;
};

BookReader.prototype.goToComponentLocation = function(location, callback) {
    console.log('GO TO: ');
    console.log(location);
    var self = this;
    this._loadComponent(location.componentIndex, function(component) {
        self.currentComponent = component;
        self.goToLocation(location.cursor);
        if (callback) callback();
    });
};

BookReader.prototype.goToLocation = function(loc) {
    var self = this;

    this.container.addEventListener('cursorchanged', function(event) {
        self.currentComponent.goToPage('main', self.frames['main'],
            self.cursor);
        self.container.removeEventListener('cursorchanged', arguments.callee,
            false);
    }, false);

    this.currentComponent.loadToFrame('main', this.frames['main']);
    this.currentComponent.loadToFrame('other', this.frames['other'],
        function() {
            self._updateCursor(loc);
        }
    );
};

BookReader.prototype.nextPage = function() {
    this._changePage(1);
};

BookReader.prototype.previousPage = function() {
    this._changePage(-1);
};

// 0..1
BookReader.prototype.currentPosition = function() {
    return this.currentComponent.currentPosition(this.cursor) /
        this.totalLength();
};

BookReader.prototype.totalLength = function() {
    var res = 0;
    for (var i = 0; i < this.lengths.length; i++) {
        res += this.lengths[i];
    }
    return res;
};

BookReader.prototype.isInvalidCursor = function(value) {
    var index = this.currentComponent.index;
    var pageCount = this.currentComponent.pageCount;

    var isInvalid = (value < 0 && index <= 0) ||
        (value >= pageCount && index >= this.components.length - 1);

    return isInvalid;
};

BookReader.prototype.getCurrentLocation = function() {
    return {
        componentIndex: this.currentComponent.index || 0,
        cursor: this.cursor || 0
    };
};

BookReader.prototype._changePage = function(offset) {
    var target = this.cursor + offset;
    if (this.isChangingPage || this.isInvalidCursor(target)) return;
    this.isChangingPage = true;

    var self = this;

    var flipPage = function(direction) {
        var directionClass = (direction > 0) ? 'forward' : 'backwards';
        utils.removeClass(self.frames['other'].node.parentNode,
            (direction > 0) ? 'left' : 'right');
        utils.addClass(self.frames['other'].node.parentNode,
            (direction > 0) ? 'right' : 'left');
        self.frames['other'].node.style.visibility = 'visible';

        utils.addClass(self.framesContainer, directionClass);

        setTimeout(function() {
            self.frames['main'].node.style.visibility = 'hidden';
            self._swapFrames();
            utils.removeClass(self.framesContainer, directionClass);
            self.isChangingPage = false;
        }, 400);
    };

    this.container.addEventListener('cursorchanged', function(event) {
        self.currentComponent.goToPage('other', self.frames['other'],
            self.cursor);
        flipPage(event.detail.direction);

        self.container.removeEventListener('cursorchanged', arguments.callee,
            false);
    }, false);

    this._updateCursor(target);
};

// TODO: look for a proper name for this!
BookReader.prototype._browseThroughComponents = function() {
    var indexPrev = undefined;
    var indexNext = undefined;
    var self = this;

    // at the beginning of component -> load previous component
    if (this.cursor == 0 && this.currentComponent.index > 0) {
        indexPrev = this.currentComponent.index - 1;
    }
    // chaging to a new component (BACKWARDS)
    else if (this.cursor == -1 && this.currentComponent.index > 0) {
        this.currentComponent = this.components[
            this.currentComponent.index - 1];
        if (this.currentComponent.pageCount == undefined) {
            this.currentComponent.loadToFrame('other', this.frames['other']);
        }
        this.cursor = this.currentComponent.pageCount - 1;

        // need to load previous component?
        if (this.cursor == 0) {
            indexPrev = this.currentComponent.index - 1;
        }
    }
    // changing to a new component (FORWARD)
    else if (this.cursor >= this.currentComponent.pageCount &&
             this.currentComponent.index < this.components.length - 1) {
        this.currentComponent = this.components[
            this.currentComponent.index + 1];
        this.cursor = 0;
        if (this.currentComponent.pageCount == undefined) {
            this.currentComponent.loadToFrame('other', this.frames['other']);
        }

        // need to load next component?
        if (this.cursor == this.currentComponent.pageCount - 1) {
            indexNext = this.currentComponent.index + 1;
        }
    }
    // at the end of component -> load next component
    else if (this.cursor >= this.currentComponent.pageCount - 1 &&
             this.currentComponent.index < this.components.length - 1) {
        indexNext = this.currentComponent.index + 1;
    }

    return {
        indexPrev: indexPrev,
        indexNext: indexNext
    };
}

BookReader.prototype._updateCursor = function(value) {
    // TODO: refactorize this!
    var oldCursor = this.cursor;
    this.cursor = value;
    var self = this;

    var direction = (oldCursor == undefined) ? 0 : this.cursor - oldCursor;

    var indicesToLoad = this._browseThroughComponents();

    var handleCursorChange = function(loaded, components) {
        var prevComponent = components.prev || self.currentComponent;
        var nextComponent = components.next || self.currentComponent;
        self.container.dispatchEvent(new CustomEvent('cursorchanged', {
            detail: {
                position: self.currentPosition(),
                direction: direction
            }
        }));
    }

    var indexPrev = indicesToLoad.indexPrev;
    var indexNext = indicesToLoad.indexNext;

    // load both components (for 1-page components)
    if (indexPrev != undefined && indexNext != undefined) {
        this._loadComponent(indexPrev, function(prev) {
            self._loadComponent(indexNext, function(next) {
                handleCursorChange(true, {
                    prev: prev,
                    next: next
                });
            })
        });
    }
    // load prev XOR next component
    else if (indexPrev != undefined || indexNext != undefined) {
        var index = (indexPrev != undefined) ? indexPrev : indexNext;
        this._loadComponent(index, function(component) {
            data = indexPrev ? {prev: component} : {next: component}
            handleCursorChange(true, data);
        });
    }
    // no component needed loading
    else {
        handleCursorChange(false, {});
    }
};

BookReader.prototype._updateComponentLengths = function() {
    this.lengths = [];
    var keys = this.bookData.getComponents();
    for (var i = 0; i < keys.length; i++) {
        this.lengths.push(this.bookData.getComponentLength(keys[i]));
    }
};

BookReader.prototype._swapFrames = function() {
    this.frames['main'].node.parentNode.className = 'reader-page other right';
    this.frames['other'].node.parentNode.className =
        'reader-page main central';

    var other = this.frames['other'];
    this.frames['other'] = this.frames['main'];
    this.frames['main'] = other;
};

BookReader.prototype._loadComponent = function(index, callback) {
    if (this.componentLoadQueue[index]) return;
    var self = this;
    var offset = function(index) {
        var res = 0;
        for (var i = 0; i < index; i++) {
            res += self.lengths[i];
        }
        return res;
    };

    var componentKeys = this.bookData.getComponents();
    var key = componentKeys[index]
    var lengthOffset = offset(index);

    this.componentLoadQueue[index] = true;
    this.bookData.getComponent(key, function(componentData) {
        var component = new Component(index, key, componentData, lengthOffset,
            self.lengths[index]);
        console.log("Loaded component #" + component.index);
        self._onComponentLoaded(component, callback);
    });
};

BookReader.prototype._findFrames = function() {
    var frames = {};
    var divs =  this.container.getElementsByTagName('div');
    var names = ['main', 'other'];
    for (var i = 0; i < divs.length; i++) {
        for (var j = 0; j < names.length; j++) {
            if (divs[i].classList.contains(names[j])) {
                frames[names[j]] = {
                    node: divs[i].getElementsByTagName('iframe')[0],
                    componentIndex: undefined
                };
                break;
            }
        }
    }
    return frames;
};

BookReader.prototype._bindEvents = function() {
    var self = this;

    // central click
    this.overlay.getElementsByClassName('central')[0]
    .addEventListener('tap', function(event) {
        event.stopPropagation();
        event.preventDefault();
        self.container.dispatchEvent(new CustomEvent('centralclick',
            {}));
    }, false);

   this.overlay.getElementsByClassName('right')[0].
   addEventListener('tap', function(event) {
       if (self.controlsEnabled) self.nextPage();
   });

   this.overlay.getElementsByClassName('left')[0].
   addEventListener('tap', function(event) {
       if (self.controlsEnabled) self.previousPage();
   });

   this.container.addEventListener('swipe', function(event) {
       if (event.detail.direction == 'left') {
           self.nextPage();
       }
       else {
           self.previousPage();
       }
   });
};

BookReader.prototype._onComponentLoaded = function(component, callback) {
    this.components[component.index] = component;
    this.componentLoadQueue[component.index] = false;

    if (callback) callback(component);

    this.container.dispatchEvent(new CustomEvent('componentloaded', {
        detail: component
    }));
};

return {
    BookReader: BookReader,
    Component: Component
};

});