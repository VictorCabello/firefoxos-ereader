define([
    'book_data',
    'vendor/gaia/async_storage'
], function(BookData, asyncStorage) {

function Book(data) {
    var self = this;

    this.lastLocation = {
        componentIndex: 0,
        cursor: 0
    };

    var dispatchLoaded = function() {
        document.dispatchEvent(new CustomEvent('bookloaded', {
            detail: self
        }));
    };

    // new book with provided bookData
    if (data.bookData != undefined) {
        this.bookData = data.bookData;
        dispatchLoaded();
    }
    // load book from asyncStorage
    else {
        this._load(data.bookId, function() {
            dispatchLoaded();
        });
    }
}

Book.prototype.isEqualTo = function(other) {
    try {
        return this.getId() == other.getId();
    }
    catch (e) {
        return false;
    }
};

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

Book.prototype.getContents = function() {
    return this.bookData.getContents();
};

Book.prototype.getComponents = function() {
    return this.bookData.getComponents();
};

Book.prototype.saveInfo = function(callback) {
    var self = this;
    var bookInfo = self._serializeBookInfo();

    asyncStorage.getItem('books', function(value) {
        // save metadata
        var books = !value ? [] : JSON.parse(value);
        books.push(bookInfo);
        // save content
        asyncStorage.setItem('books', JSON.stringify(books), function() {
            if (callback) callback();
        });
    });
};

Book.prototype.save = function(callback) {
    var self = this;
    var content = self._serializeContent();

    var savedCount = 0;
    var saveContent = function(key) {
        var storageKey = self.getId() + '__spine__' + key;
        asyncStorage.setItem(storageKey, content[key], function() {
            savedCount++;
            if (savedCount == self.bookData.getComponentCount()) {
                if (callback) callback();
                document.dispatchEvent(new CustomEvent('booksaved', {
                    detail: self
                }));
            }
        });
    };

    this.saveInfo(function() {
        for (var key in content) {
            saveContent(key);
        }
    });
};

Book.prototype._load = function(bookId, callback) {
    var self = this;
    this._deserializeBookInfo(bookId, function(bookInfo) {
        self._deserializeContent(bookId, bookInfo.spine, function(content) {
            self.bookData = new BookData(bookInfo.metadata, content,
                bookInfo.toc);
            if (callback) callback();
        });
    });
};


Book.prototype._serializeBookInfo = function() {
    return {
        metadata: this.bookData.metadata,
        contentKey: this.getId(),
        spine: this.bookData.getComponents(),
        toc: this.bookData.toc
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

Book.prototype._deserializeBookInfo = function(bookId, callback) {
    asyncStorage.getItem('books', function(value) {
        var books = (!value) ? [] :JSON.parse(value);
        var bookInfo = null;

        for (var i = 0; i < books.length; i++) {
            if (books[i].contentKey == bookId) {
                bookInfo = books[i];
                break;
            }
        }
        if (!bookInfo) throw ('Book not found');
        if (callback) callback(bookInfo);
    });
};

Book.prototype._deserializeContent = function(bookId, spine, callback) {
    var components = {};
    var loadedCount = 0;

    var loadContent = function(index, storedKey) {
        asyncStorage.getItem(storedKey, function(content) {
            if (content) {
                components[spine[index]] = content;
                loadedCount++;
                if (loadedCount == spine.length) {
                    if (callback) callback(components);
                }
            }
            else {
                throw('Book content not found');
            }
        });
    };

    for (var i = 0; i < spine.length; i++) {
        var storedKey = bookId + '__spine__' + spine[i];
        loadContent(i, storedKey);
    }
};

return Book;

});

