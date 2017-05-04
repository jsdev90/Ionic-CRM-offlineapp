angular.module('app.signature', [])
.controller('SignWorkOrderCtrl', function ($scope, $timeout, $state, $stateParams, Storage, $ionicPopup, $cordovaToast, WorkOrder, TimeSheet, Type, SIGNATURE_EVENTS) {

    $scope.signatureOptions = {};

    $scope.previousState = {};

    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        $scope.previousState.params = fromParams;
        $scope.previousState.state = fromState;

        if (window.cordova && toState.name === 'sign-work-order') {
            screen.lockOrientation('landscape');
        }

        if (toState.name === 'sign-work-order') {

            Type.getTypesFor('signature').then(
                function(types){
                    
                    $scope.fileType = types[0];
                }
            );

            $timeout(function () {
                $scope.$broadcast(SIGNATURE_EVENTS.open);
            }, 1000);

            TimeSheet.getLastTimesheetForWorkOrderUuid($stateParams.uuid).then(function(timesheet){

                

                $scope.timeSheet = timesheet;
                
            });
        }
    });

    $scope.clearSignature = function () {
        $scope.$broadcast(SIGNATURE_EVENTS.clear);
    };

    $scope.saveSignature = function () {
        $scope.$broadcast(SIGNATURE_EVENTS.save);

        if ($scope.signatureOptions.notEmpty) {
            if (window.cordova) {
                screen.lockOrientation('portrait');
            }
            $ionicPopup.show({
                template: '<label>Signature owner name <input type="text" ng-model="signatureOptions.name"></label><br>' +
                '<label>Signature owner title <input type="text" ng-model="signatureOptions.title"></label>',
                title: 'Signature confirmation',
                scope: $scope,
                buttons: [
                    {
                        text: 'Cancel',
                        onTap: function(){
                            if (window.cordova)
                            screen.lockOrientation('landscape');
                        }
                    },
                    {
                        text: '<b>Save</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if ($scope.signatureOptions.name && $scope.signatureOptions.title) {
                                Storage.saveSignatureFile($scope.signatureOptions.dataUrl, {
                                    relatedObjectId: $scope.timeSheet.id,
                                    relatedObjectUuid: $scope.timeSheet.uuid,
                                    fileTypeId: $scope.fileType.id,
                                    signatureOwnerName: $scope.signatureOptions.name,
                                    signatureOwnerTitle: $scope.signatureOptions.title,
                                    description: $scope.signatureOptions.name + ', ' + $scope.signatureOptions.title
                                })
                                .then(
                                    function () {
                                        if (window.cordova) {
                                            $cordovaToast.showShortBottom('Signature has been saved.');
                                            screen.lockOrientation('portrait');
                                            $timeout(function () {
                                                if ($scope.previousState.state) {
                                                    screen.unlockOrientation();
                                                    $state.go($scope.previousState.state.name, $scope.previousState.params);
                                                }
                                            }, 500);
                                        }
                                    },
                                    function () {
                                        if (window.cordova) {
                                            if ($scope.previousState.state) {
                                                screen.unlockOrientation();
                                                $state.go($scope.previousState.state.name, $scope.previousState.params);
                                            }
                                        }
                                        $ionicPopup.alert({
                                            title: 'Error',
                                            template: 'Error storing signature.'
                                        });
                                    }
                                )
                                ;
                            } else {
                                $ionicPopup.alert({
                                    title: 'Please sign in first',
                                    template: 'Please enter signature owner name and title'
                                });
                                screen.lockOrientation('landscape');
                            }
                        }
                    }
                ]
            });

        } else {
            $ionicPopup.alert({title: 'Signature required', template: 'Signature is required to proceed.'});
        }

    };
})
;
