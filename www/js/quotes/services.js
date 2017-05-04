angular.module('app.quotes.services', [])
.factory('Quote', function($q, $http, DBA, Logger, DEFAULT_DATE_FORMAT, PHOTO_PLACEHOLDER){
    var self = this;

    self.sync = function(){
      return $q(function(resolve, reject){
          DBA.query(
              'select q.*, "link_asset_person_wo" as table_name, ' +
              ' ( ' +
              '   select woa.link_asset_person_wo_id ' +
              '   from work_order_assets woa ' +
              '   join work_orders wo on wo.uuid = woa.work_order_uuid ' +
              '   where wo.link_person_wo_id = q.link_person_wo_id limit 1 ' +
              ' ) as record_id, ' +
              ' (select id from assets where uuid = q.asset_uuid limit 1) as asset_id  ' +
              ' from quotes q where q.sync = 0 and q.approved_at is null'
          )
          .then(
              function(result){
                  var quotes = DBA.getAll(result);
                  quotes = quotes.map(function(quote){
                      quote.link_asset_person_wo_id = quote.link_asset_person_wo_id ? quote.link_asset_person_wo_id : '';
                      quote.description = quote.description ? quote.description : 'No description';
                      return quote;
                  });
                  quotes = quotes.filter(function(quote){
                      if (!quote.record_id) {
                          //This is just a warning - disabling. It occurs when asset that the quote is assigned to is not synced yet.
                          //Logger.warning('Tried to sync quote with no matching link_asset_person_wo_id');
                      }
                      return !!quote.record_id;
                  });
                  return quotes;
              }
          )
          .then(function(quotes){
              var promises = [];
              quotes.forEach(function(quote){
                  promises.push(DBA.query('select qe.* from quote_entries qe where qe.quote_uuid = ? and sync = 0', [quote.uuid])
                  .then(function(results){
                      var quoteEntries = DBA.getAll(results);
                      quote.entries = quoteEntries ? quoteEntries : [];
                  }));
              });

              $q.all(promises).then(
                  function(){
                      var syncRoute = '/mobile/quotes/sync';
                      quotes = quotes.map(function(quote){
                          quote.record_id = parseInt(quote.record_id);
                          return quote;
                      });
                      $http({method: 'post', url: syncRoute, data: {quotes: quotes}})
                      .then(
                          function(response){

                              var syncs = response.data.response.syncs;
                              var syncEntries = response.data.response.sync_entries;
                              var retrievedQuotes = response.data.response.quotes;

                              var syncPromises = [];
                              syncs.forEach(
                                function(syncData){
                                  syncPromises.push(DBA.query('update quotes set id = ? where uuid = ?', [syncData.object_id, syncData.uuid]));
                                }
                              );

                              syncEntries.forEach(
                                function(syncedEntryData){
                                  syncPromises.push(DBA.query('update quote_entries set sync = 1, id = ? where uuid = ?', [syncedEntryData.object_id, syncedEntryData.uuid]));
                                  syncPromises.push(DBA.query('update files set object_id = ? where object_uuid = ?', [syncedEntryData.object_id, syncedEntryData.uuid]));
                                }
                              );

                              $q.all(syncPromises)
                              .then(
                                function(){
                                  retrievedQuotes.forEach(function(retrievedQuote){
                                      DBA.query('update quotes set sync = 1, approved_at = ?, summary = ? where id = ?', [retrievedQuote.approved_at, JSON.stringify(retrievedQuote.summary), retrievedQuote.id]);
                                  });
                                }
                              );

                              resolve();

                          },
                          function(err){
                              reject(err);
                          }
                      );
                  }
              );
          });
      });
    };

    self.create = function(quoteData){
        return $q(function(resolve, reject){
            var uuid = DBA.getUuid();
            DBA.query('insert into quotes (uuid, asset_uuid, link_person_wo_id, description, unit_down, status, table_name, created_at) values(?,?,?,?,?,?,?,?)', [
                uuid,
                quoteData.assetUuid,
                quoteData.link_person_wo_id,
                quoteData.description ? quoteData.description : '',
                quoteData.unitDown ? 1 : 0,
                quoteData.status || 0,
                'link_person_wo',
                DBA.getTimestamp()
            ])
            .then(function(){
                return DBA.findOrNull('select * from quotes where uuid = ?', [uuid]);
            })
            .then(
                function(quote){
                    resolve(quote);
                },
                function(error){
                    reject(error);
                }
            );
        });
    };

    self.update = function(quoteData){
        return DBA.query('update quotes set description = ?, sync = 0, unit_down = ?, status = ?, contact_name = ?, contact_number = ?, price_verified_by_supplier = ? where uuid = ?', [
            quoteData.description ? quoteData.description : '',
            quoteData.unitDown ? 1 : 0,
            quoteData.status,
            quoteData.contactName ? quoteData.contactName : '',
            quoteData.contactNumber ? quoteData.contactNumber : '',
            quoteData.priceVerified ? 1 : 0,
            quoteData.uuid
        ]);
    };

    self.getByUuid = function(quoteUuid){
        return DBA.findOrNull('select * from quotes where uuid = ?', [quoteUuid]);
    };

    self.getForAssetUuid = function(assetUuid){
        return DBA.query('select * from quotes where asset_uuid = ?', [assetUuid]).then(
            function(results){
                return DBA.getAll(results);
            }
        );
    };

    self.getNewForAssetUuid = function(assetUuid, linkPersonWoId){
        return DBA.query('select * from quotes where asset_uuid = ? and link_person_wo_id = ? and approved_at is null and ready_at is null', [assetUuid, linkPersonWoId]).then(
            function(results){
                return DBA.getAll(results);
            }
        );
    };

    self.getExistingForAssetUuid = function(assetUuid, linkPersonWoId){
        return DBA.query('select * from quotes where asset_uuid = ? and link_person_wo_id = ? and ready_at is not null and approved_at is null', [assetUuid, linkPersonWoId]).then(
            function(results){
                return DBA.getAll(results);
            }
        );
    };

    self.getApprovedForAssetUuid = function(assetUuid, linkPersonWoId){
        return DBA.query('select * from quotes where asset_uuid = ? and link_person_wo_id = ? and approved_at is not null', [assetUuid, linkPersonWoId]).then(
            function(results){
                results = DBA.getAll(results);

                results = results.map(function(quote){
                    if (quote.summary.length) {
                        quote.summary = JSON.parse(quote.summary);
                    }
                    return quote;
                });



                return results;
            }
        );
    };

    self.setReady = function(quoteUuid){
        return DBA.query('update quotes set ready_at = ? where uuid = ?', [DBA.getTimestamp(), quoteUuid]);
    };

    self.remove = function(quoteUuid){
        DBA.query('delete from quote_entries where quote_uuid = ?', [quoteUuid]);
        return DBA.query('delete from quotes where uuid = ?', [quoteUuid]);
    };

    return self;
})
.factory('QuoteEntry', function($q, DBA, DEFAULT_DATE_FORMAT, PHOTO_PLACEHOLDER, Storage, Logger){
    var self = this;

    self.deleteTotalStepForQuoteUuid = function(quoteUuid){
        return DBA.query('delete from quote_entries where quote_uuid = ? and step_name = \'total\'', [quoteUuid]);
    };

    self.getByUuid = function(uuid){
        var sql = '' +
        ' select uuid, item_lead_time_type_id as itemLeadTimeTypeId, ' +
        ' supplier_person_id as supplierPersonId, ' +
        ' item_id as itemId, ' +
        ' trade_type_id as tradeTypeId, ' +
        ' trade_type_id as laborTradeTypeId, ' +
        ' labor_rate_type_id as laborRateTypeId, ' +
        ' step_name, ' +
        ' price,' +
        ' part_number as partNumber, ' +
        ' step_name as stepName, ' +
        ' desc, qty, unit, men, hrs, total, subcontractor_name as subcontractorName, subcontractor_phone as subcontractorPhone, from_inventory as fromInventory ' +
        ' from quote_entries where uuid = ?';

        return DBA.findOrNull(sql, [uuid]);
    };

    self.remove = function(uuid){
        return DBA.query('delete from quote_entries where uuid = ?', [uuid]);
    };

    self.update = function(entryData){
        var sql = '' +
        ' update quote_entries ' +
        ' set item_lead_time_type_id = ?, supplier_person_id = ?, item_id = ?, trade_type_id = ?, labor_rate_type_id = ?, step_name = ?, desc = ?, qty = ?, unit = ?, men = ?, hrs = ?, total = ?, price = ?, part_number = ?, subcontractor_name = ?, subcontractor_phone = ?, from_inventory = ?, sync = 0 where uuid = ?';

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
            entryData.part_number ? entryData.part_number : '',
            entryData.subcontractorName ? entryData.subcontractorName : '',
            entryData.subcontractorPhone ? entryData.subcontractorPhone : '',
            entryData.fromInventory ? entryData.fromInventory : '',
            entryData.uuid
        ])
        .then(
            function(){
                DBA.query('update quotes set sync = 0 where uuid = ?', [entryData.quoteUuid]);
            }
        );
    };

    self.add = function(entryData){
        var uuid = DBA.getUuid();
        var sql = '' +
        ' insert ' +
        ' into quote_entries ' +
        ' ( ' +
        ' created_at, item_lead_time_type_id, supplier_person_id, item_id, uuid, quote_uuid, trade_type_id, labor_rate_type_id, step_name, desc, qty, unit, men, hrs, total, price, part_number, subcontractor_name, subcontractor_phone, from_inventory) ' +
        ' values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

        return DBA.query(sql, [
            DBA.getTimestamp(),
            entryData.itemLeadTimeTypeId ? entryData.itemLeadTimeTypeId : '',
            entryData.supplierPersonId ? entryData.supplierPersonId : '',
            entryData.itemId ? entryData.itemId : '',
            uuid,
            entryData.quoteUuid,
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
            entryData.partNumber ? entryData.partNumber : '',
            entryData.subcontractorName ? entryData.subcontractorName : '',
            entryData.subcontractorPhone ? entryData.subcontractorPhone : '',
            entryData.fromInventory ? entryData.fromInventory : ''
        ])
        .then(
            function(){
                DBA.query('update quotes set sync = 0 where uuid = ?', [entryData.quoteUuid]);
                return DBA.findOrNull('select * from quote_entries where uuid = ?', [uuid]);
            }
        );
    };

    self.getEntriesForQuoteUuid = function(quoteUuid){
        var sql = 'select qe.*, t.type_value as trade, f.filename from quote_entries qe left join files f on f.object_uuid = qe.uuid left join types t on t.id = qe.trade_type_id where qe.quote_uuid = ? and qe.step_name != \'total\'';

        return DBA.query(sql, [quoteUuid])
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

    self.getEntriesForQuoteUuidAndStepName = function(quoteUuid, stepName){

        var sql = 'select qe.*, t.type_value as trade, f.filename, f.thumbnail from quote_entries qe left join files f on f.object_uuid = qe.uuid left join types t on t.id = qe.trade_type_id where qe.quote_uuid = ? and step_name = ?';

        return DBA.query(sql, [quoteUuid, stepName])
        .then(function(results){
            results = DBA.getAll(results);
            results = results.map(function(result){
                if (window.cordova && result.filename) {
                    result.photo_path = Storage.resolveFilePath(result.filename);
                } else {
                    result.photo_path = PHOTO_PLACEHOLDER;
                }
                return result;
            });

            return results;
        });
    };

    return self;
})
.factory('Equipment', function($q, DBA, Logger, Account, $http, $rootScope, $cordovaSQLite){
    var self = this;

    self.getInventoryFromApi = function(){
        return $http.get('/mobile/items/inventory')
        .then(
            function(result){
                var inventory = result.data.response.inventory.data;

                if (inventory.length) {
                    DBA.query('delete from inventory').then(
                        function(){
                            inventory.forEach(function(entry){
                                DBA.query(
                                    //(id, type_id, upc, number, description, company)
                                    'insert into inventory (item_id, qty) values(?,?)',
                                    [
                                        entry.item_id,
                                        entry.qty
                                    ]
                                );
                            });
                        }
                    );
                }
            }
        );
    };

    self.getItemsFromApi = function(){
        var limit = 800;
        return $http.get('/mobile/items?limit='+limit)
        .then(
            function(result){
                var page = 1;
                var maxPages = result.data.response.items.last_page;
                var items = [];
                var itemsPromises = [];
                for (var i = page; i <= maxPages; i++) {
                    itemsPromises.push($http.get('/mobile/items?limit='+limit+'&page=' + i));
                }
                return $q.all(itemsPromises).then(
                    function(responses){
                        responses.forEach(function(response){
                            response.data.response.items.data.forEach(function(item){
                                items.push(item);
                            });
                        });

                        if (items.length) {
                            return DBA.query('delete from items').then(
                                function(){
                                    db.transaction(function(tx) {
                                        items.forEach(function(item, itemIndex){
                                            tx.executeSql(
                                                'insert into items (id, type_id, upc, number, description, company) values(?,?,?,?,?,?)',
                                                [
                                                    item.id,
                                                    item.type_id,
                                                    item.upc,
                                                    item.number,
                                                    item.description,
                                                    item.company
                                                ]
                                            );
                                        });
                                    },
                                    function(error){
                                        Logger.error();
                                    },
                                    function(){

                                    }
                                );
                            }
                        );
                    }
                }
            );
        }
    );
};

self.getAvailableItems = function(){
    return DBA.query('select i.* from items i join types t on t.id = i.type_id and t.type_key = ?', [
        'item_type.equipment'
    ])
    .then(function(result){
        return DBA.getAll(result);
    });
};

self.getAllItems = function(){
    return DBA.query('select i.* from items i')
    .then(function(result){
        return DBA.getAll(result);
    });
};

self.prepareSeach = function(){
    return DBA.query('CREATE VIRTUAL TABLE IF NOT EXISTS itemSearch USING fts4(id, type_id, upc, number, description, company);')
    .then(function(){
        return DBA.query('DELETE FROM itemSearch');
    })
    .then(function(){
        return DBA.query('INSERT INTO itemSearch SELECT * FROM items;');
    });
};

self.searchItems = function(searchInput){
    return DBA.query('select i.* from itemSearch i where i.description match \'*'+searchInput+'*\' limit 50')
    .then(function(results){
        return DBA.getAll(results);
    });
};

self.addToInventory = function(newInventoryItem){
    return DBA.query('insert into inventory(item_id, qty) values(?,?)', [newInventoryItem.item_id, newInventoryItem.qty]);
};

self.getInventory = function(){
    return DBA.query('select items.description, items.company, inventory.qty, items.id as item_id, items.number, items.upc from inventory join items on inventory.item_id = items.id')
    .then(function(result){
        return DBA.getAll(result);
    });
};

return self;
});
