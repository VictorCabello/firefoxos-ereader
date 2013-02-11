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
    },

    addEventListeners: function(node, events, callback, capture) {
        try{
            events.forEach(function(eventName) {
                node.addEventListener(eventName, callback, capture);
            });
        }
        catch (e) {
            debugger;
        }
    },

    checkMediaStorage: function(mediaType, callbacks) {
        if (!callbacks) callbacks = {};
        mediaStorage = navigator.getDeviceStorage(mediaType);
        if (!mediaStorage) {
            if (callbacks.error) callbacks.error();
        }
        else {
            if (callbacks.success) callbacks.success();
        }
    }
};
