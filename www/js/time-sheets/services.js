angular.module('app.time-sheets.services', [])
.factory('Vehicle', function($q, DBA, $http, Account){
  var self = this;

  self.getAll = function(){
    return DBA.query('select * from vehicles').then(function(result){
      return DBA.getAll(result);
    });
  };

  self.sync = function(){
    return $http.get('/mobile/vehicles')
    .then(
      function(result){
        var vehicles = result.data.response.vehicles.data;
        if (vehicles.length) {
          DBA.query('delete from vehicles').then(
            function(){
              vehicles.forEach(function(vehicle){
                DBA.query(
                  'insert into vehicles (id, vehicle_number, plate, store_id) values(?,?,?,?)',
                  [
                    vehicle.id,
                    vehicle.vehicle_number,
                    vehicle.plate,
                    vehicle.store_id
                  ]
                );
              });
            }
          );
        }
      }
    );
  };

  return self;
})
.factory('TechStatuses', function(DBA, $http, $q, Account){
  var self = this;

  self.sync = function(){
    return $http.get('/mobile/workorders/statuses')
    .then(function(response){
      var statuses = response.data.response.statuses;
      return statuses;
    })
    .then(function(statuses){
      return DBA.query('delete from tech_statuses')
      .then(function(){
        var promises = [];
        statuses.forEach(function(newStatus){

          for(var key in newStatus) {
            if (newStatus.hasOwnProperty(key)) {
              if (newStatus[key] == 'false')
              newStatus[key] = 0;
              else if (newStatus[key] == 'true') {
                newStatus[key] = 1;
              }
            }
          }

          promises.push(DBA.query('insert into tech_statuses(key,name,id,description_required,use_vehicle,start_after_stop,time_sheet_reason_type_id) values(?,?,?,?,?,?,?)',[
            newStatus.key,
            newStatus.name,
            newStatus.id,
            newStatus.description_required,
            newStatus.use_vehicle,
            newStatus.start_after_stop,
            newStatus.time_sheet_reason_type_id
          ]));
        });
        return $q.all(promises);
      });
    })
    ;
  };

  self.getAll = function(){
    return DBA.query('select * from tech_statuses where id != 977').then(function(results){
      results = DBA.getAll(results);

      results = results.map(function(techStatus){
        techStatus.description_required = techStatus.description_required == 'true' ? 1 : 0;
        techStatus.use_vehicle = techStatus.use_vehicle == 'true' ? 1: 0;
        techStatus.start_after_stop = techStatus.start_after_stop == 'true' ? 1 : 0;

        return techStatus;
      });

      return results;
    });
  };

  return self;
})
.factory('TimeSheet', function ($cordovaSQLite, $q, $http, DBA, DEFAULT_DATE_FORMAT, GpsLocation) {
  var self = this;

  self.sync = function(){
    return DBA.findAsArray(
      ' select ' +
      ' ts.uuid, ' +
      ' ts.vehicle_id, ' +
      ' ts.id,  ' +
      ' \'link_person_wo\' as table_name, ' +
      ' ts.type_id, ' +
      ' ts.start_at, ' +
      ' ts.stop_at, ' +
      ' wo.link_person_wo_id as table_id, ' +
      ' ts.start_gps, ' +
      ' ts.stop_gps, ' +
      ' ts.description, ' +
      ' ts.object_type, ' +
      ' ts.object_uuid, ' +
      ' ts.created_at, ' +
      ' ts.sync ' +
      ' from time_sheets ts left join work_orders wo on wo.uuid = ts.object_uuid ' +
      ' where ts.sync = 0'
    )
    .then(
      function(timesheetsToSync){
        return $http(
          {
            method: 'post',
            url: '/mobile/timesheets/sync',
            data: {
              timesheets: timesheetsToSync
            }
          }
        );
      }
    )
    .then(
      function(timesheetSyncResponse){
        var data = timesheetSyncResponse.data.response;
        return data;
      }
    )
    .then(
      function(data){
        var defer = $q.defer();

        function onQuerySuccess(itemIndex, itemCount, deferred){
          if (itemIndex === itemCount - 1) {
            deferred.resolve(data);
          }
        }

        function onQueryError(itemIndex, itemCount, deferred, error){
          if (error) {
            console.error(error);
            deferred.reject(error);
          }
        }

        if (!data.syncs.length){
          defer.resolve(data);
        }

        db.transaction(
          function(tx) {
            data.syncs.forEach(function(syncData, i){
              tx.executeSql(
                'update files set object_id = ? where object_uuid = ?',
                [
                  syncData.object_id,
                  syncData.uuid
                ]
              );

              tx.executeSql(
                'update time_sheets set id = ?, sync = 1 where uuid = ?',
                [
                  syncData.object_id,
                  syncData.uuid
                ],
                onQuerySuccess.bind(null, i, data.syncs.length, defer),
                onQueryError.bind(null, i, data.syncs.length, defer)
              );
            });
          }
        );

        return defer.promise.then(
          function(){
            return data;
          }
        );
      }
    )
    .then(
      function(data){
        return DBA.findAsArray('select id from time_sheets')
        .then(
          function(existingTimesheets){
            var existingTimeSheetIds = existingTimesheets.map(
              function(timesheet){
                return +timesheet.id;
              }
            );
            data.existingTimeSheetIds = existingTimeSheetIds;
            return data;
          }
        );
      }
    )
    .then(
      function(data){

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

        if (!data.time_sheets.length){
          defer.resolve();
        }

        db.transaction(
          function(tx) {
            data.time_sheets.forEach(
              function(timeSheet, i){
                if (data.existingTimeSheetIds.indexOf(+timeSheet.id) === -1) {
                  tx.executeSql(
                    'insert into time_sheets(uuid, object_uuid, object_type, id, type_id, start_at, stop_at, start_gps, stop_gps, description, object_type, object_uuid, created_at, sync) values ' +
                    '(?' +
                    ', (select wo.uuid from work_orders wo where wo.link_person_wo_id = ? limit 1)' +
                    ', "work_order"'+
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?' +
                    ',?)',
                    [
                      DBA.getUuid(),
                      timeSheet.object_id,
                      timeSheet.id,
                      timeSheet.reason_type_id,
                      DBA.getUtcDate(timeSheet.start_at),
                      DBA.getUtcDate(timeSheet.stop_at),
                      timeSheet.start_gps,
                      timeSheet.stop_gps,
                      timeSheet.description,
                      '',
                      '',
                      timeSheet.created_at,
                      1
                    ],
                    onQuerySuccess.bind(null, i, data.time_sheets.length, defer),
                    onQueryError.bind(null, i, data.time_sheets.length, defer)
                  );
                } else {
                  onQuerySuccess(i, data.time_sheets.length, defer);
                }
              }
            );
          }
        );

        return defer.promise.then(
          function(){
            return data;
          }
        );
      }
    );
  };

  self.updateStartGps = function(startGps, timeSheetUuid){
    DBA.query('update time_sheets set start_gps = ?, sync = 0 where uuid = ?', [startGps, timeSheetUuid]);
  };

  self.updateStopGps = function(stopGps, timeSheetUuid){
    DBA.query('update time_sheets set stop_gps = ?, sync = 0 where uuid = ?', [stopGps, timeSheetUuid]);
  };

  self.getLastTimesheetWithVehicleId = function(){
    return DBA.findOrNull('select v.* from time_sheets ts join vehicles v on v.id = ts.vehicle_id where ts.vehicle_id is not null order by datetime(ts.start_at) desc limit 1');
  };

  self.setVehicle = function(timesheetUuid, vehicleId){
    return DBA.query('update time_sheets set vehicle_id = ? where uuid = ?', [vehicleId, timesheetUuid]);
  };

  self.getLastTimesheetForWorkOrderUuid = function(uuid){
    return DBA.findOrNull('select * from time_sheets where object_uuid = ? order by start_at desc limit 1', [uuid]);
  };

  self.getLastRunningTimesheetForWorkOrderUuid = function(uuid){
    return DBA.findOrNull('select * from time_sheets where object_uuid = ? and stop_at is null order by start_at desc limit 1', [uuid]);
  };

  self.getAllForDateRange = function(startDate, endDate){
    var sql = "SELECT time_sheets.*, CASE WHEN type_id=600 THEN 'work' ELSE 'travel' END as type, wo.work_order_number " +
    " FROM time_sheets " +
    " LEFT JOIN work_orders wo on wo.uuid = time_sheets.object_uuid " +
    " WHERE DATE(start_at) >= DATE(?) and date(start_at) <= DATE(?) " +
    " ORDER BY datetime(start_at) desc";

    return DBA.findAsArray(sql, [
      startDate,
      endDate
    ]);
  };

  self.calculateTotalForType = function(type, timers){
    var totalInSeconds = 0;
    if (timers) {
      timers.map(function(timer){
        if (timer.start_at && timer.stop_at && timer.start_at.length && timer.stop_at.length && timer.type === type) {
          totalInSeconds += moment(timer.stop_at).utc().diff(moment(timer.start_at).utc(), 'seconds');
        }
      });
    }
    return moment.duration(totalInSeconds, "seconds").format('hh:mm:ss', { trim: false });
  };

  self.calculateTotalByWorkOrder = function(timers){
    var totalByWorkOrderNumber = {};
    if (timers) {
      timers.forEach(function(timer){
        if (!totalByWorkOrderNumber[timer.work_order_number]) {
          totalByWorkOrderNumber[timer.work_order_number] = 0;
        }
        if (timer.start_at && timer.stop_at && timer.start_at.length && timer.stop_at.length) {
          totalByWorkOrderNumber[timer.work_order_number] += moment(timer.stop_at).utc().diff(moment(timer.start_at).utc(), 'seconds');
        }
      });
    }

    for(var workOrderNumber in totalByWorkOrderNumber) {
      totalByWorkOrderNumber[workOrderNumber] = moment.duration(totalByWorkOrderNumber[workOrderNumber], "seconds").format('hh:mm:ss', { trim: false });
    }

    return totalByWorkOrderNumber;
  };

  self.getByType = function(startDate, endDate){

    return $q(function(resolve, reject){
      var sql = 'select * from tech_statuses';

      DBA.query(sql)
      .then(
        function(types){
          types = DBA.getAll(types);

          var result = [];
          var promise;

          types.map(function(type){
            var sql = "SELECT time_sheets.*, wo.work_order_number " +
            "FROM time_sheets LEFT JOIN work_orders wo on wo.uuid = time_sheets.object_uuid " +
            "WHERE DATE(start_at) >= DATE(?) and date(start_at) <= DATE(?) and time_sheets.type_id = ? " +
            "ORDER BY datetime(start_at) desc";

            promise = DBA.query(sql, [
              startDate,
              endDate,
              type.time_sheet_reason_type_id
            ]).then(
              function(sheets){
                sheets = DBA.getAll(sheets);

                var totalInSeconds = 0;
                sheets.map(function(sheet){
                  totalInSeconds += moment(sheet.stop_at).utc().diff(moment(sheet.start_at).utc(), 'seconds');
                });

                result.push({
                  type: type,
                  sheets: sheets,
                  totalTime: moment.duration(totalInSeconds, "seconds").format('hh:mm:ss', { trim: false })
                });
              }
            );
          });

          if (promise) {
            promise.then(function(){
              resolve(result);
            });
          } else {
            reject();
          }
        }
      )
      ;
    });
  };

  self.getTimestamp = function () {
    return DBA.getTimestamp();
  };

  self.getTypeById = function(typeId){
    return $q(function(resolve, reject){
      DBA.findOrNull('select * from tech_statuses where id = ?', [typeId]).then(
        function(type){
          resolve(type);
        },
        function(err){
          reject(err);
        }
      );
    });
  };

  self.get = function (uuid) {
    var params = [uuid];

    return DBA.query("SELECT * from time_sheets WHERE uuid = (?)", params)
    .then(function (result) {
      return DBA.get(result);
    });
  };

  self.start = function (data) {
    var uuid = DBA.getUuid();
    var params = [
      uuid,
      data.type_id,
      data.vehicle_id ? data.vehicle_id : null,
      self.getTimestamp(),
      self.getTimestamp(),
      data.object_type || 'work_order',
      data.object_uuid,
      0
    ];

    var sql = "INSERT INTO time_sheets (uuid, type_id, vehicle_id, start_at, created_at, " +
    "object_type, object_uuid, sync) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    return DBA.query(sql, params).then(function(){
      GpsLocation.getCurrent().then(
        function(coords){
          self.updateStartGps(coords.latitude + ',' + coords.longitude, uuid);
        });
        return true;
      });

    };

    self.stop = function (timeSheet, data) {
      if(!timeSheet){
        return $q(function(resolve){resolve()});
      }

      GpsLocation.getCurrent().then(function(coords){
        self.updateStopGps(coords.latitude + ' ' + coords.longitude, timeSheet.uuid);
      });

      var params = [
        self.getTimestamp(),
        data.description ? data.description : '',
        0,
        timeSheet.uuid
      ];

      return DBA.query("UPDATE time_sheets SET stop_at = (?), " +
      "description = (?), sync = (?) WHERE uuid = (?) and stop_at is null", params);
    };

    self.getRunningTimerForObject = function (objectUuid) {
      var sql = "SELECT ts.*, t.description_required, t.start_after_stop, t.use_vehicle FROM time_sheets ts join work_orders wo on wo.uuid = ts.object_uuid left join tech_statuses t on t.id = wo.tech_status_type_id WHERE ts.stop_at IS NULL and ts.object_uuid = ? LIMIT 1";
      return DBA.findOrNull(sql, [objectUuid]);
    };

    self.getRunningTimer = function(){
      var sql = "SELECT ts.*, wo.work_order_number FROM time_sheets ts join work_orders wo on wo.uuid = ts.object_uuid and ts.object_type = 'work_order' WHERE stop_at IS NULL";
      return DBA.findOrNull(sql);
    };

    self.remove = function (timeSheet) {
      var params = [timeSheet.uuid];

      return DBA.query("DELETE FROM time_sheets WHERE uuid = (?)", params);
    };

    self.removeAll = function () {
      return DBA.query("DELETE FROM time_sheets");
    };

    self.getTypes = function () {
      return DBA.query("SELECT id, name FROM tech_statuses")
      .then(function (result) {
        return DBA.getAll(result);
      });
    };

    return self;
  });
