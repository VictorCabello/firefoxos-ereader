define([
], function() {

function BookToc(container, contents, components) {
    this.contents = contents || [];
    this.components = components || [];
    this.container = container;

    this.template =
    '<ul>' +
    '{{#toc}}' +
    '  <li><a href="#" data-target="{{src}}" class="toc-link">' +
    '  {{title}}</a></li>' +
    '{{/toc}}' +
    '</ul>';

    this.render();
}

BookToc.prototype.render = function() {
    var html = '<ul>';
    for (var i = 0; i < this.contents.length; i++) {
        html += '<li><a href="#" data-target="' + this.contents[i].src +
            '" class="toc-link">' + this.contents[i].title + '</a></li>';
    }
    html += '</ul>';

    this.container.innerHTML = html;
    this._bindEvents();
};

BookToc.prototype._bindEvents = function() {
    var self = this;
    var links = this.container.getElementsByClassName('toc-link');

    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(event) {
            event.stopPropagation();
            event.preventDefault();
            var itemTarget = self._getTocItemTarget(
                this.getAttribute('data-target'));
            self.container.dispatchEvent(new CustomEvent('tocitemselected', {
                detail: itemTarget
            }));
        }, false);
    }
};

BookToc.prototype._getTocItemTarget = function(target) {
    var index = 0;
    var anchor = null;

    var matches = /(.+)#(.+)/.exec(target);
    if (matches && matches.length == 3) {
        target = matches[1];
        anchor = matches[2];
    }

    for (index = 0; index < this.components.length; index++) {
        if (this.components[index] == target) break;
    }

    if (index == this.components.length) throw ('Target not found');

    return {
        componentIndex: index,
        anchor: anchor
    };
};

return BookToc;
});