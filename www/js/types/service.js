angular.module('app.types.service', [])
.factory('Type', function($q, DBA, $http, Account){
  var self = this;

  self.getTypesFor = function(typeType){
    return $q(function(resolve, reject){
      return DBA.query('select * from types where type = ?', [typeType])
      .then(
        function(results){
          resolve(DBA.getAll(results));
        }
      );
    })
    ;
  };

  self.getWorkOrderTechStatusTypes = function(){
    return DBA.findAsArray('select type_key,id from types where type = \'tech_status\' ')
    .then(
      function(types){
        var typesMap = {};

        types.forEach(
          function(type){
            var key = type.type_key.split('.');
            key = key.length ? key[1] : null;
            if (key) {
              typesMap[key] = type.id;
            }
          }
        );

        return typesMap;
      }
    );
  };

  self.getAll = function(){
    return DBA.query('select * from types').then(function(result){
      return DBA.getAll(result);
    });
  };

  //TODO update sync status timestamp
  self.sync = function(){
    return $http.get('/mobile/types')
    .then(
      function(result){

        function onQuerySuccess(itemIndex, itemCount, deferred){
          if (itemIndex === itemCount - 1) {
            deferred.resolve();
          }
        }

        function onQueryError(itemIndex, itemCount, deferred, error){
          if (error) {
            console.error(error);
            deferred.reject(error);
          }
        }

        var defer = $q.defer();

        var types = result.data.response.types.data;
        if (types.length) {
          return DBA.query('delete from types')
          .then(
            function(){
              db.transaction(
                function(tx) {
                  types.forEach(function(type, i){
                    tx.executeSql(
                      'insert into types (id, type, type_key, type_value) values(?,?,?,?)',
                      [
                        type.id,
                        type.type,
                        type.type_key,
                        type.type_value
                      ],
                      onQuerySuccess.bind(null, i, types.length, defer),
                      onQueryError.bind(null, i, types.length, defer)
                    );
                  });
                }
              );
              return defer.promise;
            }
          );
        } else {
          return $q.resolve();
        }
      }
    );
  };

  return self;
})
;
