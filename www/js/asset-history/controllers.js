angular.module('app.asset-history.controllers', [])
.config(
  function($stateProvider){

    // Setup routes
    $stateProvider
    .state('asset-history', {
      url: '/asset-history/:assetId',
      templateUrl: 'views/asset-history/list.html',
      controller: 'AssetHistoryListCtrl'
    })
    .state('asset-history-photos', {
      url: '/asset-history/:linkAssetPersonWoId/photos',
      templateUrl: 'views/asset-history/photos.html',
      controller: 'AssetHistoryPhotosCtrl'
    })
    .state('asset-history-billing', {
      url: '/asset-history/:assetId/billing?type',
      templateUrl: 'views/asset-history/billing-preview.html',
      controller: 'AssetHistoryBillingPreviewCtrl'
    });
  }
)
.controller('AssetHistoryListCtrl', function($scope, $state, $timeout, $ionicLoading, $ionicPopup, AssetHistory){
  $scope.assetHistory = [];
  $scope.params = $state.params;

  // Reload data on router state change
  $scope.$on('$stateChangeSuccess', function(){
    if ($state.is('asset-history')) {
      $scope.loading = true;
      AssetHistory.getByAssetId($state.params.assetId)
      .then(
        function(assetHistory){
          $scope.loading = false;
          $scope.assetHistory = assetHistory;
          $timeout(function(){
            $ionicLoading.hide();
          });
        },
        function(error){
          $scope.loading = false;
          $ionicLoading.hide();
          $ionicPopup.alert({
            title: 'Error',
            template:
            error.message ? error.message : 'Could not load asset history for asset id ' + $state.params.assetId
          });
        }
      );
    }
  });
})
.controller('AssetHistoryPhotosCtrl', function($scope, $state, $ionicLoading, $timeout, AssetHistoryPhotos){
  $scope.params = $state.params;

  $scope.$on('$stateChangeSuccess', function(){
    // Reload data on router state change

    $scope.photos = [];
    if ($state.is('asset-history-photos')) {
      AssetHistoryPhotos.getByLinkAssetPersonWoId($scope.params.linkAssetPersonWoId)
      .then(
        function(photos){
          $timeout(function(){
            $ionicLoading.hide();
          });
          $scope.photos = photos;
        }
      );
    }
  });
})
.controller('AssetHistoryBillingPreviewCtrl', function($scope, $timeout, $ionicLoading, $state, AssetHistoryBills){
  $scope.assetHistoryBills = [];
  $scope.params = $state.params;

  $scope.$on('$stateChangeSuccess', function(){
    // Reload data on router state change
    if ($state.is('asset-history-billing')) {
      AssetHistoryBills.getByAssetIdAndBillType($state.params.assetId, $state.params.type)
      .then(
        function(bills){
          $timeout(function(){
            $ionicLoading.hide();
          });
          $scope.assetHistoryBills = bills;
        }
      );
    }
  });
})
;
