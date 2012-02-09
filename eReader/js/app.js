
/* APP */

window.onload = function() {
	current_book = "";
	var books = [];
	document.getElementById('search_button').addEventListener('click', goto_search, false);
	document.getElementById('library_button').addEventListener('click', goto_library, false);
	document.getElementById('click').addEventListener('click', search, false);
	readerElement = document.getElementById('reader');
	container = document.getElementById('container');
	close = document.getElementById('close');
	close.onclick = function(){
		hideReader();
	};
	printBooks();
	alertBox = new alertWindow();
}

function goto_library() {
	document.getElementById('search_container').setAttribute('class','transition hidden_left');
	document.getElementById('home').setAttribute('class','transition show');
}

function goto_search() {
	document.getElementById('search_container').setAttribute('class','transition show');
	document.getElementById('home').setAttribute('class','transition hidden_right');
	clearSearchResults();
}

function clear() {
	localStorage.clear();
	printBooks();
}

var printBooks = function() {
	document.getElementById("list_books").innerHTML = "";
	if(localStorage.books==undefined) {
		var script= document.createElement('script');
		script.type = 'text/javascript';
		script.src = './js/preinstalled.js';
		var head= document.getElementsByTagName('head')[0];
		head.appendChild(script);
		return;		
	}
	results = JSON.parse(localStorage.books);
	var list = document.createElement("ul");
	for(i=0;i<results.length;i++) {
		var element = results[i];
		var book = document.createElement("li");
		var bookCover = document.createElement("img");
		console.log(element.cover);
		bookCover.setAttribute("src", element['cover'] == undefined ? 'images/book.png' : element['cover']);
		bookCover.setAttribute("width", 64);
		bookCover.setAttribute("height", 64);
		book.appendChild(bookCover);
		var bookLink = document.createElement("a");
		bookLink.setAttribute("href","javascript:readBook(\""+element["id"]+"\")");
		bookLink.appendChild(document.createTextNode(element["title"]));
		book.appendChild(bookLink);
		book.setAttribute("book_id",element["id"]);
		list.appendChild(book);
	}
	document.getElementById("list_books").appendChild(list);
}


function getBooks() {
	db.getAll("ebooks", printBooks);
}

function initReader(id) {
		
		var closeElement = document.createElement("a");
		closeElement.appendChild(document.createTextNode("Library"));
		closeElement.style.pointerEvents = "all";
		closeElement.href = "javascript:hideReader()";
		container.removeChild(readerElement);
		container.appendChild(newReaderDiv());
		
		var parsed_content = JSON.parse(localStorage[id]);
		
		var bookData = {
		  getComponents: function () {
				return parsed_content["components"];
		  },
		  getContents: function () {
		    return [];
		  },
		  getComponent: function (componentId) {
		    return parsed_content["contents"][componentId];
		  },
		  getMetaData: function(key) {
		    return parsed_content["metadata"][key];
		  }
		}
		
		container.style.display = 'block';
		var placeSaver = new Monocle.Controls.PlaceSaver('reader');
		var readerOptions = {
			panel:Monocle.Panels.Marginal,
			place: placeSaver.savedPlace(),
			stylesheet: 'body { font-family: Palatino, Georgia, serif; line-height: 1.3; font-size: 11pt; color: #310; } h1, h2, h3, h4 { margin-top: 1em; margin-bottom: 2em; } .cover { text-transform: uppercase; text-align: center; } .cover h1 { letter-spacing: 0.2em; font-size: 1.7em; margin-bottom: 2em; } .cover h2 { font-size: 1em; margin-bottom: 3em; } .cover h2 span { font-size: 0.8em; display: block; font-weight: normal; } .cover h3 { font-weight: normal; font-size: 2em; } .cover p { text-transform: none; font-size: 11px; }'
		};
		document.reader = Monocle.Reader('reader',bookData, readerOptions, function() {
			close.innerHTML = "";
			close.appendChild(closeElement);
			var magnifier = new Monocle.Controls.Magnifier(document.reader);
      document.reader.addControl(magnifier);
			var scrubber = new Monocle.Controls.Scrubber(document.reader);
			document.reader.addControl(scrubber);
			document.reader.addControl(placeSaver, 'invisible');
			readerElement.style.visibility = "visible";
		});
}

function onResize() {
	window.reader.resized();
}

function newReaderDiv(){
	var div = document.createElement("div");
	div.id = "reader";
	div.style.width = "100%";
	readerElement = div;
	return div;
}

function hideReader() {
	container.style.display = 'none';
}

function readBook(id) {
		initReader(id);
		current_book = id;
		
}

function search() {
	var name = document.getElementById('search').value;
	document.getElementById('click').disabled = true;
	document.getElementById('books_container').innerHTML = 'Searching for ' + name;
	document.getElementById('books_container').innerHTML += '<ul id="books"></ul>';
	var head= document.getElementsByTagName('head')[0];
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20gutenberg%20where%20book%3D'" + name + "'%3B&format=json&diagnostics=false&env=store%3A%2F%2FNxDtaTrVncJG3ucjzRbGsp&callback=parseGoogleSearch";
	head.appendChild(script);
}

function clearSearchResults() {
	books = document.getElementById("books_container").innerHTML = "";
	document.getElementById("search").value="";
}

function findEPub(index) {
	var url = books[index].url;
	
	var ePub,ePubImages, bookId;

	bookId = url.substring(url.lastIndexOf('/') + 1);
	url = url.replace('/ebooks/', '/cache/epub/');
	
	ePub = url + "/pg" + bookId + ".epub";
	ePubImages = url + "/pg" + bookId + "-images.epub";
	
	//Try to download first the epub with images, then the plain one
	var downloader = new owd.eBookDownloader(bookId);
	
	downloader.download(ePubImages, function(metadata) { 
			alertBox.dismiss();
			printBooks();
			goto_library();
		},
		function(msg) {
			console.log("There is no ebook with images availabe, trying with the plain text epub");
			downloader.download(ePub, function(metadata){
				//alert('Book ' + metadata.title + ' downloaded');
				alertBox.dismiss();
				printBooks();
				goto_library();
			}, 
			function(msg) {
				alertBox.dismiss();
				alert('Sorry, we cannot find any book :\'(');
			});
		}
	);
	alertBox.show("Downloading book", true);
	
	
}

function checkUrl(url, callback) {
	var xmlhttp = new XMLHttpRequest();
	if(url.indexOf('?') != -1) {
		url += '&';
	} else {
		url += '?';
	}
	url += new Date().getTime();
	xmlhttp.open("HEAD", url,true);
	xmlhttp.onload = function(e) {
		if (this.status == 200) {
	    	if(xmlhttp.getResponseHeader('Content-Length') > 0) { //Not working cause ff has a problem with getResponseHeader and CORS
				callback(url, true);
			} else {
				callback(url, false);
			}
	  	} else {
			callback(url, false);
	  	}
	};

	xmlhttp.onerror = function() {
		callback(url, false);
	}
	
 	xmlhttp.send(null);
}

function parseGoogleSearch(data) {
	document.getElementById('click').disabled = false;
	if(data.query.results.books == null) {
		document.getElementById('books_container').innerHTML = "Sorry could not find it, search again";
		return;
	}
	
	if(data.query.results.books.book.hasOwnProperty('length')) { //array
		books = data.query.results.books.book;
	} else {
		//Single object
		books = [];
		books.push(data.query.results.books.book);
	}
	
	var ul = document.createElement('ul');
	ul.id = "books";
	for(var i in books) {
		if(books[i].title.indexOf('-') != -1) {
			books[i].title = books[i].title.substring(0, books[i].title.lastIndexOf('-') - 1);
		}
		ul.innerHTML += "<li><a href='#' onClick='javascript:findEPub(\"" + i + "\")'>" + books[i].title + "</a></li>";
		var books_container = document.getElementById("books_container");
		books_container.innerHTML="";
		books_container.appendChild(ul);
		 
	} 
	
	
}

var alertWindow = (function(){
	var overlay = document.getElementById('overlay');
	var overlayContent = document.getElementById('overlayContent');
	var overlayLoading = document.getElementById('overlayLoading');
	
	function setMessage(message) {
		overlayContent.innerHTML = message;
	}
	
	function setVisible(visible) {
		showEl(overlay, visible);
	}
	
	function showSpinner(visible) {
		showEl(overlayLoading, visible);
	}
	
	function showEl(el, visible) {
		el.style.visibility = visible ? "visible" : "hidden";
	}
	
	return {
		show: function(message, spinner) {
			setMessage(message);
			setVisible(true);
			showSpinner(spinner);
		},
		dismiss: function() {
			setVisible(false);
			showSpinner(false);
		}
	};
});


