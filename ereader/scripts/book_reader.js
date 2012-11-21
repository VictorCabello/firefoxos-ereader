define([
    'vendor/hogan',
    'utils'
], function(hogan, utils) {

var __next_objid=1;
function objectId(obj) {
    if (obj==null) return null;
    if (obj.__obj_id==null) obj.__obj_id=__next_objid++;
    return obj.__obj_id;
}

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
    'body { font-family: "Open Sans", Arial, sans-serif; margin: 0px; padding: 0px; width: 100%; height: 100%; -webkit-column-width: 280px;     -webkit-column-gap: 0px; -webkit-column-fill: auto; -moz-column-width: 280px;        -moz-column-gap: 0px; -moz-column-fill: auto; position: absolute; font-size: 12pt; color: #5a3120; }' +
    'body * { overflow: visible !important; word-wrap: break-word !important;        line-height: 1.25em; }' +
    'p { margin: 0px;  text-indent: 1.5em; }' +
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

function BookReader(container, bookData) {
    this.container = container;
    this.bookData = bookData;

    var template =
    '<div class="reader-wrapper">' +
    '<div class="reader-page left">' +
    '  <iframe frameborder="0" scrolling="no" style="' +
    '   width: 100%; height: 100%; -moz-user-select: none"></iframe>' +
    '</div>' +
    '<div class="reader-page central">' +
    '  <iframe frameborder="0" scrolling="no" style="' +
    '   width: 100%; height: 100%; -moz-user-select: none"></iframe>' +
    '</div>' +
    '<div class="reader-page right">' +
    '  <iframe frameborder="0" scrolling="no" style="' +
    '   width: 100%; height: 100%; -moz-user-select: none"></iframe>' +
    '</div>' +
    '</div><!-- overlay -->' +
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

    this._updateComponentLengths();
    this._bindEvents();

    var self = this;
    this._loadComponent(0, function(component) {
        self.currentComponent = component;
        self.goToLocation(0);
    });
}

BookReader.prototype.goToLocation = function(loc) {
    // TODO: change this

    var self = this;
    this.currentComponent.loadToFrame('left', this.frames['left']);
    this.currentComponent.loadToFrame('right', this.frames['right']);
    this.currentComponent.loadToFrame('central', this.frames['central'],
    function() {
        self._updateCursor(loc);
    });
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
}

BookReader.prototype._changePage = function(offset) {
    var target = this.cursor + offset;
    if (this.isChangingPage || this.isInvalidCursor(target)) return;
    this.isChangingPage = true;

    var self = this;


    var flipPage = function(direction) {
        var directionClass = (direction > 0) ? 'forward' : 'backwards';
        utils.addClass(self.framesContainer, directionClass);

        setTimeout(function() {
            if (offset > 0) {
                self._rollFramesToLeft();
            }
            else {
                self._rollFramesToRight();
            }
            utils.removeClass(self.framesContainer, directionClass);
            self.isChangingPage = false;
            self.container.dispatchEvent(new CustomEvent('pageflipped', {
                detail: direction
            }));
        }, 500);
    };

    this.container.addEventListener('cursorchanged', function(event) {
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
            this.currentComponent.loadToFrame('left', this.frames['left']);
        }
        this.cursor = this.currentComponent.pageCount -1;

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

        // need to prepare the 3rd frame to display the correct page
        if (direction > 0) { // FORWARD [l][c][r] -> [c][r][l]
            var offset = (self.cursor + 1) % self.currentComponent.pageCount;
            nextComponent.goToPage('left', self.frames['left'],
                offset);
        }
        else if (direction < 0){ // BACKWARDS [l][c][r] -> [r][l][c]
            prevComponent.goToPage('right', self.frames['right'],
                self.cursor - 1);
        }
        else { // no direction => it's a jump
            self.currentComponent.goToPage('central', self.frames['central'],
                self.cursor);
            prevComponent.goToPage('left', self.frames['left'],
                self.cursor - 1);
            var offset = (self.cursor + 1) % self.currentComponent.pageCount;
            nextComponent.goToPage('right', self.frames['right'], offset);
        }

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


BookReader.prototype._rollFramesToLeft = function() {
    // [l][c][r] -> [c][r][l]
    this.frames['left'].node.parentNode.className = 'reader-page right';
    this.frames['central'].node.parentNode.className = 'reader-page left';
    this.frames['right'].node.parentNode.className = 'reader-page central';

    var left = this.frames['left'];
    this.frames['left'] = this.frames['central'];
    this.frames['central'] = this.frames['right'];
    this.frames['right'] = left;
};

BookReader.prototype._rollFramesToRight = function() {
    // [l][c][r] -> [r][l][c]
    this.frames['left'].node.parentNode.className = 'reader-page central';
    this.frames['central'].node.parentNode.className = 'reader-page right';
    this.frames['right'].node.parentNode.className = 'reader-page left';

    var right = this.frames['right'];
    this.frames['right'] = this.frames['central'];
    this.frames['central'] = this.frames['left'];
    this.frames['left'] = right;
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
        self._onComponentLoaded(component, callback);
    });
};

BookReader.prototype._findFrames = function() {
    var frames = {};
    var divs =  this.container.getElementsByTagName('div');
    var names = ['left', 'central', 'right'];
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
    self.overlay.getElementsByClassName('central')[0]
    .addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        self.container.dispatchEvent(new CustomEvent('centralclick',
            {}));
    }, false);

   self.overlay.getElementsByClassName('right')[0].
   addEventListener('click', function(event) {
       self.nextPage();
   });

   self.overlay.getElementsByClassName('left')[0].
   addEventListener('click', function(event) {
       self.previousPage();
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