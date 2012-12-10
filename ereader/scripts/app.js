define([
    'importers/epub_importer',
    'importers/preinstalled_importer',
    'library',
    'book',
    'book_viewer',
    'file_browser'
], function(EPubImporter, PreinstalledImporter, Library, Book, BookViewer,
FileBrowser) {

function App() {
    this.currentContainer = document.getElementById('current-page');
    this.pagesContainer = document.getElementById('pages');
    this.fileBrowserContainer = document.getElementById('import_overlay');
    this.loadingContainer = document.getElementById('master_overlay');

    this.library = new Library(document.getElementById('book-list'));
    this.viewer = new BookViewer('page-reader');
    this.browser = null;

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


    // TODO: refactor this method
    document.getElementById('show_import_book').addEventListener('click',
    function(event) {
        if (!self.fileBrowser) {
            self.fileBrowser = new FileBrowser(self.fileBrowserContainer);
        }
        self.fileBrowser.show();
    }, false);

    this.fileBrowserContainer.addEventListener('fileselected',
    function(event) {
        self._showLoading();
        self._handleFileSelect(event.detail);
    });

    document.getElementById('import_book').addEventListener('change',
    function(event) {
        self._handleFileSelect(event.target.files[0]);
    }, false);

    document.getElementById('frankenstein').addEventListener('click',
    function(event) {
        event.preventDefault();
        event.stopPropagation();
        var preinstaller = new PreinstalledImporter(
            document.getElementById('import'));
        preinstaller.load();
    }, false);

    document.getElementById('reset_library').addEventListener('click',
    function(event) {
        event.preventDefault();
        event.stopPropagation();
        self.library.clear();
    });

    document.addEventListener('bookimported', function(event) {
        var book = event.detail;
        book.save(function() {
            self.library.addBook(book);
        });

        self._hideLoading();
    }, false);

    document.addEventListener('bookselected', function(event) {
        self.switchTo('page-reader');
        // NOTE: we need to always redraw the book because Firefox reloads
        // the iframes when hidden and visible again... and we have no src
        // parameter, so the iframes are empty :(
        self.viewer.showBook(self.library.currentBook);
    }, false);

    // book viewer
    // -----------
    document.getElementById('back-to-library').addEventListener('click',
    function(event) {
        event.preventDefault();
        self.viewer.saveLastLocation();
        self.switchTo('page-library');
    }, true);

    // app
    // ---
    window.onbeforeunload = function(event) {
        self._onAppClose(event);
    };
};

App.prototype._handleFileSelect = function(file) {
    var importer = null;

    // TODO: find out why reading from the SD card removes file type
    //if (file.type == 'application/epub+zip' || !file.type)
    importer = new EPubImporter(document.getElementById('import'));

    // NOTE: this is the place to add other importers

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

App.prototype._onAppClose = function(event) {
    if (this.viewer) {
        this.viewer.saveLastLocation();
    }
    // TODO: implement save of last page
};

App.prototype._showLoading = function() {
    console.log('LOADING');
    this.loadingContainer.style.display = 'block';
    console.log('++++');
};

App.prototype._hideLoading = function() {
    console.log('END LOADING');
    this.loadingContainer.style.display = 'none';
    console.log('*****');
};

return App;

});



