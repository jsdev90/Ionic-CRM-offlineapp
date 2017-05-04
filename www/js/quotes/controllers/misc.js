angular.module('app.quotes.controllers')
.controller('MiscellaneousCtrl', function($scope, $ionicPopup, $state, $stateParams, QuoteEntry, Asset){

    function reload(){
        QuoteEntry.getEntriesForQuoteUuidAndStepName($scope.quoteUuid, 'miscellaneous').then(
            function(entries){
                $scope.quoteEntries = entries;
            }
        );
    }

    // Load data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('miscellaneous')) {
            $scope.quoteUuid = $stateParams.quoteUuid;

            reload();

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

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
.controller('AddMiscCtrl', function($scope, $state, $stateParams, Equipment, $ionicPopup, QuoteEntry, Asset){
    $scope.misc = {
        qty: 0,
        price: 0
    };
    $scope.forms = {};

    // Load data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('add-misc')) {
            $scope.quoteUuid = $stateParams.quoteUuid;
            $scope.misc = {
                quoteUuid: $scope.quoteUuid,
                qty: 0,
                price: 0
            };

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    // Validate & store
    $scope.submit = function(){
        save($scope.forms.miscForm, $scope.misc);
    };

    function save(form, misc){
        if (form.$valid) {
            misc.stepName = 'miscellaneous';
            misc.total = misc.qty * misc.price;
            QuoteEntry.add(misc).then(
                function(){
                    $state.go('miscellaneous', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('EditMiscCtrl', function($scope, $state, $stateParams, Equipment, $ionicPopup, QuoteEntry, Asset){

    // Load data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('edit-misc')){
            $scope.quoteEntryUuid = $stateParams.quoteEntryUuid;
            $scope.quoteUuid = $stateParams.quoteUuid;

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            QuoteEntry.getByUuid($scope.quoteEntryUuid).then(function(misc){
                $scope.misc = misc;
            });
        }
    });

    $scope.forms = {};

    function save(form, misc){
        if (form.$valid) {
            misc.stepName = 'miscellaneous';
            misc.total = misc.qty * misc.price;
            QuoteEntry.update(misc).then(
                function(){
                    $state.go('miscellaneous', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            );
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };

    // Validate & store
    $scope.submit = function(){
        save($scope.forms.miscForm, $scope.misc);
    };
})
;
