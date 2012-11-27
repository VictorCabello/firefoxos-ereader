define([
    'vendor/monocle/monocore',
    'book_flipper',
    'book_reader'
], function(Monocore, BookFlipper, Reader) {

function BookViewer(containerId) {
    this.container = document.getElementById(containerId);
    this.bookContainer = this.container.getElementsByClassName('reader')[0];
    this.overlay = this.container.getElementsByClassName('overlay')[0];
    this.tocContainer = this.container.getElementsByClassName('toc')[0];
    this.wrapper = this.container.getElementsByClassName('wrapper')[0];
    this.controlsEnabled = true;
    this.book = null;
    this.reader = null;
    this._bindEvents();
}

BookViewer.prototype.showBook = function(book) {
    this.book = book;
    this.reader = new Reader.BookReader(this.bookContainer,
        this.book.bookData, this.book.lastLocation);
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
            self.overlay.style.display = 'block';
            self.reader.disableGestures();
        }
    }, false);

    this.overlay.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (self.controlsEnabled) {
            self.overlay.style.display = 'none';
            self.reader.enableGestures();
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

        if (self.wrapper.getAttribute('data-state') == 'drawer') {
            var state = 'none';
            self.controlsEnabled = true;
            self.reader.enableGestures();
        }
        else {
            var state = 'drawer';
            self.controlsEnabled = false;
            self.reader.disableGestures();
        }

        self.wrapper.setAttribute('data-state', state);
    }, false);
}

return BookViewer;

});

