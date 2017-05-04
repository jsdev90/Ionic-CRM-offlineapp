angular.module('app.work-orders.controllers', [])
.config(function($stateProvider){
  $stateProvider
  .state('work-orders', {
    url: '/work-orders',
    templateUrl: 'views/work_orders/list.html',
    controller: 'WorkOrderListCtrl'
  })
  .state('work-orders.by-status', {
    url: '/status/:status',
    templateUrl: 'views/work_orders/list-by-status.html',
    controller: 'WorkOrderListByStatusCtrl'
  })
  .state('work-orders-view', {
    url: '/work-orders/:uuid?noTimerNotification',
    templateUrl: 'views/work_orders/view.html',
    controller: 'WorkOrderCtrl'
  })
  ;
})
.controller('WorkOrderCtrl', function (Storage, Survey, Logger, Message, $q, $timeout, $cordovaGoogleAnalytics, $ionicLoading, $http, DBA, $scope, $state, $stateParams, SmartBack, StatusHistory, $ionicPlatform, $ionicModal, $ionicPopup, $cordovaToast, $ionicHistory, TimeSheet, WorkOrder, TechStatuses, Vehicle, Asset, Sync, Type, WORK_ORDER_STATUS, DEFAULT_DATE_FORMAT, DEFAULT_DISPLAY_DATE_FORMAT) {

  var previousState, previousParams;

  $scope.statusesThatStartTimers = [];

  $scope.data = {
    wo: {
      completed_at: null,
      tech_status_type_id: ''
    }
  };

  $scope.unreadCount = 0;

  $scope.techStatuses = [];
  $scope.techStatusTypes = {};

  $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;


  // set currentTechStatus based on wo.tech_status_type_id
  // for further processing
  function setScopeCurrentTechStatus(){
    $scope.currentTechStatus = $scope.techStatuses.filter(function(status){
      return status.id == $scope.data.wo.tech_status_type_id;
    })[0];
    console.log($scope.currentTechStatus);
  }

  function loadWorkOrderForUuid(uuid) {
    $ionicLoading.show();
    $timeout(function(){
      WorkOrder.getByUuid(uuid)
      .then(
        function (workOrder) {

          $scope.data.pickedVehicle = null;

          var promises = [];

          promises.push(
            Type.getWorkOrderTechStatusTypes()
            .then(
              function(types){
                $scope.techStatusTypes = types;
              }
            )
          );

          promises.push(TechStatuses.getAll().then(function(techStatuses){
            $scope.techStatuses = techStatuses;
            $scope.data.wo = workOrder;

            setScopeCurrentTechStatus();
          }));

          promises.push(
            Survey.getUnansweredSurveysForWorkOrderId(workOrder.work_order_id)
            .then(
              function(surveyStats){
                $scope.surveyStats = surveyStats;
              }
            )
          );

          promises.push(
            Message
            .getUnreadCountForObjectUuid(uuid)
            .then(function(unreadCount){
              $scope.unreadCount = unreadCount;
            })
          );

          promises.push(
            WorkOrder.isSigned(uuid).then(
              function(signature){
                $scope.signature = signature;
              }
            )
          );

          promises.push(
            WorkOrder.hasAtLeastOneLabor(workOrder.link_person_wo_id).then(
              function(hasLabor){
                $scope.hasLabor = !!hasLabor;
              }
            )
          );

          promises.push(
            WorkOrder.hasAtLeastOneWorkDescription(uuid)
            .then(
              function(hasWorkDescription){
                $scope.hasWorkDescription = !!hasWorkDescription;
              }
            )
          );

          promises.push(
            Vehicle.getAll()
            .then(function(vehicles){
              $scope.vehicles = vehicles;
            })
          );

          promises.push(
            DBA.findAsArray('select name from tech_statuses where start_after_stop = \'true\'')
            .then(
              function(statusesThatStartTimers){
                if (statusesThatStartTimers.length) {
                  $scope.statusesThatStartTimers = statusesThatStartTimers.map(function(status){
                    return status.name ? status.name : false;
                  });
                }
              }
            )
          );

          $q.all(promises)
          .then(
            function(){
              $timeout(function(){
                $ionicLoading.hide();
              });
            },
            function(){
              $ionicLoading.hide();
            }
          );
        }
      );
    }, 0);
  }

  $scope.$on('sync.stop', function(){
    loadWorkOrderForUuid($stateParams.uuid);
  });

  $scope.$on('$stateChangeSuccess', function (e, toState, toParams, fromState, fromParams) {
    if ($state.is('work-orders-view')) {
      $cordovaGoogleAnalytics.trackView('Work order preview');
      previousState = fromState;
      previousParams = fromParams;

      loadWorkOrderForUuid($stateParams.uuid);
      Asset.allAssetsHaveWorkPerformed($stateParams.uuid).then(
        function(allAssetsHaveWorkPerformed){
          $scope.noWorkPerformed = !allAssetsHaveWorkPerformed;
        }
      );

      if (fromState.name=='pick-vehicle') {
        Sync.all();
      }
    }
  });

  $scope.ivrReport = function(){
    $ionicLoading.show({template: 'IVR Report in progress'});

    $http({method: 'get', url: $scope.data.wo.ivr_button_url})
    .then(function(){
      $ionicLoading.hide();
      $ionicPopup.alert({template: 'IVR Report completed'});
    })
    .catch(function(err){
      $ionicLoading.hide();
      if (err.message) {
        $ionicPopup.alert({template: 'Error: ' + err.message});
      } else {
        $ionicPopup.alert({template: 'An error occured. Please try again later.'});
      }
    });
  };

  // Status change process
  $scope.techStatusChanged = function(){
    var woUuid = $scope.data.wo.uuid;

    // retrieve information about previous tech status,
    // status we are switching to, and the last timesheet for
    // displayed work order - and pass it down the promise chain
    WorkOrder.getTechStatus(woUuid)
    .then(function(previousTechStatus){
      return TimeSheet.getLastTimesheetForWorkOrderUuid(woUuid)
      .then(function(lastTimesheet){

        setScopeCurrentTechStatus();

        //if no current status, due to angular double ng-change call
        if (!$scope.currentTechStatus) {
          return $q.reject();
        }

        return {
          lastTimesheet: lastTimesheet,
          previousTechStatus: previousTechStatus,
          currentTechStatus: $scope.currentTechStatus
        };
      });
    })
    // Ask user to confirm status change, revert the ui change if user
    // clicks cancel in the popup
    .then(function(data){
      return $ionicPopup.confirm({
        title: 'Confirm status change',
        template: 'Are you sure you wish to change Work Order status?'
      })
      .then(
        function(res){
          if (!res) {
            $scope.data.wo.tech_status_type_id = data.previousTechStatus.id;
            return $q.reject();
          } else {
            return data;
          }
        }
      );
    })
    .then(function(data){
      //if changing from ONSITE to something else
      //notify about unsolved tasks, otherwise continue
      if (data.previousTechStatus.id === $scope.techStatusTypes.onsite) {
        var problems = [];

        if (!$scope.signature) {
          problems.push('- no signature');
        }

        var showProblems = function(problemsToDisplay){
          if (problemsToDisplay && problemsToDisplay.length) {
            var template = 'Please fill missing information: <br>';

            problemsToDisplay.forEach(function(problem){
              template += '<br>' + problem;
            });

            return $ionicPopup.alert(
              {
                template: template,
                title: 'Missing information'
              }
            );
          }
        };

        return Asset.getAssetsForWorkOrderUuid($scope.data.wo.uuid)
        .then(function(assets){
          //if no assets, prompt for work desciption
          if (!assets.length) {
            if (problems.length) {
              return showProblems(problems)
              .then(
                function(){
                  $scope.data.wo.tech_status_type_id = data.previousTechStatus.id;
                  return $q.reject();
                }
              );
            }


            return $ionicPopup
            .prompt({title: 'Describe work', template: 'Work description: '})
            .then(function(workDescription){
              workDescription = workDescription.trim();
              if (!workDescription) {
                $scope.data.wo.tech_status_type_id = data.previousTechStatus.id;
                $ionicPopup.alert({template: 'Work Description is required', title: 'Error'});
                return $q.reject();
              } else {
                data.stoppedTimerDescription = workDescription;
                return data;
              }
            });
          } else {

            if (!$scope.hasLabor) {
              problems.push('- no labor');
            }

            if (!$scope.hasWorkDescription) {
              problems.push('- no work performed for assets');
            }

            if (problems.length) {
              return showProblems(problems)
              .then(
                function(){
                  $scope.data.wo.tech_status_type_id = data.previousTechStatus.id;
                  return $q.reject();
                }
              );
            }
            return data;
          }
        });
      } else {
        return data;
      }
    })
    .then(function(data){
      // If changing to travel, ask user to pick used vehicle
      if (data.currentTechStatus.id === $scope.techStatusTypes.travel) {
        if (data.lastTimesheet) {
          $scope.data.pickedVehicle = data.lastTimesheet.vehicle_id;
        } else {
          $scope.data.pickedVehicle = null;
        }
        return $ionicPopup.show({
          template: '' +
          ' <select style="width: 100%" ng-model="data.pickedVehicle" ng-options="vehicle.id as vehicle.vehicle_number for vehicle in vehicles"> ' +
          '   <option value="">Please select vehicle number</option> ' +
          ' </select>',
          title: 'Select vehicle',
          scope: $scope,
          buttons: [
            { text: 'Cancel' },
            {
              text: '<b>Save</b>',
              type: 'button-positive',
              onTap: function(e) {
                if (!$scope.data.pickedVehicle) {
                  e.preventDefault();
                } else {
                  return $scope.data.pickedVehicle;
                }
              }
            }
          ]
        })
        .then(
          function(pickedVehicle){
            // abort the process if no vehicle is selected
            if (!pickedVehicle) {
              $ionicPopup.alert({title: 'Vehicle not selected', template: 'You need to pick vehicle when starting TRAVEL. Aborting.'});
              $scope.data.wo.tech_status_type_id = data.previousTechStatus.id;
              return $q.reject();
            }

            data.pickedVehicle = pickedVehicle;
            return data;
          }
        );
      }

      return data;
    })
    .then(function(data){
      // start next timer, or stop currently running one
      // depending on situation
      var lastTimesheet = data.lastTimesheet;
      var previousTechStatus = data.previousTechStatus;
      var currentTechStatus = data.currentTechStatus;

      if (previousTechStatus) {
        return TimeSheet.stop(lastTimesheet, {description: data.stoppedTimerDescription})
        .then(function(){
          if (previousTechStatus.start_after_stop && currentTechStatus.start_after_stop) {

            return TimeSheet.start({vehicle_id: data.pickedVehicle, type_id: currentTechStatus.time_sheet_reason_type_id, object_uuid: woUuid})
            .then(function(){
              return data;
            });
          } else {
            return data;
          }
        });
      } else {
        return TimeSheet.stop(lastTimesheet).then(
          function(){
            if (currentTechStatus.start_after_stop) {
              return TimeSheet.start({vehicle_id: data.pickedVehicle, type_id: currentTechStatus.time_sheet_reason_type_id, object_uuid: woUuid})
              .then(function(){
                return data;
              });
            } else {
              Logger.debug('currentTechStatus.start_after_stop is false. wp: ' + $scope.data.wo.uuid);
              return data;
            }
          }
        )
        .then(function(){
          return data;
        });
      }

      return data;
    })
    .then(function(data){
      // update work order tech status and add status change history entry

      return WorkOrder.setCurrentTechStatus(data.currentTechStatus, woUuid)
      .then(function(){

        return StatusHistory.store({
          work_order_uuid: woUuid,
          current_tech_status_type_id: data.currentTechStatus.id,
          previous_tech_status_type_id: data.previousTechStatus ? data.previousTechStatus.id : null
        })
        .then(function(){
          return data;
        });
      })
      .then(function(){
        return data;
      });
    })
    .then(function(){
      // finally, sync the data
      Sync.all()
      .then(function(){
        loadWorkOrderForUuid($stateParams.uuid);
      });
    })
    ;
  };

  //get location href for gps button
  $scope.getLocationQueryString = function(){
    if ($scope.data.wo && $scope.data.wo.gps_coords) {
      return ($scope.data.wo.gps_coords.length > 1 ? $scope.data.wo.gps_coords : false) || ($scope.data.wo.street + ', ' + $scope.data.wo.city + ', ' + $scope.data.wo.state);
    }
    return;
  };

  $scope.shouldDisableConfirmButton = function (workOrder) {
    //hide confirm button when status is other othan issued
    return workOrder.status !== WORK_ORDER_STATUS.issued;
  };

  $scope.shouldShowWorkOrderButtons = function(workOrder){
    //show all buttons only when tech_status_id belongs to open tab
    return [
      $scope.techStatusTypes.onsite,
      $scope.techStatusTypes.waiting_service,
      $scope.techStatusTypes.travel
    ].indexOf(workOrder.tech_status_type_id) > -1;
  };

  $scope.shouldShowBrowsePhotosButtonOnCompletedWo = function(workOrder){
    //show all buttons only when tech_status_id belongs to completed tab
    return [
      $scope.techStatusTypes.waiting_quote,
      $scope.techStatusTypes.return_trip,
      $scope.techStatusTypes.tech_declined,
      $scope.techStatusTypes.check_out,
      $scope.techStatusTypes.waiting_parts
    ].indexOf(workOrder.tech_status_type_id) > -1;
  };

  $scope.getSignature = function(){
    TimeSheet.getLastTimesheetForWorkOrderUuid($scope.data.wo.uuid).then(function(lastTimesheet){
      if (lastTimesheet) {
        $state.go('sign-work-order', {uuid: $scope.data.wo.uuid});
      } else {
        var timerStartingStatusesText = '';
        timerStartingStatusesText = $scope.statusesThatStartTimers.join(' or ');

        $ionicPopup.alert({title: 'Status change required', template: 'Please change status to ' + timerStartingStatusesText + ' in order to take a signature.'});
      }
    });
  };

  var onBackButtonCallback = function(e){
    e.stopPropagation();
    e.preventDefault();

    if ($state.is('work-orders-view')) {
      if (!previousState || previousState.name != 'messages' || (previousState.name === 'messages' && previousParams.objectUuid)) {
        SmartBack.backToLastViewedStateNamed('work-orders.by-status');
      } else {
        $state.go('messages', {location: 'replace'});
      }
    }
  };

  $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
  $ionicPlatform.onHardwareBackButton(onBackButtonCallback);

  $scope.navigateTo = function(gpsCoords, locationName){
    if (window.cordova) {
      if (gpsCoords.length > 1) {
        launchnavigator.navigate(gpsCoords.split(','));
      } else if (locationName.length) {
        launchnavigator.navigate(locationName);
      }
    }
  };

  //Get list of enabled statuses
  $scope.getAvailableTechStatuses = function(){
    //If current status id is ONSITE, return options that do not start another timer
    if ($scope.currentTechStatus && $scope.currentTechStatus.id === $scope.techStatusTypes.onsite) {
      return $scope.techStatuses.map(function(techStatus){
        techStatus.disabled = (
                                (techStatus.start_after_stop && techStatus.id !== $scope.techStatusTypes.onsite) ||
                                techStatus.id === $scope.techStatusTypes.onsite
                              ) &&
                              $scope.currentTechStatus.id !== techStatus.id;
        return techStatus;
      });
    }
    //otherwise, allow any option to be picked
    return $scope.techStatuses;
  };

  // confirm work order
  $scope.confirm = function (workOrder) {
    WorkOrder.confirm(workOrder.uuid)
    .then(
      function () {
        if (window.cordova)
        $cordovaToast.showShortBottom('Work order confirmed');
        $scope.data.wo.confirmed_at = DBA.getTimestamp();
        workOrder.status = WORK_ORDER_STATUS.confirmed;
        $scope.data.wo.tech_status_type_id = $scope.techStatusTypes.waiting_service;
        return WorkOrder.setCurrentTechStatus({id: $scope.techStatusTypes.waiting_service}, $scope.data.wo.uuid);
      }
    )
    .then(function(){
      Sync.all().then(function(){
        loadWorkOrderForUuid($stateParams.uuid);
      });
    });
  };

  // complete work order. not used anymore
  $scope.complete = function (workOrder) {
    return WorkOrder.complete(workOrder)
    .then(
      function () {
        if (window.cordova)
        $cordovaToast.showShortBottom('Work order completed!');
        $scope.data.wo.status = WORK_ORDER_STATUS.completed;
      },
      function () {
        $ionicPopup.alert({title: 'Error', template: 'Error completing work order'});
      }
    );
  };
})
.controller('WorkOrderListByStatusCtrl', function ($scope, NetworkCheck, $state, DEFAULT_DISPLAY_DATE_FORMAT, $timeout, $ionicHistory, $ionicPlatform, $stateParams, $rootScope, WorkOrder, TimeSheet, $ionicLoading, $ionicPopup, WORK_ORDER_STATUS, Sync) {

  $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

  var onBackButtonCallback = function(e){
    if ($state.is('work-orders.by-status')) {
      e.stopPropagation();
      e.preventDefault();
      $state.go('menu');
    }
  };

  function loadDataFromLocalDatabase(){
    $ionicLoading.show();
    var promise;
    switch ($stateParams.status) {
      case 'pending': {
        promise = WorkOrder.getPendingWorkOrders().then(function(workOrders){
          $scope.workOrders = workOrders;
          $scope.$broadcast('scroll.refreshComplete');
        });
      }
      break;

      case 'open': {
        promise = WorkOrder.getOpenWorkOrders().then(function(workOrders){
          $scope.workOrders = workOrders;
          $scope.$broadcast('scroll.refreshComplete');
        });
      }
      break;

      case 'completed': {
        promise = WorkOrder.getCompletedWorkOrders().then(function(workOrders){
          $scope.workOrders = workOrders;
          $scope.$broadcast('scroll.refreshComplete');
        });
      }
      break;
    }

    if (promise) {
      promise.catch(function(err){
        $scope.$broadcast('scroll.refreshComplete');
      });

      promise.then(
        function(){
          $timeout(function(){
            $ionicLoading.hide();
          });
        }
      );
    }
  }

  $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
  $ionicPlatform.onHardwareBackButton(onBackButtonCallback);

  function loadWorkOrdersFromApi() {
    $scope.refreshRequested = true;
    return Sync.all().then(
      function(){
        loadDataFromLocalDatabase();
      },
      function(){
        $scope.$broadcast('scroll.refreshComplete');

      }
    );
  }

  $scope.$on('sync.stop', function(){
    if ($state.is('work-orders.by-status')) {
      loadDataFromLocalDatabase();
    }
  });

  $scope.$on('$stateChangeSuccess', function () {
    if ($state.is('work-orders.by-status')) {
      loadDataFromLocalDatabase();
    }
  });

  $scope.$on('workOrders.refresh', function () {
    loadWorkOrdersFromApi();
  });
})
.controller('WorkOrderListCtrl', function ($scope, $timeout, $ionicLoading, $ionicPlatform, WorkOrder, $ionicHistory, $state, $cordovaGoogleAnalytics) {

  var onBackButtonCallback = function(e){
    if ($state.is('work-orders.by-status')) {
      $cordovaGoogleAnalytics.trackView('Work order list');
      e.stopPropagation();
      e.preventDefault();
      $state.go('menu');
    }
  };
  $ionicPlatform.offHardwareBackButton(onBackButtonCallback);
  $ionicPlatform.onHardwareBackButton(onBackButtonCallback);

  function getWorkOrderNumberInEachTab(){
    $ionicLoading.show();
    WorkOrder.getWorkOrderSummary().then(
      function(summary){
        $scope.workOrderSummary = summary;
        $timeout(function(){
          $ionicLoading.hide();
        });
      }
    );
  }

  $scope.$on('$stateChangeSuccess', function (e, ts, tp, fromState) {
    if (
      $state.includes('work-orders') &&
      fromState.name.indexOf('by-status') === -1
    )
    {
      getWorkOrderNumberInEachTab();
    }
  });

  $scope.$on('sync.stop', function(){
    if ($state.is('work-orders.by-status')) {
      getWorkOrderNumberInEachTab();
    }
  });

  $scope.$on('scroll.refreshComplete', function(){
    getWorkOrderNumberInEachTab();
  });

  $scope.showState = function(status){
    $state.go('work-orders.by-status', {status: status});
  };

  $scope.tabClass = function (tabName) {
    if (tabName == $state.params.status) {
      return 'button-positive';
    }
    return 'button-stable';
  };

  $scope.requestRefresh = function () {
    $scope.$broadcast('workOrders.refresh');
  };
})
;
