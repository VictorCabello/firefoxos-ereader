
/* APP */

window.onload = function() {
	current_book = "";
	readerElement = document.getElementById('reader');
	container = document.getElementById('container');
	close = document.getElementById('close');
	close.onclick = function(){
		hideReader();
	};
	printBooks();
}


var printBooks = function() {
	if(localStorage.books==undefined) {
		return;
	}
	results = JSON.parse(localStorage.books);
	var list = document.createElement("ul");
	for(i=0;i<results.length;i++) {
		var element = results[i];
		var book = document.createElement("li");
		var bookLink = document.createElement("a");
		bookLink.setAttribute("href","javascript:readBook('"+element["title"].replace(" ","_").toLowerCase()+"')");
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

function initReader(content) {
		
		var closeElement = document.createElement("a");
		closeElement.appendChild(document.createTextNode("X"));
		closeElement.style.position = "absolute";
		closeElement.style.zIndex = "110";
		closeElement.style.pointerEvents = "all";
		closeElement.style.margin = "8px";
		closeElement.href = "javascript:hideReader()";
		container.removeChild(readerElement);
		container.appendChild(newReaderDiv());
		readerElement.innerHTML = content;
		container.style.display = 'block';
		var placeSaver = new Monocle.Controls.PlaceSaver('reader');
		var readerOptions = {
		panel:Monocle.Panels.Marginal,
		place: placeSaver.savedPlace(),
		stylesheet: 'body { font-family: Palatino, Georgia, serif; line-height: 1.3; font-size: 11pt; color: #310; } h1, h2, h3, h4 { margin-top: 1em; margin-bottom: 2em; } .cover { text-transform: uppercase; text-align: center; } .cover h1 { letter-spacing: 0.2em; font-size: 1.7em; margin-bottom: 2em; } .cover h2 { font-size: 1em; margin-bottom: 3em; } .cover h2 span { font-size: 0.8em; display: block; font-weight: normal; } .cover h3 { font-weight: normal; font-size: 2em; } .cover p { text-transform: none; font-size: 11px; }'
		};
		document.reader = Monocle.Reader('reader',null, readerOptions, function() {
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
		initReader(localStorage[id]);
		current_book = id;
		
}


