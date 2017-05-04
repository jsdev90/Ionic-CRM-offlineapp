angular.module('app.assets.controllers', [])
.config(function($stateProvider){
  //Setup asset routes
  $stateProvider
  .state('create-asset', {
    url: '/create-asset/:address_uuid?work_order_uuid',
    templateUrl: 'views/assets/create.html',
    controller: 'CreateAssetCtrl'
  })
  .state('assets', {
    url: '/assets?work_order_uuid&address_uuid',
    templateUrl: 'views/assets/assets.html',
    controller: 'AssetsCtrl'
  })
  .state('assets.mode', {
    url: '/:mode',
    templateUrl: 'views/assets/list.html',
    controller: 'AssetsListCtrl'
  })
  .state('asset-details', {
    url: '/asset/:asset_uuid?readOnly',
    templateUrl: 'views/assets/details.html',
    controller: 'AssetDetailsCtrl'
  })
  .state('asset-work-performed', {
    url: '/asset/work-performed/:asset_uuid?workOrderUuid',
    templateUrl: 'views/assets/assetWorkPerformed.html',
    controller: 'AssetWorkPerformedCtrl'
  });
})
.controller('CreateAssetCtrl', function($scope, DBA, $state, Logger, Asset, Message, WorkOrder, $stateParams, $ionicPopup, $cordovaToast, $cordovaGoogleAnalytics){

  $scope.asset = {};
  $scope.forms = {};

  $cordovaGoogleAnalytics.trackView('Create asset');

  // TODO probably should remove these hardocded values, in favor of
  // pulling them from types table. Not sure why it is here in the first place.
  $scope.dropdownValues = {
    heatTypes: [
      {"key":"Gas", "value":"Gas"},
      {"key":"Electric", "value":"Electric"},
      {"key":"Hot Water", "value":"Hot Water"},
      {"key":"Steam", "value":"Steam"},
      {"key":"Oil", "value":"Oil"},
      {"key":"Building Supplied", "value":"Building Supplied"},
      {"key": "Heat Pump", "value": "Heat Pump"},
      {"key": "WSHP", "value": "WSHP"},
    ],
    systemTypes: [
      {"key":"RTU", "value":"RTU"},
      {"key":"Split System", "value":"Split System"},
      {"key":"Self Contained", "value":"Self Contained"},
      {"key":"Chilled Water AHU", "value":"Chilled Water AHU"},
      {"key":"Unit Heater", "value":"Unit Heater"},
      {"key":"Boiler", "value":"Boiler"},
      {"key":"EMS", "value":"EMS"},
      {"key":"Makeup Air Unit", "value":"Makeup Air Unit"},
      {"key":"Air Curtain", "value":"Air Curtain"},
      {"key":"Custom", "value":"Custom"},
      {"key":"Chiller", "value":"Chiller"},
      {"key":"Exhaust Fan / System", "value":"Exhaust Fan / System"},
      {"key":"Walkin Box (Refrigeration)", "value":"Walkin Box (Refrigeration)"},
      {"key":"Reach-in Case (Refrigeration)", "value":"Reach-in Case (Refrigeration)"},
      {"key":"VAV Box", "value":"VAV Box"},
      {"key":"LL Supplied / Mall Maintained", "value":"LL Supplied / Mall Maintained"},
      {"key":"AHU", "value":"AHU"},
      {"key":"CU", "value":"CU"},
      {"key":"WSHP", "value":"WSHP"},
      {"key":"HVAC", "value":"HVAC"}
    ],
    assetVoltage: [
      {"key":"120V/1PH", "value":"120V/1PH"},
      {"key":"208/230/1PH", "value":"208/230/1PH"},
      {"key":"208/230/3PH", "value":"208/230/3PH"},
      {"key":"460/3PH", "value":"460/3PH"}
    ],
    freshAir: [
      {"key":"Economizer", "value":"Economizer"},
      {"key":"Manual ODA Damper", "value":"Manual ODA Damper"},
      {"key":"None", "value":"None"}
    ],
    refrigerantTypes: [
      {"key":"R-22", "value":"R-22"},
      {"key":"R-410A", "value":"R-410A"},
      {"key":"R-407C", "value":"R-407C"},
      {"key":"R-134A", "value":"R-134A"},
      {"key":"R-404A", "value":"R-404A"},
      {"key":"Other", "value":"Other"}
    ],
    unitConditions:[
      {"key":"New", "value":"New"},
      {"key":"Very Good", "value":"Very Good"},
      {"key":"Good", "value":"Good"},
      {"key":"Fair", "value":"Fair"},
      {"key":"Poor", "value":"Poor"},
      {"key":"Replacement Recommended", "value":"Replacement Recommended"},
      {"key":"Down", "value":"Down"},
      {"key":"Abandoned", "value":"Abandoned"}
    ]
  };

  var workOrderUuid = $state.params.work_order_uuid;

  // Form submission handler
  $scope.submit = function(){
    $scope.save($scope.forms.assetForm, $scope.asset);
  };

  // Validate the form and store data
  $scope.save = function(form, assetData){
    form.$submitted = true;
    if (form.$valid) {
      assetData.source = 'mobile';
      assetData.sync = 0;

      // Store asset
      Asset.createAsset(assetData)
      .then(
        function(newAssetUuid){
          if (assetData.recommendations) {
            return Message.createMessage({
              description: assetData.recommendations,
              object_type: 'asset',
              object_uuid: newAssetUuid
            })
            .then(
              function(){
                return newAssetUuid;
              }
            );
          } else {
            return newAssetUuid;
          }
        }
      )
      .then(function(newAssetUuid){

        // Not used anymore:
        // DBA.query('update files set object_uuid = ?
        // where object_uuid = \'new_asset_uuid\'', [newAssetUuid]);

        if (workOrderUuid && newAssetUuid) {

          // If created asset is valid, ask user if it should be
          // bound to existing work order. Non assigned assets
          // will still be visible in the Site tab on assets list
          $ionicPopup.confirm(
            {
              template: 'Would you like to assign this asset to current work order?',
              title: 'Assignment',
              okText: 'Yes',
              cancelText: 'No'
            }
          ).then(
            function(res){
              if (res) {
                WorkOrder.assignAssetToWorkOrder({uuid: newAssetUuid}, {uuid: workOrderUuid})
                .then(
                  function(){
                    $state.go('assets.mode', {
                      work_order_uuid: workOrderUuid,
                      address_uuid: $stateParams.address_uuid,
                      mode: 'wo'
                    });
                  }
                );
              } else {
                $state.go('assets.mode', {
                  work_order_uuid: workOrderUuid,
                  address_uuid: $stateParams.address_uuid,
                  mode: 'site'
                });
              }
            }
          );
        }

        $scope.clear();
      },
      function(){
        Logger.warning('Could not create asset - asset data passed validation but it failed anyway.', assetData);
      }
    )
    ;
  } else {
    $ionicPopup.alert({title: 'Error', template: 'Fill required fields before continuing'});
  }
};

// Clear the asset form
$scope.clear = function(){
  if ($scope.forms.assetForm) $scope.forms.assetForm.$submitted = false;

  $scope.asset = {
    address_uuid: $stateParams.address_uuid,
    under_contract: 0
  };

};

$scope.clear();

  $scope.$on('$stateChangeSuccess', function(){
    if ($state.is('create-asset')) {
      $scope.clear();
    }
  });
})
.controller('AssetsCtrl', function($scope, $state, $stateParams, $cordovaGoogleAnalytics, Asset){
  // Controller for the asset list container. Not using default ionic tab
  // component for performance reasons.

  var activeTab = null;

  $scope.activeTabClass = function (tabName) {
    if (tabName === activeTab) {
      return 'button-positive';
    }
    return 'button-stable';
  };

  $scope.assetSummary = {};

  // Update asset number displayed on asset list tab headers
  function reloadAssetCounters(){
    Asset.getAssetsCountForTabs($scope.address_uuid, $scope.work_order_uuid)
    .then(
      function(assetSummary){
        $scope.assetSummary = assetSummary;
      }
    );
  }

  // Update counters on entering root state for assets list
  $scope.$on('$stateChangeSuccess', function (event, toState, toParams) {
    if ($state.is('assets.mode')) {
      $cordovaGoogleAnalytics.trackView('Assets list');
      $scope.address_uuid = $state.params.address_uuid;
      $scope.work_order_uuid = $state.params.work_order_uuid;

      reloadAssetCounters();

    }
    activeTab = $state.params.mode;
  });

  // Counters can be reloaded by emmiting event somewhere else in the app
  $scope.$on('assets.reloadCounters', function(){
    reloadAssetCounters();
  });

  $scope.toggleSite = function () {
    activeTab = 'site';
  };

  $scope.toggleWo = function () {
    activeTab = 'wo';
  };
})
.controller('AssetsListCtrl', function($scope, $rootScope, $ionicPlatform, BillingEntry, SmartBack, $state, Asset, WorkOrder, STORAGE_EVENTS, $stateParams, $ionicModal, $cordovaToast){

  $scope.editedAsset = {};
  $scope.modals = {};
  $scope.assets = [];

  // Reload assets on state change
  $scope.$on('$stateChangeSuccess', function(){
    if ($state.is('assets.mode')) {
      $scope.address_uuid = $state.params.address_uuid;
      $scope.work_order_uuid = $state.params.work_order_uuid;
      $scope.mode = $state.params.mode;
      loadData();


    }
  });

  // Override default back button action
  var onBackButtonCallback = function(e){
    if ($state.is('assets.mode')) {
      e.stopPropagation();
      e.preventDefault();
      // Go to last occurence of work-orders-view in history stack
      SmartBack.backToLastViewedStateNamed('work-orders-view');
    }
  };

  $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
  $ionicPlatform.onHardwareBackButton(onBackButtonCallback);

  // Update billing buttons with proper billing entry numbers
  function mapEntriesCountToAsset(asset){
    asset.entriesCount = {
      labor: 0,
      material: 0,
      equipment: 0,
      miscellaneous: 0
    };
    BillingEntry.getEntriesCountForObjectUuidAndLinkPersonWoIdGroupedByStep(asset.uuid, asset.link_person_wo_id).then(
      function(entriesCount){
        entriesCount.forEach(function(data){
          asset.entriesCount[data.step_name] = data.entriesCount;
        });
      }
    );
  }

  // Load data depending on curren tab. Can either be wo, site or legacy
  // (legacy is currently disabled)
  function loadData(){
    if ($scope.mode == 'wo') {
      Asset.getAssetsForWorkOrderUuid($scope.work_order_uuid)
      .then(
        function(assets){
          $scope.readOnly = false;
          assets.map(function(asset){
            mapEntriesCountToAsset(asset);
          });
          $scope.assets = assets;
        }
      );
    } else if ($scope.mode == 'site') {
      Asset.getAssetsForAddressUuid($scope.address_uuid, $scope.work_order_uuid)
      .then(
        function(assets){
          $scope.readOnly = false;
          assets.map(function(asset){
            mapEntriesCountToAsset(asset);
          });
          $scope.assets = assets;
        }
      );
    } else if ($scope.mode == 'legacy') {
      Asset.getLegacyAssets($scope.work_order_uuid)
      .then(
        function(assets){
          $scope.readOnly = true;
          assets.map(function(asset){
            mapEntriesCountToAsset(asset);
          });
          $scope.assets = assets;
        }
      );
    }
  }

  // Reload asset list on saving photos to make sure
  // that thumbs are displayed properly
  $scope.$on(STORAGE_EVENTS.photoSaved, function(){
    loadData();
  });

  $ionicModal.fromTemplateUrl('views/images/_add_photo.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.modals.addPhoto = modal;
  });

  $scope.showAddPhotoModal = function(uuid){
    $scope.object = {uuid: uuid};
    $scope.modals.addPhoto.show();
  };

  $scope.dismissAddPhotoModal = function(asset){
    $scope.modals.addPhoto.hide();
  };

  // Assign asset to work order
  $scope.assign = function(editedAsset, workOrder){


    WorkOrder.assignAssetToWorkOrder(editedAsset, workOrder)
    .then(
      function(){
        loadData();
        $rootScope.$broadcast('assets.reloadCounters');
      },
      function(error){
      }
    );
  };

})
.controller('AssetDetailsCtrl', function($scope, $state, $ionicPlatform, $stateParams, SmartBack, Asset, DEFAULT_DISPLAY_DATE_FORMAT, $cordovaGoogleAnalytics){
  var uuid = $stateParams.asset_uuid;
  $scope.asset = {};
  $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

  // When readOnly parameter is passed to this state, the use is not able to alter
  // the asset in any way
  $scope.readOnly = $state.params.readOnly;

  // Reload asset data on state change
  $scope.$on('$stateChangeSuccess', function(e, toState, toParams, fromState, fromParams){
    if ($state.is('asset-details')) {
      $cordovaGoogleAnalytics.trackView('Assets details');

      Asset.getAssetForUuid(uuid)
      .then(
        function(asset){
          $scope.asset = asset;
        }
      );
    }
  });

  var onBackButtonCallback = function(e){
    if ($state.is('asset-details')) {
      e.stopPropagation();
      e.preventDefault();
      SmartBack.backToLastViewedStateNamed('assets.mode');
    }
  };

  $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
  $ionicPlatform.onHardwareBackButton(onBackButtonCallback);
})
.controller('AssetWorkPerformedCtrl', function($scope, $state, $stateParams, Asset, $cordovaGoogleAnalytics){

  // Work performed is stored in work_orders_assets table
  $cordovaGoogleAnalytics.trackView('Assets - work performed');

  var prevState = {};
  $scope.asset = {};

  // Reload asset data on state change
  $scope.$on('$stateChangeSuccess', function(e, toState, toParams, fromState, fromParams){
    prevState = {
      state: fromState,
      params: fromParams
    };

    if ($state.is('asset-work-performed')) {
      Asset.getAssetForUuid($stateParams.asset_uuid, $state.params.workOrderUuid).then(function(asset){
        $scope.asset = asset;
      });
    }
  });

  $scope.back = function(){
    $state.go(prevState.state.name, prevState.params, {location: 'replace'});
  };

  // Update work information stored in work_orders_assets on save
  $scope.save = function(){

    Asset.updateWorkPerformedForAssetUuidAndWorkOrderUuid($scope.asset.uuid, $state.params.workOrderUuid, $scope.asset.work_performed).then(
      function(){
        $state.go(prevState.state.name, prevState.params, {location: 'replace'});
      }
    );
  };
})
;
