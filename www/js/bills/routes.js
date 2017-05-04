angular.module('app.bills.controllers')
.config(function($stateProvider){
    $stateProvider
    .state('billing-labor', {
        url: '/billing/:objectUuid/labor?linkPersonWoId',
        templateUrl: 'views/billing/labor.html',
        controller: 'BillingLaborCtrl'
    })
    .state('billing-add-labor', {
        url: '/billing/:objectUuid/add-labor?linkPersonWoId',
        templateUrl: 'views/billing/add-labor.html',
        controller: 'BillingAddLaborCtrl'
    })
    .state('billing-edit-labor', {
        url: '/billing/:objectUuid/labor/:billingEntryUuid/edit?linkPersonWoId',
        templateUrl: 'views/billing/edit-labor.html',
        controller: 'BillingEditLaborCtrl'
    })
    .state('billing-equipment', {
        url: '/billing/:objectUuid/equipment?linkPersonWoId',
        templateUrl: 'views/billing/equipment.html',
        controller: 'BillingEquipmentCtrl'
    })
    .state('billing-add-equipment', {
        url: '/billing/:objectUuid/add-equipment?linkPersonWoId',
        templateUrl: 'views/billing/add-equipment.html',
        controller: 'BillingAddEquipmentCtrl'
    })
    .state('billing-edit-equipment', {
        url: '/billing/:objectUuid/equipment/:billingEntryUuid/edit?linkPersonWoId',
        templateUrl: 'views/billing/edit-equipment.html',
        controller: 'BillingEditEquipmentCtrl'
    })
    .state('billing-add-material', {
        url: '/billing/:objectUuid/add-material?linkPersonWoId',
        templateUrl: 'views/billing/add-material.html',
        controller: 'BillingAddMaterialCtrl'
    })
    .state('billing-edit-material', {
        url: '/billing/:objectUuid/material/:billingEntryUuid/edit?linkPersonWoId',
        templateUrl: 'views/billing/edit-material.html',
        controller: 'BillingEditMaterialCtrl'
    })
    .state('billing-add-misc', {
        url: '/billing/:objectUuid/add-misc?linkPersonWoId',
        templateUrl: 'views/billing/add-misc.html',
        controller: 'BillingAddMiscCtrl'
    })
    .state('billing-edit-misc', {
        url: '/billing/:objectUuid/misc/:billingEntryUuid/edit?linkPersonWoId',
        templateUrl: 'views/billing/edit-misc.html',
        controller: 'BillingEditMiscCtrl'
    })
    .state('billing-material', {
        url: '/billing/:objectUuid/material?linkPersonWoId',
        templateUrl: 'views/billing/material.html',
        controller: 'BillingMaterialCtrl'
    })
    .state('billing-misc', {
        url: '/billing/:objectUuid/miscellaneous?linkPersonWoId',
        templateUrl: 'views/billing/miscellaneous.html',
        controller: 'BillingMiscellaneousCtrl'
    })
    ;
});
