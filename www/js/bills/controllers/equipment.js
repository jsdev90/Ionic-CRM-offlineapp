angular.module('app.bills.controllers')
.controller('BillingEquipmentCtrl', function($scope, $state, $ionicPopup, $stateParams,BillingEntry, Asset, WorkOrder){
    //List equipment entries

    // Load equipment list on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-equipment')) {
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

    function reload(){
        BillingEntry.getEntriesForAssetUuidLinkPersonWoIdAndStepName($scope.objectUuid, $scope.linkPersonWoId, 'equipment').then(
            function(entries){
                
                $scope.billingEntries = entries;
            }
        );
    }

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
.controller('BillingAddEquipmentCtrl', function($scope, $state, $stateParams, Equipment, BillingEntry, $ionicPopup, Asset){

    // Load data required to create billing entry
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-add-equipment')) {
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;
            $scope.equipment = {
                assetUuid: $scope.objectUuid,
                linkPersonWoId: $scope.linkPersonWoId
            };

            

            Equipment.getAvailableItems().then(function(availableItems){
                $scope.availableItems = availableItems;
            });

            Asset.getAssetForUuid($scope.objectUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    $scope.forms = {};

    // Validate form, then store in DB
    $scope.submit = function(){
        save($scope.forms.equipmentForm, $scope.equipment);
    };

    function save(form, equipment){
        if (form.$valid) {
            equipment.stepName = 'equipment';
            BillingEntry.add(equipment).then(
                function(){
                    $state.go('billing-equipment', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('BillingEditEquipmentCtrl', function($scope, $state, $stateParams, Asset, Equipment, BillingEntry){

    // Load data required to edit billing entry
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-edit-equipment')){
            $scope.billingEntryUuid = $stateParams.billingEntryUuid;
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            

            Equipment.getAvailableItems().then(function(availableItems){
                $scope.availableItems = availableItems;
            });

            Asset.getAssetForUuid($scope.objectUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            BillingEntry.getByUuid($scope.billingEntryUuid).then(function(equipment){
                
                $scope.equipment = equipment;
            });
        }
    });

    $scope.forms = {};

    // Validate form, then store in DB
    $scope.submit = function(){
        save($scope.forms.equipmentForm, $scope.equipment);
    };

    function save(form, equipment){
        if (form.$valid) {
            equipment.stepName = 'equipment';
            BillingEntry.update(equipment).then(
                function(){
                    $state.go('billing-equipment', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            );
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    }
})
;
