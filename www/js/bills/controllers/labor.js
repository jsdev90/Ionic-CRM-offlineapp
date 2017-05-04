angular.module('app.bills.controllers')
.controller('BillingLaborCtrl', function($scope, $ionicPopup, $stateParams, $state, BillingEntry, Asset, WorkOrder){
    // Load labor entries list and related asset & WO
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-labor')) {
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            Asset.getAssetForUuid($scope.objectUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            WorkOrder.getByLinkPersonWoId($scope.linkPersonWoId).then(
                function(wo){
                    $scope.wo = wo;
                }
            );

            reload();
        }
    });

    function reload(){
        BillingEntry.getEntriesForAssetUuidLinkPersonWoIdAndStepName($scope.objectUuid, $scope.linkPersonWoId, 'labor').then(
            function(entries){
                $scope.billingEntries = entries;
            }
        );
    }

    $scope.onSend = function(billingEntry){
        $ionicPopup.confirm({title: 'Confirmation', template: 'Please confirm that this is a final billing entry that will be sent. No edit option will be allowed.'})
        .then(function(res){
            if (res) {
                BillingEntry.setReady(billingEntry.uuid).then(
                    function(){
                        reload();
                    }
                );
            }
        });
    };

    $scope.remove = function(billingEntry){
        $ionicPopup.confirm({template: 'Are you sure you want to remove this entry?', title: 'Confirmation'})
        .then(function(res){
            if(res){
                BillingEntry.remove(billingEntry.uuid).then(
                    function(){
                        reload();
                    }
                );
            }
        });
    };

})
.controller('BillingAddLaborCtrl', function($scope, $stateParams, $state, Type, Asset, BillingEntry, $ionicPopup){
    $scope.objectUuid = $stateParams.objectUuid;
    $scope.linkPersonWoId = $state.params.linkPersonWoId;

    $scope.timeRanges = [];
    for(var i = 0.25; i <= 12; i+=0.25){
        $scope.timeRanges.push(i);
    }

    $scope.labor = {};
    $scope.forms = {};

    // Get data needed to create labor entry
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-add-labor')) {
            $scope.labor = {
                assetUuid: $scope.objectUuid,
                linkPersonWoId: $scope.linkPersonWoId
            };

            Asset.getAssetForUuid($scope.objectUuid).then(
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

    // Validate labor form and store in database
    $scope.submit = function(){
        save($scope.forms.laborForm, $scope.labor);
    };

    function save(form, labor){
        if (form.$valid) {
            labor.stepName = 'labor';
            labor.total = labor.hrs * labor.men;
            BillingEntry.add(labor).then(
                function(){
                    $state.go('billing-labor', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('BillingEditLaborCtrl', function($scope, $q, $state, $stateParams, BillingEntry, Type, Asset){
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-edit-labor')){
            $scope.billingEntryUuid = $stateParams.billingEntryUuid;
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            BillingEntry.getByUuid($scope.billingEntryUuid).then(function(labor){
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

            Asset.getAssetForUuid($scope.objectUuid).then(
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

    $scope.submit = function(){
        save($scope.forms.laborForm, $scope.labor);
    };

    function save(form, labor){
        if (form.$valid) {
            labor.stepName = 'labor';
            labor.total = labor.hrs * labor.men;
            BillingEntry.update(labor).then(
                function(){
                    $state.go('billing-labor', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
;
