angular.module('app.quotes.controllers', [])
.controller('QuotesCtrl', function($scope, WorkOrder, Logger, SmartBack, $ionicPlatform, $ionicHistory, $stateParams, $state, $ionicPopup, Quote, Asset, Sync){

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('quotes')) {
            $scope.assetUuid = $stateParams.assetUuid;
            $scope.workOrderUuid = $state.params.workOrderUuid;
            if (localStorage.quoteInProgress) {
                Quote.remove(localStorage.quoteInProgress).then(
                    function(){
                        reload();
                    }
                );
            } else {
                reload();
            }
            delete localStorage.quoteInProgress;
        }
    });

    function reload(){
        Asset.getAssetForUuid($scope.assetUuid).then(function(asset){
            $scope.asset = asset;
        });

        WorkOrder.getByUuid($scope.workOrderUuid)
        .then(
            function(wo){


                $scope.workOrder = wo;

                Quote.getNewForAssetUuid($scope.assetUuid, wo.link_person_wo_id).then(
                    function(entries){
                        $scope.newQuotes = entries;
                    }
                );

                Quote.getExistingForAssetUuid($scope.assetUuid, wo.link_person_wo_id).then(
                    function(entries){
                        $scope.existingQuotes = entries;
                    }
                );

                Quote.getApprovedForAssetUuid($scope.assetUuid, wo.link_person_wo_id).then(
                    function(entries){

                        $scope.approvedQuotes = entries;
                    }
                );
            }
        );
    }

    var onBackButtonCallback = function(e){
        if ($state.is('quotes')) {
            e.stopPropagation();
            e.preventDefault();
            SmartBack.backToLastViewedStateNamed('assets.mode');
        }
    };

    $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
    $ionicPlatform.onHardwareBackButton(onBackButtonCallback);

    $scope.$on('sync.stop', function(){
        if ($state.is('quotes')) {
            reload();
        }
    });

    $scope.addEntry = function(){
        if ($scope.workOrder) {
          $state.go('scope-of-service', {assetUuid: $scope.assetUuid, linkPersonWoId: $scope.workOrder.link_person_wo_id}, {location: "replace"});
        } else {
          $ionicPopup.alert({title: 'Missing work order data, please try again. This error has been reported automatically. Redirecting to work orders list...'})
          .then(
            function(){
              Logger.warning('Missing work order data when creating quote entry for asset ' + $scope.assetUuid);
              $state.go('work-orders');
            }
          );
        }
    };

    $scope.onSend = function(quote){
        $ionicPopup.confirm({title: 'Confirmation', template: 'Please confirm that this is a final quote that will be sent. No edit option will be allowed.'})
        .then(function(res){
            if (res) {
                Quote.setReady(quote.uuid).then(
                    function(){
                        reload();
                    }
                );
            }
        });
    };

    $scope.onRemove = function(quote){
        $ionicPopup.confirm({title: 'Confirmation', template: 'Are you sure you want to delete selected quote?'})
        .then(function(res){
            if (res) {
                Quote.remove(quote.uuid).then(function(){
                    reload();
                });
            }
        });
    };
})
.controller('TotalCtrl', function($scope, $state, Logger, $cordovaCamera, $stateParams, Quote, QuoteEntry, Asset, Type, $ionicPopup, WorkOrder){

    var self = this;
    $scope.setForm = function(form){
        self.adjustForm = form;
    };

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('total')) {
            $scope.quoteUuid = $stateParams.quoteUuid;
            $scope.adjust = {
                quoteUuid: $scope.quoteUuid
            };

            QuoteEntry.getEntriesForQuoteUuid($scope.quoteUuid)
            .then(function(entries){
                $scope.quoteEntries = entries;

                var stepNames = [];
                entries.forEach(function(entry){
                    if (stepNames.indexOf(entry.step_name) === -1) {
                        stepNames.push(entry.step_name);
                    }
                });

                var steps = {};
                stepNames.forEach(function(stepName){
                    steps[stepName] = {
                        entries: [],
                        total: 0
                    };
                    entries.forEach(function(entry){
                        if (entry.step_name === stepName) {
                            steps[stepName].entries.push(entry);
                            steps[stepName].total += entry.total ? (parseFloat(entry.total)) : 0;
                        }
                    });
                });
                $scope.steps = steps;

                $scope.sumStepsCost = 0;
                angular.forEach($scope.steps, function(step){
                    $scope.sumStepsCost+=step.total;
                });
            });

            Type.getAll().then(function(types){
                var typesAssocArray = {};
                types.forEach(function(type){
                    typesAssocArray[type.id] = type;
                });
                $scope.types = typesAssocArray;
            });

            Quote.getByUuid($scope.quoteUuid)
            .then(function(quote){
                if (quote){
                    $scope.quote = quote;
                    $scope.adjust.priceVerified = !!quote.price_verified_by_supplier;
                    $scope.adjust.contact = quote.contact_number;
                    $scope.adjust.name = quote.contact_name;
                    return Asset.getAssetForUuid(quote.asset_uuid);
                }
                else {
                    return false;
                }
            })
            .then(function(asset){
                $scope.asset = asset;

                WorkOrder.getByLinkPersonWoId($scope.quote.link_person_wo_id).then(function(wo){
                    $scope.wo = wo;
                });
            });
        }
    });

    $scope.save = function(adjust){
        var form = self.adjustForm;
        if (form.$valid) {
            var quote = $scope.quote;
            if (quote) {
              Quote.update({description: quote.description, unitDown: quote.unit_down, status: quote.status, contactName: adjust.name, contactNumber: adjust.contact, priceVerified: adjust.priceVerified, uuid: quote.uuid})
              .then(function(){
                  QuoteEntry.getEntriesForQuoteUuid(quote.uuid)
                  .then(
                    function(entries){
                      // if added any entries, proceed without deleting quote
                      // otherwise, delete it.
                      if (entries.length){
                        delete localStorage.quoteInProgress;
                        $state.go('quotes', {assetUuid: $scope.asset.uuid, workOrderUuid: $scope.wo.uuid}, {location: "replace"});
                      } else {
                        $state.go('quotes', {assetUuid: $scope.asset.uuid, workOrderUuid: $scope.wo.uuid}, {location: "replace"});
                      }
                    }
                  );
              });
            } else {
              $ionicPopup.alert({title: 'Error', template: 'Invalid quote'})
              .then(
                function(){
                  Logger.warning('Trying to edit removed quote - asset uuid ' + $scope.asset.uuid);
                  $state.go('quotes', {assetUuid: $scope.asset.uuid, workOrderUuid: $scope.wo.uuid}, {location: "replace"});
                }
              );
            }
        } else {
            form.$submitted = true;
            $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
        }
    };

    $scope.addPricingFile = function(){
      var options = {
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
          allowEdit: false,
          encodingType: Camera.EncodingType.JPEG,
          quality: 100,
          mediaType: Camera.MediaType.ALLMEDIA
      };

      // Camera plugin is recommended for file pickers like ours.
      $cordovaCamera.getPicture(options)
      .then(
        function(fileData){
          console.log(fileData);
        }
      )
      .catch(
        function(e){
          console.error(e);
        }
      );
    };
})
;
