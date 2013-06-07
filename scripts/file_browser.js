FileBrowser = (function() {

function FileBrowser(container) {
    var self = this;

    this.files = [];
    this.loadingContainer = document.getElementById('master_overlay');

    this.bookDB = new MediaDB('sdcard', null, {
        filePattern: /\.epub$/,
        version: 1,
        directory: 'books'
    });

    this.container = container;
    this.mocked = null;

    utils.checkMediaStorage('sdcard', {
        success: function() {
            self._bindUIEvents();
            self._bindDBEvents();
            self.mocked = false;
        },
        error: function() {
            self.bookDB = null;
            self._mockStorage();
            self._bindUIEvents();
            self.mocked = true;
        }
    });
}

FileBrowser.prototype.show = function() {
    this.container.style.display = 'block';
};

FileBrowser.prototype.hide = function() {
    this.container.style.display = 'none';
};

FileBrowser.prototype.render = function() {
    var self = this;
    var list = this.container.querySelector('ul');
    var html = '';

    for (var i = 0; i < this.files.length; i++) {
        html += '<li role="option"><label>';
        html += '<input type="radio" name="option" value="'
        html += this.files[i].name + '" ';
        html += 'data-fileindex="' + i + '">';
        html += '<span>' + this.files[i].name + '</span>';
        html += '</label></li>';
    }

    list.innerHTML = html;

    var li = this.container.getElementsByTagName('input');
    for (var i = 0; i < li.length; i++) {
        li[i].addEventListener('change', function(event) {
            self._handleFileSelected(event.target);
        }, false);
    }
};

FileBrowser.prototype.fileCreated = function(file) {
    console.log('File created: ' + file.name);
    this.files.push(file);
    this.render();
};

FileBrowser.prototype.fileDeleted = function(filename) {
    console.log('File deleted: ' + filename);

    var index = 0;
    for (var i = 0; i < this.files; i++) {
        if (this.files[i].name == filename) {
            index = i;
            break;
        }
    }

    console.log('before');
    console.log(this.files);
    this.files.splice(index, 1);
    console.log('after splicing at index = ' + index);
    console.log(this.files);
    this.render();
};

FileBrowser.prototype._handleFileSelected = function(li) {
    var self = this;
    var fileIndex = parseInt(li.getAttribute('data-fileindex'), 10);

    console.log(this.files[fileIndex].name);

    this.hide();

    this._getFile(this.files[fileIndex].name,
        // on success
        function(fileBlob) {
            self.container.dispatchEvent(new CustomEvent('fileselected', {
                detail: fileBlob
            }));
        },
        // on error
        function() {
            alert("Could not load file");
        }
    );
};

FileBrowser.prototype._getFile = function(filename, callback, errcallback) {
    if (!this.bookDB) return null;

    this.bookDB.getFile(filename, callback, errcallback);
};

FileBrowser.prototype._bindUIEvents = function() {
    var self = this;

    utils.addEventListeners(this.container.querySelector('button.cancel'),
    ['tap', 'click'], function(event) {
        self.hide();
    }, false);
};

FileBrowser.prototype._bindDBEvents = function() {
    var self = this;

    // This is called when DeviceStorage becomes unavailable because the
    // sd card is removed or because it is mounted for USB mass storage
    // This may be called before onready if it is unavailable to begin with
    this.bookDB.addEventListener('unavailable', function(event) {
        var why = event.detail;
        if (why == MediaDB.NOCARD) {
            console.log('nocard');
        }
        else if (why == MediaDB.UNMOUNTED) {
            console.log('unmounted');
        }
        else {
            console.log('unavailable');
            console.log(event.detail);
        }
    }, false);

    this.bookDB.addEventListener('ready', function(event) {
        // TODO: Hide the nocard or pluggedin overlay if it is displayed
        var enumHandler = self.bookDB.enumerate('name', null, 'next',
        function(file) {
            if (file == null || enumHandler == 'complete') {
                self.render();
            }
            else {
                self.files.push(file);
            }
        });
    }, false);

    var scanning = 0;
    this.bookDB.addEventListener('scanstart', function(event) {
        scanning++;
        if (scanning == 1) {
            self._showLoading();
            console.log('scanning...');
        }
    }, false);
    this.bookDB.addEventListener('scanend', function(event) {
        scanning--;
        if (scanning == 0) {
            self._hideLoading();
            console.log('scan ended');
        }
    }, false);

    this.bookDB.addEventListener('create', function(event) {
        console.log('created');
        var filenames = event.detail;
        for (var i = 0; i < filenames.length; i++) {
            self.fileCreated(filenames[i]);
        }
    }, false);

    this.bookDB.addEventListener('deleted', function(event) {
        console.log('deleted');
        var filenames = event.detail;
        for (var i = 0; i < filenames.length; i++) {
            self.fileDeleted(filenames[i]);
        }
    }, false);
};

FileBrowser.prototype._mockStorage = function() {
    this.files = [
        {name: 'waka.epub'},
        {name: 'mass_effect.epub'},
        {name: 'El Ingenioso Hidalgo Don Quijote de la Mancha.epub'},
        {name: 'frankenstein.epub'}
    ];
    this.render();
};

FileBrowser.prototype._showLoading = function() {
    this.loadingContainer.style.display = 'block';
};

FileBrowser.prototype._hideLoading = function() {
    this.loadingContainer.style.display = 'none';
};

return FileBrowser;

}());