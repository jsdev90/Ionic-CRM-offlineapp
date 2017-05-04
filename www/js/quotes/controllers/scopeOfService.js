angular.module('app.quotes.controllers')
.controller('ScopeOfServiceCtrl', function($scope, Quote, Asset, QuoteEntry, $state, $stateParams){
    $scope.operationalStatuses = [
        0, 50, 100
    ];

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('scope-of-service')) {
            $scope.assetUuid = $stateParams.assetUuid;
            $scope.quoteUuid = $state.params.quoteUuid;
            $scope.serviceScope = {
                status: 0
            };

            Asset.getAssetForUuid($scope.assetUuid).then(
                function(asset){
                    $scope.asset = asset;
                }
            );

            if (localStorage.quoteInProgress || $scope.quoteUuid) {
                Quote.getByUuid(localStorage.quoteInProgress || $scope.quoteUuid).then(function(quote){
                    $scope.serviceScope.unitDown = !!parseInt(quote.unit_down);
                    $scope.serviceScope.status = parseInt(quote.status);
                    $scope.serviceScope.desc = quote.description;
                    $scope.serviceScope.contactName = quote.contact_name;
                    $scope.serviceScope.contactNumber = quote.contact_number;
                    $scope.serviceScope.priceVerified = quote.price_verified_by_supplier;
                });
            }
        }
    });

    $scope.next = function(){
        if (!localStorage.quoteInProgress && !$scope.quoteUuid) {
            Quote.create({assetUuid: $scope.assetUuid, link_person_wo_id: $state.params.linkPersonWoId, description: $scope.serviceScope.desc, status: $scope.serviceScope.status, unitDown: $scope.serviceScope.unitDown}).then(
                function(quote){
                    if (quote) {
                        localStorage.quoteInProgress = quote.uuid;
                        $state.go('labor',{quoteUuid: quote.uuid}, {location: "replace"});
                    }
                }
            );
        } else {
            Quote.update(
                {
                    uuid: $scope.quoteUuid || localStorage.quoteInProgress,
                    description: $scope.serviceScope.desc,
                    status: $scope.serviceScope.status,
                    unitDown: $scope.serviceScope.unitDown,
                    priceVerified: $scope.serviceScope.priceVerified,
                    contactName: $scope.serviceScope.contactName,
                    contactNumber: $scope.serviceScope.contactNumber
                })
            .then(function(){
                $state.go('labor',{quoteUuid: localStorage.quoteInProgress || $scope.quoteUuid});
            });
        }

    };
})
;
