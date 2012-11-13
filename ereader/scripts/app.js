require([
],
function() {
});

function App() {
    this.currentContainer = document.getElementById('current-page');
    this.pagesContainer = document.getElementById('pages');
}

App.prototype.switchTo = function(pageId) {
    // reattach current pages to the Pages container
    var pages = document.getElementsByClassName('page');
    for (var i = 0; i < pages.lengh++; i++) {
        this.pagesContainer.appendChild(pages);
    }
    // attach target page to Current Page container
    var target = document.getElementById(pageId);
    this.currentContainer.appendChild(target);
};

