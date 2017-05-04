var db = null;

angular.module('app',
[
  'ionic',
  'app.controllers',
  'app.settings.controllers',
  'app.settings.services',
  'app.services',
  'app.services.migrations',
  'app.persons',
  'app.accounts.services',
  'app.filters',
  'app.adresses.service',
  'app.authentication.controllers',
  'app.authentication.services',
  'app.work-orders.controllers',
  'app.work-orders.services',
  'app.work-orders.filters',
  'app.work-orders.directives',
  'app.surveys.services',
  'app.surveys.controllers',
  'app.time-sheets.services',
  'app.media.controllers',
  'app.media.services',
  'app.media.directives',
  'app.assets.controllers',
  'app.assets.services',
  'app.site-history.controllers',
  'app.site-history.services',
  'app.messages.controllers',
  'app.messages.services',
  'app.storage',
  'app.gps.services',
  'app.timesheets',
  'app.sync',
  'app.quotes.controllers',
  'app.quotes.services',
  'app.bills.controllers',
  'app.bills.services',
  'app.purchase-orders.controllers',
  'app.update-required',
  'app.signature',
  'app.asset-history.services',
  'app.asset-history.controllers',
  'app.push-notifications.services',
  'app.garbage-collector',
  'app.types.service',
  'app.upload-queue',

  'ngCordova',
  'ngMessages',
  'angularMoment',
  'ionicLazyLoad',
  'exceptionOverride',
  'nl2br',
  'ui.thumbnail'
])

.constant('PHOTO_PLACEHOLDER', 'img/photo-placeholder.svg')
.constant('DEFAULT_DATE_FORMAT', 'YYYY-MM-DD HH:mm:ss')
.constant('DEFAULT_DISPLAY_DATE_FORMAT', 'MM/DD/YYYY hh:mm A')
.constant('DEFAULT_DISPLAY_DATE_FORMAT_NO_TIME', 'MM/DD/YYYY')
.constant('CHECK_APP_VERSION_INTERVAL_IN_SECONDS', 60 * 10)
.constant('DEFAULT_HTTP_TIMEOUT', 10 * 1000)
.constant('MIN_FREE_STORAGE_IN_MB', 50)
.filter('rawHtml', ['$sce', function($sce){
  return function(val) {
    return $sce.trustAsHtml(val);
  };
}])
// blocks clicking elements when offline
.directive('onlineOnly', function(NetworkCheck, $ionicPopup, $timeout){
  return {
    restrict: 'A',
    link: function(scope, element, attrs){
      var isOnline = false;
      if (attrs.onlineOnly && JSON.parse(attrs.onlineOnly)) {
        element.bind('click', function(e){
          if (!isOnline) {
            e.preventDefault();
            NetworkCheck.isOffline()
            .then(
              function(){
                $ionicPopup.alert({title: 'You are offline', template: 'This function is available only in online mode. Please check your internet connection.'});
              },
              function(){
                isOnline = true;
                $timeout(function(){

                  angular.element(element).triggerHandler('click');
                }, 100);
              }
            );
          }
        });
      } else {
        isOnline = false;
      }
    }
  };
})
.config(function ($stateProvider, $urlRouterProvider, $httpProvider, $ionicConfigProvider) {
  $stateProvider
  .state('menu', {
    url: '/',
    templateUrl: 'views/menu.html',
    controller: 'MenuCtrl'
  })

  .state('videos', {
    url: '/videos/:objectUuid?objectType&readOnly',
    templateUrl: 'views/video/list.html',
    controller: 'VideoListCtrl'
  })

  .state('sign-work-order', {
    url: '/work-order-sign/:uuid',
    templateUrl: 'views/work_orders/_signature.html',
    controller: 'SignWorkOrderCtrl'
  })
  .state('time-sheets', {
    url: '/time-sheets',
    templateUrl: 'views/time_sheets/list.html',
    controller: 'TimeSheetListCtrl'
  })
  .state('images', {
    url: '/images/:objectUuid?objectType&readOnly',
    templateUrl: 'views/images/list.html',
    controller: 'ImageListCtrl'
  });

  $urlRouterProvider.otherwise('/company-code');
  $ionicConfigProvider.views.transition('none');
  $ionicConfigProvider.tabs.position('top');
  $httpProvider.interceptors.push('AuthInterceptor');
})
.run(function ($ionicPlatform, PushNotificationsReceiver, $cordovaGoogleAnalytics, $rootScope, $http, $cordovaFile, $cordovaPush, $ionicPopup, Logger, Account, DBA, $cordovaSQLite, DbMigrator, $state, Sync) {
  // setup services here

  var splashVisible = true;

  function hideSplash(){
    // Hide spinner when database is ready
    var splash = document.getElementById('splash');
    splash.style.display = 'none';
    splashVisible = false;
  }

  //hide splash automatically after 20s to prevent app lock (in case of errors)
  setTimeout(
    function(){
      if (splashVisible) {
        hideSplash();
        Logger.debug('Splash screen hidden due to timeout');
      }
    },
    1000 * 20
  );

  document.addEventListener('deviceready', function(){
    if (Crittercism) {
      console.log('[crittercism] init');
      Crittercism.init(
        {
          'androidAppID' : 'c3b31120ea884238ade5b2577c94beb500555300'
        }
      );
    }
  }, false);

  $ionicPlatform.ready(function () {
    document.addEventListener("backbutton", function () {
      screen.unlockOrientation();
    }, false);

    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }

    if (window.cordova) {
      cordova.plugins.backgroundMode.setDefaults({ text:'File is uploading'});
      db = window.sqlitePlugin.openDatabase({name: 'app.db', location: 'default'}, function(){},
      function(err){

      }
    );

  } else {
    db = window.openDatabase("app", "1.0", "My app", -1);
  }

  DBA.setDbHandle(db);

  var version = 'NA';

  if (window.cordova) {
    window.cordova.getAppVersion.getVersionNumber(function (v) {
      version = v;
    });
  }

  var registerPushListener = function(){
    var androidConfig = {
      "senderID": "782192016331",
    };

    $cordovaPush.register(androidConfig).then(function(result) {

    }, function(err) {
      Logger.error('Could not register to GCM', err);
    });

    $rootScope.$on('$cordovaPush:notificationReceived', function(event, notification) {
      switch(notification.event) {
        case 'registered':
        if (notification.regid.length > 0 ) {

          Account.getCurrent()
          .then(function(currentAccount){
            if (currentAccount) {
              // updating push related device token
              return Account.updateDeviceToken(
                currentAccount.uuid,
                notification.regid
              );
            }
          });
        }
        break;

        case 'message': {
          PushNotificationsReceiver.handle(notification);
        }
        break;

        case 'error': {
          Logger.error(notification.msg);
        }
        break;

        default:{
          Logger.warning('An unknown GCM event has occurred');
        }
        break;
      }
    });
  };

  $rootScope.$$listeners['auth.numberSubmitted']=[];
  $rootScope.$on('auth.numberSubmitted', function(){
    registerPushListener();
  });

  $rootScope.$on('$db.ready', function(){

    hideSplash();

    registerPushListener();

    DBA.findOrNull('select * from settings where id = \'reset_upload\'')
    .then(
      function(uploadCleared){
        if (!uploadCleared) {
          $cordovaFile.removeFile(cordova.file.applicationStorageDirectory + '/databases/', 'UploadQueueDatabase')
          .then(
            function(){
              return DBA.query('insert into settings(id,`value`) values (\'reset_upload\', 1)');
            },
            function(){
              return DBA.query('insert into settings(id,`value`) values (\'reset_upload\', 1)');
            }
          )
          .then(
            function(){


              return Account.getCurrent();
            }
          )
          .then(
            function(currentAccount){
              $cordovaGoogleAnalytics.trackEvent('Force sync files', currentAccount.person_id + ' - upload cleared');
            }
          );
        }
      }
    );
  });

  // Run migrations on app startup
  DbMigrator.migrate().then(
    function () {
      $rootScope.$broadcast('$db.ready');
    }
  );

  // configure gps
  document.addEventListener("deviceready", function(){
    var callbackFn = function(location, taskId) {
      var coords = location.coords;
      var lat    = coords.latitude;
      var lng    = coords.longitude;

      setTimeout(function() {
        bgGeo.finish(taskId);
      }, 1000);
    };

    var failureFn = function(error) {

    };

    var bgGeo = window.BackgroundGeolocation;
    // BackgroundGeoLocation is highly configurable.
    bgGeo.configure(callbackFn, failureFn, {
      // Geolocation config
      desiredAccuracy: 0,
      stationaryRadius: 50,
      distanceFilter: 50,
      disableElasticity: false, // <-- [iOS] Default is 'false'.  Set true to disable speed-based distanceFilter elasticity
      locationUpdateInterval: 1000 * 60 * 5,
      minimumActivityRecognitionConfidence: 80,   // 0-100%.  Minimum activity-confidence for a state-change
      fastestLocationUpdateInterval: 5000,
      activityRecognitionInterval: 10000,
      stopDetectionDelay: 1,   // [iOS] delay x minutes before entering stop-detection mode
      stopTimeout: 2,	 // Stop-detection timeout minutes (wait x minutes to turn off tracking)
      activityType: 'AutomotiveNavigation',

      // Application config
      //debug: true, // <-- enable this hear sounds for background-geolocation life-cycle.
      forceReloadOnLocationChange: false,  // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a new location is recorded (WARNING: possibly distruptive to user)
      forceReloadOnMotionChange: false,    // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when device changes stationary-state (stationary->moving or vice-versa) --WARNING: possibly distruptive to user)
      forceReloadOnGeofence: false,        // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a geofence crossing occurs --WARNING: possibly distruptive to user)
      stopOnTerminate: false,              // <-- Don't stop tracking when user closes app.
      startOnBoot: true                   // <-- [Android] Auto start background-service in headless mode when device is powered-up.
    });

    bgGeo.start();

  }, false);


}, false);
})
;

function devDb(query, params){
  return angular.element(document.body).injector().get('DBA').findAsArray(query,params).then(
    function(results){

      results.forEach(function(record){
        console.log(' ');
        console.log(' ');
        console.info('>>>>');
        for(var key in record){
          console.info('[sql] ' + key + ':' + record[key]);
        }
        console.info('<<<<');
      });
      return results;
    }
  );
}
