define([
],
function() {

function BookData(metadata, components, toc, spine) {
    this.metadata = metadata || {};
    this.components = components || {};
    this.toc = toc || [];
    this.spine = spine || Object.keys(components);
}

BookData.prototype.getComponents = function() {
    return this.spine;
};

BookData.prototype.getComponentCount = function() {
    return this.spine.length;
};

BookData.prototype.getComponent = function(componentId, callback) {
    var self = this;

    var _loadComponent = function(componentId) {
        // TODO: make component loading asynchronously
        return self.components[componentId];
    }

    if (callback) {
        callback(_loadComponent(componentId));
    }
    else {
        return _loadComponent(componentId);
    }
};

BookData.prototype.getContents = function() {
    return this.toc;
};

BookData.prototype.getMetaData = function(key) {
    return this.metadata[key];
};

BookData.prototype.getComponentLength = function(componentId) {
    return this.components[componentId].length;
};

return BookData;

});
