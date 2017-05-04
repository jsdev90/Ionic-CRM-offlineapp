(function(){
  angular.module('app.upload-queue', [])
  .controller('UploadQueueCtrl', UploadQueueCtrl);

  function UploadQueueCtrl($scope, $state, $timeout, Storage, $ionicPopup, DEFAULT_DISPLAY_DATE_FORMAT){

    $scope.queuedFiles = [];
    $scope.$on('$stateChangeSuccess', function(){
      if ($state.is('upload-queue')) {
        getUploads();
      }
    });

    $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

    function getUploads(){
      friendlysol.FsUpload.getUploads(
        null,
        friendlysol.FsCompletionStatus.ALL,
        function(uploads){
          $timeout(function(){$scope.queuedFiles = uploads;});
          Storage.updateFilesSyncStatus();
        }
      );
    }

    $scope.getStatus = function(queuedFile){
      if (queuedFile.success && queuedFile.completed) {
        return 'Success';
      } else if (queuedFile.completed && !queuedFile.success) {
        return 'Error';
      } else{
        return 'Not completed yet';
      }
    };

    friendlysol.FsUpload.setUploadCallback(
      function(){
        if ($state.is('upload-queue')) {
          getUploads();
        }
      }
    );

    $scope.showError = function(error){

      var errorMessage;
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = e.message;
      }

      $ionicPopup.alert(
        {
          title: 'Error',
          template: errorMessage
        }
      );
    };

    $scope.retryFileSync = function(id){
      friendlysol.FsUpload.resetUploads(
        [
          id
        ],
        'ALL',
        function(){
          $ionicPopup.alert(
            {
              title: 'Reset upload',
              template: 'File has been requeued for upload'
            }
          )
          .then(
            function(){
              getUploads();
            }
          );
        },
        function(){
          $ionicPopup.alert(
            {
              title: 'Error',
              template: 'Could not requeue file'
            }
          );
        }
      );
    };
  }
})();
