describe('WorkOrderCtrl', function(){
  beforeEach(module('app'));

  var scope;
  beforeEach(inject(function($controller, $rootScope){
    scope = $rootScope.$new();
    controller = $controller('WorkOrderCtrl', { $scope: scope });
  }));

  describe('shouldDisableConfirmButton', function(){
    it('should return true when wo.status is not issued', function(){
      assert.equal(true, scope.shouldDisableConfirmButton({status: 'in_progress'}));
    });
  });
});
