angular.module('app.messages.controllers' , [])
    .config(function($stateProvider){
        $stateProvider
        .state('create-message', {
            url: '/create-message?objectType&objectUuid&receiverPersonId&objectId',
            templateUrl: 'views/messages/create.html',
            controller: 'CreateMessageCtrl'
        })
        .state('messages', {
            url: '/messages?objectType&objectUuid&forceAllMessages&objectId',
            templateUrl: 'views/messages/list.html',
            controller: 'MessageListCtrl'
        });
    })
    .controller('CreateMessageCtrl', ['$scope', '$state', 'Message', 'Person', '$cordovaToast', '$ionicPopup', '$stateParams', function($scope, $state, Message, Person, $cordovaToast, $ionicPopup, $stateParams){

        $scope.message = {};
        $scope.forms = {};

        var saveDisabled = false;

        $scope.previousState = {};

        $scope.persons = [];

        // Load available recipients on state change
        $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
          if ($state.is('create-message')) {
            $scope.previousState.params = fromParams;
            $scope.previousState.state = fromState;
            Person.getFromLocalDatabase({skipSelf: true}).then(
                function(persons){
                    $scope.persons = persons;
                }
            );
            $scope.clear();
          }
        });

        // Validate and save the message. Saved messages will be queued for
        // syncing.
        $scope.submit = function(){
          save($scope.forms.messageForm, $scope.message);
        };

        function save(form, message){

            form.$submitted = true;

            // Had to set this property by hand, recommended work did not work
            // with current angular version
            if (!$scope.message.person_id) {
              form.$invalid = true;
              form.person_id.$invalid = true;
              form.person_id.$error = {required: true};
            }

            if (form.$invalid) {
                $ionicPopup.alert({template: 'Please fill in all required fields.', title: 'Error'});
            } else {
                saveDisabled = true;
                Message.createMessage(message)
                    .then(
                        function(){
                            saveDisabled = false;
                            if (window.cordova) $cordovaToast.showShortBottom('Message has been saved');

                            if ($scope.previousState && $scope.previousState.state) {
                                $state.go($scope.previousState.state.name, $scope.previousState.params);
                            }
                        },
                        function(){
                            saveDisabled = false;
                            $ionicPopup.alert({template: 'Error storing message.', title: 'Error'});
                        }
                    );
            }
        }

        $scope.isSaveDisabled = function(){
            return saveDisabled;
        };

        $scope.clear = function(){
            if ($scope.forms.messageForm) {
                $scope.forms.messageForm.$submitted = false;
            }

            $scope.message = {
                object_uuid: $state.params.objectUuid,
                object_type: $state.params.objectType,
                object_id: $state.params.objectId,
                description: '',
                person_id: +$state.params.receiverPersonId
            };

            if (!!$state.params.receiverPersonId) {
                $scope.message.reply = true;
            } else {
                $scope.message.reply = false;
            }

            
        };

        $scope.clear();
    }])
    .controller('MessageListCtrl', function($scope, $q, DEFAULT_DISPLAY_DATE_FORMAT, $cordovaToast, Logger, Account, Message, $state, $ionicPopup, $ionicLoading, Sync){

        // Display all messages, or just these related to passed objectUuid (
        // currently work_orders are the only related entities)
        $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

        $scope.getHeaderText = function(){
            if ($scope.objectType) {
                switch ($scope.objectType) {
                    case 'work_order': {
                        return 'for selected Work Order';
                    }
                        break;
                }
            }
        };

        // Filter messages for inbox - we only display the ones that are addressed to us
        $scope.receivedNotCompleted = function(message){
          if (!message.completed && message.person_id == $scope.currentAccount.person_id) {
            return true;
          }
          return false;
        };

        $scope.relatedLink = function(message){
            var type = message.object_type;
            var uuid = message.object_uuid;

            var link = {};

            switch (type) {
                case 'work_order':{
                    link.uri = '#/work-orders/' + uuid;
                    link.label = 'Work Order';
                }
                    break;
            }

            return link;
        };

        function load(objectUuid){
            $ionicLoading.show({template: 'Loading messages...'});
            if (objectUuid) {
                Message.getForUuid(objectUuid)
                    .then(
                        function(messages){
                            handleLoaded(messages);
                        }
                    )
                    .catch(
                        function(){
                            $ionicLoading.hide();
                        }
                    );
            } else {
                Message.getAll().then(
                    function(messages){
                        handleLoaded(messages);
                    }
                )
                .catch(
                    function(){
                        $ionicLoading.hide();
                    }
                );
            }
        }

        function handleLoaded(messages){
            $scope.messages = messages;
            $ionicLoading.hide();
        }

        $scope.$on('$stateChangeSuccess', function(){
            if ($state.is('messages')) {

                $scope.messages = [];

                // reload option for ui-sref-opts does not clear state params,
                // so this is some kind of a workaround
                if (!$state.params.forceAllMessages) {
                    $scope.objectUuid = $state.params.objectUuid;
                    $scope.objectType = $state.params.objectType;
                    $scope.objectId = $state.params.objectId;
                } else {
                    $scope.objectUuid = null;
                    $scope.objectType = null;
                    $scope.objectId = null;
                }

                Account.getCurrent().then(function(currentAccount){
                    $scope.currentAccount = currentAccount;
                    load($scope.objectUuid);
                });
            }
        });

        // When syncing has stopped and we are on the messages screen,
        // reload messages to show newly added
        $scope.$on('sync.stop', function(){
            if ($state.is('messages')) {
                Account.getCurrent().then(function(currentAccount){
                    $scope.currentAccount = currentAccount;
                    load($scope.objectUuid);
                });
            }
        });

        $scope.completed = function(message) {
            if (message.completed) {
                return true;
            }
            return false;
        };


        $scope.notCompleted = function(message) {
            if (!message.completed) {
                return true;
            }
            return false;
        };

        $scope.goToRelatedWorkOrder = function(message){
            $state.go('work-orders-view', {uuid: message.object_uuid});
        };

        $scope.canReply = function(message){
            return message.from_person_id && message.from_person_id != $scope.currentAccount.person_id;
        };

        $scope.complete = function(message){
            $ionicPopup.confirm({template: 'Are you sure you want to mark this note as completed?', title: 'Confirm'}).then(
                function(res){
                    if (res) {
                        Message.complete(message).then(
                            function(){
                                if (window.cordova)
                                  $cordovaToast.showShortBottom('Note marked as completed');
                                  message.completed = true;
                                  message.completed_at = moment().utc();
                            }
                        );
                    }
                }
            );
        };
    })
;
