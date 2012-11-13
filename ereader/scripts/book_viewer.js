define([
    'vendor/monocle/monocore'
], function(Monocore) {

function BookViewer(containerId) {
    this.container = document.getElementById(containerId);
    this.book = null;
}

BookViewer.prototype.showBook = function(book) {
    this.book = book;
    Monocle.Reader(this.container, this.book.bookData);
};

return BookViewer;

});

