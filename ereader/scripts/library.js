define([
    'vendor/hogan',
    'book',
    'vendor/gaia/async_storage'
], function(hogan, Book, asyncStorage) {

function Library(container) {
    this.container = container;
    this.bookListTemplate = Hogan.compile(
    '<h2 class="bb-heading">Books</h2>' +
    '<ul>' +
    '{{#books}}' +
    '  <li><a href="#" class="book" data-bookid="{{contentKey}}">' +
    '    <img src="images/no_cover.png">' +
    '    <dl>' +
    '        <dt><strong>{{metadata.title}}</strong></dt>' +
    '        <dd>{{metadata.creator}}</dd>' +
    '    </dl>' +
    '  </a></li>' +
    '{{/books}}' +
    '</ul>'
    );

    this.books = [];
    this.currentBook = null;

    this._bindBookLoaded();

    var self = this;
    asyncStorage.getItem('books', function(jsonBooks) {
        self.books = (jsonBooks != undefined) ? JSON.parse(jsonBooks) : [];
        self.render();
    });

};


Library.prototype.render = function() {
    var self = this;

    this.container.innerHTML = this.bookListTemplate.render({
        books:this.books
    });

    var bookNodes = this.container.getElementsByClassName('book');
    for (var i = 0; i < bookNodes.length; i++) {
        this._bindBookEvents(bookNodes[i]);
    }
};

Library.prototype.addBook = function(book) {
    var bookInfo = book._serializeBookInfo();
    this.books.push(bookInfo);
    this.render();
};

Library.prototype.clear = function() {
    asyncStorage.clear();
    this.books = [];
    this.render();
};

Library.prototype._bindBookEvents = function(bookNode) {
    var self = this;

    bookNode.addEventListener('click', function(event) {
        var bookId = this.getAttribute('data-bookid');

        if (!self.currentBook || self.currentBook.getId() != bookId) {
            var book = new Book({
                bookId: bookId
            });
        }
        else {
            document.dispatchEvent(new CustomEvent('bookselected', {
                detail: self.currentBook
            }));
        }
    }, false);
};

Library.prototype._bindBookLoaded = function() {
    var self = this;
    document.addEventListener('bookloaded', function(event) {
        self.currentBook = event.detail;
        document.dispatchEvent(new CustomEvent('bookselected', {
            detail: self.currentBook
        }));
        // self.container.removeEventListener('bookloaded',
        //     arguments.callee, false);
    }, false);
};

return Library;

});

