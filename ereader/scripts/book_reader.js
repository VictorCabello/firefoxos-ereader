define([
    'vendor/hogan',
    'utils'
], function(hogan, utils) {

function Component(componentId, bookDataComponent) {
    this.id = componentId;
    this.src = bookDataComponent;
}

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
    this.components = this._loadComponents();

    this.isChangingPage = false;

    this._bindEvents();

    this.goToLocation(0);
}

BookReader.prototype.goToLocation = function(location) {
    this._loadDOM('left', '<h1>Left</h1>');
    this._loadDOM('right', '<h1>Right</h1>');
    this._loadDOM('central', this.components[3].src);
};

BookReader.prototype.nextPage = function() {
    if (this.isChangingPage) return;

    utils.addClass(this.framesContainer, 'forward');
    this.isChangingPage = true;

    var self = this;
    setTimeout(function() {
        self._rollFramesToLeft();
        utils.removeClass(self.framesContainer, 'forward');
        self.isChangingPage = false;
    }, 500);
};

BookReader.prototype.previousPage = function() {
    if (this.isChangingPage) return;

    utils.addClass(this.framesContainer, 'backwards');
    this.isChangingPage = true;

    var self = this;
    setTimeout(function() {
        self._rollFramesToRight();
        utils.removeClass(self.framesContainer, 'backwards');
        self.isChangingPage = false;
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

BookReader.prototype._loadDOM = function(frameName, src) {
    var frame = this.frames[frameName];

    frame.contentDocument.open('text/html', 'replace');
    frame.contentDocument.write(src);
    frame.contentDocument.close();
    // frame.whenDocumentReady();
};

BookReader.prototype._loadComponents = function() {
    var components = [];
    var componentKeys = this.bookData.getComponents();
    for (var i = 0; i < componentKeys.length; i++) {
        var c = new Component(
            componentKeys[i],
            this.bookData.getComponent(componentKeys[i]));
        components.push(c);
    }
    return components;
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