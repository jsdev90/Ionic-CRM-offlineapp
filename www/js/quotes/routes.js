angular.module('app.quotes.controllers')
.config(function($stateProvider){
    $stateProvider
    .state('quotes', {
        url: '/quotes/:assetUuid?workOrderUuid',
        templateUrl: 'views/quotes/quotes.html',
        controller: 'QuotesCtrl'
    })
    .state('scope-of-service', {
        url: '/quotes/:assetUuid/scope-of-service?quoteUuid&linkPersonWoId',
        templateUrl: 'views/quotes/scope-of-service.html',
        controller: 'ScopeOfServiceCtrl'
    })
    .state('labor', {
        url: '/quotes/:quoteUuid/labor',
        templateUrl: 'views/quotes/labor.html',
        controller: 'LaborCtrl'
    })
    .state('add-labor', {
        url: '/quotes/:quoteUuid/add-labor',
        templateUrl: 'views/quotes/add-labor.html',
        controller: 'AddLaborCtrl'
    })
    .state('edit-labor', {
        url: '/quotes/:quoteUuid/labor/:quoteEntryUuid/edit',
        templateUrl: 'views/quotes/edit-labor.html',
        controller: 'EditLaborCtrl'
    })
    .state('subcontractor', {
        url: '/quotes/:quoteUuid/subcontractor',
        templateUrl: 'views/quotes/subcontractor.html',
        controller: 'SubcontractorCtrl'
    })
    .state('add-subcontractor', {
        url: '/quotes/:quoteUuid/add-subcontractor',
        templateUrl: 'views/quotes/add-subcontractor.html',
        controller: 'AddSubcontractorCtrl'
    })
    .state('edit-subcontractor', {
        url: '/quotes/:quoteUuid/subcontractor/:quoteEntryUuid/edit',
        templateUrl: 'views/quotes/edit-subcontractor.html',
        controller: 'EditSubcontractorCtrl'
    })
    .state('equipment', {
        url: '/quotes/:quoteUuid/equipment',
        templateUrl: 'views/quotes/equipment.html',
        controller: 'EquipmentCtrl'
    })
    .state('add-equipment', {
        url: '/quotes/:quoteUuid/add-equipment',
        templateUrl: 'views/quotes/add-equipment.html',
        controller: 'AddEquipmentCtrl'
    })
    .state('edit-equipment', {
        url: '/quotes/:quoteUuid/equipment/:quoteEntryUuid/edit',
        templateUrl: 'views/quotes/edit-equipment.html',
        controller: 'EditEquipmentCtrl'
    })
    .state('add-material', {
        url: '/quotes/:quoteUuid/add-material',
        templateUrl: 'views/quotes/add-material.html',
        controller: 'AddMaterialCtrl'
    })
    .state('edit-material', {
        url: '/quotes/:quoteUuid/material/:quoteEntryUuid/edit',
        templateUrl: 'views/quotes/edit-material.html',
        controller: 'EditMaterialCtrl'
    })
    .state('add-misc', {
        url: '/quotes/:quoteUuid/add-misc',
        templateUrl: 'views/quotes/add-misc.html',
        controller: 'AddMiscCtrl'
    })
    .state('edit-misc', {
        url: '/quotes/:quoteUuid/misc/:quoteEntryUuid/edit',
        templateUrl: 'views/quotes/edit-misc.html',
        controller: 'EditMiscCtrl'
    })
    .state('material', {
        url: '/quotes/:quoteUuid/material',
        templateUrl: 'views/quotes/material.html',
        controller: 'MaterialCtrl'
    })
    .state('miscellaneous', {
        url: '/quotes/:quoteUuid/miscellaneous',
        templateUrl: 'views/quotes/miscellaneous.html',
        controller: 'MiscellaneousCtrl'
    })
    .state('total', {
        url: '/quotes/:quoteUuid/total',
        templateUrl: 'views/quotes/total.html',
        controller: 'TotalCtrl'
    });
});
