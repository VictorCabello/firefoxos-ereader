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

Component.prototype.show = function(frameName, frame, location) {
    var self = this;

    this.loadToFrame(frameName, frame.node, function() {
        self.goToPage(frameName, frame, location);
    });
};

Component.prototype.loadToFrame = function(frameName, frameNode, callback) {
    frameNode.contentDocument.open('text/html', 'replace');
    frameNode.contentDocument.write(this.src);
    frameNode.contentDocument.close();

    // add CSS sheets
    var link = frameNode.contentDocument.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', 'style/bb/fonts.css')
    frameNode.contentDocument.head.appendChild(link);

    link = frameNode.contentDocument.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', 'style/ereader_content.css')
    frameNode.contentDocument.head.appendChild(link);


    if (this.pageCount == undefined) {
        this._refreshDimensions(frameNode, callback);
    }
    else {
        if (callback) callback();
    }
};

Component.prototype.goToPage = function(name, frame, page) {
    var doc = frame.node.contentWindow.document;
    var oldPage = page;

    if (page < 0) {
        page = this.pageCount + page;
    }

    var offset = -(page * this.pageWidth);
    doc.body.setAttribute('style',
        '-moz-transform: translateX(' + offset + 'px); ' +
        '-webkit-transform: translateX(' + offset + 'px)');
};

Component.prototype._refreshDimensions = function(frame, callback) {
    this.pageWidth = frame.offsetWidth;
    var self = this;
    setTimeout(function() {
        self.totalWidth = frame.contentWindow.document.body.scrollWidth;
        self.pageCount = Math.ceil(self.totalWidth / self.pageWidth);
        if (callback) callback();
        document.dispatchEvent(new CustomEvent('dimensionschanged'));
    }, 200);
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

    this.components = [];
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
    this.currentComponent.loadToFrame('left', this.frames['left'].node);
    this.currentComponent.loadToFrame('central', this.frames['central'].node);
    this.currentComponent.loadToFrame('right', this.frames['right'].node);

    this.currentComponent.goToPage('left', this.frames['left'], 0);
    this.currentComponent.goToPage('central', this.frames['central'], 1);
    this.currentComponent.goToPage('right', this.frames['right'], 2);

    this._updateCursor(1);
};

BookReader.prototype.nextPage = function() {
    if (this.isChangingPage) return;

    utils.addClass(this.framesContainer, 'forward');
    this.isChangingPage = true;

    this._updateCursor(this.cursor + 1);

    var self = this;
    setTimeout(function() {
        self._rollFramesToLeft();
        utils.removeClass(self.framesContainer, 'forward');
        self.isChangingPage = false;
        self.currentComponent.goToPage('right', self.frames['right'], self.cursor + 1);
    }, 500);
};

BookReader.prototype.previousPage = function() {
    if (this.isChangingPage) return;
    this.isChangingPage = true;

    var self = this;

    var flipPage = function() {
        utils.addClass(self.framesContainer, 'backwards');

        setTimeout(function() {
            self._rollFramesToRight();
            utils.removeClass(self.framesContainer, 'backwards');
            self.isChangingPage = false;
        }, 500);
    }

    function handleCursorChange(event) {
        if (event.detail.mustLoad) {
            var index = event.detail.component.index;
            if (index < self.currentComponent.index) {
                self.components[index].show('right', self.frames['right'],
                    -1);
            }
            flipPage();
        }
        else {
            if (self.frames['right'].componentIndex != self.currentComponent.index) {
                self.currentComponent.show('right', self.frames['right'],
                    self.cursor - 1);
            }
            else {
                self.currentComponent.goToPage('right', self.frames['right'],
                    self.cursor - 1);
            }

            flipPage();
        }
        self.container.removeEventListener('cursorchanged',
            handleCursorChange, false);
    }

    this.container.addEventListener('cursorchanged', handleCursorChange,
        false);

    this._updateCursor(this.cursor - 1);
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

BookReader.prototype._updateCursor = function(value) {
    this.cursor = value;
    var self = this;

    var index = undefined;
    if (this.cursor == 0) {
        // need to load previous component
        index = this.currentComponent.index - 1;
    }
    else if (this.cursor == -1) {
        // need to change component
        this.currentComponent = this.components[this.currentComponent.index - 1];

        this.cursor = this.currentComponent.pageCount -1;
    }
    // TODO: end of chapter

    var triggerEvent = function(detail) {
        self.container.dispatchEvent(new CustomEvent('cursorchanged', {
            detail: detail
        }));
    };

    if (index != undefined) {
        this._loadComponent(index, function(component) {
            // if (self.cursor == 0) {
            //     self.cursor = component.pageCount - 1;
            // }
            // self.currentComponent = component;
            triggerEvent({
                position: self.currentPosition(),
                mustLoad: true,
                component: component
            });
        });
    }
    else {
        triggerEvent({
            position: self.currentPosition(),
            mustLoad: false
        });
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