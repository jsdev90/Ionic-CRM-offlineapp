(function(){
    // Retrieve site history data and photos (online only)

    angular.module('app.site-history.services', [])
    .factory('SiteHistory', SiteHistory)
    .factory('SiteHistoryPhotos', SiteHistoryPhotos);

    function SiteHistory(DBA, $http, $q){
        return {
            getForAddressId: getForAddressId
        };

        function getForAddressId(addressId, page){
            page = page || 1;

            return $http({
                method: 'GET',
                url: '/mobile/addresses/' +  addressId + '/history?page=' + page
            })
            .then(
                function(response){
                    var data = response.data.response;
                    return data;
                }
            );
        }
    }

    function SiteHistoryPhotos($http, $ionicLoading, Account, $ionicPopup, $q, $timeout){
        var self = this;

        self.getByLinkPersonWoId = function(linkPersonWoId){
            $ionicLoading.show();

            return Account.getCurrent()
            .then(function(currentAccount){
                return $http({
                    url: '/mobile/files/photos?table_name=link_person_wo' +
                    '&record_id=' + linkPersonWoId +
                    '&date=' + moment().utc().format('YYYY-MM-DD') +
                    '&person_id=' + currentAccount.person_id,
                    method: 'get'})
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
                            template: 'Could not retrieve site photos'
                        });
                        return $q.reject(errorResponse);
                    }
                );
            });
        };

        return self;
    }
})();
