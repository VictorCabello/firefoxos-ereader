require([

],
function() {
});

function Library(container) {
    this.container = container;
    this.bookListTemplate = Hogan.compile(
    "<ul>" +
    "  {{#books}}" +
    "    <li>{{metadata.title}}</li>" +
    "  {{/books}}" +
    "</ul>")
    ;

    var jsonBooks = localStorage.getItem('books');
    this.books = (jsonBooks != undefined) ? JSON.parse(jsonBooks) : [];
}

Library.prototype.render = function() {
    this.container.innerHTML = this.bookListTemplate.render({
        books:this.books
    });
    console.log(this.books);
    console.log(this.container);
}