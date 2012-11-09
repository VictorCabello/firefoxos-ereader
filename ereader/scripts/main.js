require([
    'vendor/monocle/monocore',
    'vendor/domReady',
    'vendor/hogan',
    'importers/epub_importer',
    'library',
    'book',
    ], function(monocore, domready, hogan, epubImporter, library, book) {
        domready(function() {
            init();
        });
    }
);

function handleFileSelect(event) {
    var file = event.target.files[0];
    var importer = null;

    if (file.type == 'application/epub+zip') {
        importer = new EPubImporter(document.getElementById('import'));
    }

    if (importer != null) {
        importBook(file, importer);
    }
    else {
        alert('File format not supported');
    }
}

function importBook(file, importer) {
    var reader = new FileReader();

    reader.onloadend = function () {
        importer.parseFile(reader.result);
    };

    reader.onerror = function (event) {
        alert("An error occurred while reading the file. Error code: " +
            event.target.error.code);
    };

    reader.readAsBinaryString(file);
}

function init() {
    library = new Library(document.getElementById('library'));
    library.render();

    document.getElementById('import_book').addEventListener('change',
        handleFileSelect, false);

    document.addEventListener('bookloaded', function(event) {
        var book = new Book(event.detail);
        book.save();
        Monocle.Reader('reader', book.bookData);
    }, false);
}