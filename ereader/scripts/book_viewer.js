define([
    'vendor/monocle/monocore',
    'vendor/hogan',
    'book_reader',
    'book_toc',
], function(Monocore, hogan, Reader, BookToc) {

function BookViewer(containerId) {
    this.container = document.getElementById(containerId);
    this.bookContainer = this.container.getElementsByClassName('reader')[0];
    this.overlay = this.container.getElementsByClassName('overlay')[0];
    this.tocContainer = this.container.getElementsByClassName(
        'toc-container')[0];

    // this.tocContainer = this.container.getElementsByClassName('toc')[0];
    this.wrapper = this.container.getElementsByClassName('wrapper')[0];
    this.controlsEnabled = true;

    this.book = null;
    this.reader = null;
    this.toc = null;

    this._bindEvents();
}

BookViewer.prototype.showBook = function(book) {
    this.book = book;
    this.reader = new Reader.BookReader(this.bookContainer,
        this.book.bookData, this.book.lastLocation);
    if (!this.book.getContents() || this.book.getContents().length == 0) {
        // debugger;
        console.log('No TOC');
    }
    this.toc = new BookToc(this.tocContainer, this.book.getContents(),
        this.book.getComponents());

    this.reader.enableGestures();
};

BookViewer.prototype.saveLastLocation = function() {
    this.book.lastLocation = this.reader.getCurrentLocation();
    // this.book.save(true);
};

BookViewer.prototype._bindEvents = function() {
    var self = this;

    this.bookContainer.addEventListener('centralclick', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (self.controlsEnabled) {
            self._showOverlay();
        }
    }, false);

    this.overlay.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (self.controlsEnabled) {
            self._hideOverlay();
        }
    }, false);

    this.overlay.getElementsByClassName('previous')[0].
    addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (self.controlsEnabled) self.reader.previousPage();
    }, false);

    this.overlay.getElementsByClassName('next')[0].
    addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (self.controlsEnabled) self.reader.nextPage();
    }, false);

    this.bookContainer.addEventListener('cursorchanged', function(event) {
        var percentage = isNaN(event.detail.position) ? 0 :
            Math.floor(100 * event.detail.position);
        var seeker = self.overlay.getElementsByClassName('seeker')[0];
        seeker.getElementsByTagName('progress')[0].value = percentage;
    });

    // TODO: implement actual button behavior
    var buttons = this.overlay.getElementsByTagName('button');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(event) {
            event.stopPropagation();
            event.preventDefault();
        }, false);
    }

    document.getElementById('show_toc').
    addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        self._toggleTocPanel();
    }, false);

    self.tocContainer.addEventListener('tocitemselected', function(event) {
        self.reader.goToTarget(event.detail);
        self._toggleTocPanel();
        self._hideOverlay();
    }, false);
};

BookViewer.prototype._toggleTocPanel = function() {
    if (this.wrapper.getAttribute('data-state') == 'drawer') {
        var state = 'none';
        this.controlsEnabled = true;
        this.reader.enableGestures();
    }
    else {
        var state = 'drawer';
        this.controlsEnabled = false;
        this.reader.disableGestures();
    }

    this.wrapper.setAttribute('data-state', state);
};

BookViewer.prototype._hideOverlay = function() {
    this.overlay.style.display = 'none';
    this.reader.enableGestures();
};

BookViewer.prototype._showOverlay = function() {
    this.overlay.style.display = 'block';
    this.reader.disableGestures();
};

return BookViewer;

});
