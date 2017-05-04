angular.module('app.quotes.controllers')
.controller('MaterialCtrl', function($scope, $ionicPopup, $state, $stateParams, QuoteEntry, Asset, $ionicModal, Equipment){
    function reload(){
        QuoteEntry.getEntriesForQuoteUuidAndStepName($scope.quoteUuid, 'material').then(
            function(entries){
                $scope.quoteEntries = entries;
            }
        );
    }

    // Load materials list
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('material')) {
            $scope.quoteUuid = $stateParams.quoteUuid;

            reload();

            // prepare virtual table with item data (for faster querying)
            Equipment.prepareSeach();

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
.controller('AddMaterialCtrl', function($scope, $state, $timeout, Asset, $stateParams, $ionicModal, Equipment, Person, Type, $ionicPopup, QuoteEntry){
    $scope.material = {
        price: 0,
        qty: 0
    };

    $scope.forms = {};

    $scope.searchInput = "";

    $scope.data = {};

    $scope.increaseQty = function(){
        $scope.material.qty++;
    };

    $scope.decreaseQty = function(){
        if ($scope.material.qty >=1)
        $scope.material.qty--;
    };

    $scope.onChanged = function(){
        $scope.material.itemId = '';
        
    };

    // Load data on state change, poulate dropdowns
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('add-material')) {
            $scope.quoteUuid = $stateParams.quoteUuid;

            $scope.material = {
                price: 0,
                qty: 0,
                quoteUuid: $scope.quoteUuid
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

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    // Search for items in virtual items table
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
    $ionicModal.fromTemplateUrl('views/quotes/add-material-from-inventory.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modals.addMaterialFromInventory = modal;
    });

    $ionicModal.fromTemplateUrl('views/quotes/add-material-from-list.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modals.addMaterialFromList = modal;
    });

    $scope.addFromInventory = function(){
        $scope.modals.addMaterialFromInventory.show();
    };

    $scope.chooseItem = function(item, fromInventory){
        $scope.material.desc = item.description;
        $scope.material.partNumber = item.number;
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

    // Validate form and save data
    $scope.submit = function(){
        save($scope.forms.materialForm, $scope.material);
    };

    function save(form, material){
        if (form.$valid) {
            material.stepName = 'material';
            material.total = material.price * material.qty;
            QuoteEntry.add(material).then(
                function(){
                    $state.go('material', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('EditMaterialCtrl', function($scope, $state, $stateParams, $timeout, Asset, $ionicModal, Equipment, Person, Type, $ionicPopup, QuoteEntry){

    $scope.forms = {};
    $scope.searchInput = "";
    $scope.data = {};

    // Load material data & populate dropdowns on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('edit-material')){
            $scope.quoteEntryUuid = $stateParams.quoteEntryUuid;
            $scope.quoteUuid = $stateParams.quoteUuid;

            QuoteEntry.getByUuid($scope.quoteEntryUuid).then(function(material){
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

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
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
    $ionicModal.fromTemplateUrl('views/quotes/add-material-from-inventory.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modals.addMaterialFromInventory = modal;
    });

    $ionicModal.fromTemplateUrl('views/quotes/add-material-from-list.html', {
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
        $scope.material.partNumber = item.number;
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

    // Validate & store data
    $scope.submit = function(){
        save($scope.forms.materialForm, $scope.material);
    };

    function save(form, material){
        if (form.$valid) {
            material.stepName = 'material';
            material.total = material.price * material.qty;
            QuoteEntry.update(material).then(
                function(){
                    $state.go('material', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            );
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
;
