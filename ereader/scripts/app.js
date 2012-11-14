define([
    'importers/epub_importer',
    'library',
    'book',
    'book_viewer',
], function(EPubImporter, Library, Book, BookViewer) {

function App() {
    this.currentContainer = document.getElementById('current-page');
    this.pagesContainer = document.getElementById('pages');
    this.library = new Library(document.getElementById('book-list'));
    this.library.render();

    this.viewer = new BookViewer('page-reader');

    this._bindEvents();
}

App.prototype.switchTo = function(pageId) {
    // reattach current pages to the Pages container
    var pages = this.currentContainer.getElementsByClassName('page');
    for (var i = 0; i < pages.length++; i++) {
        this.pagesContainer.appendChild(pages[i]);
    }
    // attach target page to Current Page container
    var target = document.getElementById(pageId);
    this.currentContainer.appendChild(target);
};

App.prototype._bindEvents = function() {
    var self = this;

    // library management
    // ------------------
    document.getElementById('import_book').addEventListener('change',
    function(event) {
        self._handleFileSelect(event.target.files[0]);
    }, false);

    document.addEventListener('bookloaded', function(event) {
        var book = event.detail;
        book.save();
        self.library.addBook(book);
        self.viewer.showBook(book);
    }, false);

    document.addEventListener('bookselected', function(event) {
        var book = event.detail;
        self.switchTo('page-reader');
        self.viewer.showBook(book);
    }, false);

    // book viewer
    // -----------
    document.getElementById('back-to-library').addEventListener('click',
    function(event) {
        event.preventDefault();
        self.switchTo('page-library');
    }, true);
};

App.prototype._handleFileSelect = function(file) {
    var importer = null;

    if (file.type == 'application/epub+zip') {
        importer = new EPubImporter(document.getElementById('import'));
    }
    // TODO: add other importers here

    if (importer != null) {
        this._importBook(file, importer);
    }
    else {
        alert('File format not supported');
    }
};

App.prototype._importBook = function(file, importer) {
    var reader = new FileReader();

    reader.onloadend = function () {
        importer.parseFile(reader.result);
    };

    reader.onerror = function (event) {
        alert("An error occurred while reading the file. Error code: " +
            event.target.error.code);
    };

    reader.readAsBinaryString(file);
};

return App;

});



