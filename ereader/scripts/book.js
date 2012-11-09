require([
],
function() {
});

function Book(bookData) {
    this.bookData = bookData;
}

Book.prototype.getId = function() {
    var bookId = null;

    var title = this.bookData.getMetadata('title');
    if (title != undefined) {
        bookId = 'book_' + title.replace(/ /g, '_').
                                 replace(/[^\w_]+/g,'').
                                 toLowerCase();
    }

    return bookId;
}