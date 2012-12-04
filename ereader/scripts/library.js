define([
    'vendor/hogan',
    'book',
    'vendor/gaia/async_storage',
    'vendor/gaia/gesture_detector',
    'utils'
], function(hogan, Book, asyncStorage, GestureDetector, utils) {

function Library(container) {
    this.container = container;
    this.bookListTemplate = Hogan.compile(
    '<h2 class="bb-heading">Books</h2>' +
    '<ul>' +
    '{{#books}}' +
    '  <li><button class="action danger"><big>&times;</big></button>' +
    '  <a href="#" class="book" data-bookid="{{contentKey}}">' +
    '    <img src="images/no_cover.png">' +
    '    <dl>' +
    '        <dt><strong>{{metadata.title}}</strong></dt>' +
    '        <dd>{{metadata.creator}}</dd>' +
    '    </dl>' +
    '  </a></li>' +
    '{{/books}}' +
    '</ul>'
    );

    this.removeBookTemplate = Hogan.compile(
    '<form role="dialog" onsubmit="return false;">' +
    '    <section>' +
    '       <p>' +
    '           <strong>{{metadata.title}}</strong>' +
    '           <small>{{metadata.creator}}</small>' +
    '       </p>' +
    '       <p>Are you sure you want to delete this book?</p>' +
    '    </section>' +
    '   <menu>' +
    '       <button class="cancel">Cancel</button>' +
    '       <button class="danger remove" data-bookid={{contentKey}}>' +
    '       Delete</button>' +
    '   </menu>' +
    '   </form>'
    );

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
    var self = this;

    this.container.innerHTML = this.bookListTemplate.render({
        books:this.books
    });

    var bookNodes = this.container.getElementsByClassName('book');
    for (var i = 0; i < bookNodes.length; i++) {
        this._bindBookEvents(bookNodes[i]);
    }
};

Library.prototype.addBook = function(book) {
    var bookInfo = book._serializeBookInfo();
    this.books.push(bookInfo);
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
}

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
    this._bindBookPan(bookNode);
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
            document.dispatchEvent(new CustomEvent('bookselected', {
                detail: self.currentBook
            }));
        }
    }, false);
};

Library.prototype._bindBookPan = function(bookNode) {
    var self = this;

    var createDialog = function(book) {
        var node = document.createElement('div');
        node.innerHTML = self.removeBookTemplate.render(book);
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

    bookNode.addEventListener('pan', function(event) {
        event.stopPropagation();
        event.preventDefault();
        bookNode.parentNode.setAttribute('data-state', 'edit');
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

return Library;

});

