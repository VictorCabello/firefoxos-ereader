define([
    'vendor/hogan',
    'utils'
], function(hogan, utils) {

function Component(componentId, bookDataComponent) {
    this.id = componentId;
    this.src = bookDataComponent;
    this.frames = {};
}

Component.prototype.loadToFrame = function(frameName, frameNode) {
    this.frames[frameName] = {
        node: frameNode,
        currentPage: 0
    };

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


    if (this.totalWidth == undefined) {
        this._refreshPageCount(frameNode);
    }
};

Component.prototype.goToPage = function(frame, page) {
    var offset = -(page * this.pageWidth);
    var doc = frame.contentWindow.document;

    this.currentPage = page;
    doc.body.setAttribute('style',
        '-moz-transform: translateX(' + offset + 'px);' +
        '-webkit-transform: translateX(' + offset + 'px)');
};

Component.prototype._refreshPageCount = function(frame) {
    this.totalWidth = frame.contentWindow.document.body.offsetWidth;
    this.pageWidth = frame.offsetWidth;
    this.pageCount = Math.ceil(this.totalWidth / this.pageWidth);
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
    this.components = {};
    this.framesContainer = this.container.getElementsByClassName(
        'reader-wrapper')[0];
    this.overlay = this.container.getElementsByClassName('reader-overlay')[0];
    this.overlay.innerHTML = overlayTemplate;

    this.isChangingPage = false;
    this.cursor = 0;

    this._bindEvents();
    this.currentComponent = this._loadComponent(3);

    this.goToLocation(0);
}

BookReader.prototype.goToLocation = function(location) {
    // TODO: change this
    this.currentComponent.loadToFrame('left', this.frames['left']);
    this.currentComponent.loadToFrame('central', this.frames['central']);
    this.currentComponent.loadToFrame('right', this.frames['right']);

    this.currentComponent.goToPage(this.frames['left'], 0);
    this.currentComponent.goToPage(this.frames['central'], 1);
    this.currentComponent.goToPage(this.frames['right'], 2);

    this._updateCursor(0);
};

BookReader.prototype._updateCursor = function(value) {
    this.cursor = value;
    this.container.dispatchEvent(new CustomEvent('cursorchanged',{
        detail: value
    }));
}

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
        self.currentComponent.goToPage(self.frames['right'], self.cursor + 1);
    }, 500);
};

BookReader.prototype.previousPage = function() {
    if (this.isChangingPage) return;

    utils.addClass(this.framesContainer, 'backwards');
    this.isChangingPage = true;

    this._updateCursor(this.cursor - 1);

    var self = this;
    setTimeout(function() {
        self._rollFramesToRight();
        utils.removeClass(self.framesContainer, 'backwards');
        self.isChangingPage = false;
        self.currentComponent.goToPage(self.frames['left'], self.cursor - 1);
    }, 500);
}

BookReader.prototype._rollFramesToLeft = function() {
    // [l][c][r] -> [c][r][l]
    this.frames['left'].parentNode.className = 'reader-page right';
    this.frames['central'].parentNode.className = 'reader-page left';
    this.frames['right'].parentNode.className = 'reader-page central';

    var left = this.frames['left'];
    this.frames['left'] = this.frames['central'];
    this.frames['central'] = this.frames['right'];
    this.frames['right'] = left;
};

BookReader.prototype._rollFramesToRight = function() {
    // [l][c][r] -> [r][l][c]
    this.frames['left'].parentNode.className = 'reader-page central';
    this.frames['central'].parentNode.className = 'reader-page right';
    this.frames['right'].parentNode.className = 'reader-page left';

    var right = this.frames['right'];
    this.frames['right'] = this.frames['central'];
    this.frames['central'] = this.frames['left'];
    this.frames['left'] = right;
};

BookReader.prototype._loadComponent = function(index) {
    var componentKeys = this.bookData.getComponents();
    var key = componentKeys[index]

    return new Component(key,this.bookData.getComponent(key));
};

BookReader.prototype._findFrames = function() {
    var frames = {};
    var divs =  this.container.getElementsByTagName('div');
    var names = ['left', 'central', 'right'];
    for (var i = 0; i < divs.length; i++) {
        for (var j = 0; j < names.length; j++) {
            if (divs[i].classList.contains(names[j])) {
                frames[names[j]] = divs[i].getElementsByTagName('iframe')[0];
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

return {
    BookReader: BookReader,
    Component: Component
};

});