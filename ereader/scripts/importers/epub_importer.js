EPubImporter = (function() {

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
        msg = "Unzipping";
    } else if (step === 2) {
        msg = "Uncompressing " + extras;
    } else if (step === 3) {
        msg = "Reading OPF";
    } else if (step === 4) {
        msg = "Post processing";
    } else if (step === 5) {
        msg = "Finishing";
        this._onParsingDone(epub);
    }
    else {
        alert('Error loading ebook');
        // TODO: error handling here
    }

    var progress = step * 20;
    this._progressBar.value = progress;
};

EPubImporter.prototype._onParsingDone = function(epub) {
    this._loadingContainer.style.display = 'none';
    var contents = this._readContent(epub);
    var bookData = new BookData(
        this._readMetadata(epub),
        contents.components,
        epub.opf.toc,
        contents.spine
        );

    var splittedBookData = (new BookSplitter(bookData)).splitFiles();

    // NOTE: will trigger bookloaded event
    var book = new Book({bookData: splittedBookData});

    document.dispatchEvent(new CustomEvent('bookimported', {
        detail: book
    }));
};

EPubImporter.prototype._readMetadata = function(epub) {
    var keys = ['title', 'creator', 'publisher', 'language', 'identifier'];
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
};

EPubImporter.prototype._readContent = function(epub) {
    var components = {};
    var spine = [];

    for (var i = 0; i < epub.opf.spine.length; i++) {
        var key = epub.opf.spine[i];
        var href = epub.opf.manifest[key].href;
        var body = epub.files[href].getElementsByTagName('body')[0];

        components[href] = body.innerHTML;
        spine.push(href);
        // TODO: save other files in the manifest into local storage
    }

    return {components: components, spine: spine};
};

// splitter methods
// TODO: refactorise this in its own file
// ---------------------------------------

function BookSplitter(bookData) {
    this.bookData = bookData;
}

BookSplitter.prototype.splitFiles = function() {
    if (this.bookData.toc) {
        var items = this._findItemsWithAnchors();
        var groups = this._groupByHref(items);
        for (key in groups) {
            var ranges = this._sliceGroup(groups[key]);
            this._addRangesToBookData(groups[key], ranges);
        }
    }
    return this.bookData;
};

BookSplitter.prototype._addRangesToBookData = function(group, ranges) {
    var self = this;

    var addComponents = function(hrefPrefix, bookData) {
        var newIds = [];

        for (var i = 0; i < ranges.length; i++) {
            var html = (new XMLSerializer()).serializeToString(
                ranges[i].extractContents());
            var componentId = hrefPrefix + '__' + group[i].anchor;

            self.bookData.components[componentId] = html;
            newIds.push(componentId);
        }

        // remove original component
        delete self.bookData.components[hrefPrefix];

        return newIds;
    };

    var addToSpine = function(originalId, newIds) {
        var spine = self.bookData.getComponents();
        var originalIndex = spine.indexOf(originalId);

        spine.splice.apply(spine, [originalIndex, 1].concat(newIds));
        self.bookData.spine = spine;
    };

    var updateToC = function(newIds) {
        var toc = self.bookData.getContents();

        for (var i = 0; i < newIds.length; i++) {
            for (var j = 0; j < toc.length; j++) {
                if (toc[j].src.replace('#', '__') == newIds[i]) {
                    toc[j].src = newIds[i];
                }
            }
        }
        self.bookData.toc = toc;
    };

    var updateSpine = function(newIds) {
        // var spine = self.bookData.
    };

    var hrefPrefix = group[0].href;
    var newIds = addComponents(hrefPrefix);
    addToSpine(hrefPrefix, newIds);
    updateToC(newIds);
}

BookSplitter.prototype._findItemsWithAnchors = function() {
    var items = [];
    for (var i = 0; i < this.bookData.toc.length; i++) {
        var matches = /(.+)#(.+)/.exec(this.bookData.toc[i].src);
        if (matches && matches.length == 3) {
            items.push({
                href: matches[1],
                anchor: matches[2]
            });
        }
    }
    return items;
};

BookSplitter.prototype._groupByHref = function(items) {
    var groups = {};
    for (var i = 0; i < items.length; i++) {
        if (!groups[items[i].href]) {
            groups[items[i].href] = [items[i]];
        }
        else {
            groups[items[i].href].push(items[i]);
        }
    }
    // remove all groups with just 1 element
    var filtered = {};
    for (var key in groups) {
        if (groups[key].length > 1) filtered[key] = groups[key];
    }

    return filtered;
};

BookSplitter.prototype._sliceGroup = function(group) {
    var doc = document.implementation.createHTMLDocument('junk');
    doc.body.innerHTML = this.bookData.getComponent([group[0].href]);

    var ranges = [];

    for (var i = 0; i < group.length; i++) {
        var range = doc.createRange();
        var start = doc.getElementById(group[i].anchor);
        range.setStartBefore(start);
        if (i < group.length - 1) {
            range.setEndBefore(doc.getElementById(group[i + 1].anchor));
        }
        else {
            range.setEndAfter(start.parentNode.lastChild);
        }

        ranges.push(range);
    }
    return ranges;
};

return EPubImporter;

}());


