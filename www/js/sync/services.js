angular.module('app.sync', [])
.constant('SYNC_TIMEOUT_IN_SECONDS', 40)
.factory('Sync',
function (
  $q,
  DBA,
  TechStatuses,
  SYNC_TIMEOUT_IN_SECONDS,
  NetworkCheck,
  $ionicPlatform,
  $rootScope,
  $ionicPopup,
  $ionicLoading,
  Settings,
  Message,
  TimeSheet,
  WorkOrder,
  Asset,
  Address,
  Type,
  Equipment,
  Person,
  Vehicle,
  VersionCheck,
  Storage,
  Survey,
  SurveyResult,
  SurveyQuestion,
  BillingEntry,
  Logger,
  GarbageCollector,
  GpsLocation,
  Quote
) {
  var self = this;

  var onError = function(err){


    err = err ? err : {};
    var message = '';

    if (err.message) {
      message = err.message;
    } else if (err.status !== undefined && err.status === 0) {
      message = 'Internet connection lost. Please connect your device to the Internet to sync.';
    } else if (err.status !== undefined && err.status !== 0) {
      message = 'Error - http code ' + err.status;
    } else if (typeof err === 'string' && err.length){
      message = err;
    } else {
      message = 'An error occured';
    }

    //log handled error using cordova
    Logger.error(message);

    //$rootScope.$broadcast('sync.stop');
    //$rootScope.$broadcast('sync.error', {message: message});

    return message;
  };

  var onTimeout = function(){
    $ionicLoading.hide();
    $rootScope.$broadcast('sync.stop');
    $ionicPopup.alert({title: 'Error', template: 'Sync timed out. Please try again later.'});
    onError('Sync timed out.');
    Storage.syncFiles();
  };

  //sync types, persons etc. not occuring on every sync.
  self.installTypes = function(){
    $rootScope.$broadcast('sync.start');
    $rootScope.$broadcast('sync.progress', {task: 'Syncing statics'});
    return $q.all(
      [
        Equipment.getItemsFromApi(),
        Equipment.getInventoryFromApi()
      ]
    )
    .catch(function(e){
      throw new Error(onError(e));
    });
  };

  self.updateLastSyncStatus = function(tableName){
    return DBA.findOrNull('select * from sync_statuses where table_name = ?', [tableName])
    .then(
        function (result) {
            if (!result) {
                return DBA.query('insert into sync_statuses (table_name, last_sync_at) values (?,?)', [
                    tableName,
                    DBA.getTimestamp()
                ]);
            } else {
                return DBA.query('update sync_statuses set last_sync_at = ? where table_name = ?', [
                    DBA.getTimestamp(),
                    tableName
                ]);
            }
        }
    );
  };

  //sync everything - entry point
  self.all = function(skipNetworkCheck){
    $rootScope.$broadcast('sync.start');
    //check network connection

    // dont set the timeout when network connection is not available
    var timeout = null;

    return NetworkCheck.isOffline(skipNetworkCheck)
    .then(function(){
      throw new Error('No internet connection. Please connect internet for sync.');
    },function(e){

      timeout = setTimeout(function(){
        onTimeout();
      }, SYNC_TIMEOUT_IN_SECONDS * 1000);

      //internet available, start syncing
      //sync is a promise chain, each stage starts when the previous one
      //is considered done. method names are self explanatory
      return $q.resolve()
      .then(function(){
        console.time('entire sync');
        return GarbageCollector.cleanUp();
      })
      .then(
        function(){
          $rootScope.$broadcast('sync.progress', {task: 'Syncing settings, work orders and static data'});
          return $q.all([
            Person.sync(),
            Type.sync().then(self.updateLastSyncStatus.bind(null,'types')),
            Settings.sync().then(self.updateLastSyncStatus.bind(null,'settings')),
            TechStatuses.sync().then(self.updateLastSyncStatus.bind(null,'tech_statuses')),
            Vehicle.sync().then(self.updateLastSyncStatus.bind(null,'vehicles')),
            GpsLocation.sync().then(self.updateLastSyncStatus.bind(null,'gps_locations')),
            WorkOrder.sync().then(self.updateLastSyncStatus.bind(null,'work_orders'))
          ]);
        }
      )

      .then(
        function(){
          $rootScope.$broadcast('sync.progress', {task: 'Syncing assets, messages and time sheets'});
          return $q.all([
            Asset.sync().then(self.updateLastSyncStatus.bind(null,'assets')),
            TimeSheet.sync().then(self.updateLastSyncStatus.bind(null,'time_sheets')),
            Message.sync().then(self.updateLastSyncStatus.bind(null,'messages'))
          ]);
        }
      )
      .then(
        function(){
          $rootScope.$broadcast('sync.progress', {task: 'Syncing quotes, bills and surveys'});
          return $q.all([
            Quote.sync().then(self.updateLastSyncStatus.bind(null,'quotes')),
            Survey.sync().then(self.updateLastSyncStatus.bind(null,'surveys')),
            BillingEntry.sync().then(self.updateLastSyncStatus.bind(null,'billing_entries'))
          ]);
        }
      )
      .then(
        function(){
          console.timeEnd('entire sync');
          $rootScope.$broadcast('sync.progress', {task: 'DONE'});
          $rootScope.$broadcast('sync.stop');
          clearTimeout(timeout);
          VersionCheck.checkVersion();
        }
      )
      .catch(function(e){
        onError(e);
        $rootScope.$broadcast('sync.stop');
        $ionicLoading.hide();
        clearTimeout(timeout);
        $ionicPopup.alert({title: 'Error', template: e.message ? e.message : 'Sync error' });
      })
      .then(
        function(){
          return Storage.syncFiles();
        }
      )
      .catch(
        function(e){
          onError(e);
        }
      );
    });
  };

  return self;
});
