angular.module('app.quotes.controllers')
// Check out labor, material or misc for the reference. Code here works the same way.
.controller('SubcontractorCtrl', function($scope, $ionicPopup, $state, $stateParams, QuoteEntry, Asset){
    $scope.quoteUuid = $stateParams.quoteUuid;
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('subcontractor')){
            $scope.quoteUuid = $stateParams.quoteUuid;
        }

        Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
            function(asset){
                $scope.asset = asset;
            }
        );

        reload();
    });

    function reload(){
        QuoteEntry.getEntriesForQuoteUuidAndStepName($scope.quoteUuid, 'subcontractor').then(
            function(entries){
                $scope.quoteEntries = entries;
            }
        );
    }

    $scope.remove = function(quoteEntry){
        $ionicPopup.confirm({template: 'Are you sure you want to remove this entry?', title: 'Confirmation'})
        .then(function(res){
            if(res){
                QuoteEntry.remove(quoteEntry.uuid).then(
                    function(){
                        reload();
                    }
                );
            }
        });
    };
})
.controller('AddSubcontractorCtrl', function($scope, $ionicModal, $state, $stateParams, $ionicPopup, QuoteEntry, Type, Asset, DBA){
    $scope.quoteUuid = $stateParams.quoteUuid;
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('add-subcontractor')){
            $scope.quoteUuid = $stateParams.quoteUuid;
            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            Type.getTypesFor('subcontract_trade').then(function(subcontractorTypes){
                $scope.subcontractorTypes = subcontractorTypes;
            });
        }
    });

    $scope.subcontractor = {};
    $scope.forms = {};

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('add-subcontractor')){
            $scope.subcontractor = {
                stepName: 'subcontractor',
                quoteUuid: $scope.quoteUuid
            };
        }
    });

    $scope.submit = function(){
        save($scope.forms.subcontractorForm, $scope.subcontractor);
    };

    function save(form, subcontractor){
        if (form.$valid) {
            QuoteEntry.add(subcontractor).then(
                function(newQuoteEntry){
                    DBA.query('update files set object_uuid = ? where object_uuid = ?', [newQuoteEntry.uuid, $scope.quoteUuid]);
                    $state.go('subcontractor', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            );
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('EditSubcontractorCtrl', function($scope, $ionicModal, $state, $stateParams, $ionicPopup, QuoteEntry, Type, Asset, DBA){
    $scope.forms = {};
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('edit-subcontractor')){
            $scope.quoteEntryUuid = $stateParams.quoteEntryUuid;
            $scope.quoteUuid = $stateParams.quoteUuid;

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            Type.getTypesFor('subcontract_trade').then(function(subcontractorTypes){
                $scope.subcontractorTypes = subcontractorTypes;
            });

            QuoteEntry.getByUuid($scope.quoteEntryUuid).then(function(subcontractor){
                $scope.subcontractor = subcontractor;
            });
        }
    });

    $scope.submit = function(){
        save($scope.forms.subcontractorForm, $scope.subcontractor);
    };

    function save(form, subcontractor){
        if (form.$valid) {
            QuoteEntry.update(subcontractor).then(
                function(){
                    
                    DBA.query('update files set object_uuid = ? where object_uuid = ?', [$scope.quoteEntryUuid, $scope.quoteUuid]);
                    $state.go('subcontractor', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            );
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
;
