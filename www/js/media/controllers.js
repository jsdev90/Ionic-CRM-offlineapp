angular.module('app.media.controllers', [])
.controller('ImageListCtrl', function($scope, $state, DBA, Logger, $ionicPlatform, $ionicLoading, MediaProvider, $ionicModal, $stateParams, STORAGE_EVENTS, WorkOrder, Asset){

    // Display images list. When readOnly param is passed to this state.
    // its not possible to add photos from here

    $scope.images = [];
    $scope.preview = {
        index: null,
        image: null
    };

    $scope.object = {
        uuid: $stateParams.objectUuid,
        type: $state.params.objectType
    };

    $scope.modals = {};

    var currentPage = 0, maxPages = null, previousState, previousStateParams;

    function reload(){
        $scope.images = [];
        currentPage = 0;
        maxPages = null;
        $scope.loadMore();
    }

    $scope.$on('$stateChangeSuccess', function(e, toState, toParams, fromState, fromParams) {
        if ($state.is('images')){

            previousState = fromState;
            previousStateParams = fromParams;

            if ($scope.object.type == 'link_person_wo') {
                WorkOrder.getByUuid($scope.object.uuid).then(function(wo){
                    $scope.object.id = wo.link_person_wo_id;
                });
            } else if ($scope.object.type == 'link_asset_person_wo') {
                DBA.findOrNull('select link_asset_person_wo_id from work_order_assets woa where uuid = ?',[
                    $scope.object.uuid
                ])
                .then(
                    function(workOrderAsset){
                        $scope.object.id = workOrderAsset.link_asset_person_wo_id;
                    }
                );
            }

            reload();
            $scope.readOnly = $state.params.readOnly ? JSON.parse($state.params.readOnly.toLowerCase()) : false;
        }
    });

    var onBackButtonCallback = function(e){
        if ($state.is('images')) {
            e.stopPropagation();
            e.preventDefault();
            $state.go(previousState.name, previousStateParams, {location: 'replace'});
        }
    };
    $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
    $ionicPlatform.onHardwareBackButton(onBackButtonCallback);

    $scope.$on(STORAGE_EVENTS.photoSaved, function(e, savedPhotoDetails){
        $scope.images.push({ thumbnailPath: savedPhotoDetails.thumbnailUrl, fullSizePath: savedPhotoDetails.fileUri });
    });

    $ionicModal.fromTemplateUrl('views/images/preview.html', {
        scope: $scope,
        animation: 'fade-in',
    }).then(function(modal) {
        $scope.previewModal = modal;
    });

    $scope.showPreview = function(index, image){
        $scope.preview = {
            index: index,
            image: image
        };
        $scope.previewModal.show();
    };

    $scope.onSwipeRight = function(){
        var currentImageIndex = $scope.preview.index;
        if (currentImageIndex > 0) {
            $scope.preview.index = --currentImageIndex;
            $scope.preview.image = $scope.images[currentImageIndex];
            $scope.showPreview($scope.preview.index, $scope.preview.image);
        }
    };

    $scope.onSwipeLeft = function(){
        var currentImageIndex = $scope.preview.index;
        if (currentImageIndex < $scope.images.length - 1) {
            $scope.preview.index = ++currentImageIndex;
            $scope.preview.image = $scope.images[currentImageIndex];
            $scope.showPreview($scope.preview.index, $scope.preview.image);
        } else {
            $scope.loadMore(function(){
                $scope.onSwipeLeft();
            });
        }
    };

    $scope.loadMore = function(loaded){
        if (maxPages === null) {
            MediaProvider.getPhotosPageCountForUuid($scope.object.uuid)
            .then(function(totalPages){
                maxPages = totalPages;

                $scope.loadMore();
            });
        } else {
            if (currentPage < maxPages) {
                currentPage++;
                $ionicLoading.show();
                MediaProvider.getPhotosForUuid($stateParams.objectUuid, {page: currentPage})
                .then(
                    function(images){
                        if (images.length) {
                            $scope.images.push.apply($scope.images, images);

                            //if image does not exist on the list already, add it.
                            images.forEach(function(imageToInsert){
                              var imageExists = $scope.images.filter(function(existingImage){
                                return existingImage.uuid === imageToInsert.uuid;
                              });
                              if (!imageExists.length) {
                                $scope.images.push(imageToInsert);
                              }
                            });

                            $ionicLoading.hide();

                            if (loaded instanceof Function) {
                              loaded();
                            }
                        }
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    },
                    function(error){
                        $ionicLoading.hide();
                        Logger.error(error);
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                );
            } else {
                $ionicLoading.hide();
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        }
    };
})
.controller('VideoListCtrl', function($scope, DBA, $ionicPlatform, STORAGE_EVENTS, $state, $ionicModal, MediaProvider, $stateParams, WorkOrder, Asset){
    // Display videos list. When readOnly param is passed to this state.
    // its not possible to add videos from here

    $scope.modals = {};
    $scope.object = {
        uuid: $stateParams.objectUuid,
        type: $state.params.objectType
    };

    var previousState, previousStateParams;

    function loadVideosForUuid(uuid){
        MediaProvider.getVideosForUuid($stateParams.objectUuid).then(
            function(videos){
                $scope.videos = videos;
            }
        );
    }

    $scope.$on(STORAGE_EVENTS.videoSaved, function(){
        loadVideosForUuid($stateParams.objectUuid);
    });

    $scope.$on('$stateChangeSuccess', function(e, toState, toParams, fromState, fromParams){
        if (toState.name === 'videos') {

            previousState = fromState;
            previousStateParams = fromParams;

            loadVideosForUuid($stateParams.objectUuid);
            $scope.readOnly = $state.params.readOnly ? JSON.parse($state.params.readOnly) : false;

            if ($scope.object.type == 'link_person_wo') {
                WorkOrder.getByUuid($scope.object.uuid).then(function(wo){
                    $scope.object.id = wo.link_person_wo_id;

                });
            } else if ($scope.object.type == 'link_asset_person_wo') {
                DBA.findOrNull('select link_asset_person_wo_id from work_order_assets woa where uuid = ?',[
                    $scope.object.uuid
                ])
                .then(
                    function(workOrderAsset){
                        $scope.object.id = workOrderAsset.link_asset_person_wo_id;
                    }
                );
            }
        }
    });

    var onBackButtonCallback = function(e){
        if ($state.is('videos')) {
            e.stopPropagation();
            e.preventDefault();
            $state.go(previousState.name, previousStateParams, {location: 'replace'});
        }
    };
    $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
    $ionicPlatform.onHardwareBackButton(onBackButtonCallback);
})
;
