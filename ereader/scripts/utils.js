utils = {
    __next_objid: 1,

    objectId: function(obj) {
        if (obj==null) return null;
        if (obj.__obj_id==null) obj.__obj_id=__next_objid++;
        return obj.__obj_id;
    },

    addClass: function(node, klass) {
        if (!(klass instanceof Array)) klass = [klass];
        var classes = node.className.split(' ');
        for (var i = 0; i < klass.length; i++) {
            if (classes.indexOf(klass[i]) < 0)
                classes.push(klass[i]);
        }
        node.className = classes.join(' ');
    },

    removeClass: function(node, klass) {
        if (!(klass instanceof Array)) klass = [klass];

        var classes = node.className.split(' ');
        for (var i = 0; i < klass.length; i++) {
            if (classes.indexOf(klass[i]) >= 0) {
                classes.splice(classes.indexOf(klass[i]), 1);
            }
        }
        node.className = classes.join(' ');
    }
};