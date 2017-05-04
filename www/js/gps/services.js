angular.module('app.gps.services', [])
.factory('GpsLocation', function (DBA, $rootScope, Settings, $http, Account, Logger, $q, DEFAULT_DATE_FORMAT, $cordovaGeolocation) {

  // This service gets user position on demand (as opposed to paid plugin,
  // which does it in the background) eg. on saving timesheets or taking pictures
  // Gps locations are then bulk-sent to the API in Sync service
  function getCurrent() {
    var q = $q.defer();
    var posOptions = {timeout: 10 * 1000, enableHighAccuracy: true};
    $cordovaGeolocation
    .getCurrentPosition(posOptions)
    .then(function (position) {

      try{
        save(position.coords);
      }
      catch (e){
        console.warn('error storing location data');
      }
      q.resolve(position.coords);
    }, function (err) {
      Logger.warning(err);
      q.reject(err);
    });

    return q.promise;
  }

  function sync(){
    var bgGeo = window.BackgroundGeolocation;
    return Account.getCurrent()
    .then(
      function(currentAccount){
        return Settings.get('gps.bulk_max_items')
        .then(
          function(value){
            return {
              maxItems: +value,
              currentAccount: currentAccount
            };
          }
        );
      }
    )
    .then(
      function(accountAndMaxItems){
        return $q(function(resolve, reject){
          bgGeo.getLocations(
            function(locations){
              var gpsLocationsToStore = [];

              if (locations.length) {
                gpsLocationsToStore = locations.map(function(location){
                  return {
                    timestamp: moment(location.timestamp).unix(),
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    speed: location.coords.speed,
                  };
                });
              }

              var promise = DBA.findAsArray(
                'select timestamp from gps_locations'
              )
              .then(
                function(storedGpsLocations){
                  var storedGpsLocationsTimestamps = storedGpsLocations.map(
                    function(storedGpsLocation){
                      return +storedGpsLocation.timestamp;
                    }
                  );
                  return storedGpsLocationsTimestamps;
                }
              )
              .then(
                function(storedGpsLocationsTimestamps){
                  var defer = $q.defer();

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

                  if (!gpsLocationsToStore.length) {
                    return defer.resolve();
                  }

                  db.transaction(
                    function(tx) {
                      gpsLocationsToStore.forEach(
                        function(location, i){
                          // Look up currently stored gps entries to prevent inserting dupes
                          if (storedGpsLocationsTimestamps.indexOf(+location.timestamp) === -1) {
                            tx.executeSql(
                              ' insert into gps_locations (uuid, latitude, longitude, speed, sync, timestamp) ' +
                              ' values (?,?,?,?,?,?) ',
                              [
                                DBA.getUuid(),
                                location.latitude,
                                location.longitude,
                                location.speed,
                                0,
                                location.timestamp
                              ],
                              onQuerySuccess.bind(null, i, gpsLocationsToStore.length, defer),
                              onQueryError.bind(null, i, gpsLocationsToStore.length, defer)
                            );
                          } else {
                            onQuerySuccess(i, gpsLocationsToStore.length, defer);
                          }
                        }
                      );
                    }
                  );

                  return defer.promise;
                }
              );

              promise
              .then(
                function(){
                  bgGeo.clearDatabase();
                  return DBA.findAsArray('select * from gps_locations where sync = 0 order by timestamp asc limit ?', [accountAndMaxItems.maxItems]);
                }
              )
              .then(
                function(gpsLocations){

                  gpsLocations = gpsLocations.map(
                    function(location){
                      location.person_id = accountAndMaxItems.currentAccount ? accountAndMaxItems.currentAccount.person_id : null;

                      //fix sending legacy gps_locations
                      var timestamp = '';
                      if (typeof location.timestamp === 'string' && location.timestamp.indexOf('-') !== -1) {
                        timestamp = moment(location.timestamp).unix();
                      } else {
                        timestamp = location.timestamp;
                      }

                      location.timestamp = timestamp;
                      return location;
                    }
                  );

                  var locationUuids = gpsLocations.map(function(location){
                    return location ? location.uuid : '';
                  });

                  if (!gpsLocations.length) {

                    resolve();
                    return;
                  }

                  $http({
                    method: 'post',
                    url: '/mobile/gpslocations/bulk',
                    data: {
                      gps_locations: gpsLocations
                    }
                  })
                  .then(
                    function(){
                      if (locationUuids.length) {
                        var sql = 'update gps_locations set sync = 1 where uuid in (\''+locationUuids.join('\',\'')+'\')';
                        DBA.query(sql)
                        .then(
                          function(){
                            resolve();
                          }
                        );
                      } else {
                        resolve();
                      }
                    },
                    function(error){
                      reject(error);
                    }
                  );
                }
              );
            },
            function(error){
              Logger.error('Could not get gps locations from background', error);
              reject(error);
            }
          );
        });
      }
    );
  }

  function save(location) {
    var sql = '' +
    'insert into gps_locations (uuid, latitude, longitude, speed, timestamp) values' +
    '(?, ?, ?, ?, ?)';

    return $q(function (resolve, reject) {
      DBA.query(sql, [
        DBA.getUuid(),
        location.latitude,
        location.longitude,
        location.speed ? location.speed : 0,
        DBA.getTimestamp()
      ])
      .then(
        function () {
          resolve();
        },
        function (error) {
          reject(error);
        }
      )
      ;
    });
  }


  return {
    getCurrent: getCurrent,
    sync: sync
  };
})
;
