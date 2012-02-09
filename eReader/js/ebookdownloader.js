"use strict";

var owd = window.owd || {};

owd.eBookDownloader = function(gutenbergId){
	
	var that = this;
	var _successCallback,
		_errorCallback,
		_metadata,
		_epub,
		_data,
		_blob,
		_cover = 'images/book.png';
			
	function saveToInternalStorage() {
		var books, book, id = getBookId(that._metadata.title);
		
		if(!localStorage.hasOwnProperty('books')) {
			books = [];
		} else {
			books = JSON.parse(localStorage.books);
		}
		
		book = that._metadata;
		book['id'] = id;
		book['cover'] = _cover;
		
		books.push(book);
		
		localStorage.books = JSON.stringify(books);
		
		var spine, href, doc, content = {};
		content.metadata = that._metadata;
		content.components = [];
		content.contents = {};
		for(var i=0; i<that._epub.opf.spine.length; i++) {
			spine = that._epub.opf.spine[i];
			content.components.push(spine);
			href = that._epub.opf.manifest[spine]["href"];
			doc = that._epub.files[href];
			content.contents[spine] = doc.getElementsByTagName('body')[0].innerHTML;			
		}
		
		localStorage[id] = JSON.stringify(content);
		content = null;
		
		that._epub = {};
	}
	
	function getCoverUrl() {
		return 'http://www.gutenberg.org/files/' + gutenbergId + '/' + gutenbergId + '-h/images/cover.jpg';
	}
		
	function fetchBinary(url) {
		var BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder; //We just need MozBlobBuilder

		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';

		xhr.onload = function(e) {
			if (this.status == 200) {
		    	var bb = new BlobBuilder();
		    	bb.append(this.response);

				try {
		    		that._blob = bb.getBlob('application/epub+zip');
				} catch (err) {
					that._errorCallback("The specified url doesn't contain an epub: " + err);
				}
		    	
				readEPub();
		  	} else {
				that._errorCallback("Error downloading file from url " + url);
		  	}
		};
		
		xhr.onerror = function() {
			that._errorCallback("Error downloading: " + url);
		}
		
		xhr.send();
	}
	
	function readEPub() {
		var reader = new FileReader();
		reader.onloadend = function () {
            that._data = reader.result;
			that._blob = {};
			parseEPub();
        };            
        reader.onerror = function (event) {
            that._errorCallback("An error occurred while reading the file. Error code: " + event.target.error.code);
        };

		reader.readAsBinaryString(that._blob);
	}

	function parseEPub() {        
		that._epub = new JSEpub(that._data);
		that._data = {};
		that._epub.processInSteps(function (step, extras) {
			if (step === 1) {
		        //Unzipping
		    } else if (step === 2) {
		        //Uncompressing extras
		    } else if (step === 3) {
		        //Reading OPF
		    } else if (step === 4) {
		        //Post processing
		    } else if (step === 5) {
		        //End
				extractMetadata();
		    } else {
				that._errorCallback("Error processing ePub: " + step);
			}

		});
	}
		
	function extractMetadata() {
		that._metadata = {};
		var extractIfExists = function(field) {
			if(undefined != that._epub.opf.metadata["dc:" + field]) {
				that._metadata[field] = that._epub.opf.metadata["dc:" + field]._text;
			}
		};
		
		var metas = ['title', 'creator', 'description', 'language'];
		for(var i in metas) {
			extractIfExists(metas[i]);
		}
		
		onSuccess();
	}
	
	function onSuccess() {
		saveToInternalStorage();
		that._successCallback(that._metadata);
	}
	
	function getBookId(title) {
		return 'book_' + title.replace(/ /g,"_").toLowerCase();
	}
	
	function checkCover() {
		checkUrl(getCoverUrl(), function(url, exists){
			if(exists) {
				_cover = url;
			}
		});
	}
	
	return {
	
		download: function(url, successCallback, errorCallback) {
			that._successCallback  = successCallback;
			that._errorCallback = errorCallback;
			
			checkCover();
			fetchBinary(url);			
		}
		
	};
	
};