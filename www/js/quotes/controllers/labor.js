angular.module('app.quotes.controllers')
.controller('LaborCtrl', function($scope, $ionicPopup, $stateParams, $state, QuoteEntry, Asset){
    // Load labor entries and asset data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('labor')) {
            $scope.quoteUuid = $stateParams.quoteUuid;

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            reload();
        }
    });

    function reload(){
        QuoteEntry.getEntriesForQuoteUuidAndStepName($scope.quoteUuid, 'labor').then(
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
.controller('AddLaborCtrl', function($scope, $stateParams, $state, Type, Asset, QuoteEntry, $ionicPopup){
    $scope.quoteUuid = $stateParams.quoteUuid;
    $scope.timeRanges = [];
    for(var i = 0.25; i <= 12; i+=0.25){
        $scope.timeRanges.push(i);
    }

    $scope.labor = {};
    $scope.forms = {};

    // Get asset and dropdown options
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('add-labor')) {
            $scope.labor = {
                quoteUuid: $scope.quoteUuid
            };

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            Type.getTypesFor('quote_labor_rate').then(
                function(laborRates){
                    $scope.laborRateTypes = laborRates;
                }
            );

            Type.getTypesFor('quote_trade').then(
                function(tradeTypes){
                    $scope.laborTradeTypes = tradeTypes;
                }
            );
        }
    });

    // Validate form data and store in database
    $scope.submit = function(){
        save($scope.forms.laborForm, $scope.labor);
    };

    function save(form, labor){
        if (form.$valid) {
            labor.stepName = 'labor';
            labor.total = labor.hrs * labor.men;
            QuoteEntry.add(labor).then(
                function(){
                    $state.go('labor', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('EditLaborCtrl', function($scope, $q, $state, $stateParams, QuoteEntry, Type, Asset){
    // Load form data, populate dropdowns
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('edit-labor')){
            $scope.quoteEntryUuid = $stateParams.quoteEntryUuid;
            $scope.quoteUuid = $stateParams.quoteUuid;

            QuoteEntry.getByUuid($scope.quoteEntryUuid).then(function(labor){
                $scope.labor = labor;
            });

            Type.getTypesFor('quote_labor_rate').then(
                function(laborRates){
                    $scope.laborRateTypes = laborRates;
                }
            );

            Type.getTypesFor('quote_trade').then(
                function(tradeTypes){
                    $scope.laborTradeTypes = tradeTypes;
                }
            );

            Asset.getAssetForQuoteUuid($scope.quoteUuid)
            .then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            $scope.timeRanges = [];
            for(var i = 0.5; i <= 12; i+=0.5){
                $scope.timeRanges.push(i);
            }
        }
    });

    $scope.forms = {};

    // Validate and save labor data
    $scope.submit = function(){
        save($scope.forms.laborForm, $scope.labor);
    };

    function save(form, labor){
        if (form.$valid) {
            labor.stepName = 'labor';
            labor.total = labor.hrs * labor.men;
            QuoteEntry.update(labor).then(
                function(){
                    $state.go('labor', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            );
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
;
