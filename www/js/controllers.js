angular.module('app.controllers', [])
.controller('AppCtrl', function (
  Account,
  Settings,
  $cordovaGoogleAnalytics,
  Sync,
  DBA,
  Dump,
  NetworkCheck,
  $ionicLoading,
  LogoutService,
  $ionicHistory,
  $rootScope,
  $ionicSideMenuDelegate,
  $state,
  $scope,
  $ionicPopup,
  $ionicPlatform,
  VersionCheck,
  CHECK_APP_VERSION_INTERVAL_IN_SECONDS,
  DEFAULT_DATE_FORMAT,
  Message,
  Logger,
  MIN_FREE_STORAGE_IN_MB,
  $q
) {
  var shouldHideHamburger = true;
  var lastVersionCheck = moment();

  var loggedOutPopup = false;

  $scope.appInfo = {
    version: ' N/A'
  };

  $ionicPlatform.ready(function(){
    if (window.cordova) {
      window.cordova.getAppVersion.getVersionNumber(function (version) {
        $scope.appInfo.version = version;
      });
    }
  });

  $scope.messageIndicator = {
    unreadCount: 0
  };

  var updateUnreadMessagesCount = function(){
    Message.getUnreadCount()
    .then(function(count){

      $scope.messageIndicator = {unreadCount: count ? ' (' + count + ')' : 0};

    });
  };
  updateUnreadMessagesCount();

  $scope.$on('message.completed', function(){
    updateUnreadMessagesCount();
  });

  $scope.sync = function(){
    Sync.all()
    .catch(
      function(error){
        if (error.message) {
          $ionicPopup.alert({title: 'Error', template: error.message});
        } else {
          Logger.error('Undefined error message in sync', error);
          $ionicPopup.alert({title: 'Error', template: 'Please try again later'});
        }
      }
    );
  };


  $ionicPlatform.ready(function(){
    VersionCheck.checkVersion();
    lastVersionCheck = moment();

    if (window.cordova) {

      $cordovaGoogleAnalytics.debugMode();
      $cordovaGoogleAnalytics.startTrackerWithId('UA-38732525-6');
      $cordovaGoogleAnalytics.trackView('Init');
    }
  });

  $scope.$on('$stateChangeStart', function(){
    var currentTime = moment();
    if (currentTime.diff(lastVersionCheck) > 1000 * CHECK_APP_VERSION_INTERVAL_IN_SECONDS) {
      VersionCheck.checkVersion();
      lastVersionCheck = moment();
    }
  });

  $scope.$on('versionCheck.update-required', function(){
    $state.go('update-required');
  });

  $scope.$on('sync.start', function(){

    Account.getCurrent()
    .then(
      function(currentAccount){
        if (currentAccount) {
          Logger.configure(
            {
              person: {
                id: currentAccount.person_id,
                username: currentAccount.username
              },
              appVersion: $scope.appInfo.version
            }
          );
        }
      }
    );

    $ionicLoading.show();
  });

  $scope.$on('sync.error', function(e, args){
    $ionicLoading.hide();
    $ionicPopup.alert({title: 'Error', template: args.message});
  });

  $scope.$on('NetworkCheck.checking', function(e, args){
    $ionicLoading.show({template: 'Checking network connection...'});
  });

  $scope.$on('NetworkCheck.online', function(e, args){
    $ionicLoading.hide();
  });

  $scope.$on('NetworkCheck.offline', function(e, args){
    $ionicLoading.hide();
  });

  $scope.$on('sync.progress', function(e, args){

    $ionicLoading.show({template: args.task});
  });

  $scope.$on('sync.stop', function(){

    updateUnreadMessagesCount();
    $ionicLoading.hide();
  });

  $scope.$on('dump.upload.progress', function(e, data){
    if (data && data.loaded !== undefined && data.total !== undefined) {
      var percentage = Math.ceil((data.loaded / data.total) * 100);
      percentage = percentage > 100 ? 100 : percentage;
      $ionicLoading.show(
        {
          template: 'Uploading database, ' +
          ' please don\'t close the app (' + percentage + '%)'
        }
      );
    }
  });

  $scope.shouldHideHamburger = function () {
    return shouldHideHamburger;
  };

  $scope.$on('unauthorized', function(){
    $ionicLoading.hide();
    LogoutService.logout().then(function(){
      return Account.getCurrent().then(function(){},function(){
        if (!loggedOutPopup) {
          $ionicHistory.clearHistory();
          $ionicLoading.hide();
          $state.go('company-code-prompt');
          loggedOutPopup = true;
        }
      })
      .then(function(){
        return $ionicPopup.alert({
          title: 'Unauthorized',
          template: 'Your token has expired. Please sign in.'
        });
      })
      .then(function(){
        loggedOutPopup = false;
      });
    });
  });

  $scope.$on('$stateChangeSuccess', function (e, toState) {
    if ($state.is('menu')) {
      $ionicHistory.clearHistory();
      DBA.findOrNull('select * from items').then(function(item){
        if (!item) {
          return Sync.installTypes();
        } else {
          return DBA.findOrNull('select * from tech_statuses').then(function(status){
            if (!status){
              return Sync.installTypes();
            }
          });
        }
      });
    }

    if (
      $state.is('menu')
      || $state.is('company-code-prompt')
      || $state.is('phone-prompt')
      || $state.is('confirmation-code-prompt')
    ) {
      shouldHideHamburger = true;
    } else {
      shouldHideHamburger = false;
    }

    Account.getCurrent()
    .then(
      function (currentAccount) {
        if (!currentAccount && ['company-code-prompt', 'confirmation-code-prompt', 'phone-prompt'].indexOf(toState.name) === -1) {
          $ionicPopup.alert({template: 'Account not found', title: 'Account not found'}).then(
            function(){
              $ionicHistory.clearHistory();
              $state.go('company-code-prompt');
            }
          );
        } else if (currentAccount && currentAccount.token && currentAccount.token.length && ['company-code-prompt', 'confirmation-code-prompt', 'phone-prompt'].indexOf(toState.name) !== -1) {
          $ionicHistory.clearHistory();
          $state.go('menu');
          $rootScope.$broadcast('auth.regenerated');
        }
      },
      function () {
        $ionicHistory.clearHistory();
        $state.go('company-code-prompt');
      }
    );
  });

  $scope.toggleLeft = function () {
    $ionicSideMenuDelegate.toggleLeft();
  };

  var gpsPromptDisplayed = false;
  function gpsPrompt(){
    if (!gpsPromptDisplayed) {
      $ionicPlatform.ready(
        function(){
          if (window.cordova) {
            cordova.plugins.diagnostic.isLocationEnabled(
              function(enabled) {
                if (!enabled){
                  $ionicPopup.confirm(
                    {
                      template: 'Enabled GPS is required for this app to work properly. Would you like to enable it now?',
                      title: 'GPS Disabled'
                    }
                  )
                  .then(
                    function(res){
                      if (res) {
                        cordova.plugins.diagnostic.switchToLocationSettings();
                      }
                    }
                  );
                }
              },
              function(e) {
                $ionicPopup.alert({template: e.message, title: 'Error'});
              }
            );
          }
        }
      );

      gpsPromptDisplayed = true;
    }
  }

  var storagePromptDisplayed = false;
  function storagePrompt(){
    if (!storagePromptDisplayed) {
      storagePromptDisplayed = true;

      cordova.exec(function(kilobytes){
        var megabytesFree = Math.round(kilobytes / 1024);
        if ( megabytesFree < MIN_FREE_STORAGE_IN_MB ) {
          $ionicPopup.alert(
            {
              title: 'Not enough space',
              template: 'Please free some storage space - You have less than ' +
                        MIN_FREE_STORAGE_IN_MB +
                        'mb free, which could cause problems with the app.'
            }
          );
        } else {
          console.info('Free space: ' + megabytesFree + 'mb');
        }
      }, function(error){
        console.error(error);
      }, "File", "getFreeDiskSpace", []);


    }
  }

  $ionicPlatform.ready(function(){
    storagePrompt();
  });

  $scope.$on('dump.end', function(){
    gpsPrompt();
  });


  // run autodump on app resume, auth.regenerate or login. cordova only
  // internal flag 'exportInProgress' prevents db export from starting twice
  if (window.cordova) {
    document.addEventListener('resume', function(){
      Dump.autoDump(Sync.all);
    });

    $scope.$on('auth.login-go-to-menu', function(){
      Dump.autoDump(Sync.all);
    });

    $scope.$on('auth.regenerated', function(){
      window.cordova.getAppVersion.getVersionNumber(
        function (version) {
          if (version) {
            version = version.trim();
          }

          // check app version after starting up, if it's different than stored -
          // set dump_uploaded_after_update to 0 && init auto dump (will succeed if user is logged in)
          Settings.get('stored_app_version')
          .then(
            function(storedAppVersion){
              if (!storedAppVersion) {
                return null;
              }
              return storedAppVersion.trim();
            }
          )
          .then(
            function(storedAppVersion){
              if (!storedAppVersion || version !== storedAppVersion) {
                return Settings.set('stored_app_version', version)
                .then(
                  function(){
                    return Settings.set('dump_uploaded_after_update', 0)
                    .then(
                      function(){
                        $rootScope.$broadcast('$appUpdated');
                      }
                    );
                  }
                );
              } else {
                return $q.resolve();
              }
            }
          )
          .then(
            function(){
              Dump.autoDump(Sync.all);
            }
          );
        }
      );
    });
  }
})
.controller('MenuCtrl', function ($scope, $ionicPlatform, Account, $ionicHistory, $state, $ionicLoading, $ionicPopup, LogoutService, $ionicSideMenuDelegate, $cordovaGoogleAnalytics) {

  $scope.$on('$stateChangeSuccess', function(e, toState, toStateParams, fromState){
    if ($state.is('menu')) {
      $cordovaGoogleAnalytics.trackView('Main menu');
      $ionicHistory.clearHistory();
      Account.getCurrent().then(function(currentAccount){
        if (currentAccount) {
          $cordovaGoogleAnalytics.setUserId(currentAccount.phone);
        }
      });
    }
  });

  $scope.menuItems = [
    {
      label: 'Work Order',
      url: '#/work-orders/status/pending',
      icon: 'ion-hammer'

    },
    {
      label: 'Time sheet',
      url: '#/time-sheets',
      icon: 'ion-clock'
    },
    {
      label: 'Messages',
      url: '#/messages',
      icon: 'ion-compose'
    },
    {
      label: 'Purchase orders',
      url: '#/purchase-orders',
      icon: 'ion-android-cart',
      onlineOnly: true
    },
    {
      label: 'Settings',
      url: '#/settings',
      icon: 'ion-gear-b'
    }
  ];

  $scope.hideSideMenu = function(){
    if ($ionicSideMenuDelegate.isOpenLeft()) {
      $ionicSideMenuDelegate.toggleLeft();
    }
  };

  $scope.logout = function () {
    $ionicLoading.show({template: 'Logging out...'});
    LogoutService.logout().then(
      function () {
        $scope.hideSideMenu();
        $ionicLoading.hide();
        $ionicPopup.alert({title: 'Notification', template: 'You have been logged out.'}).then(function () {
          $state.go('company-code-prompt');
        });
      }
    );
  };
})
;
