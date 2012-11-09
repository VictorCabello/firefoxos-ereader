require([
],
function() {
});

function Book(bookData) {
    this.bookData = bookData;
    console.log(this.bookData);
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
}

Book.prototype.getAuthor = function() {
    return this.bookData.getMetaData('author') || 'Unknown';
}

Book.prototype.save = function() {
    // save metadata
    var books = (!localStorage.getItem('books')) ? [] :
        JSON.parse(localStorage.getItem('books'));
    books.push(this._serializeMetaData());
    localStorage.setItem('books', JSON.stringify(books));

    // save content
    var content = this._serializeContent();
    console.log(content);
    for (var key in content) {
        localStorage.setItem(this.getId() + '__spine__' + key, content[key]);
    }
}

Book.prototype._serializeMetaData = function() {
    return {
        metadata: this.bookData.metadata,
        contentKey: this.getId()
    };
}

Book.prototype._serializeContent = function() {
    var content = {};

    var components = this.bookData.getComponents();
    for (var i = 0; i < components.length; i++) {
        content[components[i]] = this.bookData.getComponent(components[i]);
    }

    return content;
}

