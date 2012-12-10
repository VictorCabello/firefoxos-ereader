Library = (function() {
function Library(container) {
    this.container = container;
    this.bookListTemplatePre =
    '<h2 class="bb-heading">Books</h2>' +
    '<ul role="tablist" class="filter" data-items="3">' +
    '   <li role="tab" aria-selected="true"><a href="#">By access</a></li>' +
    '   <li role="tab"><a href="#">By title</a></li>' +
    '   <li role="tab"><a href="#">By author</a></li>' +
    '</ul>' +
    '<ul>';
    this.bookListTemplatePost = '</ul>';

    this.books = [];
    this.currentBook = null;

    this._bindBookLoaded();

    var self = this;
    asyncStorage.getItem('books', function(jsonBooks) {
        self.books = (jsonBooks != undefined) ? JSON.parse(jsonBooks) : [];
        self.render();
    });

};


Library.prototype.render = function() {

    var html = this.bookListTemplatePre;
    for (var i = 0; i < this.books.length; i++) {
        var book = this.books[i];
        html += '<li>';
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

Library.prototype._bindBookEvents = function(bookNode) {
    var self = this;

    (new GestureDetector(bookNode)).startDetecting();

    this._bindBookTap(bookNode);
    this._bindBookSwipe(bookNode);
};

Library.prototype._bindBookTap = function(bookNode) {
    bookNode.addEventListener('tap', function(event) {
        event.stopPropagation();
        var bookId = this.getAttribute('data-bookid');

        if (!self.currentBook || self.currentBook.getId() != bookId) {
            var book = new Book({
                bookId: bookId
            });
        }
        else {
            // save book at the beginning of the book list
            self.currentBook.saveInfo();
            // trigger event
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
        var removeButton = node.getElementsByClassName('remove')[0];
        removeButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            closeDialog(bookNode, node);
            self.removeBook(bookNode.getAttribute('data-bookid'));
        });

        var closeButton = node.getElementsByClassName('cancel')[0];
        closeButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            closeDialog(bookNode, node);
        });
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

    bookNode.parentNode.getElementsByClassName('action')[0].
    addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        var node = createDialog(self.getBookInfo(
            bookNode.getAttribute('data-bookid')));
        bindDialogActions(bookNode, node);
    });
}

Library.prototype._bindBookLoaded = function() {
    var self = this;
    document.addEventListener('bookloaded', function(event) {
        self.currentBook = event.detail;
        document.dispatchEvent(new CustomEvent('bookselected', {
            detail: self.currentBook
        }));
        // self.container.removeEventListener('bookloaded',
        //     arguments.callee, false);
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

return Library;

}());

