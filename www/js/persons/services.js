angular.module('app.persons', [])
.factory('Person', function (DBA, $http, Logger, Account, DEFAULT_DATE_FORMAT, $q) {

  var self = {
    // Retrieve persons list from API, and store them
    sync: function(){
      var limit = 800;
      return $http.get('/mobile/persons?limit='+limit)
      .then(
        function(result){
          var page = 1;
          var maxPages = result.data.response.persons.last_page;
          var persons = [];
          var personsPromises = [];
          for (var i = page; i <= maxPages; i++) {
            personsPromises.push($http.get('/mobile/persons?limit='+limit+'&page=' + i));
          }
          return $q.all(personsPromises).then(
            function(responses){
              responses.forEach(function(response){
                response.data.response.persons.data.forEach(function(person){
                  persons.push(person);
                });
              });

              if (persons.length) {
                return DBA.query('delete from persons').then(
                  function(){
                    db.transaction(function(tx) {
                      persons.forEach(function(person, personIndex){
                        tx.executeSql(
                          'insert into persons (id, uuid, first_name, last_name, created_at, kind, type) values(?,?,?,?,?,?,?)',
                          [
                            person.id,
                            DBA.getUuid(),
                            person.first_name,
                            person.last_name,
                            DBA.getTimestamp(),
                            person.kind,
                            person.type
                          ]
                        );
                      });
                    },
                    function(error){
                      Logger.warning(error);
                    },
                    function(){

                    }
                  );
                }
              );
            }
          }
        );
      }
    );
  },
  getFromLocalDatabase: function(options){

    options = options || {skipSelf: false};

    // Get imported persons in order to display them. This only includes
    // physical persons that we might want to send a message to.
    return $q(function(resolve, reject){
      DBA.findAsArray(
        ' select * from persons ' +
        ' where kind = \'person\' and (type = \'technician\' or type = \'employee\' ) ' +
        (options.skipSelf ? ' and id != (select person_id from accounts where current = 1 limit 1) ' : '') +
        ' order by lower(first_name) asc, lower(last_name) asc'
      )
      .then(
        function(result){
          resolve(result);
        },
        function(err){
          reject(err);
        }
      );
    });
  },
  getSuppliers: function(){
    // Get all suppliers, used in billing/materials and quotes/materials view.
    return DBA.query('select * from persons where type = \'supplier\' and kind = \'company\'').then(function(results){
      return DBA.getAll(results);
    });
  }
};

return self;
})
;
