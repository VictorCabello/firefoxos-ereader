define([
    'vendor/monocle/monocore',
    'book_flipper',
    'book_reader'
], function(Monocore, BookFlipper, Reader) {

function BookViewer(containerId) {
    this.container = document.getElementById(containerId);
    this.bookContainer = this.container.getElementsByClassName('reader')[0];
    this.overlay = this.container.getElementsByClassName('overlay')[0];
    this.book = null;

    this._bindEvents();
}

BookViewer.prototype.showBook = function(book) {
    this.book = book;
    // Monocle.Reader(this.bookContainer, this.book.bookData, {
    //     // flipper: BookFlipper
    // });
    this.reader = new Reader.BookReader(this.bookContainer,
        this.book.bookData);
};

BookViewer.prototype._bindEvents = function() {
    var self = this;

    this.bookContainer.addEventListener('centralclick', function(event) {
        event.stopPropagation();
        event.preventDefault();
        console.log('waka');
        self.overlay.style.display = 'block';
    }, false);

    this.overlay.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        self.overlay.style.display = 'none';
    }, false);

    // TODO: implement actual button behavior
    var buttons = this.overlay.getElementsByTagName('button');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(event) {
            event.stopPropagation();
            event.preventDefault();
        }, false);
    }
}

return BookViewer;

});

