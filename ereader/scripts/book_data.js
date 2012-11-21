define([
],
function() {

function BookData(metadata, components) {
    this.metadata = metadata || {};
    this.components = components || {};
}

BookData.prototype.getComponents = function() {
    return Object.keys(this.components);
};

BookData.prototype.getComponentCount = function() {
    return Object.keys(this.components).length;
}

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
    // TODO: implement this!!!
    return [];
};

BookData.prototype.getMetaData = function(key) {
    return this.metadata[key];
};

BookData.prototype.getComponentLength = function(componentId) {
    return this.components[componentId].length;
}

return BookData;

});

