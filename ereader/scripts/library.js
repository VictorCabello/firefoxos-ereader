define([
    'vendor/hogan',
    'book'
], function(hogan, Book) {

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

    var jsonBooks = localStorage.getItem('books');
    this.books = (jsonBooks != undefined) ? JSON.parse(jsonBooks) : [];
};


Library.prototype.render = function() {
    var self = this;

    this.container.innerHTML = this.bookListTemplate.render({
        books:this.books
    });

    var books = this.container.getElementsByClassName('book');
    for (var i = 0; i < books.length; i++) {
        books[i].addEventListener('click', function(event) {
            var book = new Book({bookId: this.getAttribute('data-bookid')});

            document.dispatchEvent(new CustomEvent('bookselected', {
                detail: book
            }));
        }, false);
    }
};

Library.prototype.addBook = function(book) {
    var bookInfo = book._serializeBookInfo();
    this.books.push(bookInfo);
    this.render();
};

return Library;

});

