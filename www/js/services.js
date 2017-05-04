angular.module('app.services', ['angular-uuid'])
.factory('NetworkCheck', function($http, $q, Logger, $ionicPlatform, $rootScope, AUTH_SERVER_URL){
    var self = this;

    self.isOffline = function(skipNetworkCheck){
        return $q(function(resolve, reject){

            if (skipNetworkCheck === 'offline') {
                $rootScope.$broadcast('NetworkCheck.offline');
                resolve();
            }

            if (skipNetworkCheck === true) {
                reject();
            }

            $http({method: 'get', url: AUTH_SERVER_URL + '/app?tag=tcg', params: { 'forceReload': new Date().getTime() }, timeout: 1000 * 5})
            .then(
                function(){
                    reject();
                    $rootScope.$broadcast('NetworkCheck.online');
                },
                function(error){
                    $rootScope.$broadcast('NetworkCheck.offline');
                    resolve();
                }
            )
            .catch(
              function(err){
                console.log(err);
              }
            );
        });
    };

    return self;
})
.factory('SmartBack', function($ionicHistory, $state){
    var self = this;

    self.backToLastViewedStateNamed = function(stateName, clearHistory){
        var historyStack = $ionicHistory.viewHistory().histories.ion1.stack;
        var nearestMatchingState = null;
        historyStack.forEach(function(historyEntry){
            if (historyEntry.stateName==stateName) {
                nearestMatchingState = historyEntry;
            }
        });
        if (nearestMatchingState) {
            $state.go(nearestMatchingState.stateName, nearestMatchingState.stateParams);
            if (clearHistory) {
                $ionicHistory.clearHistory();
            }
        }
    };

    return self;
})
.factory('DBA', function ($cordovaSQLite, Logger, $q, $ionicPlatform, uuid, DEFAULT_DATE_FORMAT) {
    var self = this;

    // Handle query's and potential errors
    self.query = function (query, parameters) {

        var queryLogStyle = '';
        if (!!~query.indexOf('delete')) {
          queryLogStyle = 'color: orangered; font-weight: bold;';
        }
        console.info('%c[query] ' + query, queryLogStyle);
        console.info('');
        parameters = parameters || [];
        var q = $q.defer();

        $ionicPlatform.ready(function () {
            $cordovaSQLite.execute(db, query, parameters)
            .then(function (result) {
                q.resolve(result);
            }, function (error) {
                // ignore errors that occur because migrations were not fired yet TODO: improve this
                if (error && error.message && error.message.indexOf('no such table') === -1) {
                  Logger.error(error, query, parameters);
                } else {
                  console.error(error);
                }
                q.reject(error);
            });
        });

        return q.promise;
    };

    // Proces a result set
    self.getAll = function (result) {
        var output = [];

        for (var i = 0; i < result.rows.length; i++) {
            output.push(result.rows.item(i));
        }

        return output;
    };

    // Proces a single result
    self.get = function (result) {
        var output = null;
        output = angular.copy(result.rows.item(0));

        return output;
    };

    self.getUuid = function () {
        return uuid.v4();
    };

    self.getTimestamp = function () {
        return moment().utc().format(DEFAULT_DATE_FORMAT);
    };

    self.getUtcDate = function(dateString){
        if (dateString) {
            return moment(new Date(dateString)).utc().format(DEFAULT_DATE_FORMAT);
        }
        return dateString;
    };

    self.findOrNull = function (sql, parameters) {
        return self.query(sql, parameters)
        .then(function (result) {
            if (result.rows.length) {
                return self.get(result);
            }

            return null;
        });
    };

    self.findAsArray = function(sql, parameters){
        return self.query(sql, parameters).then(
            function(results){
                return self.getAll(results);
            }
        );
    };

    self.idExistsInTable = function(id, tableName){
        return $q(function(resolve){
            var idColumnName = 'id';
            self.findOrNull('select '+idColumnName+' from ' + tableName + ' where '+idColumnName+' = ?', [id]).then(
                function(result){
                    resolve(result);
                }
            );
        });
    };

    self.setDbHandle = function(dbHandle){
      self.dbHandle = dbHandle;
    };

    return self;
})
.factory('Logger', function(){
    function isRollbarReady(){
      if (Rollbar) {
        return true;
      }
      console.warn('[Rollbar] Rollbar not ready yet!');
      return false;
    }

    function configure(configuration){
      if (isRollbarReady()) {
        Rollbar.configure({
          payload: configuration,
          checkIgnore: function(isUncaught, args, payload){
            // Skip status 0 message (request timeout)
            console.log(payload);

            var body = '';
            try {
              body = payload.data.body.message.body;
            } catch(e) {
              console.warn(e);
            }

            if (body.indexOf('"status":0')!==-1) {
              console.info('[Rollbar] skip network timeout message');
              return true;
            }
            return false;
          }
        });
      }
    }

    function critical(){
      try {
        if (isRollbarReady()){
          Rollbar.critical.apply(Rollbar, arguments);
        }
      } catch(e){
        console.error(e);
      }
    }

    function warning(){
      try {
        if (isRollbarReady()){
          Rollbar.warning.apply(Rollbar, arguments);
        }
      } catch(e){
        console.error(e);
      }
    }

    function info(){
      try {
        if (isRollbarReady()){
          Rollbar.info.apply(Rollbar, arguments);
        }
      } catch(e){
        console.error(e);
      }
    }

    function error(){
      try {
        if (isRollbarReady()){
          Rollbar.error.apply(Rollbar, arguments);
        }
      } catch(e){
        console.error(e);
      }
    }

    function debug(){
      try {
        if (isRollbarReady()){
          Rollbar.debug.apply(Rollbar, arguments);
        }
      } catch(e){
        console.error(e);
      }
    }

    function log(){
      debug(arguments);
    }

    return {
      critical: critical,
      log: log,
      debug: debug,
      error: error,
      info: info,
      warning: warning,

      configure: configure
    };
})
;
