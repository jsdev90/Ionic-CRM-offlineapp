angular.module('app.timesheets', [])
.config(function($stateProvider){
    $stateProvider.state('pick-vehicle', {
        url: '/vehicles/:timesheetUuid',
        controller: 'PickVehicleCtrl',
        templateUrl: 'views/time_sheets/vehicles.html'
    });
})
.controller('PickVehicleCtrl', function($scope, $state, Vehicle, TimeSheet){
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('pick-vehicle')){
            Vehicle.getAll().then(function(vehicles){
                $scope.vehicles = vehicles;
            });

            TimeSheet.getLastTimesheetForWorkOrderUuid($scope.workOrderUuid).then(
                function(ts){
                    $scope.workOrderUuid = ts.object_uuid;
                    $scope.lastTimesheet = ts;
                }
            );
        }
    });

    $scope.selectVehicle = function(vehicle){
        if ($scope.lastTimesheet) {
            TimeSheet.setVehicle($scope.lastTimesheet.uuid, vehicle.id).then(
                function(){
                    $state.go('work-orders-view', {uuid: $scope.workOrderUuid}, {location: 'replace'});
                }
            );
        } else {
            $state.go('work-orders-view', {uuid: $scope.workOrderUuid}, {location: 'replace'});
        }
    };
})
.controller('TimeSheetListCtrl', function ($scope, $cordovaGoogleAnalytics, $state, $ionicLoading, $ionicPopup, TimeSheet, DEFAULT_DATE_FORMAT, DEFAULT_DISPLAY_DATE_FORMAT_NO_TIME,DEFAULT_DISPLAY_DATE_FORMAT) {

    $cordovaGoogleAnalytics.trackView('Time sheets list');

    $scope.weeklyStartDate = $weeklyEndDate = null;
    $scope.viewedDay = moment().utc();
    $scope.DEFAULT_DISPLAY_DATE_FORMAT_NO_TIME = DEFAULT_DISPLAY_DATE_FORMAT_NO_TIME;
    $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

    $scope.TimeSheet = TimeSheet;

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('time-sheets')){
            getWeeklyData();
            getDailyData();
        }
    });

    $scope.types = [
        'work',
        'travel'
    ];

    $scope.getCurrentWeek = function () {
        var start = moment().utc().startOf('week').hours(0).minutes(0).seconds(0).milliseconds(0);
        var end = moment(start.format(DEFAULT_DATE_FORMAT)).utc().add(7, 'day').add(1,'hour');
        $scope.weeklyStartDate = start;
        $scope.weeklyEndDate = end;
        getWeeklyData();
    };

    $scope.getCurrentWeek();

    $scope.getPreviousWeek = function () {
        $scope.weeklyStartDate.subtract(1, 'week');
        $scope.weeklyEndDate.subtract(1, 'week');
        getWeeklyData();
    };

    $scope.getNextWeek = function () {
        $scope.weeklyStartDate.add(1, 'week');
        $scope.weeklyEndDate.add(1, 'week');
        getWeeklyData();
    };

    function getWeeklyData() {
        TimeSheet.getAllForDateRange($scope.weeklyStartDate.format(DEFAULT_DATE_FORMAT), $scope.weeklyEndDate.format(DEFAULT_DATE_FORMAT))
        .then(function(timers){
            $scope.weeklyTimers = timers;
        });
    }

    function getDailyData() {
        TimeSheet.getAllForDateRange($scope.viewedDay.format(DEFAULT_DATE_FORMAT), $scope.viewedDay.format(DEFAULT_DATE_FORMAT))
        .then(function(timers){
            $scope.dailyTimers = timers;
        });
    }

    getWeeklyData();
    getDailyData();

    $scope.getPreviousDay = function () {
        $scope.viewedDay.subtract(1, 'day');
        getDailyData();
    };

    $scope.getNextDay = function () {
        $scope.viewedDay.add(1, 'day');
        getDailyData();
    };

    $scope.getCurrentDay = function () {
        $scope.viewedDay = moment().utc();
        getDailyData();
    };
})
;
