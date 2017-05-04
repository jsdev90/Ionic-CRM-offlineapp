angular.module('app.site-history.controllers', [])
    .config(function($stateProvider){
        $stateProvider
        .state('site-history', {
            url: '/site-history/:addressId',
            controller: 'SiteHistoryCtrl',
            templateUrl: 'views/site-history/view.html'
        })
        .state('site-history-photos', {
            url: '/site-history/:linkPersonWoId/photos',
            controller: 'SiteHistoryPhotosCtrl',
            templateUrl: 'views/site-history/photos.html'
        });
    })
    .controller('SiteHistoryCtrl', function($scope, $state, $timeout, Logger, $ionicPopup, $ionicLoading, SiteHistory, DEFAULT_DISPLAY_DATE_FORMAT){

        $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

        $scope.$on('$stateChangeSuccess', function(){
            if ($state.is('site-history')) {
                $scope.params = $state.params;
                $scope.currentPage = 0;
                $scope.lastPage = 1;
                $scope.history = [];
                $scope.loadData($state.params.addressId, $scope.currentPage + 1);
            }
        });

        $scope.loadData = function(addressId, page){
            $ionicLoading.show();
            return SiteHistory.getForAddressId(addressId, page)
            .then(function(data){
                $scope.lastPage = data.last_page;
                $scope.currentPage = page;
                Array.prototype.push.apply($scope.history, data.data);
                $timeout($ionicLoading.hide, 100);
            });
        };
    })
    .controller('SiteHistoryPhotosCtrl', function(NetworkCheck, $timeout, $scope, $state, $ionicPopup, $ionicModal, $ionicLoading, SiteHistoryPhotos){
        $scope.params = $state.params;
        $scope.$on('$stateChangeSuccess', function(){
            $scope.photos = [];

            if ($state.is('site-history-photos')) {

                SiteHistoryPhotos.getByLinkPersonWoId($scope.params.linkPersonWoId)
                .then(
                    function(photos){
                        $timeout($ionicLoading.hide, 100);
                        $scope.photos = photos;
                    }
                );
            }
        });
    })
;
