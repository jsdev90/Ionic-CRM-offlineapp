angular.module('app.authentication.controllers', [])
.config(['$stateProvider', function($stateProvider){
    // Register app routes
    $stateProvider
    .state(
        'company-code-prompt', {
            url: '/company-code',
            templateUrl: 'views/authentication/companyCodePrompt.html',
            controller: 'CompanyCodePromptCtrl'
        }
    )
    .state(
        'phone-prompt', {
            url: '/phone',
            templateUrl: 'views/authentication/phonePrompt.html',
            controller: 'PhonePromptCtrl'
        }
    )
    .state(
        'confirmation-code-prompt', {
            url: '/confirmation-code',
            templateUrl: 'views/authentication/confirmationCodePrompt.html',
            controller: 'ConfirmationCodePromptCtrl'
        }
    )
    ;
}])
.controller('CompanyCodePromptCtrl', function($scope, $state, $ionicLoading, NetworkCheck, $ionicPopup, EndpointConfigurationProvider){
    // This screen prompts user for company tag to get the
    // api configuration data
    $scope.company = {};

    $scope.showHelp = function(){
        $ionicPopup.alert(
            {
                title: 'Help',
                template: 'Need help? Contact our support: <p><a style="text-decoration: none" href="mailto:crm@friendly-solutions.com"><i class="ion-email"></i> crm@friendly-solutions.com</a></p><p><a style="text-decoration: none" href="tel:(847) 312-4567"><i class="ion-android-call"></i> (847) 312-4567</a></p>'
            }
        );
    };

    // Get endpoint configuration for given company tag
    $scope.getEndpointConfiguration = function(company){
        $ionicLoading.show();
        EndpointConfigurationProvider.getEndpointConfiguration(company).then(
            function(result){
                $ionicLoading.hide();
                $state.go('phone-prompt');
            },
            function(result){
                $ionicLoading.hide();
                NetworkCheck.isOffline().then(
                    function(){
                        $ionicPopup.alert({
                            title: 'No internet connection',
                            template: 'Please connect internet.'
                        });
                    },
                    function(){
                        $ionicPopup.alert({
                            title: 'Authentication error',
                            template: result.error
                        });
                    }
                );
            }
        );
    };
})
.controller('PhonePromptCtrl', function($scope, $state, NetworkCheck, Account, $ionicLoading, $ionicPopup, ConfirmationCodeProvider){
    $scope.countryCodes = [
        {
            label: 'Poland (+48)',
            value: '+48'
        },
        {
            label: 'USA (+1)',
            value: '+1'
        },
        {
            label: 'India (+91)',
            value: '+91'
        }
    ];

    $scope.phone = {
        countryCode: $scope.countryCodes[0].value,
        number: ''
    };

    // If current account is available, we pull default country code
    // from the api configuration value obtained in CompanyCodePromptCtrl
    Account.getCurrent().then(function(currentAccount){
       if (currentAccount) {
           $scope.phone.countryCode = currentAccount.default_country_prefix;
       }
    });

    // Fire request to api server, to get sms message with authorization token.
    // On success, jump to ConfirmationCodePromptCtrl and start listening
    // for incoming sms message.
    $scope.getConfirmationCode = function(phone){
        $ionicLoading.show();
        ConfirmationCodeProvider.getConfirmationCode(phone).then(
            function(){
                $ionicLoading.hide();
                $state.go('confirmation-code-prompt');
            }, function(result){

                $ionicLoading.hide();

                NetworkCheck.isOffline().then(
                    function(){
                        $ionicPopup.alert({
                            title: 'No internet connection',
                            template: 'Please connect internet.'
                        });
                    },
                    function(){
                        $ionicPopup.alert({
                            title: 'Authentication error',
                            template: result.error
                        });
                    }
                );
            })
        ;
    };

})
.controller('ConfirmationCodePromptCtrl', function($scope, $rootScope, Logger, $timeout, NetworkCheck, $state, $ionicHistory, $ionicLoading, $ionicPopup, AccessTokenProvider){

    // Prompt use for sms authorization code, allowing obtaining oauth2 bearer token
    // from the api.

    // This controller also sets up sms watching service, to automatically
    // paste & submit auth code retrieved in sms message

    $scope.confirmation = {
        code: ''
    };

    $rootScope.watchingSms = false;

    function smsCallback(e){
      var sms = e.data;
      if (sms.body) {
          var codeRegex = /\d{6}/;
          var confirmationCodeMatches = sms.body.match(codeRegex);
          if (confirmationCodeMatches && confirmationCodeMatches.length) {
              var confirmationCode = confirmationCodeMatches[0];
              $timeout(function(){
                  if (!$scope.confirmation.code || $scope.confirmation.code && !$scope.confirmation.code.length) {
                    $scope.confirmation.code = parseInt(confirmationCode);
                    $scope.$apply();
                    $scope.getAccessToken($scope.confirmation);
                  }
              });
          }
      }
    }

    $scope.$on('$stateChangeSuccess', function(){
      if ($state.is('confirmation-code-prompt')) {
        if (!!window.cordova) {
            try {
                if (SMS && !$rootScope.watchingSms) {
                    SMS.startWatch(function(){
                        $rootScope.watchingSms = true;
                        document.removeEventListener('onSMSArrive', smsCallback);
                        document.addEventListener('onSMSArrive', smsCallback);
                    }, function(){
                        Logger.error('failed to start watching sms messages');
                    });
                } else if (!SMS) {
                    Logger.warning('SMS plugin not available');
                }
            } catch (e){
                Logger.error('Exception in sms read plugin message interception', e);
            }
        }
      }
    });

    $scope.getAccessToken = function(confirmation){
        $ionicLoading.show();
        AccessTokenProvider.getAccessToken(confirmation).then(
            function(){
                confirmation.code = '';
                $ionicLoading.hide();
                $ionicHistory.clearHistory();

                if (window.cordova && SMS) {
                  //stop listening to sms messages on successful login
                  SMS.stopWatch(function(){
                    $rootScope.watchingSms = false;
                  });
                }

                $state.go('menu');
                $rootScope.$broadcast('auth.login-go-to-menu');

            },
            function(error){
                $ionicLoading.hide();
                NetworkCheck.isOffline().then(
                    function(){
                        $ionicPopup.alert({
                            title: 'No internet connection',
                            template: 'Please connect internet.'
                        });
                    },
                    function(){

                        var message;
                        if (error && error.data.response && error.data.response && error.data.response.error.message) {
                            message = error.data.response.error.message ? error.data.response.error.message : 'Confirmation code error.';
                        } else {
                            message = 'Invalid confirmation code response.';
                        }

                        if (message && message.trim() === 'Invalid or missing fields.') {
                            message = 'Invalid SMS code. Please try again';
                        }

                        $ionicPopup.alert({
                            title: 'Authentication error',
                            template: message
                        });
                    }
                );
            }
        );
    };
})
;
