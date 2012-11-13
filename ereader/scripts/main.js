require([
    'vendor/domReady',
    'app',
    ], function(domready, App) {
        domready(function() {
            var app = new App();
            app.switchTo('page-library');
        });
    }
);
