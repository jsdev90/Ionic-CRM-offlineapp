angular.module('app.quotes.controllers')
.controller('EquipmentCtrl', function($scope, $ionicPopup, $state, $stateParams,QuoteEntry, Asset){
    // Load asset for passed quote uuid
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('equipment')) {
            $scope.quoteUuid = $stateParams.quoteUuid;

            // Load quote entries
            reload();

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    // Load quote entries for current step (as in the billing section)
    function reload(){
        QuoteEntry.getEntriesForQuoteUuidAndStepName($scope.quoteUuid, 'equipment').then(
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
.controller('AddEquipmentCtrl', function($scope, $state, $stateParams, Equipment, QuoteEntry, $ionicPopup, Asset){
    // Load required data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('add-equipment')) {
            $scope.quoteUuid = $stateParams.quoteUuid;
            $scope.equipment = {
                quoteUuid: $scope.quoteUuid
            };

            Equipment.getAvailableItems().then(function(availableItems){
                $scope.availableItems = availableItems;
            });

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );
        }
    });

    $scope.forms = {};

    // Validate form and save equipment entry
    $scope.submit = function(){
        save($scope.forms.equipmentForm, $scope.equipment);
    };

    function save(form, equipment){
        if (form.$valid) {
            equipment.stepName = 'equipment';
            QuoteEntry.add(equipment).then(
                function(){
                    $state.go('equipment', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            )
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };
})
.controller('EditEquipmentCtrl', function($scope, $state, $stateParams, Asset, Equipment, QuoteEntry){
    // Load required data on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('edit-equipment')){
            $scope.quoteEntryUuid = $stateParams.quoteEntryUuid;
            $scope.quoteUuid = $stateParams.quoteUuid;

            Equipment.getAvailableItems().then(function(availableItems){
                $scope.availableItems = availableItems;
            });

            Asset.getAssetForQuoteUuid($scope.quoteUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            QuoteEntry.getByUuid($scope.quoteEntryUuid).then(function(equipment){
                
                $scope.equipment = equipment;
            });
        }
    });

    $scope.forms = {};

    // Validate and save data
    $scope.submit = function(){
        save($scope.forms.equipmentForm, $scope.equipment);
    };

    function save(form, equipment){
        if (form.$valid) {
            equipment.stepName = 'equipment';
            QuoteEntry.update(equipment).then(
                function(){
                    $state.go('equipment', {quoteUuid: $scope.quoteUuid}, {location: "replace"});
                }
            );
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    }
})
;
