define([
    'vendor/hogan',
    'utils'
], function(hogan, utils) {

function Component(index, componentId, bookDataComponent, lengthOffset,
ownLength) {
    this.index = index;
    this.id = componentId;
    this.src = bookDataComponent;
    this.lengthOffset = lengthOffset;
    this.ownLength = ownLength;
}

Component.prototype.loadToFrame = function(frameName, frame, callback) {
    // TODO: embed styles into a <style> and see if with this we don't have
    // the delay in applying those styles to the DOM
    var appendStylesheets = function(doc, sheets) {
        for (var i = 0; i < sheets.length; i++) {
            var link = doc.createElement('link');
            link.setAttribute('href', 'style/' + sheets[i]);
            link.setAttribute('type', 'text/css');
            link.setAttribute('rel', 'stylesheet');

            doc.head.appendChild(link);
        }
    }
    var frameNode = frame.node;
    frame.componentIndex = this.index;
    frameNode.contentDocument.open('text/html', 'replace');
    frameNode.contentDocument.write(this.src);
    frameNode.contentDocument.close();

    appendStylesheets(frameNode.contentDocument,
        ['ereader_content.css', 'bb/fonts.css']);

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
        if (page < 0) {
            page = self.pageCount + page;
        }

        var offset = -(page * self.pageWidth);
        doc.body.setAttribute('style',
            '-moz-transform: translateX(' + offset + 'px); ' +
            '-webkit-transform: translateX(' + offset + 'px)');
    }

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
    var self = this;
    setTimeout(function() {
        self.totalWidth = frame.contentWindow.document.body.scrollWidth;
        self.pageCount = Math.ceil(self.totalWidth / self.pageWidth);
        if (callback) callback();
        document.dispatchEvent(new CustomEvent('dimensionschanged'));
    }, 0);
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
    this.cursor = 0;

    this.components = new Array(this.bookData.getComponentCount());
    this.componentLoadQueue = [];

    this._updateComponentLengths();
    this._bindEvents();

    var self = this;
    this._loadComponent(3, function(component) {
        self.currentComponent = component;
        self.goToLocation(1);
    });
}

BookReader.prototype.goToLocation = function(location) {
    // TODO: change this
    this.currentComponent.loadToFrame('left', this.frames['left']);
    this.currentComponent.loadToFrame('central', this.frames['central']);
    this.currentComponent.loadToFrame('right', this.frames['right']);

    this.currentComponent.goToPage('left', this.frames['left'], 0);
    this.currentComponent.goToPage('central', this.frames['central'], 1);
    this.currentComponent.goToPage('right', this.frames['right'], 2);

    this._updateCursor(location);
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

    return (value < 0 && index <= 0) ||
           (value >= pageCount && index >= this.components.length - 1);
}

BookReader.prototype._changePage = function(offset) {
    var target = this.cursor + offset;
    if (this.isChangingPage || this.isInvalidCursor(target)) return;
    this.isChangingPage = true;

    var self = this;

    var flipPage = function() {
        var direction = (offset > 0) ? 'forward' : 'backwards';
        utils.addClass(self.framesContainer, direction);

        setTimeout(function() {
            if (offset > 0) {
                self._rollFramesToLeft();
            }
            else {
                self._rollFramesToRight();
            }
            utils.removeClass(self.framesContainer, direction);
            self.isChangingPage = false;
        }, 500);
    };

    this.container.addEventListener('cursorchanged', function(event) {
        flipPage();
        self.container.removeEventListener('cursorchanged', arguments.callee,
            false);
    }, false);

    this._updateCursor(target);
};

// TODO: look for a proper name for this!
BookReader.prototype._browseThroughComponents = function() {
    var index = undefined;

    // at the beginning of component -> load previous component
    if (this.cursor == 0 && this.currentComponent.index > 0) {
        index = this.currentComponent.index - 1;
    }
    // chaging to a new component (BACKWARDS)
    else if (this.cursor == -1 && this.currentComponent.index > 0) {
        this.currentComponent = this.components[
            this.currentComponent.index - 1];
        this.cursor = this.currentComponent.pageCount -1;

        // need to load previous component?
        if (this.cursor == 0) {
            index = this.currentComponent.index - 1;
        }
    }
    // at the end of component -> load next component
    else if (this.cursor >= this.currentComponent.pageCount - 1 &&
             this.currentComponent.index < this.components.length - 1) {
        index = this.currentComponent.index + 1;
    }
    // changing to a new component (FORWARD)
    else if (this.cursor >= this.currentComponent.pageCount &&
             this.currentComponent.index < this.components.length - 1) {
        this.currentComponent = this.components[
            this.currentComponent.index + 1];

        // need to load next component?
        if (this.cursor == this.currentComponent.pageCount - 1) {
            index = this.currentComponent.index + 1;
        }
    }

    return index;
}

BookReader.prototype._updateCursor = function(value) {
    // TODO: refactorize this!
    this.cursor = value;
    var self = this;

    var indexToLoad = this._browseThroughComponents();

    var handleCursorChange = function(mustLoad, component) {
        // TODO: left component
        var rightComponent = component;
        if (mustLoad) {
            var indexToLoad = component.index;
            if (indexToLoad < self.currentComponent.index) {
               rightComponent = self.components[indexToLoad];
            }
        }

        rightComponent.goToPage('right', self.frames['right'],
            self.cursor - 1);

        self.container.dispatchEvent(new CustomEvent('cursorchanged', {
            detail: {
                position: self.currentPosition(),
                mustLoad: mustLoad,
                component: component
            }
        }));
    }

    if (indexToLoad != undefined) {
        this._loadComponent(indexToLoad, function(component) {
            handleCursorChange(true, component);
        });
    }
    else {
        handleCursorChange(false, this.currentComponent);
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