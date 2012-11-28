define([
    'vendor/hogan'
], function(hogan) {

function BookToc(container, contents) {
    this.contents = contents || [];
    this.container = container;

    this.template = Hogan.compile(
    '<ul>' +
    '{{#toc}}' +
    '  <li><a href="#" data-target="{{src}}" class="toc-link">' +
    '  {{title}}</a></li>' +
    '{{/toc}}' +
    '</ul>'
    );

    this.render();
}

BookToc.prototype.render = function() {
    this.container.innerHTML = this.template.render({toc: this.contents});
    this._bindEvents();
};

BookToc.prototype._bindEvents = function() {
    var self = this;
    var links = this.container.getElementsByClassName('toc-link');

    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(event) {
            event.stopPropagation();
            event.preventDefault();
            self.container.dispatchEvent(new CustomEvent('tocitemselected', {
                detail: self._getLocation(this.getAttribute('data-target'))
            }));
        }, false);
    }
};

BookToc.prototype._getLocation = function(target) {
    var index = 0;
    for (index = 0; index < this.contents.length; index++) {
        if (this.contents[index].src == target) break;
    }
    if (index == this.contents.length) throw ('Target not found');

    return {
        componentIndex: index,
        cursor: 0
    };
};

return BookToc;
});