angular.module('app.update-required', [])
.config(function($stateProvider){
    $stateProvider.state('update-required', {
        templateUrl: 'views/settings/update-required.html',
        controller: 'UpdateRequiredCtrl'
    });
})
.factory('VersionCheck', function($http, $rootScope, Logger, AUTH_SERVER_URL){
    var self = this;

    self.currentVersion = null;
    self.serverReturnedVersion = null;

    // Check app version with the server and compare it
    // with the value from config.xml.
    // If they are different, emit update-required event
    self.checkVersion = function(){

        if (window.cordova) {
            window.cordova.getAppVersion.getVersionNumber(function (version) {
                self.currentVersion = version.trim();

                $http({method: 'get', url: AUTH_SERVER_URL + '/app?tag=tcg', timeout: 2000})
                .then(function(versionResponse){
                    self.serverReturnedVersion = versionResponse.data.version.trim();

                    var currentVersion = self.currentVersion;
                    var serverReturnedVersion = self.serverReturnedVersion;

                    
                    

                    currentVersion = currentVersion.replace('.', '');
                    serverReturnedVersion = serverReturnedVersion.replace('.','');
                    currentVersion = parseFloat(currentVersion);
                    serverReturnedVersion = parseFloat(serverReturnedVersion);

                    

                    if (serverReturnedVersion > currentVersion) {
                        $rootScope.$broadcast('versionCheck.update-required');
                    }
                },
                function(err){
                    $rootScope.$broadcast('versionCheck.error');
                    Logger.warning('Version check error', err);
                });
            });
        }


    };

    return self;
})
.controller('UpdateRequiredCtrl', function($scope, $cordovaGoogleAnalytics, $ionicPlatform, $ionicPopup, $state, VersionCheck, Sync){
    // Displays information about new version availability

    // Prevent user from exiting update notification screen
    var onBackButtonCallback = function(e){
        if ($state.is('update-required')) {
            e.stopPropagation();
            e.preventDefault();
            $state.go('update-required');
        }
    };

    $scope.$on('$stateChangeSuccess', function(){
        $cordovaGoogleAnalytics.trackEvent('Force Update', 'User prompted to update app from ' + VersionCheck.currentVersion + ' to ' + VersionCheck.serverReturnedVersion);
    });

    // Prompt user to sync app data.
    // If sync is successful, continue to update page
    $scope.openUpdatePage = function(){
        $ionicPopup.confirm({template: 'App will now sync to prevent data loss. Internet connection is required. Are you ready?'})
        .then(function(res){
            if (res) {
                Sync.all().then(
                    function(){
                        if (window.cordova) {
                            window.open('http://friendlycmms.com/tcg', '_system');
                            $cordovaGoogleAnalytics.trackEvent('Force Update', 'Clicked update button on ' + VersionCheck.currentVersion);
                        }
                    }
                );
            } else {
                $ionicPopup.alert({title: 'Aborted', template: 'Update aborted.'});
            }
        });
    };

    $scope.VersionCheck = VersionCheck;
    $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
    $ionicPlatform.onHardwareBackButton(onBackButtonCallback);
})
;
