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

BookData.prototype.getComponent = function(componentId) {
    return this.components[componentId];
};

BookData.prototype.getContents = function() {
    return []; // TODO
};

BookData.prototype.getMetaData = function(key) {
    return this.metadata[key];
};

return BookData;

});

