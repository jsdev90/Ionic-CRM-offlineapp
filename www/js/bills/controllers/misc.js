angular.module('app.bills.controllers')
.controller('BillingMiscellaneousCtrl', function($scope, $ionicPopup, $state, $stateParams, BillingEntry, Asset, WorkOrder){

    function reload(){
        BillingEntry.getEntriesForAssetUuidLinkPersonWoIdAndStepName($scope.objectUuid, $scope.linkPersonWoId, 'miscellaneous').then(
            function(entries){
                $scope.billingEntries = entries;
            }
        );
    }

    // Load data related to miscellaneous list
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-misc')) {
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            reload();

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
        }
    });

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
})
.controller('BillingAddMiscCtrl', function($scope, $state, $stateParams, Equipment, $ionicPopup, BillingEntry, Asset){
    $scope.misc = {
        qty: 0,
        price: 0
    };
    $scope.forms = {};

    // Load data needed to create misc billing entry on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-add-misc')) {
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            $scope.misc = {
                assetUuid: $scope.objectUuid,
                linkPersonWoId: $scope.linkPersonWoId,
                qty: 0,
                price: 0
            };

            Asset.getAssetForUuid($scope.objectUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    // Validate and save
    $scope.submit = function(){
        save($scope.forms.miscForm, $scope.misc);
    };

    function save(form, misc){
        if (form.$valid) {
            misc.stepName = 'miscellaneous';
            misc.total = misc.qty * misc.price;
            BillingEntry.add(misc).then(
                function(){
                    $state.go('billing-misc', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('BillingEditMiscCtrl', function($scope, $state, $stateParams, Equipment, $ionicPopup, BillingEntry, Asset){
    // Load required data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-edit-misc')){
            $scope.billingEntryUuid = $stateParams.billingEntryUuid;
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            Asset.getAssetForUuid($scope.objectUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            BillingEntry.getByUuid($scope.billingEntryUuid).then(function(misc){
                $scope.misc = misc;
            });
        }
    });

    $scope.forms = {};

    function save(form, misc){
        if (form.$valid) {
            misc.stepName = 'miscellaneous';
            misc.total = misc.qty * misc.price;
            BillingEntry.update(misc).then(
                function(){
                    $state.go('billing-misc', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };

    // Validate and save
    $scope.submit = function(){
        save($scope.forms.miscForm, $scope.misc);
    };
})
;
