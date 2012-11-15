define([], function() {
var utils = {
    addClass: function(node, klass) {
        var classes = node.className;
        node.className = classes + ' ' + klass;
    },

    removeClass: function(node, klass) {
        var classes = node.className.split(' ');
        if (classes.indexOf(klass) >= 0) {
            classes.splice(classes.indexOf(klass), 1);
            node.className = classes.join(' ');
        }
    }
};

return utils;
});