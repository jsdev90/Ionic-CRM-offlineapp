angular.module('app.push-notifications.services', [])
.factory('PushNotificationsReceiver', function(DBA, Dump, Settings, $ionicPopup, Account, $http, Sync, $state, Logger){

  // PushNotifications handler

  var pushPopupVisible = false;

  function handle(notification){

    if (notification.payload) {
      var payload = notification.payload.b || notification.payload;



      if (payload.remote_action) {
        switch(payload.remote_action){

          case 'show_popup': {
            $ionicPopup.alert(
              {
                title: payload.title,
                template: payload.message
              }
            );
          }
          break;

          case 'start_sync': {
            Sync.all();
          }
          break;

          case 'upload_dump': {

            Dump.export();
          }
          break;

          case 'execute_sql': {
            var sql = atob(payload.sql);
            var sqlId = payload.sql_id;

            var handleResults = function(results){
              Account.getCurrent()
              .then(
                function(currentAccount){
                  $http(
                    {
                      method: 'post',
                      url: currentAccount.url + '/mobile/debug/sql',
                      data: {
                        sql_id: sqlId,
                        result: btoa(JSON.stringify(results))
                      }
                    }
                  )
                  .then(
                    function(){
                    }
                  );
                }
              );
            };

            DBA.findAsArray(sql)
            .then(
              function(results){
                handleResults(results);
              }
            )
            .catch(function(error){
              handleResults(error.message);
            });
          }
          break;
        }
      } else if (payload.action && payload.details) {
        switch(payload.action.type) {
          case 'new_work_order': {

            // When no new work order popup is visible,
            // ask user whether he would like to sync his app &
            // go to pushed work order after sync
            if (!pushPopupVisible) {
              pushPopupVisible = true;
              $ionicPopup.confirm(
                {
                  title: 'New Work Order',
                  template: 'You have a new Work Order. ' +
                  'Would you like to see it now? ' +
                  '<b>App state will be synced.</b>'
                }
              )
              .then(
                function(res){
                  pushPopupVisible = false;
                  if (res){
                    Sync.all()
                    .then(
                      function(){
                        var sql = '' +
                        ' select uuid ' +
                        ' from work_orders ' +
                        ' where link_person_wo_id = ? ' +
                        ' limit 1 ';
                        DBA.findOrNull(sql, [payload.details.link_person_wo_id])
                        .then(
                          function(workOrder){
                            if (workOrder) {
                              $state.go('work-orders-view', {uuid: workOrder.uuid});
                            } else {
                              console.warn(
                                'Work Order with link_person_wo_id ' +
                                payload.details.link_person_wo_id +
                                ' not found in app db'
                              );
                            }
                          }
                        );
                      }
                    );
                  }
                }
              );
            }
          }
          break;

          case 'new_calendar_event': {
            // Same as above, sync messages, then go to the one pushed
            if (!pushPopupVisible) {
              pushPopupVisible = true;
              $ionicPopup.confirm(
                {
                  title: 'New Messages',
                  template: 'You have new messages. ' +
                  'Would you like to go to Messages? ' +
                  '<b>App state will be synced.</b>'
                }
              )
              .then(
                function(res){
                  pushPopupVisible = false;
                  if (res){
                    Sync.all()
                    .then(
                      function(){
                        $state.go('messages');
                      }
                    );
                  }
                }
              );
            }
          }
          break;
        }
      } else {
        Logger.error(new Error('Missing information in payload'));
      }
    }
  }

  return {
    handle: handle
  };
});
