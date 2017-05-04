angular.module('app.assets.services', [])
.factory('Asset', function (DBA, $q, $http, Logger, GpsLocation, Address, DEFAULT_DATE_FORMAT, PHOTO_PLACEHOLDER, Storage) {

  function getCreateAssetQuery(){
    return 'insert into assets ( ' +
    'uuid, ' +
    'id,' +
    'address_uuid, ' +
    'name, ' +
    'latitude,' +
    'longitude,' +
    'coords_accuracy,' +
    'identifier, ' +
    'manufacturer, ' +
    'model_number, ' +
    'serial_number, ' +
    'system_type, ' +
    'heat_type, ' +
    'voltage_type, ' +
    'refrigerant_type, ' +
    'other_refrigerant_type, ' +
    'fresh_air, ' +
    'filter_quantity, ' +
    'filter_size, ' +
    'belt, ' +
    'belt_size, ' +
    'unit_condition, ' +
    'recommendations, ' +
    'created_at, ' +
    'source, ' +
    'status_type_id, ' +
    'sync ' +
    ') ' +
    ' values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
  }

  function getUpdateAssetQuery(){
    return 'update assets ' +
    'set name = ?, ' +
    'latitude = ?,' +
    'longitude = ?,' +
    'coords_accuracy = ?,' +
    'identifier = ?, ' +
    'manufacturer = ?, ' +
    'model_number = ?, ' +
    'serial_number = ?, ' +
    'system_type = ?, ' +
    'heat_type = ?, ' +
    'voltage_type = ?, ' +
    'refrigerant_type = ?, ' +
    'other_refrigerant_type = ?, ' +
    'fresh_air = ?, ' +
    'filter_quantity = ?, ' +
    'filter_size = ?, ' +
    'belt = ?, ' +
    'belt_size = ?, ' +
    'unit_condition = ?, ' +
    'recommendations = ?, ' +
    'source = ?, ' +
    'status_type_id = ?, ' +
    'address_uuid = ?, ' +
    'created_at = ?, ' +
    'sync = 1' +
    ' where id = ?';
  }

  function getCreateWorkOrderAssetQuery(){
    return ' insert into work_order_assets ' +
           ' ( ' +
           '  created_at, ' +
           '  work_order_uuid, ' +
           '  asset_uuid, ' +
           '  work_requested, ' +
           '  work_performed, ' +
           '  link_asset_person_wo_id, ' +
           '  uuid, ' +
           '  sync ' +
           ') values (?,?,?,?,?,?,?,1)';
  }

  function getUpdateWorkOrderAssetQuery(){
    return ' update work_order_assets ' +
           ' set sync = 1, work_requested = ?, work_performed = ?, link_asset_person_wo_id = ? ' +
           ' where asset_uuid = ? and work_order_uuid = ? ';
  }

  function sync(){
    // Get all assets to work order
    return DBA.findAsArray(
      ' select a.*, addr.id as address_id ' +
      ' from assets a join addresses addr on addr.uuid = a.address_uuid ' +
      ' where a.sync = 0 '
    )
    .then(
      function(assetsToSync){

        if (assetsToSync && assetsToSync.length) {
          assetsToSync.forEach(function(assetToSync){
            assetToSync.work_orders = [];
          });
        }

        return $q.resolve(assetsToSync)
        .then(
          function(assetsToSync){
              // We also need to send all link_person_wo_ids while syncing.
              // Append link_person_wo_ids and return data.
              return DBA.findAsArray('select link_person_wo_id from work_orders')
              .then(
                function(allStoredLinkPersonWoIds){
                  allStoredLinkPersonWoIds = allStoredLinkPersonWoIds.map(
                    function(recordData){
                      return recordData.link_person_wo_id;
                    }
                  );

                  return {
                    assets: assetsToSync,
                    link_person_wo_ids: allStoredLinkPersonWoIds
                  };
                }
              );
          }
        )
        .then(
          function(data){
            //Append all unsynced work_order_assets
            return DBA.findAsArray(
              'select woa.uuid, woa.work_performed, woa.asset_uuid, ' +
              ' ( ' +
              '   select id from assets where uuid = woa.asset_uuid limit 1 ' +
              ' ) asset_id, ' +
              ' ( ' +
              '   select wo.link_person_wo_id from work_orders wo where wo.uuid = woa.work_order_uuid limit 1 ' +
              ' ) link_person_wo_id, ' +
              ' ( ' +
              '   select wo.work_order_id from work_orders wo where wo.uuid = woa.work_order_uuid limit 1 ' +
              ' ) work_order_id ' +
              'from work_order_assets woa where sync = 0'
            )
            .then(
              function(unsyncedWorkOrderAssets){
                data.work_order_assets = unsyncedWorkOrderAssets;
                return data;
              }
            );
          }
        )
        .then(
          function(data){
            return $http({method: 'post', url: '/mobile/assets/sync', data: data});
          }
        )
        .then(
          function(result){
            // Update assets with syncs
            var dataToStore = result.data.response;

            var defer = $q.defer();

            function onQuerySuccess(itemIndex, itemCount, deferred){
              if (itemIndex === itemCount - 1) {
                deferred.resolve(dataToStore);
              }
            }

            function onQueryError(itemIndex, itemCount, deferred, error){
              if (error) {
                console.error(error);
                deferred.reject(error);
              }
            }

            if (dataToStore.syncs.length) {
              db.transaction(
                function(tx) {
                  dataToStore.syncs.forEach(function(syncData, i){

                    tx.executeSql(
                      'update assets set id = ? where uuid = ?',
                      [
                        syncData.object_id,
                        syncData.uuid
                      ],
                      onQuerySuccess.bind(null, i, dataToStore.syncs.length, defer),
                      onQueryError.bind(null, i, dataToStore.syncs.length, defer)
                    );
                  });
                }
              );
            } else {
              defer.resolve(dataToStore);
            }

            return defer.promise.then(
              function(){
                return dataToStore;
              }
            );
          }
        )
        .then(
          function(data){
            // Update work_order_assets with sync_work_order_assets
            var defer = $q.defer();

            function onQuerySuccess(itemIndex, itemCount, deferred){
              if (itemIndex === itemCount - 1) {
                deferred.resolve(data);
              }
            }

            function onQueryError(itemIndex, itemCount, deferred, error){
              if (error) {
                console.error(error);
                deferred.reject(error);
              }
            }

            if (data.syncs_work_order_assets && data.syncs_work_order_assets.length) {
              db.transaction(
                function(tx) {
                data.syncs_work_order_assets.forEach(
                  function(syncData, i){
                    tx.executeSql('update files set object_id = ? where object_uuid = ?', [
                      syncData.object_id,
                      syncData.uuid
                    ]);
                    tx.executeSql(
                      'update work_order_assets set link_asset_person_wo_id = ?, updated_at = ?, sync = 1 where uuid = ?',
                      [
                        syncData.object_id,
                        DBA.getTimestamp(),
                        syncData.uuid
                      ],
                      onQuerySuccess.bind(null, i, data.syncs_work_order_assets.length, defer),
                      onQueryError.bind(null, i, data.syncs_work_order_assets.length, defer)
                    );
                  }
                );
              });
            } else {
              defer.resolve(data);
            }

            return defer.promise.then(
              function(){
                return data;
              }
            );
          }
        )
        .then(
          function(data){
            // Process the results, starting with storing / updating addresses
            // Resolves to address hashmap
            return Address.bulkStore(data.assets)
            .then(
              function(storedAddressesHashmap){
                data.addressesHashmap = storedAddressesHashmap;
                // Pass the data down for further processing
                return data;
              }
            )
            .then(
              function(data){
                return DBA.findAsArray('select * from assets')
                .then(
                  function(storedAssets){
                    data.storedAssetIds = storedAssets.map(function(storedAsset){
                      return +storedAsset.id;
                    });
                    return data;
                  }
                );
              }
            );
          }
        )
        .then(
          function(dataToStore){
            // Store or update retrieved assets

            var defer = $q.defer();
            var promise = defer.promise;

            function onQuerySuccess(itemIndex, itemCount, deferred){
              if (itemIndex === itemCount - 1) {
                deferred.resolve(dataToStore);
              }
            }

            function onQueryError(itemIndex, itemCount, deferred, error){
              if (error) {
                console.error(error);
                deferred.reject(error);
              }
            }

            if (!dataToStore.assets.length) {
              return defer.resolve(dataToStore);
            }

            db.transaction(
              function(tx) {

                // Update asset when it is present in the app,
                // or create a new one if it isnt there

                dataToStore.assets.forEach(
                  function(assetToStore, i){
                    // Lookup asset address_uuid in addressesHashmap
                    assetToStore.address_uuid = dataToStore.addressesHashmap[assetToStore.address_id];
                    assetToStore.source = 'mobile';
                    assetToStore.sync = 1;

                    // Lookup assets data in indexes array, instead of querying
                    // for each separately
                    if (dataToStore.storedAssetIds.indexOf(+assetToStore.asset_id) > -1) {
                      // Asset exists, update it

                      tx.executeSql(
                        getUpdateAssetQuery(),
                        [
                          assetToStore.name ? assetToStore.name : 'No name',
                          assetToStore.latitude ? assetToStore.latitude : 0,
                          assetToStore.longitude ? assetToStore.longitude : 0,
                          assetToStore.gps_accuracy ? assetToStore.gps_accuracy : 0,
                          assetToStore.identifier ? assetToStore.identifier : '',
                          assetToStore.manufacturer ? assetToStore.manufacturer : '',
                          assetToStore.model_number ? assetToStore.model_number : '',
                          assetToStore.serial_number ? assetToStore.serial_number : '',
                          assetToStore.system_type ? assetToStore.system_type : '',
                          assetToStore.heat_type ? assetToStore.heat_type : '',
                          assetToStore.voltage_type ? assetToStore.voltage_type : '',
                          assetToStore.refrigerant_type ? assetToStore.refrigerant_type : '',
                          assetToStore.other_refrigerant_type ? assetToStore.other_refrigerant_type : '',
                          assetToStore.fresh_air ? assetToStore.fresh_air : '',
                          assetToStore.filter_quantity ? assetToStore.filter_quantity : '',
                          assetToStore.filter_size ? assetToStore.filter_size : '',
                          assetToStore.belt ? 1 : 0,
                          assetToStore.belt_size ? assetToStore.belt_size : '',
                          assetToStore.unit_condition ? assetToStore.unit_condition : '',
                          assetToStore.recommendations ? assetToStore.recommendations : '',
                          assetToStore.source,
                          assetToStore.status_type_id,
                          assetToStore.address_uuid,
                          assetToStore.created_at ? DBA.getUtcDate(assetToStore.created_at) : DBA.getTimestamp(),
                          assetToStore.asset_id
                        ],
                        onQuerySuccess.bind(null, i, dataToStore.assets.length, defer),
                        onQueryError.bind(null, i, dataToStore.assets.length, defer)
                      );
                    } else {
                      // Create one
                      var newAssetUuid = DBA.getUuid();

                      tx.executeSql(
                        getCreateAssetQuery(),
                        [
                          newAssetUuid,
                          assetToStore.asset_id ? assetToStore.asset_id : null,
                          assetToStore.address_uuid,
                          assetToStore.name,
                          assetToStore.latitude ? assetToStore.latitude : 0,
                          assetToStore.longitude ? assetToStore.longitude : 0,
                          assetToStore.gps_accuracy ? assetToStore.gps_accuracy : 0,
                          assetToStore.identifier ? assetToStore.identifier : '',
                          assetToStore.manufacturer ? assetToStore.manufacturer : '',
                          assetToStore.model_number ? assetToStore.model_number : '',
                          assetToStore.serial_number ? assetToStore.serial_number : '',
                          assetToStore.system_type ? assetToStore.system_type : '',
                          assetToStore.heat_type ? assetToStore.heat_type : '',
                          assetToStore.voltage_type ? assetToStore.voltage_type : '',
                          assetToStore.refrigerant_type ? assetToStore.refrigerant_type : '',
                          assetToStore.other_refrigerant_type ? assetToStore.other_refrigerant_type : '',
                          assetToStore.fresh_air ? assetToStore.fresh_air : '',
                          assetToStore.filter_quantity ? assetToStore.filter_quantity : '',
                          assetToStore.filter_size ? assetToStore.filter_size : '',
                          assetToStore.belt ? 1 : 0,
                          assetToStore.belt_size ? assetToStore.belt_size : '',
                          assetToStore.unit_condition ? assetToStore.unit_condition : '',
                          assetToStore.recommendations ? assetToStore.recommendations : '',
                          assetToStore.created_at ? DBA.getUtcDate(assetToStore.created_at) : DBA.getTimestamp(),
                          assetToStore.source,
                          assetToStore.status_type_id,
                          assetToStore.sync
                        ],
                        onQuerySuccess.bind(null, i, dataToStore.assets.length, defer),
                        onQueryError.bind(null, i, dataToStore.assets.length, defer)
                      );
                    }
                  }
                );

              }
            );

            return promise.then(
              function(retrievedApiData){
                // Resolve with stored assets list, work_order_assets and work_orders list

                return DBA.findAsArray('select * from assets')
                .then(
                  function(assets){
                    return DBA.findAsArray('select * from work_orders')
                    .then(
                      function(workOrders){
                        return DBA.findAsArray(
                          'select * from work_order_assets'
                        )
                        .then(
                          function(workOrderAssets){

                            // Key - asset_id
                            var assetsHashmap = {};

                            // Key - link_person_wo_id
                            var workOrdersHashmap = {};

                            // Here, the key will be constructed of asset.uuid + '_' + wo.uuid
                            // If there is no entry like this, we create the link betweem
                            // Work Order and the asset
                            var existingWorkOrderAssetsHashmap = {};

                            assets.forEach(
                              function(asset){
                                assetsHashmap[asset.id] = asset;
                              }
                            );

                            workOrders.forEach(
                              function(workOrder){
                                workOrdersHashmap[workOrder.link_person_wo_id] = workOrder;
                              }
                            );

                            workOrderAssets.forEach(
                              function(workOrderAsset){
                                if (workOrderAsset.asset_uuid && workOrderAsset.work_order_uuid) {
                                  existingWorkOrderAssetsHashmap[
                                    workOrderAsset.work_order_uuid +
                                    '_' +
                                    workOrderAsset.asset_uuid
                                  ] = workOrderAsset;
                                }
                              }
                            );

                            return {
                              assets: assetsHashmap,
                              workOrders: workOrdersHashmap,
                              existingWorkOrderAssets: existingWorkOrderAssetsHashmap,
                              retrievedApiData: retrievedApiData
                            };
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        )
        .then(
          function(data){
            // Link assets to work orders through work_order_assets
            // All assets and work_orders in question should already
            // be present in the app at this point.

            // Find uuids for work orders and assets, then find existing relationship.
            // If it exists, update, if not - insert.

            var defer = $q.defer();

            function onQuerySuccess(itemIndex, itemCount, deferred){
              if (itemIndex === itemCount - 1) {
                deferred.resolve(data);
              }
            }

            function onQueryError(itemIndex, itemCount, deferred, error){
              console.error(error);
              if (error) {
                deferred.reject(error);
              }
            }

            //skip if no woa data is present in response
            if (!data || !data.retrievedApiData || !data.retrievedApiData.work_order_assets.length) {
              return defer.resolve(data);
            }

            db.transaction(
              function(tx) {

                data.retrievedApiData.work_order_assets.forEach(
                  function(retrievedWorkOrderAsset, i){
                    var foundWorkOrder = data.workOrders[+retrievedWorkOrderAsset.link_person_wo_id];
                    var foundAsset = data.assets[+retrievedWorkOrderAsset.asset_id];

                    if (foundWorkOrder && foundAsset) {
                      retrievedWorkOrderAsset.work_order_uuid = foundWorkOrder.uuid;
                      retrievedWorkOrderAsset.asset_uuid = foundAsset.uuid;

                      var relationshipHash = retrievedWorkOrderAsset.work_order_uuid +
                      '_' +
                      retrievedWorkOrderAsset.asset_uuid;

                      var foundExistingRelationship =
                      data.existingWorkOrderAssets[relationshipHash];

                      if(foundExistingRelationship){
                        console.info('[woa] update');
                        tx.executeSql(
                          getUpdateWorkOrderAssetQuery(),
                          [
                            retrievedWorkOrderAsset.work_requested,
                            retrievedWorkOrderAsset.work_performed,
                            retrievedWorkOrderAsset.link_asset_person_wo_id,
                            retrievedWorkOrderAsset.asset_uuid,
                            retrievedWorkOrderAsset.work_order_uuid
                          ],
                          onQuerySuccess.bind(null, i, data.retrievedApiData.work_order_assets.length, defer),
                          onQueryError.bind(null, i, data.retrievedApiData.work_order_assets.length, defer)
                        );

                        // Update file object_id field where file.object_uuid matches asset wo relationship

                        tx.executeSql(
                          'update files set object_id = ? where object_uuid = ?',
                          [
                            retrievedWorkOrderAsset.link_asset_person_wo_id,
                            foundExistingRelationship.uuid
                          ],
                          function(){},
                          function(err){

                          }
                        );

                      } else {
                        console.info('[woa] insert');
                        var uuid = DBA.getUuid();
                        tx.executeSql(
                          getCreateWorkOrderAssetQuery(),
                          [
                            DBA.getTimestamp(),
                            retrievedWorkOrderAsset.work_order_uuid,
                            retrievedWorkOrderAsset.asset_uuid,
                            retrievedWorkOrderAsset.work_requested,
                            retrievedWorkOrderAsset.work_performed,
                            retrievedWorkOrderAsset.link_asset_person_wo_id,
                            uuid
                          ],
                          onQuerySuccess.bind(null, i, data.retrievedApiData.work_order_assets.length, defer),
                          onQueryError.bind(null, i, data.retrievedApiData.work_order_assets.length, defer)
                        );
                      }

                    } else {
                      console.warn(retrievedWorkOrderAsset);

                      var message = '';
                      if (!foundAsset) {
                        message+=' no asset with id ' + retrievedWorkOrderAsset.asset_id;
                      }

                      if (!foundWorkOrder) {
                        message+=' no link person wo id ' + retrievedWorkOrderAsset.link_person_wo_id;
                      }

                      console.warn('[woa] missing data. ' + message);

                      // TODO report error - api sent the data related to asset and
                      // wo association, but asset or wo is missing
                      onQuerySuccess(i, data.retrievedApiData.work_order_assets.length, defer);
                    }
                  }
                );
              }
            );

            return defer.promise.then(
              function(){
                return data;
              }
            );
          }
        )
        .then(
          function(data){
            //skip if no data is present in response
            if (data && data.retrievedApiData && data.retrievedApiData.syncs) {
              db.transaction(
                function(tx) {
                  data.retrievedApiData.syncs.forEach(function(syncData){
                    tx.executeSql(
                      'update assets sync = 1 where uuid = ?',
                      [
                        syncData.uuid
                      ]

                    );
                  });
                }
              );
            }
          }
        );
      }
    );
  }

    // Store created asset
    var createAsset = function(data){

        return DBA.findOrNull(
          'select id from types where type_key = \'asset_status.active\''
        )
        .then(
          function(type){
            data.status_type_id = type.id;

            return $q(function(resolve, reject){

                var sql = getCreateAssetQuery();

                var newAssetUuid = DBA.getUuid();

                DBA.query(sql, [
                    newAssetUuid,
                    data.asset_id ? data.asset_id : null,
                    data.address_uuid,
                    data.name,
                    data.latitude ? data.latitude : 0,
                    data.longitude ? data.longitude : 0,
                    data.gps_accuracy ? data.gps_accuracy : 0,
                    data.identifier ? data.identifier : '',
                    data.manufacturer ? data.manufacturer : '',
                    data.model_number ? data.model_number : '',
                    data.serial_number ? data.serial_number : '',
                    data.system_type ? data.system_type : '',
                    data.heat_type ? data.heat_type : '',
                    data.voltage_type ? data.voltage_type : '',
                    data.refrigerant_type ? data.refrigerant_type : '',
                    data.other_refrigerant_type ? data.other_refrigerant_type : '',
                    data.fresh_air ? data.fresh_air : '',
                    data.filter_quantity ? data.filter_quantity : '',
                    data.filter_size ? data.filter_size : '',
                    data.belt ? 1 : 0,
                    data.belt_size ? data.belt_size : '',
                    data.unit_condition ? data.unit_condition : '',
                    data.recommendations ? data.recommendations : '',
                    data.created_at ? DBA.getUtcDate(data.created_at) : DBA.getTimestamp(),
                    data.source,
                    data.status_type_id,
                    data.sync
                ])
                .then(
                    function(){
                        resolve(newAssetUuid);
                    },
                    function(error){
                        reject(error);
                    }
                )
                .then(
                  function(){

                    GpsLocation.getCurrent()
                    .then(
                      function(currentLocation){
                        var params = [
                          currentLocation.latitude,
                          currentLocation.longitude,
                          currentLocation.accuracy,
                          newAssetUuid
                        ];



                        return DBA.query(
                          'update assets set latitude = ?, longitude = ?, coords_accuracy = ? where uuid = ?',
                          params
                        );
                      }
                    )
                    .catch(
                      function(error){
                        console.error(error);
                      }
                    );

                    return newAssetUuid;
                  }
                );
            });
          }
        );
    };

    var getAssetForQuoteUuid = function(quoteUuid){
        return DBA.findOrNull('select a.* from assets a join quotes q on q.asset_uuid = a.uuid where q.uuid = ?',[quoteUuid]);
    };

    var getAssetForUuid = function(uuid, workOrderUuid){
        return $q(function(resolve, reject){
            var promise = DBA.query('select a.*, woa.uuid as work_order_asset_uuid, woa.work_performed, woa.work_requested, (select f.filename from files f where f.object_uuid = woa.uuid limit 1) filename from assets a left join work_order_assets woa on woa.asset_uuid = a.uuid and woa.work_order_uuid = ? where a.uuid = ? limit 1', [workOrderUuid, uuid]);
            promise.then(
                function(result){
                    result = DBA.get(result);
                    result.photo_path = PHOTO_PLACEHOLDER;
                    if (window.cordova && result.filename) {
                        result.photo_path = Storage.resolveFilePath(result.filename);
                    }
                    resolve(result);
                },
                function(error){
                    reject(error);
                }
            );
        });
    };

    var getAssetsCountForTabs = function(addressUuid, workOrderUuid){

      // Each tab on assets list has a number of assets in it.
      // The query below is used to retrieve that number.

        var sql = '' +
        ' select ( ' +
        '    select count(1) ' +
        '    from assets a ' +
        '    left join work_order_assets woa on woa.asset_uuid = a.uuid and woa.work_order_uuid = \'' + workOrderUuid + '\' ' +
        '    left join work_orders wo on woa.work_order_uuid = wo.uuid' +
        '    where a.address_uuid = \'' + addressUuid + '\' and (wo.uuid != \'' + workOrderUuid + '\' or wo.uuid is null) and a.source != \'legacy\'' +
        ' ) siteAssetsCount, ' +
        ' ( ' +
        '    select count(1) ' +
        '    from assets a ' +
        '    left join work_order_assets woa on woa.asset_uuid = a.uuid and woa.work_order_uuid = \'' + workOrderUuid + '\' ' +
        '    where woa.work_order_uuid = \'' + workOrderUuid + '\' and a.source = \'legacy\'' +
        ' ) legacyAssetsCount, ' +
        ' ( ' +
        '    select count(1) ' +
        '    from assets a ' +
        '    left join work_order_assets woa on woa.asset_uuid = a.uuid and woa.work_order_uuid = \'' + workOrderUuid + '\' ' +
        '    where a.source != \'legacy\' and woa.work_order_uuid = \'' + workOrderUuid + '\' ' +
        ' ) workOrderAssetsCount ';
        return DBA.findOrNull(sql);
    };

    var getAssetsForAddressUuid = function(addressUuid, workOrderUuid){
        // Get site assets

        var sql = '' +
        'select ' +
        ' (select count(1) from quotes where asset_uuid = a.uuid and link_person_wo_id = wo.link_person_wo_id) quote_count, a.uuid, a.name, a.system_type, a.latitude, woa.work_requested, t.type_value as asset_status, woa.work_performed, a.longitude, a.address_uuid, woa.work_order_uuid, wo.work_order_number, wo.link_person_wo_id, a.model_number, ' +
        ' (select f.filename from files f where f.object_uuid = a.uuid limit 1) filename, ' +
        ' (select count(1) from files f where f.object_uuid = a.uuid and f.type = \'photo\' ) as photo_count, ' +
        ' (select count(1) from files f where f.object_uuid = a.uuid and f.type = \'video\' ) as video_count ' +
        ' from assets a ' +
        ' left join work_order_assets woa on woa.asset_uuid = a.uuid and woa.work_order_uuid = ? ' +
        ' left join work_orders wo on woa.work_order_uuid = wo.uuid' +
        ' left join types t on t.id = a.status_type_id ' +
        ' where ' +
        ' a.address_uuid = ? and (wo.uuid != ? or wo.uuid is null) and a.source != \'legacy\' ' +
        ' ';

        return $q(function(resolve, reject){
            DBA.query(sql, [workOrderUuid, addressUuid, workOrderUuid])
            .then(
                function(results){
                    results = DBA.getAll(results);
                    results = results.map(function(result){
                        result.photo_path = PHOTO_PLACEHOLDER;
                        if (window.cordova && result.filename) {
                            result.photo_path = Storage.resolveFilePath(result.filename);
                        }
                        return result;
                    });
                    resolve(results);
                },
                function(error){
                    reject(error);
                }
            );
        });
    };

    var getAssetsForWorkOrderUuid = function(workOrderUuid){
        // Get assets related to work order

        return $q(function(resolve, reject){
            var sql = 'select ' +
            ' a.uuid, t.type_value as asset_status, a.id as asset_id, woa.link_asset_person_wo_id, a.name, a.system_type, a.model_number, woa.work_requested, woa.work_performed, ' +
            ' a.latitude, a.longitude, woa.work_order_uuid, woa.uuid as work_order_asset_uuid, wo.work_order_number, wo.link_person_wo_id, a.model_number, ' +
            ' (select count(1) from quotes where asset_uuid = a.uuid and link_person_wo_id = wo.link_person_wo_id) quote_count, ' +
            ' (select f.filename from files f where f.object_uuid = woa.uuid limit 1) filename, ' +
            ' (select count(1) from files f where f.object_uuid = woa.uuid and f.type = \'photo\' ) as photo_count, ' +
            ' (select count(1) from files f where f.object_uuid = woa.uuid and f.type = \'video\' ) as video_count ' +
            ' from work_order_assets woa ' +
            ' join work_orders wo on woa.work_order_uuid = wo.uuid' +
            ' join assets a on woa.asset_uuid = a.uuid' +
            ' left join types t on t.id = a.status_type_id ' +
            ' where a.source != \'legacy\' and woa.work_order_uuid = ?';

            DBA.query(sql, [workOrderUuid])
            .then(
                function(results){
                    results = DBA.getAll(results);
                    results = results.map(function(result){
                        result.hide_assign = true;
                        result.photo_path = PHOTO_PLACEHOLDER;
                        if (window.cordova && result.filename) {
                            result.photo_path = Storage.resolveFilePath(result.filename);
                        }
                        return result;
                    });
                    resolve(results);
                },
                function(error){
                    reject(error);
                }
            );
        });
    };

    var updateWorkPerformedForAssetUuidAndWorkOrderUuid = function(assetUuid, workOrderUuid, description){
        // Update work performed for asset. Pivot table is updated here, so two
        // columns are needed to identify it.
        return DBA.query('update work_order_assets set work_performed = ?, sync = 0, updated_at = ? where asset_uuid = ? and work_order_uuid = ?', [description, DBA.getTimestamp(), assetUuid, workOrderUuid])
        .then(function(){
            return DBA.query('update assets set sync = 0 where uuid = ?', [assetUuid]);
        });
    };

    var hasAssetsWithWorkPerformed = function(workOrderUuid){
        // Resolves to null when asset has no work performed on any of the associated
        // assets
        return DBA.findOrNull('select * from assets a join work_order_assets woa on woa.asset_uuid = a.uuid where woa.work_order_uuid = ? and woa.work_performed is not null and woa.work_performed != \'\'', [workOrderUuid]);
    };

    var allAssetsHaveWorkPerformed = function(workOrderUuid){
        // Will resolve to true if all work order assets have work performed
        return DBA.findOrNull('select * from assets a join work_order_assets woa on woa.asset_uuid = a.uuid where woa.work_order_uuid = ? and (woa.work_performed is null or woa.work_performed = \'\')', [workOrderUuid])
        .then(function(assetWithoutWorkPerformed){
            return !assetWithoutWorkPerformed;
        });
    };

    var allAssetsHaveWorkPerformedAndLabor = function(workOrderUuid){
        // Will resolve to true if all assets have both work performed
        // and labor

        var sql = '' +
        ' select a.uuid, be.uuid as labor, woa.work_performed ' +
        ' from assets a ' +
        ' left join work_order_assets woa on woa.asset_uuid = a.uuid ' +
        ' left join billing_entries be on be.object_uuid = a.uuid and be.step_name = \'labor\' ' +
        ' where woa.work_order_uuid = ?';

        return DBA.findAsArray(sql, [workOrderUuid])
        .then(function(assets){
            var allAssetsWorkPerformed = true;
            var allAssetsLabor = true;
            assets.forEach(function(asset){
                if (!asset.labor) {
                    allAssetsLabor = false;
                }
                if (!asset.work_performed || !asset.work_performed.length) {
                    allAssetsWorkPerformed = false;
                }
            });

            return {
                laborAdded: allAssetsLabor,
                workPerformed: allAssetsWorkPerformed
            };
        });
    };

    // Expose public api
    return {
        createAsset: createAsset,
        getAssetsForAddressUuid: getAssetsForAddressUuid,
        getAssetsForWorkOrderUuid: getAssetsForWorkOrderUuid,
        getAssetForUuid: getAssetForUuid,
        getAssetForQuoteUuid: getAssetForQuoteUuid,
        updateWorkPerformedForAssetUuidAndWorkOrderUuid: updateWorkPerformedForAssetUuidAndWorkOrderUuid,
        hasAssetsWithWorkPerformed: hasAssetsWithWorkPerformed,
        allAssetsHaveWorkPerformed: allAssetsHaveWorkPerformed,
        allAssetsHaveWorkPerformedAndLabor: allAssetsHaveWorkPerformedAndLabor,
        getAssetsCountForTabs: getAssetsCountForTabs,
        sync: sync
    };
})
;
