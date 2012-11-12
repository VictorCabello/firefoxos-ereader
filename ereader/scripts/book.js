require([
],
function() {
});

function Book(data) {
    // new book with provided bookData
    if (data.bookData != undefined) {
        this.bookData = data.bookData;
    }
    // load book from LocalStorage
    else {
        this._load(data.bookId);
    }
}

Book.prototype.getId = function() {
    var slugify = function(text) {
        // TODO: what happens with books with no metadata?
        return text.replace(/ /g, '-').replace(/[^\w-]+/g, '').toLowerCase();
    }

    return 'book__' + slugify(this.getTitle());
};

Book.prototype.getTitle = function() {
    return this.bookData.getMetaData('title') || 'Untitled';
};

Book.prototype.getAuthor = function() {
    return this.bookData.getMetaData('author') || 'Unknown';
};

Book.prototype.save = function() {
    // save metadata
    var books = (!localStorage.getItem('books')) ? [] :
        JSON.parse(localStorage.getItem('books'));
    books.push(this._serializeBookInfo());
    localStorage.setItem('books', JSON.stringify(books));

    // save content
    var content = this._serializeContent();
    for (var key in content) {
        localStorage.setItem(this.getId() + '__spine__' + key, content[key]);
    }
};

Book.prototype._load = function(bookId) {
    var bookInfo = this._deserializeBookInfo(bookId);
    var content = this._deserializeContent(bookId, bookInfo.spine);

    this.bookData = new BookData(bookInfo.metadata, content);
};


Book.prototype._serializeBookInfo = function() {
    return {
        metadata: this.bookData.metadata,
        contentKey: this.getId(),
        spine: this.bookData.getComponents()
    };
};

Book.prototype._serializeContent = function() {
    var content = {};

    var components = this.bookData.getComponents();
    for (var i = 0; i < components.length; i++) {
        content[components[i]] = this.bookData.getComponent(components[i]);
    }

    return content;
};

Book.prototype._deserializeBookInfo = function(bookId) {
    var books = (!localStorage.getItem('books')) ? [] :
        JSON.parse(localStorage.getItem('books'));
    var bookInfo = null;

    for (var i = 0; i < books.length; i++) {
        if (books[i].contentKey == bookId) {
            bookInfo = books[i];
            break;
        }
    }

    if (!bookInfo) throw ('Book not found');

    return bookInfo;
};

Book.prototype._deserializeContent = function(bookId, spine) {
    var components = {};

    for (var i = 0; i < spine.length; i++) {
        var content = localStorage.getItem(bookId + '__spine__' + spine[i]);
        if (content) {
            components[spine[i]] = content;
        }
        else {
            throw ('Book content not found');
        }
    }

    return components;
};