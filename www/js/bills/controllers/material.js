angular.module('app.bills.controllers')
.controller('BillingMaterialCtrl', function($scope, $ionicPopup, $state, $stateParams, BillingEntry, Asset, $ionicModal, Equipment, WorkOrder){

    function reload(){
        BillingEntry.getEntriesForAssetUuidLinkPersonWoIdAndStepName($scope.objectUuid, $scope.linkPersonWoId, 'material').then(
            function(entries){
                $scope.billingEntries = entries;
            }
        );
    }

    // Load material list
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-material')) {
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            Equipment.prepareSeach();

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
.controller('BillingAddMaterialCtrl', function($scope, $state, $timeout, Asset, $stateParams, $ionicModal, Equipment, Person, Type, $ionicPopup, BillingEntry){
    $scope.material = {
        price: 0,
        qty: 0
    };

    $scope.forms = {};

    $scope.searchInput = "";

    $scope.data = {};

    // Increase material quantity
    $scope.increaseQty = function(){
        $scope.material.qty++;
    };

    // Decrease material quantity
    $scope.decreaseQty = function(){
        if ($scope.material.qty >=1)
        $scope.material.qty--;
    };

    $scope.onChanged = function(){
        $scope.material.itemId = '';
        
    };

    // Load related material data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-add-material')) {
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            $scope.material = {
                price: 0,
                qty: 0,
                assetUuid: $scope.objectUuid,
                linkPersonWoId: $scope.linkPersonWoId
            };

            Person.getSuppliers().then(function(suppliers){
                $scope.suppliers = suppliers;
            });

            Equipment.getInventory().then(function(inventory){
                $scope.inventory = inventory;
            });

            Equipment.getAllItems().then(function(items){
                
                $scope.items = items;
            });

            Type.getTypesFor('material_lead_time').then(function(leadTimeTypes){
                $scope.leadTimeTypes = leadTimeTypes;
            });

            Asset.getAssetForUuid($scope.objectUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    // Search for items
    $scope.search = function(){
        var matches = [];

        Equipment.searchItems($scope.data.search).then(function(items){
            matches = items;
        });

        $timeout(function(){
            $scope.matches = matches;
        }, 1000);
    };

    // Define modals
    $scope.modals = {};
    $ionicModal.fromTemplateUrl('views/billing/add-material-from-inventory.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modals.addMaterialFromInventory = modal;
    });

    $ionicModal.fromTemplateUrl('views/billing/add-material-from-list.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modals.addMaterialFromList = modal;
    });

    // Show item picker (from inventory)
    $scope.addFromInventory = function(){
        $scope.modals.addMaterialFromInventory.show();
    };

    // Choose item
    $scope.chooseItem = function(item, fromInventory){
        $scope.material.desc = item.description;
        $scope.material.itemCode = item.number;
        $scope.material.fromInventory = fromInventory || 0;
        $scope.material.itemId = item.id;

        $scope.closeAddFromInventory();
        $scope.closeAddFromList();
    };

    // Show item picker (from item list)
    $scope.addFromList = function(){
        $scope.modals.addMaterialFromList.show();
    };

    $scope.closeAddFromList = function(){
        $scope.modals.addMaterialFromList.hide();
    };

    $scope.closeAddFromInventory = function(){
        $scope.modals.addMaterialFromInventory.hide();
    };

    // Validate and save material data in database
    $scope.submit = function(){
        save($scope.forms.materialForm, $scope.material);
    };

    function save(form, material){
        if (form.$valid) {
            material.stepName = 'material';
            material.total = material.price * material.qty;
            BillingEntry.add(material).then(
                function(){
                    $state.go('billing-material', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('BillingEditMaterialCtrl', function($scope, $state, $stateParams, $timeout, Asset, $ionicModal, Equipment, Person, Type, $ionicPopup, BillingEntry){

    $scope.forms = {};
    $scope.searchInput = "";
    $scope.data = {};

    // Load related data necessary to edit material entry
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('billing-edit-material')){
            $scope.billingEntryUuid = $stateParams.billingEntryUuid;
            $scope.objectUuid = $stateParams.objectUuid;
            $scope.linkPersonWoId = $state.params.linkPersonWoId;

            BillingEntry.getByUuid($scope.billingEntryUuid).then(function(material){
                $scope.material = material;
            });

            Person.getSuppliers().then(function(suppliers){
                $scope.suppliers = suppliers;
            });

            Equipment.getInventory().then(function(inventory){
                $scope.inventory = inventory;
            });

            Equipment.getAllItems().then(function(items){
                $scope.items = items;
            });

            Type.getTypesFor('material_lead_time').then(function(leadTimeTypes){
                $scope.leadTimeTypes = leadTimeTypes;
            });

            Asset.getAssetForUuid($scope.objectUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    $scope.increaseQty = function(){
        $scope.material.qty++;
    };

    $scope.decreaseQty = function(){
        if ($scope.material.qty >=1)
        $scope.material.qty--;
    };

    $scope.search = function(){
        var matches = [];

        Equipment.searchItems($scope.data.search).then(function(items){
            matches = items;
        });

        $timeout(function(){
            $scope.matches = matches;
        }, 1000);
    };

    // Prepare modals
    $scope.modals = {};
    $ionicModal.fromTemplateUrl('views/billing/add-material-from-inventory.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modals.addMaterialFromInventory = modal;
    });

    $ionicModal.fromTemplateUrl('views/billing/add-material-from-list.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modals.addMaterialFromList = modal;
    });

    $scope.addFromInventory = function(){
        $scope.modals.addMaterialFromInventory.show();
    };

    $scope.onChanged = function(){
        $scope.material.itemId = '';
        
    };

    $scope.chooseItem = function(item, fromInventory){
        $scope.material.desc = item.description;
        $scope.material.itemCode = item.number;
        $scope.material.fromInventory = fromInventory || 0;
        $scope.material.itemId = item.id;

        $scope.closeAddFromInventory();
        $scope.closeAddFromList();
    };

    $scope.addFromList = function(){
        $scope.modals.addMaterialFromList.show();
    };

    $scope.closeAddFromList = function(){
        $scope.modals.addMaterialFromList.hide();
    };

    $scope.closeAddFromInventory = function(){
        $scope.modals.addMaterialFromInventory.hide();
    };

    // Validate and save material entry
    $scope.submit = function(){
        save($scope.forms.materialForm, $scope.material);
    };

    function save(form, material){
        if (form.$valid) {
            material.stepName = 'material';
            material.total = material.price * material.qty;
            BillingEntry.update(material).then(
                function(){
                    $state.go('billing-material', {objectUuid: $scope.objectUuid, linkPersonWoId: $scope.linkPersonWoId}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
;
