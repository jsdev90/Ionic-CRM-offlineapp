angular.module('app.media.directives', [])
// Directives for taking videos and photos
.directive('addVideo', function($ionicModal, Logger, $cordovaToast, $cordovaCapture, Storage, $ionicLoading){
    return {
        scope: {
            videoOptions: '='
        },
        template: '<div class="row no-padding"><div class="col no-padding"><a ng-click="captureVideo()" ng-class="videoOptions.class" class="button button-positive"><i class="ion-plus"></i> Add video</a></div></div>',
        link: function(scope, element, attrs){
            scope.modals = {};

            scope.captureVideo = function() {
                var options = { limit: 1 };

                if (window.cordova) {
                    cordova.plugins.backgroundMode.enable();

                    $cordovaCapture.captureVideo(options).then(function(videoData) {
                        Storage.moveVideosToAppDataDirectoryAndSave(videoData, {relatedObjectType: scope.videoOptions.objectType, relatedObjectUuid: scope.videoOptions.objectUuid, relatedObjectId: scope.videoOptions.objectId}).then(
                            function(){
                                $cordovaToast.showShortBottom('Videos saved');
                            },
                            function(error){
                                cordova.plugins.backgroundMode.disable();
                                Logger.warning(error);
                            }
                        )
                        .then(
                            function(){
                              cordova.plugins.backgroundMode.disable();

                            }
                        );

                    }, function(err) {
                        cordova.plugins.backgroundMode.disable();
                    });
                }
            };
        }
    };
})
.directive('addImage', function($ionicPopup, $rootScope, $ionicLoading, $ionicModal, $cordovaToast, $cordovaCamera, Storage, Type){
    return {
        scope: {
            imageOptions: '='
        },
        template: '' +
        ' <div class="text-center"> ' +
        '   <img style="height: 100px; display: inline-block;" ng-show="imageOptions.preview && imageUri" ng-src="{{ imageUri }}"> ' +
        ' </div> ' +
        ' <div class="row no-padding"> ' +
        '   <div class="col no-padding"> ' +
        '       <a ng-click="showAddPhotoModal()" ng-class="imageOptions.class" class="button button-positive"><i class="ion-plus"></i> {{ imageOptions.label || "Add Photo" }}</a> ' +
        '   </div> ' +
        '   <div ng-show="imageOptions.preview && imageUri" class="col no-padding"> ' +
        '       <a ng-click="removePhoto()" ng-class="imageOptions.class" class="button button-assertive"><i class="ion-trash-b"></i> Remove photo</a>' +
        '   </div> ' +
        ' </div> ',
        link: function(scope, element, attrs){

            scope.modals = {};
            scope.photoTypes = [];

            scope.data = {description: ''};

            $ionicModal.fromTemplateUrl('views/images/_add_photo.html', {
                scope: scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                scope.modals.addPhoto = modal;
            });

            scope.showAddPhotoModal = function () {
                if (scope.imageOptions.objectType) {
                    var photoTypeKey;

                    if (!scope.imageOptions.photoType) {
                        switch (scope.imageOptions.objectType) {
                            case 'link_asset_person_wo': {
                                photoTypeKey = 'asset_pictures';
                            }
                            break;

                            case 'link_person_wo': {
                                photoTypeKey = 'wo_pictures';
                            }
                        }
                    } else {
                        photoTypeKey = scope.imageOptions.photoType;
                    }


                    if (photoTypeKey) {
                        Type.getTypesFor(photoTypeKey).then(
                            function(types){
                                scope.photoTypes = types;
                                if (!scope.photoTypes.length) {
                                    scope.selectType();
                                } else {
                                    scope.modals.addPhoto.show();
                                }
                            }
                        );
                    } else {
                        scope.selectType();
                    }
                }
            };

            scope.removePhoto = function(){
                var uuid = scope.imageOptions.objectUuid,
                objectType = scope.imageOptions.objectType;
                

                return Storage.removePhoto(uuid, objectType)
                .then(
                    function(){
                        scope.imageUri = '';
                    }
                );
            };

            scope.dismissAddPhotoModal = function () {
                $rootScope.$broadcast('addPhoto.dismissed');
                scope.modals.addPhoto.hide();
                $ionicLoading.hide();
            };

            scope.selectType = function(type){
                $ionicPopup.show({
                    template: 'Choose photo location',
                    title: 'Choose photo location',
                    scope: scope,
                    cssClass: 'photo-location',
                    buttons: [
                        {
                            text: 'Cancel',
                            onTap: function(e) {
                                return -1;
                            }
                        },
                        {
                            text: 'Camera',
                            type: 'button-positive',
                            onTap: function(e) {
                                return Camera.PictureSourceType.CAMERA;
                            }
                        },
                        {
                            text: 'Gallery',
                            type: 'button-positive',
                            onTap: function(e) {
                                return Camera.PictureSourceType.PHOTOLIBRARY;
                            }
                        }
                    ]
                }).then(
                    function(location){

                        if (location != -1) {
                            var options = {
                                destinationType: Camera.DestinationType.FILE_URI,
                                sourceType: location,
                                allowEdit: false,
                                encodingType: Camera.EncodingType.JPEG,
                                quality: 100
                            };

                            cordova.plugins.backgroundMode.enable();

                            var cameraSuccessCallback = function(imageUri){
                                var photoDescription = $ionicPopup.show({
                                    template: '<input type="text" ng-model="data.description">',
                                    title: 'Enter Photo description',
                                    scope: scope,
                                    buttons: [
                                        { text: 'Skip' },
                                        {
                                            text: 'Ok',
                                            type: 'button-positive',
                                            onTap: function(e) {
                                                if (!scope.data.description) {
                                                    e.preventDefault();
                                                } else {
                                                    return scope.data.description;
                                                }
                                            }
                                        }
                                    ]
                                });

                                return photoDescription.then(
                                    function(desc){
                                        $ionicLoading.show();
                                        return Storage.savePhoto(imageUri, {description: desc, relatedObjectType: scope.imageOptions.objectType, fileType: 'default', fileTypeId: type ? type.id : '', relatedObjectUuid: scope.imageOptions.objectUuid, relatedObjectId: scope.imageOptions.objectId}).then(
                                            function(savedPhotoData){
                                                scope.data.description = '';
                                                if (window.cordova) {
                                                    if (location === Camera.PictureSourceType.CAMERA) {
                                                        $cordovaToast.showShortBottom('Photo was taken.');
                                                    } else {
                                                        $cordovaToast.showShortBottom('Photo selected.');
                                                    }
                                                    scope.imageUri = savedPhotoData.thumbnail;
                                                    $cordovaToast.showShortBottom('Photo saved.');
                                                }
                                                $ionicLoading.hide();
                                                scope.dismissAddPhotoModal();
                                            }
                                        )
                                        .then(
                                            function(){
                                                cordova.plugins.backgroundMode.disable();
                                            }
                                        )
                                        .catch(
                                            function(){
                                                $ionicLoading.hide();
                                                scope.dismissAddPhotoModal();
                                                cordova.plugins.backgroundMode.disable();
                                                $cordovaToast.showShortBottom('Error saving photo');
                                            }
                                        )
                                        ;
                                    }
                                );
                            };

                            var cameraErrorCallback = function (error) {
                                scope.data.description = '';
                                if (window.cordova) {
                                  $cordovaToast.showShortBottom('Error saving photo.');
                                }

                                cordova.plugins.backgroundMode.disable();
                                scope.dismissAddPhotoModal();
                                throw error;
                            };

                            $cordovaCamera.getPicture(options).then(cameraSuccessCallback, cameraErrorCallback);

                        } else {
                            scope.dismissAddPhotoModal();
                            cordova.plugins.backgroundMode.disable();
                        }
                    }
                );
            };
        },
    };
})
;
