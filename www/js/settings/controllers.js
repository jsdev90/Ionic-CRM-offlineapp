angular.module('app.settings.controllers', [])
.config(function($stateProvider){
    $stateProvider
    .state('settings', {
        url: '/settings',
        templateUrl: 'views/settings/menu.html'
    })
    .state('query', {
        url: '/settings/query',
        templateUrl: 'views/settings/query.html',
        controller: 'SettingsQueryCtrl'
    })
    .state('dump', {
        url: '/settings/dump',
        templateUrl: 'views/settings/dump.html',
        controller: 'DatabaseDumpCtrl'
    })
    .state('sync', {
        url: '/settings/sync',
        templateUrl: 'views/settings/sync.html',
        controller: 'SyncStatusCtrl'
    })
    .state('upload-queue', {
        url: '/settings/upload-queue',
        templateUrl: 'views/settings/upload-queue.html',
        controller: 'UploadQueueCtrl'
    })
    ;
})
.controller('SettingsQueryCtrl', function ($scope, Settings, Sync, Logger, $ionicPopup, DBA, $q, TimeSheet, GpsLocation, Type, Equipment, Person) {
    $scope.queryResult = '';
    $scope.query = '';

    // Execute queries for diagnostics
    $scope.runQuery = function (query) {
        return DBA.query(query)
        .then(function (result) {
            var output = DBA.getAll(result);
            $scope.queryResult = output;
            
            
        },
        function(err){
            alert(err.message || 'SQL Error');
        }
      );
    };



    $scope.deleteAll = function(){
        $ionicPopup.confirm({title: 'Are you sure?', template: 'This action is permanent'})
        .then(function(res){
            if (res) {
                var tables = [
                    'work_orders',
                    'quotes',
                    'assets',
                    'work_order_assets',
                    'messages',
                    'quote_entries',
                    'files',
                    'addresses',
                    'time_sheets',
                    'settings',
                    'types',
                    'tech_statuses',
                    'surveys',
                    'survey_results',
                    'survey_questions'
                ];

                tables.forEach(function(tableName){
                    DBA.query('delete from ' + tableName);
                });
            }
        });
    };

})
.controller('SyncStatusCtrl', function($scope, $state, $cordovaFile, Logger, Account, $ionicPopup, $cordovaGoogleAnalytics, $ionicLoading, Sync, Storage, DBA, DEFAULT_DISPLAY_DATE_FORMAT){

    $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('sync')) {
            reloadData();
        }
    });

    $scope.$on('sync.stop', function(){
        if ($state.is('sync')) {
            reloadData();
        }
    });

    function reloadData(){
        return DBA.findAsArray('select * from sync_statuses order by table_name asc')
        .then(function(syncs){
            $scope.syncs = syncs;
        })
        .then(
          function(){
            return DBA.findOrNull('select count(1) as not_synced from files where sync = 0')
            .then(
                function(fileStats){
                    $scope.notSynced = fileStats.not_synced;
                }
            );
          }
        );
    }

    // Start sync
    $scope.forceSync = function(){
        Sync.all();
        Account.getCurrent().then(
          function(currentAccount){
            $cordovaGoogleAnalytics.trackEvent('Force sync all', currentAccount.person_id + ' clicked force file sync all button');
          }
        );
    };

    // Sync files - omits file check and shows loading indicator
    $scope.forceSyncFiles = function(){
        Account.getCurrent().then(
          function(currentAccount){
            $cordovaGoogleAnalytics.trackEvent('Force sync files', currentAccount.person_id + ' clicked force file sync button');
          }
        );
        Storage.syncFiles(reloadData);
    };
})
.controller('DatabaseDumpCtrl', function($scope, Dump, $cordovaGoogleAnalytics){
    // Upload database dump manually
    $scope.exportDatabase = function(){
        
        $cordovaGoogleAnalytics.trackEvent('Db Dump', 'User clicked export database button');
        Dump.export();
    };
})
;
