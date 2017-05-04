angular.module('app.authentication.services', [])
.constant('AUTH_SERVER_URL', 'http://api.friendlycmms.com')
.factory('EndpointConfigurationProvider', function($http, Logger, $q, Account, AUTH_SERVER_URL){

    function getEndpointConfiguration(company){
        company.tag = company.tag ? company.tag : '';
        return $q(function(resolve, reject){
            $http({method: 'get', 'url': AUTH_SERVER_URL, params: company}).then(
                function(response){
                    var data = response.data;
                    if (!data.error) {
                        return Account.createAccount(data);
                    } else {
                        reject(data);
                    }
                },
                function(result){
                    Logger.error('Could not get endpoint configuration, status: ' + result.status);
                    reject({error: 'Connection error: status ' + result.status});
                }
            ).then(
                function(uuid){
                    return Account.setCurrent(uuid);
                },
                function(error){
                    Logger.warning('Error storing profile', error);
                    reject({error: 'Error storing profile'});
                }
            ).then(
                function(){
                    resolve();
                },
                function(error){
                    reject(error);
                }
            );
        });
    }

    return {
        getEndpointConfiguration: getEndpointConfiguration
    };
})
.factory('ConfirmationCodeProvider', ['$http', '$rootScope', '$q', 'Account', function($http, $rootScope, $q, Account){
    function getConfirmationCode(phone){
        return $q(function(resolve, reject){

            var phoneNumber = phone.countryCode ? phone.countryCode + phone.number : '';

            var currentAccount;
            Account.getCurrent()
            .then(
                function(_currentAccount){
                    currentAccount = _currentAccount;
                    return $http({'url': currentAccount.url + '/mobile-auth', method: 'post', data: {number: phoneNumber}})
                    .then(function(){
                        console.log('code requested');
                        $rootScope.$broadcast('auth.numberSubmitted');
                    });
                }
            )
            .then(
                function(){
                    return Account.updatePhone(currentAccount.uuid, phoneNumber);
                },
                function(result){
                    var response = result.data.response;
                    reject({error: response.error.message});
                }
            )
            .then(
                function(){
                    resolve();
                },
                function(error){
                    reject(error);
                }
            );
        });
    }

    return {
        getConfirmationCode: getConfirmationCode
    };
}])
.factory('AccessTokenProvider', function($http, $q, Account, $rootScope, $ionicPlatform){

    var version = 'NA';

    $ionicPlatform.ready(function(){
        if (window.cordova) {
            window.cordova.getAppVersion.getVersionNumber(function (v) {
                version = v;
            });
        }
    });

    function getAccessToken(confirmation){
        return $q(function(resolve, reject){

            var currentAccount;
            Account.getCurrent()
            .then(function(_currentAccount){
                currentAccount = _currentAccount;
                var dataUrl = currentAccount.url + '/mobile-auth/token';
                return $http({method: 'post', url: dataUrl, data: {code: confirmation.code, number: currentAccount.phone, device_type: 'android', device_token: currentAccount.device_token, app_version: version} });
            })
            .then(
                function(response){
                    var data = response.data.response;
                    var accessToken = data.access_token;
                    return Account.updateToken(currentAccount.uuid, accessToken).then(
                        function(){
                          return Account.updatePersonId(currentAccount.uuid, data.user.person_id);
                        }
                    )
                    .then(
                        function(){
                            return Account.updateUsername(currentAccount.uuid, data.user.username);
                        }
                    );
                },
                function(error){
                    reject(error);
                }
            ).then(
                function(){
                    $rootScope.$broadcast('token.new');
                    resolve();
                },
                function(error){
                    reject(error);
                }
            );
        });
    }

    return {
        getAccessToken: getAccessToken
    };
})
.factory('LogoutService', ['Account', '$http', '$q', '$ionicHistory', function(Account, $http, $q, $ionicHistory){

    var self = this;

    self.logout = function(){
        return $q(function(resolve) {

            var currentAccount;
            Account.getCurrent()
            .then(function (_currentAccount) {
                currentAccount = _currentAccount;
                return $http({method: 'get', url: currentAccount.url + '/auth/logout'}).then(
                    function(){
                        return Account.clearAccount(currentAccount.uuid);
                    },
                    function(){
                        return Account.clearAccount(currentAccount.uuid);
                    }
                );
            })
            .then(
                function () {
                    $ionicHistory.clearHistory();
                    resolve();
                }, function (error) {
                    $ionicHistory.clearHistory();
                    resolve();
                }
            );

        });
    };

    return self;
}])
.service('AuthInterceptor', function($rootScope, Account, $q, $ionicPlatform) {
    var self = this;

    $ionicPlatform.ready(function(){
        if (window.cordova && window.cordova.getAppVersion && !self.currentVersion) {
            window.cordova.getAppVersion.getVersionNumber(function (version) {
                self.currentVersion = version.trim();
            });
        }
    });

    function isApiUrlRequired(url){
        return url.indexOf('.sql') === -1 &&
        url.indexOf('.html') === -1 &&
        url.indexOf('http') === -1;
    }

    self.request = function (config) {
        return $q(function (resolve) {
            Account.getCurrent().then(
                function (currentAccount) {
                    config.headers['Authorization'] = 'Bearer ' + currentAccount.token;
                    config.headers['User-Info'] = 'App version: ' + self.currentVersion + ' Phone Number: ' + currentAccount.phone + ' Username: ' + currentAccount.username + ' Person id: ' + currentAccount.person_id;
                    config.timeout = 15 * 1000;

                    if (isApiUrlRequired(config.url)) {

                        config.url = currentAccount.url + config.url;
                    }

                    resolve(config);
                },
                function (error) {
                    resolve(config);
                }
            );
        });
    };

    self.responseError = function(rejection){
        var url = '';
        if (rejection && rejection.config && rejection.config.url) {
          url = rejection.config.url;
        }

        // Only broadcast unauthorized event when status is 401 or 498 and request is made
        // to any endpoint except the /auth ones
        if (
          [
            401, 498
          ].indexOf(rejection.status) > -1 &&
          url.indexOf('auth') === -1
        ) {
            $rootScope.$broadcast('unauthorized');
        }

        if (rejection.status == 429) {
          return Account.useFallbackUrl()
          .then(
            function(){
              return $q.reject(rejection);
            },
            function(){
              return $q.reject(rejection);
            }
          );
        }

        return $q.reject(rejection);
    };
})
;
