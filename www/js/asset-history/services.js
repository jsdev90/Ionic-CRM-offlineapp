angular.module('app.asset-history.services', [])
.factory('AssetHistory', function($http, $timeout, $ionicLoading, $ionicPopup, $q){
    var self = this;

    // Get asset history data using asset_id
    self.getByAssetId = function(assetId){
        $ionicLoading.show();

        return $http({url: '/mobile/assets/' + assetId + '/history', method: 'get'})
        .then(
            function(response){
                var data = response.data.response;
                return data.asset_history;
            },
            function(errorResponse){
                console.error(errorResponse);
                $ionicLoading.hide();
                $ionicPopup.alert({
                    title: 'Error',
                    template: 'Could not retrieve asset history'
                });
                return $q.reject(errorResponse);
            }
        );
    };

    return self;
})
.factory('AssetHistoryPhotos', function($http, $timeout, $ionicLoading, $ionicPopup, $q){
    var self = this;

    // Get asset history photos using link_asset_person_wo_id
    self.getByLinkAssetPersonWoId = function(linkAssetPersonWoId){
        $ionicLoading.show();

        return $http({url: '/mobile/files/photos?table_name=link_asset_person_wo&record_id=' + linkAssetPersonWoId, method: 'get'})
        .then(
            function(response){
                var data = response.data.response;
                return data.photos;
            },
            function(errorResponse){
                console.error(errorResponse);
                $ionicLoading.hide();
                $ionicPopup.alert({
                    title: 'Error',
                    template: 'Could not retrieve asset history photos'
                });
                return $q.reject(errorResponse);
            }
        );
    };

    return self;
})
.factory('AssetHistoryBills', function($http, $timeout, $ionicLoading, $ionicPopup, $q){
    var self = this;

    // Get asset history bills by asset_id and bill type
    self.getByAssetIdAndBillType = function(assetId, billType){
        $ionicLoading.show();

        return $http({url: '/mobile/assets/' + assetId + '/history/bills?type=' + billType, method: 'get'})
        .then(
            function(response){
                var data = response.data.response;
                return data.bill_entries;
            },
            function(errorResponse){
                console.error(errorResponse);
                $ionicLoading.hide();
                $ionicPopup.alert({
                    title: 'Error',
                    template: 'Could not retrieve asset history bills'
                });
                return $q.reject(errorResponse);
            }
        );
    };

    return self;
})
;
