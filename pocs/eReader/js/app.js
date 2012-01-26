
/* APP */

window.onload = function() {
	current_book = "";
	readerElement = document.getElementById('reader');
	container = document.getElementById('container');
	close = document.getElementById('close');
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
		closeElement.style.zIndex = "101";
		closeElement.pointerEvents = "all";
		closeElement.href = "javascript:hideReader()";
		container.removeChild(readerElement);
		container.appendChild(newReaderDiv());
		readerElement.innerHTML = content;
		container.style.display = 'block';
		document.reader = Monocle.Reader('reader',null, {}, function() {
			close.innerHTML = "";
			close.appendChild(closeElement);
			readerElement.style.visibility = "visible";
		});
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
	if(current_book == id) {
		container.style.display = 'block';
	}else{
		initReader(localStorage[id]);
		current_book = id;
	}
}


