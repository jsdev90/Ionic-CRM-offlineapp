angular.module('app.garbage-collector', [])
.factory('GarbageCollector', function(DBA, $q, Storage){

  /*
  Garbage collector:
  dla wszystkiego co jest done + zsynchronizowane + starsze niż 2 msc
  */

  //remove unnecessary (synced or outdated) stuff
  function cleanUp(){

    //remove outdated messages
    return DBA.query(
      ' delete from messages ' +
      ' where ' +
      ' date(completed_at) < date(\'now\', \'-7 day\') ' +
      ' and completed_at is not null ' +
      ' and sync = 1 '
    )
    .then(
      DBA.query.bind(DBA,'delete from work_orders where date(completed_at) < date(\'now\', \'-60 day\')')
    )
    .then(
      DBA.query.bind(DBA, 'delete from billing_entries where date(created_at) < date(\'now\', \'-60 day\') and sync = 1')
    )
    .then(
      DBA.query.bind(DBA, 'delete from quote_entries where date(created_at) < date(\'now\', \'-60 day\') and sync = 1')
    )
    .then(
      DBA.query.bind(DBA, 'delete from quotes where date(created_at) < date(\'now\', \'-60 day\') and sync = 1')
    )
    .then(
      DBA.query.bind(DBA, 'delete from work_order_assets where date(created_at) < date(\'now\', \'-60 day\') and sync = 1')
    )
    .then(
      DBA.query.bind(DBA, 'delete from work_order_status_history where date(created_at) < date(\'now\', \'-60 day\') and sync = 1')
    )
    .then(
      DBA.query.bind(DBA,
        ' delete from time_sheets ' +
        ' where ' +
        ' start_at is not null ' +
        ' and stop_at is not null ' +
        ' and date(stop_at) < date(\'now\', \'-60 day\')' +
        ' and sync = 1 '
      )
    )
    .then(
      DBA.query.bind(DBA,'delete from gps_locations where sync = 1')
    )
    .then(
      Storage.removeOldSyncedFiles.bind(Storage)
    );
  }

  return {
    cleanUp: cleanUp
  };
});
