require([
    'vendor/monocle/monocore',
    'vendor/domReady',
    'importers/epub_importer',
    ], function(monocore, domready, epubImporter) {
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
    document.getElementById('import_book').addEventListener('change',
        handleFileSelect, false);

    document.addEventListener('bookloaded', function(event) {
        var bookData = event.detail;
        Monocle.Reader('reader', bookData);
    }, false);
}