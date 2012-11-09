require([
    'vendor/js-epub/vendor/js-unzip/js-unzip',
    'vendor/js-epub/vendor/js-inflate/js-inflate',
    'vendor/js-epub/js-epub',
],
function(unzip, inflate, epubReader) {

});

// ------------------------------------------
// ePub bookData object (to use with monocle)
// ------------------------------------------

function EPubBookData() {
    this.metadata = {};
    this.components = {};
}

EPubBookData.prototype.getComponents = function() {
    return Object.keys(this.components);
};

EPubBookData.prototype.getComponent = function(componentId) {
    return this.components[componentId];
};

EPubBookData.prototype.getContents = function() {
    return [];
};

EPubBookData.prototype.getMetaData = function(key) {
    return this.metadata[key];
};


// -------------
// ePub Importer
// -------------

function EPubImporter(container) {
    this._container = container;
    this._loadingContainer =  this._container.
        getElementsByClassName('loading')[0];
    this._progressBar = this._container.getElementsByTagName('progress')[0];
}

EPubImporter.prototype.parseFile = function(blob) {
    var self = this;

    this._progressBar.value = 0;
    this._loadingContainer.style.display = 'block';

    var epub = new JSEpub(blob);
    epub.processInSteps(function(step, extras) {
        self._processCallback(step, extras, epub)
    });
};

EPubImporter.prototype._processCallback = function(step, extras, epub) {
    var msg;

    if (step === 1) {
        // msg = "Unzipping";
    } else if (step === 2) {
        // msg = "Uncompressing " + extras;
    } else if (step === 3) {
        // msg = "Reading OPF";
    } else if (step === 4) {
        // msg = "Post processing";
    } else if (step === 5) {
        // msg = "Finishing";
        this._onParsingDone(epub);
    }
    else {
        alert('Erorr loading ebook');
        // TODO: error handling here
    }

    var progress = step * 20;
    this._progressBar.value = progress;
};

EPubImporter.prototype._onParsingDone = function(epub) {
    this._loadingContainer.style.display = 'none';

    var bookData = new EPubBookData();
    bookData.metadata = this._readMetadata(epub);
    bookData.components = this._readContent(epub);

    document.dispatchEvent(new CustomEvent('bookloaded', {
        detail: bookData
    }));
};

EPubImporter.prototype._readMetadata = function(epub) {
    var keys = ['title', 'creator', 'publisher', 'language'];
    var metadata = {};

    for (var i = 0; i < keys.length; i++) {
        var value = epub.opf.metadata["dc:" + keys[i]];
        if (value != undefined) { // some keys might not be present
			metadata[keys[i]] = value._text;
		}
	}

	document.dispatchEvent(new CustomEvent('bookmetaloaded', {
	    detail: metadata
	}));

	return metadata;
}

EPubImporter.prototype._readContent = function(epub) {
    var components = {};

    for (var i = 0; i < epub.opf.spine.length; i++) {
        var key = epub.opf.spine[i];
        var href = epub.opf.manifest[key].href;
        if (epub.files[href].body != undefined) {
            components[key] = epub.files[href].body.innerHTML;
        }
        // TODO: save other files in the manifest into local storage
    }

    return components;
};