angular.module('app.work-orders.services', [])
.constant('WORK_ORDER_STATUS', {
  issued: 'issued',
  confirmed: 'confirmed',
  in_progress: 'in_progress',
  in_progress_and_hold: 'in_progress_and_hold',
  cancelled: 'cancelled',
  completed: 'completed'
})
.factory('WorkOrder', function($http, DBA, Account, Address, Logger, $q, DEFAULT_DATE_FORMAT, WORK_ORDER_STATUS){

  var self = this;

  self.sync = function(){
    //Get data to send
    return DBA.findAsArray(
      ' select ' +
      ' work_order_id, tech_status_type_id, link_person_wo_id, status, confirmed_at, completed_at, uuid ' +
      ' from work_orders ' +
      ' where sync = 0 '
    )
    .then(
      function(workOrdersToSync){
        // Find work_order_status_history for each synced work order
        var promises = [];
        workOrdersToSync.forEach(function(workOrder){
          workOrder.status_history = [];
          promises.push(DBA.query('select * from work_order_status_history wh where wh.work_order_uuid = ? and wh.sync = 0', [workOrder.uuid]).then(
            function(results){
              workOrder.status_history = DBA.getAll(results);
            }
          ));
        });

        return $q.all(promises)
        .then(
          function(){
            return workOrdersToSync;
          }
        );
      }
    )
    .then(
      function(workOrdersWithStatusHistory){
        var data = {
          workorders: workOrdersWithStatusHistory,
          link_person_wo_ids: []
        };

        // Find all link_person_wo_ids present in the app
        return DBA.findAsArray('select link_person_wo_id from work_orders').then(
          function(linkPersonWorkOrderIds){
            var ids = linkPersonWorkOrderIds.map(function(linkPersonWoId){
              return linkPersonWoId.link_person_wo_id;
            });
            data.link_person_wo_ids = ids;
            return data;
          }
        );
      }
    )
    .then(
      // Post the data
      function(data){
        return $http({method: 'post', url: '/mobile/workorders/sync', data: data})
        .then(
          function(response){
            return {
              response: response,
              link_person_wo_ids: data.link_person_wo_ids
            };
          }
        );
      }
    )
    .then(
      // Store address changes
      function(result){
        var retrievedWorkOrders = result.response.data.response.workorders;
        var existingWorkOrderLinks = result.link_person_wo_ids;

        // Resolves to address map, where address_id => address_uuid
        return Address.bulkStore(retrievedWorkOrders)
        .then(
          function(addressesHashmap){
            return {
              retrievedWorkOrders: retrievedWorkOrders,
              addressesHashmap: addressesHashmap,
              existingWorkOrderLinks: existingWorkOrderLinks
            };
          }
        );
      }
    )
    .then(
      function(data){

        var defer = $q.defer();

        function onQuerySuccess(itemIndex, itemCount, deferred){
          if (itemIndex === itemCount - 1) {
            deferred.resolve();
          }
        }

        function onQueryError(itemIndex, itemCount, deferred, error){
          if (error) {
            console.error(error);
            deferred.reject(error);
          }
        }

        if (!data.retrievedWorkOrders.length) {
          return defer.reject();
        }

        db.transaction(
          function(tx) {
            data.retrievedWorkOrders.forEach(
              function(workOrder, i){
                // Lookup work order id in the work orders list
                // to decide whether update or insert is needed

                // Set address_uuid to value from addressesHashmap
                workOrder.address_uuid = data.addressesHashmap[+workOrder.address_id];

                // Convert dates to utc for vendors
                if (workOrder.assigned_vendors) {
                  workOrder.assigned_vendors = workOrder.assigned_vendors.map(function(vendor){
                    vendor.scheduled_date = DBA.getUtcDate(vendor.scheduled_date);
                    return vendor;
                  });
                }

                if (data.existingWorkOrderLinks.indexOf(+workOrder.link_person_wo_id) > -1) {
                  console.info('[wo] update ' + workOrder.work_order_number);
                  tx.executeSql(
                    getUpdateWorkOrderQuery(),
                    [
                      workOrder.address_uuid,
                      workOrder.store_number, //store number
                      workOrder.client, //client
                      workOrder.phone, //phone
                      workOrder.fax, //fax
                      DBA.getUtcDate(workOrder.confirmed_at),
                      DBA.getUtcDate(workOrder.completed_at),
                      DBA.getUtcDate(workOrder.canceled_at),
                      DBA.getUtcDate(workOrder.received_date), //received_date
                      DBA.getUtcDate(workOrder.scheduled_date), //received_date
                      DBA.getUtcDate(workOrder.expected_completion_date), //expected_completion_date
                      workOrder.estimated_time,
                      workOrder.status, //status,
                      workOrder.priority,
                      workOrder.tech_status_type_id,
                      workOrder.description, //description
                      workOrder.instructions, //instruction
                      workOrder.ivr_instructions, //qb_info,
                      workOrder.ivr_pin,
                      workOrder.ivr_button_url,
                      workOrder.ivr_button_label,
                      workOrder.tcg_ivr_pin,
                      workOrder.ivr_number,
                      workOrder.ivr_from_store,
                      workOrder.ivr_number_forward,
                      workOrder.tcg_ivr_tracking,
                      JSON.stringify(workOrder.assigned_vendors),
                      JSON.stringify(workOrder.purchase_orders),
                      workOrder.primary_technician,
                      workOrder.work_order_number,
                      workOrder.link_person_wo_id
                    ],
                    onQuerySuccess.bind(null, i, data.retrievedWorkOrders.length, defer),
                    onQueryError.bind(null, i, data.retrievedWorkOrders.length, defer)
                  );
                  tx.executeSql('update work_order_status_history set sync = 1 where work_order_uuid = (select uuid from work_orders where link_person_wo_id = ? limit 1)', [workOrder.link_person_wo_id]);
                } else {
                  workOrder.uuid = DBA.getUuid();
                  console.info('[wo] insert ' + workOrder.work_order_number);
                  tx.executeSql(
                    getInsertWorkOrderQuery(),
                    [
                      workOrder.uuid,
                      workOrder.link_person_wo_id, //id
                      workOrder.link_person_wo_id, //link_person_wo_id
                      workOrder.work_order_id,
                      workOrder.sync || 1, //sync - 1 for  synced, 0 for to sync
                      workOrder.work_order_number, //work_order_number
                      workOrder.address_uuid, //address_uuid
                      workOrder.store_number, //store number
                      workOrder.client, //client
                      workOrder.phone, //phone
                      workOrder.fax, //fax
                      DBA.getUtcDate(workOrder.confirmed_at),
                      DBA.getUtcDate(workOrder.completed_at),
                      DBA.getUtcDate(workOrder.canceled_at),
                      DBA.getTimestamp(),
                      DBA.getUtcDate(workOrder.received_date), //received_date
                      DBA.getUtcDate(workOrder.scheduled_date),
                      DBA.getUtcDate(workOrder.expected_completion_date), //expected_completion_date
                      workOrder.estimated_time,
                      workOrder.status, //status,
                      workOrder.tech_status_type_id,
                      workOrder.priority,
                      workOrder.description, //description
                      workOrder.instructions, //instruction
                      workOrder.ivr_instructions,
                      workOrder.ivr_pin,
                      workOrder.ivr_button_label,
                      workOrder.ivr_button_url,
                      workOrder.tcg_ivr_pin,
                      workOrder.ivr_number,
                      workOrder.ivr_from_store,
                      workOrder.ivr_number_forward,
                      workOrder.tcg_ivr_tracking,
                      JSON.stringify(workOrder.assigned_vendors),
                      JSON.stringify(workOrder.purchase_orders),
                      workOrder.primary_technician
                    ],
                    onQuerySuccess.bind(null, i, data.retrievedWorkOrders.length, defer),
                    onQueryError.bind(null, i, data.retrievedWorkOrders.length, defer)
                  );
                }
              }
            );
          }
        );

        return defer.promise;
      }
    )
    .then(
      function(){
        return DBA.query(
          ' update assets set address_uuid = ' +
          ' ( ' +
          '   select wo.address_uuid ' +
          '   from work_orders wo join work_order_assets woa on woa.work_order_uuid = wo.uuid ' +
          '   where woa.asset_uuid = assets.uuid limit 1 ' +
          ' ) where address_uuid is null or length(trim(address_uuid)) = 0'
        );
      }
    );
  };

  function getInsertWorkOrderQuery(){
    return 'insert  ' +
    'into work_orders  ' +
    '(uuid,  ' +
    'id,  ' +
    'link_person_wo_id, ' +
    'work_order_id,' +
    'sync,  ' +
    'work_order_number,  ' +
    'address_uuid,  ' +
    'store_number,  ' +
    'client ,' +
    'phone,  ' +
    'fax,  ' +
    'confirmed_at,  ' +
    'completed_at, ' +
    'canceled_at, ' +
    'created_at, ' +
    'received_date,  ' +
    'received_date, ' +
    'expected_completion_date,  ' +
    'estimated_time, ' +
    'status,  ' +
    'tech_status_type_id, ' +
    'priority, ' +
    'description,  ' +
    'instruction,  ' +
    'ivr_instructions, ' +
    'ivr_pin, ' +
    'ivr_button_label, ' +
    'ivr_button_url, ' +
    'tcg_ivr_pin, ' +
    'ivr_number,  ' +
    'ivr_from_store, ' +
    'ivr_number_forward, ' +
    'tcg_ivr_tracking, ' +
    'assigned_techs_vendors, ' +
    'purchase_orders, ' +
    'primary_technician ' +
    ')  ' +
    'values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ';
  }

  function getUpdateWorkOrderQuery(){
    return 'update work_orders ' +
    'set sync = 1,  ' +
    'address_uuid = ?, ' +
    'store_number = ?,  ' +
    'client = ?,' +
    'phone = ?,  ' +
    'fax = ?,  ' +
    'confirmed_at = ?,  ' +
    'completed_at = ?,  ' +
    'canceled_at = ?,  ' +
    'received_date = ?,  ' +
    'scheduled_date = ?,  ' +
    'expected_completion_date = ?,  ' +
    'estimated_time = ?, ' +
    'status = ?,  ' +
    'priority = ?, ' +
    'tech_status_type_id = ?, ' +
    'description = ?,  ' +
    'instruction = ?,  ' +
    'ivr_instructions = ?, ' +
    'ivr_pin = ?, ' +
    'ivr_button_url = ?, ' +
    'ivr_button_label = ?, ' +
    'tcg_ivr_pin = ?, ' +
    'ivr_number = ? ,  ' +
    'ivr_from_store = ?, ' +
    'ivr_number_forward = ?, ' +
    'tcg_ivr_tracking = ?, ' +
    'assigned_techs_vendors = ?, ' +
    'purchase_orders = ?, ' +
    'primary_technician = ?, ' +
    'work_order_number = ? ' +
    'where link_person_wo_id = ?';
  }

  self.setCurrentTechStatus = function(status, uuid){


    return DBA.query('update work_orders set tech_status_type_id = ?, sync = 0 where uuid = ?', [status.id, uuid]);
  };

  self.getFromLocalDatabase = function(){
    return $q(function(resolve, reject){
      var workOrdersQuery =
      'select ' +
      'wo.uuid, wo.id, wo.status, wo.ivr_instructions, wo.ivr_pin, wo.tcg_ivr_pin, wo.ivr_number, wo.ivr_from_store, wo.ivr_number_forward, wo.received_date, wo.expected_completion_date , wo.description, wo.instruction, wo.work_order_number, a.id as address_id, a.address street, a.city, a.zip_code, a.state, wo.store_number, wo.client ' +
      'from work_orders wo left join addresses a on wo.address_uuid = a.uuid ' +
      'order by wo.scheduled_date asc';

      DBA.query(workOrdersQuery, []).then(
        function(resultSet){
          resolve(DBA.getAll(resultSet));
        },
        function(error){
          reject(error);
        }
      );
    });
  };

  // get pending wo query body part
  self.getPendingWorkOrdersFromAndWhere = function(){
    return '' +
    ' from work_orders wo ' +
    ' left join addresses a on wo.address_uuid = a.uuid ' +
    ' left join tech_statuses tech on tech.id = wo.tech_status_type_id ' +
    ' where  ' +
    ' (wo.status = \'issued\') ' +
    ' and (wo.tech_status_type_id in( select id from types where type_key in (\'tech_status.scheduled\') ) ' +
    ' or wo.tech_status_type_id is null) ';
  };

  self.getPendingWorkOrders = function(){
    var sql =
    ' select ' +
    ' wo.*, a.address street, a.id as address_id, a.city, a.zip_code, a.state, tech.name as tech_status ' +
    self.getPendingWorkOrdersFromAndWhere() +
    ' order by wo.scheduled_date asc';
    return DBA.findAsArray(sql);
  };

  // get open wo query body part
  self.getOpenWorkOrdersFromAndWhere = function(){
    return '' +
    ' from work_orders wo ' +
    ' left join addresses a on wo.address_uuid = a.uuid ' +
    ' left join tech_statuses tech on tech.id = wo.tech_status_type_id ' +
    ' where (wo.status in (\'confirmed\', \'in_progress\', \'in_progress_and_hold\')) ' +
    ' and wo.tech_status_type_id in( select id from types where type_key in (\'tech_status.waiting_service\',\'tech_status.travel\',\'tech_status.onsite\') ) ';
  };

  self.getOpenWorkOrders = function(){
    var sql =
    ' select ' +
    ' wo.*, a.address street, a.id as address_id, a.city, a.zip_code, a.state, tech.name as tech_status ' +
    self.getOpenWorkOrdersFromAndWhere() +
    ' order by wo.scheduled_date asc';
    return DBA.findAsArray(sql);
  };

  // get completed wo query body part
  self.getCompletedWorkOrdersFromAndWhere = function(){
    return ' from work_orders wo left join addresses a on wo.address_uuid = a.uuid  left join tech_statuses tech on tech.id = wo.tech_status_type_id ' +
    ' where (wo.status = \'completed\' ' +
    ' or wo.tech_status_type_id in( ' +
    ' select id from types where type_key in (\'tech_status.check_out\',\'tech_status.waiting_parts\',\'tech_status.waiting_quote\',\'tech_status.return_trip\') ' +
    ' )) ' +
    ' and (datetime(wo.completed_at) >= datetime(\'now\', \'- 7 day\') or wo.completed_at is null ) ';
  };

  self.getCompletedWorkOrders = function(){
    var sql =
    ' select ' +
    ' wo.*, a.address street, a.id as address_id, a.city, a.zip_code, a.state, tech.name as tech_status ' +
    self.getCompletedWorkOrdersFromAndWhere() +
    ' order by wo.scheduled_date asc';
    return DBA.findAsArray(sql);
  };

  self.getWorkOrderSummary = function(){
    var sql = '' +
    ' select openWorkOrders.total totalOpen, pendingWorkOrders.total totalPending, completedWorkOrders.total totalCompleted from ' +
    ' ( select count(1) total ' +
    self.getOpenWorkOrdersFromAndWhere() +
    ' ) openWorkOrders, ' +
    ' ( select count(1) total ' +
    self.getPendingWorkOrdersFromAndWhere() +
    ' ) pendingWorkOrders, ' +
    ' ( select count(1) total ' +
    self.getCompletedWorkOrdersFromAndWhere() +
    ' ) completedWorkOrders ';

    return DBA.findOrNull(sql);
  };

self.getByUuid = function(uuid){
  return DBA.findOrNull(
    'select wo.*, ts.name as tech_status_name, a.id as address_id, a.address as street, a.gps_coords, a.city, a.state, a.zip_code ' +
    ' from work_orders wo left join addresses a on wo.address_uuid = a.uuid left join tech_statuses ts on ts.id = wo.tech_status_type_id' +
    ' where wo.uuid = ? limit 1',
    [uuid]
  )
  .then(function(wo){
    if (wo.confirmed_at=='null' || wo.confirmed_at===null) {
      wo.confirmed_at = null;
    }

    if (wo.assigned_techs_vendors) {
      try {
        wo.assigned_techs_vendors = JSON.parse(wo.assigned_techs_vendors);
      }
      catch(e){
        Logger.error('error parsing assigned_techs_vendors');
        Logger.error(e);
      }
    }

    if (wo.purchase_orders) {
      try {
        wo.purchase_orders = JSON.parse(wo.purchase_orders);
      }
      catch(e){
        Logger.error('error parsing purchase_orders');
        Logger.error(e);
      }
    }

    return wo;
  });
};

self.getByRelatedAssetUuid = function(assetUuid){
  return DBA.findOrNull('select * from work_orders wo join work_order_assets woa on woa.work_order_uuid = wo.uuid where woa.asset_uuid = ? limit 1', [assetUuid]);
};

self.getByLinkPersonWoId = function(linkPersonWoId){
  return DBA.findOrNull('select * from work_orders wo where link_person_wo_id = ? limit 1', [linkPersonWoId]);
};

self.confirm = function(uuid){
  return $q(function(resolve, reject){
    var confirmedAt = DBA.getTimestamp();
    DBA.query('update work_orders set confirmed_at = ?, status = ?, sync = 0 where uuid = ?', [confirmedAt, WORK_ORDER_STATUS.confirmed, uuid])
    .then(
      function(){
        resolve();
      },
      function(error){
        reject(error);
      }
    )
    ;
  });
};

self.complete = function(workOrder){
  workOrder.completed_at = (workOrder.completed_at && workOrder.completed_at.length) ? workOrder.completed_at : DBA.getTimestamp();
  workOrder.status = WORK_ORDER_STATUS.completed;

  return DBA.query('update work_orders set status = ?, completed_at = ?, sync = 0 where uuid = ?', [WORK_ORDER_STATUS.completed, workOrder.completed_at, workOrder.uuid]);
};

self.changeStatus = function(uuid, status){
  return DBA.query('update work_orders set status = ?, sync = 0 where uuid = ?', [status, uuid]);
};

self.setInProgress = function(workOrder){
  workOrder.status = WORK_ORDER_STATUS.in_progress;
  return self.changeStatus(workOrder.uuid, workOrder.status);
};

self.setInProgressAndHold = function(workOrder){
  workOrder.status = WORK_ORDER_STATUS.in_progress_and_hold;
  return self.changeStatus(workOrder.uuid, workOrder.status);
};

self.isSigned = function(workOrderUuid){
  var sql = '' +
  ' select f.* ' +
  ' from files f ' +
  ' where f.object_uuid = ( ' +
  '   select ts.uuid from time_sheets ts ' +
  '   where ts.object_uuid = ? order by ts.start_at desc limit 1 ' +
  ' ) ' +
  ' limit 1';

  return DBA.findOrNull(sql, [workOrderUuid]);
};

self.hasAtLeastOneLabor = function(linkPersonWoId){
  var sql = '' +
  ' select labor.* from billing_entries labor where link_person_wo_id = ? and step_name = \'labor\'';
  return DBA.findOrNull(sql, [linkPersonWoId]);
};

self.hasAtLeastOneWorkDescription = function(workOrderUuid){
  var sql = '' +
  ' select woa.* from work_order_assets woa ' +
  ' where woa.work_order_uuid = ? and woa.work_performed is not null and length(woa.work_performed) > 0';
  return DBA.findOrNull(sql, [workOrderUuid]);
};

self.assignAssetToWorkOrder = function(asset, workOrder){
  return $q(function(resolve, reject){
    DBA.findOrNull('select * from work_order_assets where asset_uuid = ? and work_order_uuid = ?', [
      workOrder.uuid,
      asset.uuid,
    ])
    .then(function(existingRelationship){
      if (!existingRelationship) {
        DBA.query('insert into work_order_assets (work_order_uuid, asset_uuid, created_at,uuid) values (?,?,?,?)', [
          workOrder.uuid,
          asset.uuid,
          DBA.getTimestamp(),
          DBA.getUuid()
        ])
        .then(
          function(){
            DBA.query('update assets set sync = 0 where uuid = ?', [asset.uuid]);
            resolve();
          },
          function(error){
            reject(error);
          }
        );
      } else {
        reject();
      }
    });
  });
};

self.getTechStatus = function(workOrderUuid){
  return DBA.findOrNull('select t.* from tech_statuses t join work_orders wo on wo.tech_status_type_id = t.id where wo.uuid = ? limit 1', [workOrderUuid]);
};

return self;
})
.factory('StatusHistory', function(DBA, DEFAULT_DATE_FORMAT){
  var self = this;

  self.store = function(statusData){
    return DBA.query('insert into work_order_status_history(work_order_uuid, current_tech_status_type_id, previous_tech_status_type_id, created_at, sync) values(?,?,?,?,0)',[
      statusData.work_order_uuid,
      statusData.current_tech_status_type_id,
      statusData.previous_tech_status_type_id,
      DBA.getTimestamp()
    ]);
  };

  return self;
})
;
