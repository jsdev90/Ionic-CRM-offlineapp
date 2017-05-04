angular.module('app.messages.services', [])
.factory('Message', function (DBA, $rootScope, $http, $q, DEFAULT_DATE_FORMAT, Account) {

  function sync(){
    return DBA.findAsArray(
      ' select m.* from messages m' +
      ' where m.sync = 0 '
    )
    .then(
      function(messagesToSync){
        return $http(
          {
            method: 'post',
            url: '/mobile/activities/sync',
            data: {
              activities: messagesToSync
            }
          }
        );
      }
    )
    .then(
      function(messageSyncResult){
        var data = messageSyncResult.data.response;
        return DBA.findAsArray(
          'select id from messages'
        )
        .then(
          function(messageIds){
            messageIds = messageIds.map(
              function(message){
                return +message.id;
              }
            );
            data.existingMessagesIds = messageIds;
            return data;
          }
        )
        .then(
          function(dataToStore){

            var defer = $q.defer();

            function onQuerySuccess(itemIndex, itemCount, deferred){
              if (itemIndex === itemCount - 1) {
                deferred.resolve();
              }
            }

            function onQueryError(itemIndex, itemCount, deferred, error){
              console.error(error);
              if (error) {
                deferred.reject(error);
              }
            }

            if (dataToStore.syncs.length) {
              db.transaction(
                function(tx) {
                  dataToStore.syncs.forEach(function(syncData,i){
                    tx.executeSql(
                      'update messages set id = ? where uuid = ?',
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
              defer.resolve();
            }


            return defer.promise.then(
              function(){
                return Account.getCurrent()
                .then(
                  function(currentAccount){
                    if (!dataToStore) {
                      dataToStore = {};
                    }
                    dataToStore.currentAccount = currentAccount;
                    return dataToStore;
                  }
                );
              }
            );
          }
        )
        .then(
          function(dataToStore){

            var defer = $q.defer();

            var messages = dataToStore.activities.data || [];
            messages = messages.filter(function(item){
              return item.creator_person_id !== dataToStore.currentAccount.person_id;
            });

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

            if (!messages.length) {
              return defer.resolve();
            }

            db.transaction(
              function(tx) {
                messages.forEach(
                  function(message, i){

                    var clientAndAddress = '';
                    try {
                      clientAndAddress = JSON.stringify(
                        {
                          address_id: message.address_id,
                          address: message.address,
                          city: message.city,
                          customer_name: message.customer_name,
                          state: message.state,
                          zip_code: message.zip_code,
                          latitude: message.latitude,
                          longitude: message.longitude
                        }
                      );
                    }catch(e){
                      console.warn('[messages]');
                      console.warn(e);
                    }

                    if (dataToStore.existingMessagesIds.indexOf(+message.id) > -1) {
                      // Update
                      tx.executeSql(
                        ' update messages ' +
                        ' set completed = ?, object_id = ?, work_order_number = ?, completed_at = ?, created_at = ?, type = ?, creator_person_id = ?, client_and_address = ? ' +
                        ' where id = ?',
                        [
                          message.completed,
                          message.record_id,
                          message.work_order_number,
                          DBA.getUtcDate(message.completed_at),
                          DBA.getUtcDate(message.created_at),
                          message.type,
                          message.creator_person_id,
                          clientAndAddress,
                          message.id
                        ],
                        onQuerySuccess.bind(null, i, messages.length, defer),
                        onQueryError.bind(null, i, messages.length, defer)
                      );
                    } else {
                      // Create
                      tx.executeSql(
                        'insert into messages(uuid, object_id, person_id, creator_person_id, id, hot, type, subject, description, object_uuid, object_type, work_order_number, created_at, completed, client_and_address, sync) values ' +
                        '(?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ', (select uuid from work_orders where work_order_id = ? order by canceled_at asc limit 1) ' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?' +
                        ',?)',
                        [
                          DBA.getUuid(),
                          message.record_id,
                          message.person_id,
                          message.creator_person_id,
                          message.id,
                          message.hot_type_id ? message.hot_type_id : 0,
                          message.type,
                          message.subject,
                          message.description,
                          message.record_id,
                          'work_order',
                          message.work_order_number,
                          DBA.getUtcDate(message.created_at),
                          message.completed,
                          clientAndAddress,
                          1
                        ],
                        onQuerySuccess.bind(null, i, messages.length, defer),
                        onQueryError.bind(null, i, messages.length, defer)
                      );
                    }
                  }
                );
              }
            );

            return defer.promise.then(
              function(){
                return dataToStore;
              }
            );
          }
        ).then(
          function(data){
            db.transaction(
              function(tx) {
                data.syncs.forEach(function(syncData){
                  tx.executeSql(
                    'update messages set sync = 1 where uuid = ?',
                    [
                      syncData.uuid
                    ],
                    function(){},
                    function(error){
                      console.error(error);
                    }
                  );
                });
              }
            );
          }
        );
      }
    );
  }

  function createMessage(messageData) {

    return Account.getCurrent().then(function(currentAccount){
      return $q(function (resolve, reject) {

        DBA.query(
          'insert into messages(uuid, object_id, person_id, creator_person_id, id, hot, type, subject, description, object_uuid, object_type, created_at)' +
          ' values (?,?,?,?,?,?,?,?,?,?,?,?)', [
            DBA.getUuid(),
            messageData.object_id || null,
            messageData.person_id ? messageData.person_id : currentAccount.person_id,
            currentAccount.person_id,
            messageData.id ? messageData.id : null,
            messageData.hot ? 1 : 0,
            'task',
            messageData.subject ? messageData.subject : '',
            messageData.description,
            messageData.object_uuid,
            messageData.object_type,
            DBA.getTimestamp()
          ])
          .then(
            function () {
              resolve();
            },
            function (error) {
              reject(error);
            }
          );
        });
      });


    }

    function getForUuid(uuid){
      return $q(function(resolve, reject){
        DBA.query('' +
        ' select m.*, p.first_name as person_first_name, fp.id as from_person_id, p.last_name as person_last_name, fp.first_name as from_person_first_name, fp.last_name as from_person_last_name ' +
        ' from messages m ' +
        ' left join persons fp on fp.id = m.creator_person_id ' +
        ' left join persons p on p.id = m.person_id where m.object_uuid = ? ' +
        ' order by datetime(m.created_at) desc', [uuid])
        .then(
          function(messages){
            resolve(DBA.getAll(messages));
          },
          function(error){
            reject(error);
          }
        );
      });
    }

    function getAll(){
      return $q(function(resolve, reject){
        DBA.findAsArray('' +
        ' select m.*, m.work_order_number, wo.client, fp.id as from_person_id, p.first_name as person_first_name, p.last_name as person_last_name, fp.first_name as from_person_first_name, fp.last_name as from_person_last_name ' +
        ' from messages m ' +
        ' left join persons fp on fp.id = m.creator_person_id ' +
        ' left join persons p on p.id = m.person_id ' +
        ' left join work_orders wo on wo.uuid = m.object_uuid ' +
        ' order by datetime(m.created_at) desc '
      )
      .then(
        function(messages){
          if (messages && messages.length) {
            messages = messages.map(function(message){
              try {
                message.client_and_address = JSON.parse(message.client_and_address);
              }catch(e){
                console.warn('[messages]');
                message.client_and_address = {};
              }
              return message;
            });
          }
          resolve(messages);
        },
        function(error){
          reject(error);
        }
      );
    });
  }

  // Set message as completed & queue to sync
  function complete(message){
    return $q(function(resolve, reject){
      DBA.query('update messages set completed = 1, sync = 0, completed_at = ? where uuid = ?', [DBA.getTimestamp(), message.uuid])
      .then(
        function(){
          $rootScope.$broadcast('message.completed');
          resolve();
        },
        function(){
          reject();
        }
      );
    });
  }

  // Get unread messages count for related object (eq. work_order)
  function getUnreadCountForObjectUuid(objectUuid){
    return Account.getCurrent()
    .then(
      function(currentAccount){
        return DBA
        .findOrNull(
          ' select count(1) as unreadCount from messages ' +
          ' where completed = 0 and creator_person_id != ? and object_uuid = ? and person_id = (select person_id from accounts limit 1)',
          [
            currentAccount.person_id,
            objectUuid
          ]
        )
        .then(function(unreadCount){
          if (unreadCount) {
            return unreadCount.unreadCount;
          } else {
            return 0;
          }
        });
      }
    );
  }

  // Get overall unread count
  var getUnreadCount = function(){
    return DBA.findOrNull(
      'select count(1) as unread from messages where completed = 0 and person_id = (select person_id from accounts limit 1)'
    )
    .then(
      function(result){
        return result.unread;
      }
    );
  };

  return {
    createMessage: createMessage,
    getForUuid: getForUuid,
    getAll: getAll,
    complete: complete,
    getUnreadCountForObjectUuid: getUnreadCountForObjectUuid,
    getUnreadCount: getUnreadCount,
    sync: sync
  };
}
);
