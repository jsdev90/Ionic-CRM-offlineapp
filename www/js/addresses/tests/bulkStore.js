describe('Address', function() {
  beforeEach(module('app'));

  var Address;
  var $q;
  var $rootScope;

  beforeEach(module(function($provide) {
    var findAsArrayCalls = 0;
    $provide.value('DBA', {
      findAsArray: function(q) {
        findAsArrayCalls++;
        if (findAsArrayCalls === 1) {
          return $q.resolve(
            [
              {id: 1, address_id: 1, uuid: 'test-uuid'}
            ]
          );
        } else {
          // On second run, both items
          return $q.resolve(
            [
              {id: 1, address_id: 1, uuid: 'test-uuid'},
              {id: 2, address_id: 2, uuid: 'test-uuid'}
            ]
          );
        }

      },
      findOrNull: function(){
        return $q.resolve(null);
      },
      getUuid: function(){
        return 'test-uuid';
      },
      setDbHandle: function(){

      },
      dbHandle: {
        transaction: function(cb){
          cb(
            {
              executeSql: function(a,b,c){
                c();
              }
            }
          );
        }
      }
    });

    $provide.value('Logger', {
      isRollbarReady: function(){return false;},
      error: function(){}
    });
  }));

  beforeEach(
    inject(
      function(_Address_, _$q_, _$rootScope_, $httpBackend) {
        Address = _Address_;
        $q = _$q_;
        $rootScope = _$rootScope_;

        // Mock all view requests
        $httpBackend.whenGET(/.{1,}/).respond('');
      }
    )
  );

  describe('bulkStore', function() {
    it('should return address lookup map, with items at indexes 1 and 2',
      function(done) {
        Address.bulkStore(
            [{
              address_id: 2,
              address: '',
              address2: '',
              city: '',
              state: '',
              zip_code: ''
            }]
          )
          .then(
            function(addressesMap){
              assert.equal(true, !!addressesMap[2]);
              assert.equal(false, !!addressesMap[3]);
              done();
            }
          );

          // Propagate resolution to then callbacks
          $rootScope.$apply();
      }
    );
  });
});
