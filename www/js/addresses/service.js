(function(){
  angular.module('app.adresses.service', [])
  .factory('Address', Address);

  function Address(
    DBA,
    $q,
    Logger
  ){

    // Pass in array of objects containing address data.
    // Addresses are then either updated or inserted.
    // Later on, we return hashmap, where address_id is a key, and
    // address.uuid is a value.
    function bulkStore(addresses){
      return DBA.findAsArray('select id from addresses')
      .then(
        function(allStoredAddresses){
          var existingAddressesList = allStoredAddresses.map(
            function(existingAddressRecord){
              return +existingAddressRecord.id;
            }
          );

          function onQuerySuccess(itemIndex, itemCount, deferred){
            if (itemIndex === itemCount - 1) {
              deferred.resolve();
            }
          }

          function onQueryError(itemIndex, itemCount, deferred, error){
            if (error) {
              Logger.error(error);
              deferred.reject(error);
            }
          }

          var defer = $q.defer();

          if (!addresses.length) {
            return defer.resolve();
          }

          DBA.dbHandle.transaction(
            function(tx) {
              addresses.forEach(
                function(address, i){
                  // Lookup address id in the addresses list
                  // to decide whether update or insert is needed

                  if (!address.address_id) {
                    var item;
                    if (address.link_person_wo_id) {
                      item = 'link person wo - ' + address.link_person_wo_id;
                    } else {
                      item = 'asset - ' + address.asset_id;
                    }
                    Logger.error('Tried to sync item with no address_id - ' + item);
                  }

                  if (existingAddressesList.indexOf(+address.address_id) > -1) {
                    console.info('[address] update ' + address.address_id);
                    tx.executeSql(
                      getUpdateAddressQuery(),
                      [
                        address.address,
                        address.address2,
                        address.city,
                        address.state,
                        address.zip_code,
                        address.latitude + ',' + address.longitude,
                        address.address_id
                      ],
                      onQuerySuccess.bind(null, i, addresses.length, defer),
                      onQueryError.bind(null, i, addresses.length, defer)
                    );
                  } else {
                    var addressUuid = DBA.getUuid();
                    console.info('[address] insert ' + address.address_id);
                    tx.executeSql(
                      getInsertAddressQuery(),
                      [
                        addressUuid,
                        address.address_id,
                        address.address,
                        address.address2,
                        address.city,
                        address.state,
                        address.zip_code,
                        address.latitude + ',' + address.longitude,
                        0,
                        0
                      ],
                      onQuerySuccess.bind(null, i, addresses.length, defer),
                      onQueryError.bind(null, i, addresses.length, defer)
                    );
                  }
                }
              );
            }
          );

          return defer.promise;
        }
      )
      .then(DBA.findAsArray.bind(DBA, 'select id, uuid from addresses'))
      .then(
        function(addresses){
          var addressesLookupMap = {};
          addresses.forEach(
            function(address){
              addressesLookupMap[+address.id] = address.uuid;
            }
          );
          return addressesLookupMap;
        }
      );
    }

    function getUpdateAddressQuery(){
      return 'update addresses ' +
      'set address = ?, ' +
      'address2 = ?, ' +
      'city = ?, ' +
      'state = ?, ' +
      'zip_code = ?, ' +
      'gps_coords = ? ' +
      'where id = ?';
    }

    function getInsertAddressQuery(){
      return 'insert ' +
      'into addresses ' +
      '(uuid, ' +
      'id, ' +
      'address, ' +
      'address2, ' +
      'city, ' +
      'state, ' +
      'zip_code, ' +
      'gps_coords, ' +
      'created_at, ' +
      'sync) ' +
      ' values (?,?,?,?,?,?,?,?,?,?);';
    }

    return {
      bulkStore: bulkStore
    };
  }
})();
