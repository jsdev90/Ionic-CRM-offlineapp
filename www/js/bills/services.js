angular.module('app.bills.services', [])
.factory('BillingEntry', function($q, DBA, $http, DEFAULT_DATE_FORMAT, PHOTO_PLACEHOLDER){
  var self = this;

  self.sync = function(){
    return $q(function(resolve, reject){

      DBA.query(
        '' +
        ' select ' +
        ' be.*, t.id as type_id, be.object_uuid as asset_uuid, ' +
        ' (select id from assets where uuid = woa.asset_uuid limit 1) as asset_id ' +
        ' from billing_entries be ' +
        ' join types t on be.step_name = t.type_value ' +
        ' join work_orders wo on wo.link_person_wo_id = be.link_person_wo_id ' +
        ' join work_order_assets woa on woa.asset_uuid = be.object_uuid and woa.work_order_uuid = wo.uuid ' +
        ' where be.sync = 0 '
      )
      .then(
        function(results){
          results = DBA.getAll(results);
          results = results.map(function(entry){
            if (entry.step_name === 'miscellaneous') {
              entry.step_name = 'other';
            }
            return entry;
          });
          return results;
        })
        .then(
          function(billingEntries){
            return {
              billingEntries: billingEntries
            };
          })
          .then(
            function(data){
              var syncRoute = '/mobile/bills/sync';
              return $http({method: 'post', url: syncRoute, data: {bill_entries: data.billingEntries}})
              .then(function(response){

                var syncs = response.data.response.syncs;
                var billingEntries = response.data.response.bill_entries;

                syncs.forEach(
                  function(syncData){
                    DBA.query('update billing_entries set id = ?, sync = 1 where uuid = ?', [
                      syncData.object_id,
                      syncData.uuid
                    ])
                    .then(
                      function(){
                        var entryToUpdate = billingEntries.filter(function(billingEntry){
                          return billingEntry.id === syncData.object_id;
                        })
                        .pop();

                        if (entryToUpdate) {
                          DBA.query('update billing_entries set bill_id = ? where id = ?', [entryToUpdate.bill_id, entryToUpdate.id]);
                        }
                      }
                    );
                  }
                );
              });
            })
            .then(
              function(){
                resolve();
              },
              function(err){
                reject(err);
              }
            );
          });
        };

        // Get single billind entry details by its uuid
        self.getByUuid = function(uuid){
          var sql = '' +
          ' select uuid, item_lead_time_type_id as itemLeadTimeTypeId, ' +
          ' supplier_person_id as supplierPersonId, ' +
          ' item_id as itemId, ' +
          ' trade_type_id as tradeTypeId, ' +
          ' trade_type_id as laborTradeTypeId, ' +
          ' labor_rate_type_id as laborRateTypeId, ' +
          ' step_name, ' +
          ' price, ' +
          ' item_code as itemCode,' +
          ' step_name as stepName, ' +
          ' desc, qty, unit, men, hrs, total, subcontractor_name as subcontractorName, subcontractor_phone as subcontractorPhone, from_inventory as fromInventory ' +
          ' from billing_entries where uuid = ?';

          return DBA.findOrNull(sql, [uuid]);
        };

        // Get entries count for each step (labor, material etc)
        self.getEntriesCountForObjectUuidAndLinkPersonWoIdGroupedByStep = function(objectUuid, linkPersonWoId){
          var sql = 'select count(1) as entriesCount, step_name from billing_entries where object_uuid = ? and link_person_wo_id = ? group by step_name';
          return DBA.query(sql, [objectUuid, linkPersonWoId])
          .then(function(results){
            return DBA.getAll(results);
          });
        };

        self.remove = function(uuid){
          return DBA.query('delete from billing_entries where uuid = ?', [uuid]);
        };

        self.update = function(entryData){
          var sql = '' +
          'update billing_entries ' +
          ' set item_lead_time_type_id = ?, supplier_person_id = ?, item_id = ?, trade_type_id = ?, labor_rate_type_id = ?, step_name = ?, desc = ?, qty = ?, unit = ?, men = ?, hrs = ?, total = ?, price = ?, item_code = ?, unit_down = ?, subcontractor_name = ?, subcontractor_phone = ?, from_inventory = ?, sync = 0 where uuid = ?';

          return DBA.query(sql, [
            entryData.itemLeadTimeTypeId ? entryData.itemLeadTimeTypeId : '',
            entryData.supplierPersonId ? entryData.supplierPersonId : '',
            entryData.itemId ? entryData.itemId : '',
            entryData.tradeTypeId ? entryData.tradeTypeId : '',
            entryData.laborRateTypeId ? entryData.laborRateTypeId : '',
            entryData.stepName,
            entryData.desc ? entryData.desc : '',
            entryData.qty ? entryData.qty : 1,
            entryData.unit  ? entryData.unit: 'pcs',
            entryData.men ? entryData.men: 0,
            entryData.hrs ? entryData.hrs: 0,
            entryData.total ? entryData.total : '',
            entryData.price ? entryData.price : 0,
            entryData.item_code ? entryData.itemCode : '',
            entryData.unitDown ? 1 : 0,
            entryData.subcontractorName ? entryData.subcontractorName : '',
            entryData.subcontractorPhone ? entryData.subcontractorPhone : '',
            entryData.fromInventory ? entryData.fromInventory : '',
            entryData.uuid
          ]);
        };

        self.add = function(entryData){
          var uuid = DBA.getUuid();
          var sql = ''
          + ' insert '
          + ' into billing_entries '
          + ' (item_lead_time_type_id, link_person_wo_id, supplier_person_id, item_id, uuid, object_uuid, trade_type_id, labor_rate_type_id, step_name, desc, qty, unit, men, hrs, total, price, item_code, unit_down, subcontractor_name, subcontractor_phone, from_inventory, created_at) '
          + ' values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

          return DBA.query(sql, [
            entryData.itemLeadTimeTypeId ? entryData.itemLeadTimeTypeId : '',
            entryData.linkPersonWoId ? entryData.linkPersonWoId : null,
            entryData.supplierPersonId ? entryData.supplierPersonId : '',
            entryData.itemId ? entryData.itemId : '',
            uuid,
            entryData.assetUuid,
            entryData.tradeTypeId ? entryData.tradeTypeId : '',
            entryData.laborRateTypeId ? entryData.laborRateTypeId : '',
            entryData.stepName,
            entryData.desc ? entryData.desc : '',
            entryData.qty ? entryData.qty : 1,
            entryData.unit  ? entryData.unit: 'pcs',
            entryData.men ? entryData.men: 0,
            entryData.hrs ? entryData.hrs: 0,
            entryData.total ? entryData.total : '',
            entryData.price ? entryData.price : 0,
            entryData.itemCode ? entryData.itemCode : '',
            entryData.unitDown ? entryData.unitDown : 0,
            entryData.subcontractorName ? entryData.subcontractorName : '',
            entryData.subcontractorPhone ? entryData.subcontractorPhone : '',
            entryData.fromInventory ? entryData.fromInventory : '',
            DBA.getTimestamp()
          ])
          .then(
            function(){
              return DBA.findOrNull('select * from billing_entries where uuid = ?', [uuid]);
            }
          );
        };

        self.getEntriesForAssetUuidAndLinkPersonWoId = function(assetUuid, linkPersonWoId){
          var sql = 'select be.*, t.type_value as trade, f.filename from billing_entries be left join files f on f.object_uuid = be.uuid left join types t on t.id = be.trade_type_id where be.object_uuid = ? and be.link_person_wo_id = ? and be.step_name != \'total\'';

          return DBA.query(sql, [assetUuid, linkPersonWoId])
          .then(function(results){
            results = DBA.getAll(results);
            results = results.map(function(result){
              result.photo_path = PHOTO_PLACEHOLDER;
              if (window.cordova && result.filename) {
                result.photo_path = Storage.resolveFilePath(result.filename);
              }
              return result;
            });

            return results;
          });
        };

        self.getEntriesForAssetUuidLinkPersonWoIdAndStepName = function(assetUuid, linkPersonWoId, stepName){

          var sql = 'select be.*, t.type_value as trade, f.filename from billing_entries be left join files f on f.object_uuid = be.uuid left join types t on t.id = be.trade_type_id where be.object_uuid = ? and be.link_person_wo_id = ? and step_name = ?';

          return DBA.query(sql, [assetUuid, linkPersonWoId, stepName])
          .then(function(results){
            results = DBA.getAll(results);
            results = results.map(function(result){
              if (window.cordova && result.filename) {
                result.photo_path = window.cordova.file.dataDirectory + result.filename;
              } else {
                result.photo_path = PHOTO_PLACEHOLDER;
              }
              return result;
            });

            return results;
          });
        };

        self.setReady = function(entryUuid){
          return DBA.query('update billing_entries set ready_at = ? where uuid = ?', [DBA.getTimestamp(), entryUuid]);
        };

        // Set ids for billing entries using api request results. Called in Sync
        self.updateBillIds = function(billingEntries){
          var promises = [];

          billingEntries.forEach(
            function(billingEntry){
              promises.push(DBA.query(
                'update billing_entries set bill_id = ? where id = ?',
                [
                  billingEntry.bill_id,
                  billingEntry.id
                ]
              ));
            }
          );

          return $q.all(promises);
        };

        return self;
      })
      ;
