angular.module('app.purchase-orders.controllers', [])
.config(function($stateProvider){
    $stateProvider
    .state('purchase-orders', {
        templateUrl: 'views/purchase-orders/list.html',
        url: '/purchase-orders?link_person_wo_id',
        controller: 'PurchaseOrdersCtrl'
    })
    .state('purchase-order', {
        templateUrl: 'views/purchase-orders/preview.html',
        url: '/purchase-order/:id',
        controller: 'PurchaseOrderDetailsCtrl'
    })
    .state('purchase-orders-notes', {
        templateUrl: 'views/purchase-orders/notes.html',
        url: '/purchase-orders/:id/notes',
        controller: 'PurchaseOrdersNotesCtrl'
    })
    ;
})
.controller('PurchaseOrdersCtrl', function($scope, $timeout, DEFAULT_DISPLAY_DATE_FORMAT_NO_TIME, $state, $http, $ionicLoading){

    // Display list of purchase orders (online only)
    $scope.purchaseOrders = [];
    $scope.DEFAULT_DISPLAY_DATE_FORMAT_NO_TIME = DEFAULT_DISPLAY_DATE_FORMAT_NO_TIME;

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('purchase-orders')) {
            var queryString = $state.params.link_person_wo_id ? '?link_person_wo_id=' + $state.params.link_person_wo_id : '';


            $ionicLoading.show();
            return $http({url: '/mobile/purchaseorders/sync' + queryString, method: 'post', data: {'purchase_order_entries': []}})
            .then(
                function(response){
                    var data = response.data.response;


                    $scope.purchaseOrders = data.purchase_orders_new;
                    $timeout(function(){
                        $ionicLoading.hide();
                    });
                },
                function(errorResponse){
                    $timeout(function(){
                        $ionicLoading.hide();
                        $ionicPopup.alert({template: 'Error retrieving purchase orders.'});
                    });
                }
            );
        }
    });
})
.controller('PurchaseOrderDetailsCtrl', function($scope, $ionicPopup, $state, $timeout, $http, Account, $ionicLoading){

    $scope.stores = [];
    $scope.purchaseOrderEntries = [];
    $scope.purchaseOrder = {};
    $scope.forms = {};

    // Retrieve purchase order details on state change
    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('purchase-order')) {

            var purchaseOrderId = $state.params.id;

            $ionicLoading.show();

            return $http({
                method: 'post',
                url: '/mobile/purchaseorders/sync',
                data: {
                    purchase_order_entries: []
                }
            })
            .then(
                function(response){
                    $scope.pickedStoreId = null;
                    var data = response.data.response;
                    $scope.stores = data.stores;
                    $scope.forms.purchaseOrders.$submitted = false;

                    data.purchase_order_entries = data.purchase_order_entries.map(function(order){
                        order.quantity = parseInt(order.quantity);
                        order.received_qty = parseInt(order.received_qty);
                        order.ordered = 0;
                        return order;
                    });

                    $scope.purchaseOrderEntries = data.purchase_order_entries.filter(function(purchaseOrderEntry){
                        return purchaseOrderEntry.purchase_order_id == purchaseOrderId;
                    });

                    var matchingPurchaseOrders = data.purchase_orders_new.filter(function(purchaseOrder){
                        return purchaseOrder.id == purchaseOrderId;
                    });
                    if (matchingPurchaseOrders.length) {
                        $scope.purchaseOrder = matchingPurchaseOrders[0];
                    }

                    $timeout(function(){
                        $ionicLoading.hide();
                    });

                },
                function(){
                    $timeout(function(){
                        $ionicLoading.hide();
                        $ionicPopup.alert({template: 'Error retrieving purchase orders.'});
                    });
                }
            );
        }
    });

    // Increase orderered quantity for purchase order entry
    $scope.add = function(purchaseOrderEntry){
        if (purchaseOrderEntry.ordered < purchaseOrderEntry.quantity - purchaseOrderEntry.received_qty) {
            purchaseOrderEntry.ordered++;
        }
    };

    // Decrease orderered quantity for purchase order entry
    $scope.subtract = function(purchaseOrderEntry){
        purchaseOrderEntry.ordered--;
        if (purchaseOrderEntry.ordered < 0)
        purchaseOrderEntry.ordered = 0;
    };

    // Receive stuff (sync order)
    $scope.receiveInventory = function(){
        $scope.forms.purchaseOrders.$submitted = true;

        if ($scope.forms.purchaseOrders.$valid) {
            $scope.purchaseOrderEntries = $scope.purchaseOrderEntries.map(function(purchaseOrderEntry){
                purchaseOrderEntry.store_id = $scope.purchaseOrder.pickedStoreId;
                purchaseOrderEntry.id = purchaseOrderEntry.purchase_order_entry_id;
                purchaseOrderEntry.move_qty = purchaseOrderEntry.ordered;
                return purchaseOrderEntry;
            });

            $ionicLoading.show();



            return $http({url: '/mobile/purchaseorders/sync', method: 'post', data: {'purchase_order_entries': $scope.purchaseOrderEntries}})
            .then(
                function(response){
                    var data = response.data.response;
                    $scope.stores = data.stores;

                    data.purchase_order_entries = data.purchase_order_entries.map(function(purchaseOrderEntry){
                        purchaseOrderEntry.quantity = parseInt(purchaseOrderEntry.quantity);
                        purchaseOrderEntry.received_qty = parseInt(purchaseOrderEntry.received_qty);
                        purchaseOrderEntry.ordered = 0;
                        return purchaseOrderEntry;
                    });

                    $scope.forms.purchaseOrders.$submitted = false;
                    $scope.purchaseOrderEntries = data.purchase_order_entries;

                    $ionicLoading.hide();

                    $ionicPopup.alert({template: 'Purchase orders have been sent.'});
                },
                function(errorResponse){
                    $ionicLoading.hide();
                }
            );
        }
    };
})
.controller('PurchaseOrdersNotesCtrl', function($scope, $state, $http, $ionicPopup, $ionicLoading, DEFAULT_DISPLAY_DATE_FORMAT){
  $scope.notes = [];

  $scope.DEFAULT_DISPLAY_DATE_FORMAT = DEFAULT_DISPLAY_DATE_FORMAT;

  $scope.$on('$stateChangeSuccess', function(){
    if ($state.is('purchase-orders-notes')) {
      var orderId = $state.params.id;
      $scope.notes = [];

      $ionicLoading.show();
      $http({url: '/mobile/purchaseorders/'+orderId+'/notes', method: 'get'})
      .then(
        function(response){
          $ionicLoading.hide();
          var data = response.data.response;
          $scope.notes = data.notes;
        }
      )
      .catch(
        function(error){
          $ionicPopup.alert({title: 'Error', template: error.message});
          $ionicLoading.hide();
        }
      );
    }
  });
});
