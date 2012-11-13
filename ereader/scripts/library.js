require([

],
function() {
});

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
}


Library.prototype.render = function() {
    var self = this;

    this.container.innerHTML = this.bookListTemplate.render({
        books:this.books
    });

    var books = this.container.getElementsByClassName('book');
    for (var i = 0; i < books.length; i++) {
        books[i].addEventListener('click', function(event) {
            document.dispatchEvent(new CustomEvent('bookselected', {
                detail: this.getAttribute('data-bookid')
            }));
        }, false);
    }
}

Library.prototype.addBook = function(book) {
    var bookInfo = book._serializeBookInfo();
    this.books.push(bookInfo);
    this.render();
}