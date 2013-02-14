Library = (function() {
function Library(container) {
    this.container = container;
    this.loadingContainer = document.getElementById('master_overlay');
    this.bookListTemplatePre =
    '<h2 class="bb-heading">Books</h2>' +
    '<ul role="tablist" class="filter" data-items="3">' +
    '   <li role="tab" data-key="access" id="order_key_access"><a href="#">By access</a></li>' +
    '   <li role="tab" data-key="title" id="order_key_title"><a href="#">By title</a></li>' +
    '   <li role="tab" data-key="author" id="order_key_author"><a href="#">By author</a></li>' +
    '</ul>' +
    '<ul class="booklist">';
    this.bookListTemplatePost = '</ul>';

    this.books = [];
    this.currentBook = null;

    this._bindBookLoaded();

    this.bookOrderKey = 'access';

    this._loadBooks();
};


Library.prototype.render = function() {
    var books = this._sortedBookList(this.bookOrderKey);

    var html = this.bookListTemplatePre;
    for (var i = 0; i < books.length; i++) {
        var book = books[i];
        html += '<li data-index="' + i + '"';
        html += ' data-title="' + book.metadata.title + '"';
        html += ' data-author="' + book.metadata.creator + '">';
        html += '<button class="action danger"><big>&times;</big></button>'
        html += '<a href="#" class="book" data-bookid="' +
            book.contentKey + '">';
        html += '<img src="images/no_cover.png">';
        html += '<dl>';
        html += '<dt><strong>' + book.metadata.title + '</strong></dt>';
        html += '<dd>' + book.metadata.creator + '</dd>';
        html += '</dl></a></li>';
    }
    html += this.bookListTemplatePost;
    this.container.innerHTML = html;

    document.getElementById('order_key_' + this.bookOrderKey).
        setAttribute('aria-selected', 'true');
    this._bindBookTabEvents();

    var bookNodes = this.container.getElementsByClassName('book');
    for (var i = 0; i < bookNodes.length; i++) {
        this._bindBookEvents(bookNodes[i]);
    }
};

Library.prototype.addBook = function(book) {
    var bookInfo = book._serializeBookInfo();
    this.books.unshift(bookInfo);
    this.render();
};

Library.prototype.removeBook = function(bookId) {
    var book = null;
    for (var i = 0; i < this.books.length; i++) {
        if (this.books[i].contentKey == bookId) {
            book = this.books.splice(i, 1)[0];
            break;
        }
    }
    if (book) {
        Book.deleteFromStorage(bookId);
        this.render();
    }
};

Library.prototype.clear = function() {
    asyncStorage.clear();
    localStorage.clear();
    this.books = [];
    this.render();
};

Library.prototype.getBookInfo = function(bookId) {
    for (var i = 0; i < this.books.length; i++) {
        if (this.books[i].contentKey == bookId) return this.books[i];
    }
    return null;
};

Library.prototype.updateBookOrderKey = function(key) {
    if (key != this.bookOrderKey) {
        this.bookOrderKey = key;
        this.render();
    }
};

Library.prototype.isBookInLibrary = function(book) {
    for (var i = 0; i < this.books.length; i++) {
        if (book.getId() == this.books[i].contentKey) {
            return true;
        }
    }
    return false;
};

Library.prototype._loadBooks = function() {
    var self = this;
    asyncStorage.getItem('books', function(jsonBooks) {
        self.books = (jsonBooks != undefined) ? JSON.parse(jsonBooks) : [];
        self.render();
        self.container.dispatchEvent(new CustomEvent('libraryloaded'), {});
    });
};

Library.prototype._bindBookTabEvents = function() {
    var self = this;

    var list = this.container.querySelector('ul.filter');
    var lis = list.getElementsByTagName('li');
    for (var i = 0; i < lis.length; i++) {
        utils.addEventListeners(lis[i], ['tap'], function(event) {
            event.preventDefault();
            event.stopPropagation();
            self.updateBookOrderKey(this.getAttribute('data-key'));
        }, false);
    }
};

Library.prototype._bindBookEvents = function(bookNode) {
    var self = this;

    (new GestureDetector(bookNode)).startDetecting();

    this._bindBookTap(bookNode);
    this._bindBookSwipe(bookNode);
};

Library.prototype._bindBookTap = function(bookNode) {
    var self = this;

    utils.addEventListeners(bookNode, ['tap'], function(event) {
        event.stopPropagation();
        console.log('HOSTIA');
        var bookId = this.getAttribute('data-bookid');

        // the book tapped is different to the current one
        if (!self.currentBook || self.currentBook.getId() != bookId) {
            var book = new Book({
                bookId: bookId
            });
            self._showLoading();
            // NOTE: creating a book from a bookID will trigger the
            // 'bookloaded' event later
        }
        else { // the book tapped is the same as the current one
            document.dispatchEvent(new CustomEvent('bookselected', {
                detail: self.currentBook
            }));
        }
    }, false);
};

Library.prototype._bindBookSwipe = function(bookNode) {
    var self = this;

    var createDialog = function(book) {
        var node = document.createElement('div');
        node.innerHTML = self._renderRemoteBookTemplate(book);
        utils.addClass(node.getElementsByTagName('form')[0], 'visible');
        self.container.appendChild(node);
        return node;
    };

    var closeDialog = function(bookNode, node) {
        self.container.removeChild(node);
        bookNode.parentNode.setAttribute('data-state', '');
    };

    var bindDialogActions = function(bookNode, node) {
        // remove
        utils.addEventListeners(node.getElementsByClassName('remove')[0],
        ['tap'], function(event) {
            event.preventDefault();
            event.stopPropagation();
            closeDialog(bookNode, node);
            self.removeBook(bookNode.getAttribute('data-bookid'));
        }, false);

        // close
        utils.addEventListeners(node.getElementsByClassName('cancel')[0],
        ['tap'], function(event) {
            event.preventDefault();
            event.stopPropagation();
            closeDialog(bookNode, node);
        }, false);
    };

    bookNode.addEventListener('swipe', function(event) {
        event.stopPropagation();
        event.preventDefault();

        var state = bookNode.parentNode.getAttribute('data-state') || '';

        if (event.detail.direction == 'left') {
            state = '';
        }
        else if (event.detail.direction == 'right' && state == '') {
            state = 'edit';
        }

        bookNode.parentNode.setAttribute('data-state', state);
    });

    // click on X to remove book (triggers confirm dialog)
    var removeButton = bookNode.parentNode.getElementsByClassName('action')[0];
    utils.addEventListeners(removeButton, ['tap'], function(event) {
        event.stopPropagation();
        event.preventDefault();
        var node = createDialog(self.getBookInfo(
            bookNode.getAttribute('data-bookid')));
        bindDialogActions(bookNode, node);
    }, false);
}

Library.prototype._bindBookLoaded = function() {
    var self = this;
    document.addEventListener('bookloaded', function(event) {
        self._hideLoading();

        var book = event.detail.book;
        if (!(event.detail.isNew && self.isBookInLibrary(book))) {
            self._updateCurrentBook(book);
            document.dispatchEvent(new CustomEvent('bookselected', {
                detail: self.currentBook
            }));
        }
    }, false);
};

Library.prototype._renderRemoteBookTemplate = function(book) {
    var html = '<form role="dialog" onsubmit="return false;">';
    html += '<section>';
    html += '<p>';
    html += '<strong>' + book.metadata.title + '</strong>';
    html += '<small>' + book.metadata.creator + '</small>';
    html += '</p>';
    html += '<p>Are you sure you want to delete this book?</p>';
    html += '</section>';
    html += '<menu>';
    html += '<button class="cancel">Cancel</button>';
    html += '<button class="danger remove" data-bookid="' +
        book.contentKey + '">Delete</button>';
    html += '</menu>';
    html += '</form>';

    return html;
};

Library.prototype._updateCurrentBook = function(book) {
    // update library book list
    var i = 0;
    for (i = 0; i < this.books.length; i++) {
        if (this.books[i].contentKey == book.getId()) {
            break;
        }
    }
    if (i < this.books.length && i > 0) {
        var bookInfo = this.books.splice(i, 1)[0];
        this.books.unshift(bookInfo);
        this.render();
    }

    // update current book and save it at the beginning of the list
    this.currentBook = book;
    book.saveInfo();
};

Library.prototype._sortedBookList = function(key) {
    var copy =  this.books.slice(0);

    if (key == 'title') {
        copy.sort(function(a, b) {
            return a.metadata.title.toLowerCase().localeCompare(
                b.metadata.title.toLowerCase());
        });
    }
    else if (key == 'author') {
        copy.sort(function(a, b) {
           return a.metadata.creator.toLowerCase().localeCompare(
               b.metadata.creator.toLowerCase());
        });
    }

    return copy;
};

Library.prototype._showLoading = function() {
    this.loadingContainer.style.display = 'block';
};

Library.prototype._hideLoading = function() {
    this.loadingContainer.style.display = 'none';
};

return Library;

}());

