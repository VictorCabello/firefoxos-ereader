Book = (function() {

function Book(data) {
    var self = this;

    this.lastLocation = {
        componentIndex: 0,
        cursor: 0
    };

    var dispatchLoaded = function(isNew) {
        document.dispatchEvent(new CustomEvent('bookloaded', {
            detail: {
                book: self,
                isNewBook: isNew || false
            }
        }));
    };

    // new book with provided bookData
    if (data.bookData != undefined) {
        this.bookData = data.bookData;
        dispatchLoaded(true);
    }
    // load book from asyncStorage
    else {
        this._load(data.bookId, function() {
            dispatchLoaded();
        });
    }
}

Book.deleteFromStorage = function(bookId) {
    Book._deleteBookInfo(bookId, function(bookInfo) {
        // remove book contents
        for (var i = 0; i < bookInfo.spine.length; i++) {
            asyncStorage.removeItem(bookId + '__spine__' + bookInfo.spine[i]);
        }

        // remove lastLocation
        localStorage.removeItem(bookId + '__last_location');
    });
};

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

    return 'book__' + slugify(
        this.bookData.getMetaData('identifier') || this.getTitle());
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

    var removeInfoIfExists = function(bookInfo, books) {
        for (var i = 0; i < books.length; i++) {
            if (bookInfo.contentKey == books[i].contentKey) {
                books.splice(i, 1);
                break;
            }
        }
        return books;
    };

    asyncStorage.getItem('books', function(value) {
        // save metadata
        var books = !value ? [] : JSON.parse(value);
        books = removeInfoIfExists(bookInfo, books);
        books.unshift(bookInfo);
        // save content
        asyncStorage.setItem('books', JSON.stringify(books), function() {
            if (callback) callback();
        });
    });
};

Book.prototype.saveLastLocation = function(callback) {
    var key = this.getId() + '__last_location';
    localStorage.setItem(key, JSON.stringify(this.lastLocation));
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
            self.lastLocation = self._deserializeLastLocation(bookId);

            if (callback) callback();
        });
    });
};

Book.prototype._serializeBookInfo = function() {
    return {
        metadata: this.bookData.metadata,
        contentKey: this.getId(),
        spine: this.bookData.getComponents(),
        toc: this.bookData.toc,
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

Book.prototype._deserializeLastLocation = function(bookId) {
    var raw = localStorage.getItem(bookId + '__last_location');
    var location = {
        componentIndex: 0,
        cursor: 0
    };

    try {
        location = JSON.parse(raw);
    }
    catch (e) {
    }

    return location;
};

Book._deleteBookInfo = function(bookId, callback) {
    // update array with bookinfos
    var bookInfo = null;
    asyncStorage.getItem('books', function(value) {
        var books = JSON.parse(value);
        for (var i = 0; i < books.length; i++) {
            if (books[i].contentKey == bookId) {
                bookInfo = books.splice(i, 1)[0];
                break;
            }
        }
        if (callback) callback(bookInfo);
        // save content
        asyncStorage.setItem('books', JSON.stringify(books));
    });
};

return Book;

}());

