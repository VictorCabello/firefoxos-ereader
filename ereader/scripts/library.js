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

    var self = this;
    asyncStorage.getItem('books', function(jsonBooks) {
        self.books = (jsonBooks != undefined) ? JSON.parse(jsonBooks) : [];
        self.render();
    });
};


Library.prototype.render = function() {
    var self = this;

    var bindBookLoaded = function() {
        // TODO: bind only once, and not multiple times since we can call
        // this render method n times
        document.addEventListener('bookloaded', function(event) {
            document.dispatchEvent(new CustomEvent('bookselected', {
                detail: event.detail
            }));
            self.container.removeEventListener('bookloaded',
                arguments.callee, false);
        }, false);
    };

    this.container.innerHTML = this.bookListTemplate.render({
        books:this.books
    });

    var books = this.container.getElementsByClassName('book');
    for (var i = 0; i < books.length; i++) {
        books[i].addEventListener('click', function(event) {
            var book = new Book({bookId: this.getAttribute('data-bookid')});
            bindBookLoaded();
        }, false);
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

return Library;

});

