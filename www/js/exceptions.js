angular.module('exceptionOverride', []).factory('$exceptionHandler', function(Logger) {
    return function(exception, cause) {
        console.error(exception);
        Logger.error(exception);
        if (window.location.hostname && window.location.hostname.indexOf('192.168') !== -1) {
            
            window.alert(exception.message);
        }
    };
});
