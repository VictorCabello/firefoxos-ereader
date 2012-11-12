require([

],
function() {
});

function Library(container) {
    this.container = container;
    this.bookListTemplate = Hogan.compile(
    '<ul>' +
    '{{#books}}' +
    '  <li>' +
    '    <a class="book" href="#" data-bookid="{{contentKey}}">{{metadata.title}}</a>' +
    '  </li>' +
    '{{/books}}' +
    '</ul>'
    );

    var jsonBooks = localStorage.getItem('books');
    this.books = (jsonBooks != undefined) ? JSON.parse(jsonBooks) : [];
}


Library.prototype.render = function() {
    var self = this;

    this.container.innerHTML = this.bookListTemplate.render({
        books:this.books
    });

    var books = this.container.getElementsByClassName('book');
    for (var i = 0; i < books.length; i++) {
        books[i].addEventListener('click', function(event) {
            self.container.dispatchEvent(new CustomEvent('bookselected', {
                detail: this.getAttribute('data-bookId')
            }));
        });
    }
}

Library.prototype.addBook = function(book) {
    var bookInfo = book._serializeBookInfo();
    this.books.push(bookInfo);
    this.render();
}