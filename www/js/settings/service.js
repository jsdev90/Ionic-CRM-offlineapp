angular.module('app.settings.services', [])
.factory('Settings', function(DBA, $http, $q, Account, Logger){
  var self = this;

  self.get = function(key){
    return DBA.findOrNull('select value from settings where id = ?', [key])
    .then(function(setting){
      if (setting) {
        return setting.value;
      }
      return setting;
    });
  };

  self.set = function(key, value){
    return self.get(key).then(function(existingValue){
      if (existingValue) {
        return DBA.query('update settings set value = ? where id = ?', [value, key]);
      } else {
        return DBA.query('insert into settings (id, value) values (?,?)', [key, value]);
      }
    });
  };

  self.remove = function(key){
    return DBA.query('delete from settings where id = ?', [key]);
  };

  self.sync = function(){
    return $http({method: 'get', url: '/mobile/settings'})
    .then(function(settings){
      var response = settings.data.response;

      settings = response.settings;
      var promise;
      for (var key in settings) {
        if (settings.hasOwnProperty(key)) {
          for (var subkey in settings[key]) {
            if (settings[key].hasOwnProperty(subkey)) {
              promise = self.set(key+'.'+subkey, settings[key][subkey]);
            }
          }
        }
      }

      if (response.migrations) {
        window.cordova.getAppVersion.getVersionNumber(function (versionNumber){

          var migrations = response.migrations;
          migrations.forEach(
            function(migration){

              var currentAppVersion = versionNumber;
              var migrationAppVersion = migration.app_version;
              currentAppVersion = currentAppVersion.replace('.', '');
              migrationAppVersion = migrationAppVersion.replace('.','');
              currentAppVersion = parseFloat(currentAppVersion);
              migrationAppVersion = parseFloat(migrationAppVersion);

              if (migrationAppVersion <= currentAppVersion) {
                DBA.findOrNull('select * from migrations where name = ?', [migration.id])
                .then(
                  function(migrationFound){
                    if (!migrationFound) {
                      try {
                        var sql = atob(migration.sql);
                        console.info('[remote migration] ' + migration.id + ' ' + sql);
                        DBA.query(sql)
                        .then(
                          function(){
                            return DBA.query('insert into migrations(name, migrated_at) values (?,?)', [
                              migration.id,
                              DBA.getTimestamp()
                            ]);
                          }
                        );
                      }catch(e){
                        console.error(e);
                      }
                    } else {
                      console.info('[remote migration] ' + migration.id + ' already there');
                    }
                  }
                );
              }
            }
          );
        }
      );
    }

    return promise;
  });
};

return self;
})
.factory('Dump', function($ionicLoading, $q, NetworkCheck, Settings, Logger, $ionicPlatform, $cordovaFileTransfer, $ionicPopup, $rootScope, Account, DEFAULT_DATE_FORMAT){
  var self = this;
  var status = {
    exportInProgress: false
  };

  $ionicPlatform.ready(function(){
    if (window.cordova && window.cordova.getAppVersion && !self.currentVersion) {
      window.cordova.getAppVersion.getVersionNumber(function (version) {
        self.currentVersion = version.trim();
      });
    }
  });

  // Upload database file pulled from app internals to api server
  self.export = function(){

    //if no export in progress - prevent starting export twice
    if (!status.exportInProgress) {
      $ionicLoading.show({template: 'Exporting database...'});
      status.exportInProgress = true;

      //set last database upload attempt
      return Settings.set('last_dump_upload_attempt_at', moment().format(DEFAULT_DATE_FORMAT))
      .then(
        function(){
          return NetworkCheck.isOffline()
          .then(
            function(){
              $ionicLoading.hide();
              status.exportInProgress = false;
              throw new Error('No internet connection. Please connect internet to dump database.');
            },
            function(e){
              //internet available
              var dbFilePath = cordova.file.applicationStorageDirectory + 'databases/app.db';

              return Account.getCurrent().then(
                function(currentAccount){

                  // gather file list and upload to api server

                  var apiPath = currentAccount.url + '/mobile/debug/db';
                  return $cordovaFileTransfer.upload(apiPath, dbFilePath,
                    {
                      timeout: 1000 * 90,
                      fileName: 'app.db',
                      mimeType: 'application/x-sqlite3',
                      headers: {
                        'Authorization': 'Bearer ' + currentAccount.token,
                        'User-Info': 'App version: ' + self.currentVersion +
                        ' Phone Number: ' + currentAccount.phone +
                        ' Username: ' + currentAccount.username +
                        ' Person id: ' + currentAccount.person_id
                      }
                    },
                    true
                  )
                  .then(
                    function(){
                      window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
                        fileSystem.root.getDirectory(".crm-files", {
                          create: false
                        }, function(directory) {

                          var directoryReader = directory.createReader();
                          var files = '';
                          directoryReader.readEntries(function(entries) {
                            var i;
                            for (i=0; i<entries.length; i++) {
                              var foundFileName = entries[i].name;
                              files+=(foundFileName + '\n');
                            }


                            fileSystem.root.getFile("crm-filelist.txt", { create: true, exclusive: false }, function (fileEntry) {
                              fileEntry.createWriter(function (fileWriter) {
                                fileWriter.onwriteend = function() {



                                  $cordovaFileTransfer.upload(currentAccount.url + '/mobile/debug/file-list',
                                  cordova.file.externalRootDirectory + '/crm-filelist.txt',
                                  {
                                    timeout: 1000 * 90,
                                    fileName: 'crm-filelist.txt',
                                    mimeType: 'text/plain',
                                    headers: {
                                      'Authorization': 'Bearer ' + currentAccount.token,
                                      'User-Info': 'App version: ' + self.currentVersion +
                                      ' Phone Number: ' + currentAccount.phone +
                                      ' Username: ' + currentAccount.username +
                                      ' Person id: ' + currentAccount.person_id
                                    }
                                  },
                                  true
                                )
                                .then(
                                  function(){

                                  },
                                  function(error){
                                    console.error(error);
                                  }
                                );
                              };

                              fileWriter.onerror = function (e) {

                              };

                              fileWriter.write(new Blob([files], { type: 'text/plain' }));
                            });

                          }, function(error){

                          });


                        }, function (error) {
                          alert(error.code);
                        });

                      } );
                    }, function(error) {
                      alert("can't even get the file system: " + error.code);
                    });
                  }
                )
                .then(
                  function(){
                    $ionicLoading.hide();
                    Settings.set('dump_upload_attempts', 0);
                    Settings.set('last_successful_dump_upload_at', moment().format(DEFAULT_DATE_FORMAT));

                    status.exportInProgress = false;
                    $ionicPopup.alert({title: 'Database export', template: 'Export Done'})
                    .then(
                      function(){
                        $rootScope.$broadcast('dump.end');
                      }
                    );
                  },
                  function(err){
                    $ionicLoading.hide();
                    status.exportInProgress = false;

                    console.error(err);

                    if (err instanceof FileTransferError) {
                      if (err.code) {
                        switch (err.code) {
                          case 1: {
                            err = new Error('FileTransferError: file not found');
                          }
                          break;

                          case 2: {
                            err = new Error('FileTransferError: invalid url');
                          }
                          break;

                          case 3: {
                            err = new Error('FileTransferError: connection error');
                          }
                          break;

                          case 4: {
                            err = new Error('FileTransferError: timeout exceeded');
                          }
                          break;

                          case 5: {
                            err = new Error('FileTransferError: not modified error');
                          }
                          break;

                          default: {
                            err = new Error('FileTransferError: DB Dump upload failed, invalid error code. Api path: ' + apiPath);
                          }
                          break;
                        }
                      } else {
                        err = new Error('FileTransferError: DB Dump upload failed, no error code. Api path: ' + apiPath);
                      }
                    } else if (!err.message) {
                      err = new Error('DB Dump upload failed, no default exception message available. Api path: ' + apiPath);
                    }


                    if (window.cordova && Crittercism) {
                      Crittercism.logHandledException(err);
                    }
                    $ionicLoading.hide();
                    $ionicPopup.alert({title: 'Database export', template: 'Export Failed'})
                    .then(
                      function(){
                        $rootScope.$broadcast('dump.end');
                      }
                    );

                    throw err;
                  },
                  function (progress) {
                    $rootScope.$broadcast('dump.upload.progress', progress);
                  }
                );
              }
            );
          })
          .catch(
            function(error){
              $ionicLoading.hide();
              status.exportInProgress = false;
              $ionicPopup.alert({title: 'Database export failed', template: error.message});
              throw error;
            }
          );
        }
      );
    } else {
      return $q.resolve();
    }
  };

  self.autoDump = function(beforeUploadPromise){
    return Account.getCurrent()
    .then(
      function(currentAccount) {
        return NetworkCheck.isOffline()
        .then(
          function(){

          },
          function(){
            Settings.get('dump_upload_attempts')
            .then(
              function(dumpUploadAttempts){
                return {
                  dumpUploadAttempts: dumpUploadAttempts ? +dumpUploadAttempts : 0
                };
              }
            )
            .then(
              function(settings){
                return Settings.get('dump_uploaded_after_update')
                .then(
                  function(dumpUploadedAfterUpdate){
                    settings.dumpUploadedAfterUpdate = +dumpUploadedAfterUpdate;
                    return settings;
                  }
                );
              }
            )
            .then(
              function(settings){
                return Settings.get('last_dump_upload_attempt_at')
                .then(
                  function(lastDumpUploadAttemptAt){
                    settings.lastDumpUploadAttemptAt = lastDumpUploadAttemptAt ? moment(lastDumpUploadAttemptAt) : null;
                    return settings;
                  }
                );
              }
            )
            .then(
              function(settings){
                return Settings.get('last_successful_dump_upload_at')
                .then(
                  function(lastSuccessfulDumpUploadAt){
                    settings.lastSuccessfulDumpUploadAt = lastSuccessfulDumpUploadAt ? moment(lastSuccessfulDumpUploadAt) : null;
                    return settings;
                  }
                );
              }
            )
            .then(
              function(settings){
                var currentTime = moment();
                var firstUploadAttemptTime = moment()
                .set('hour', 6)
                .set('minute', 0)
                .set('second', 0)
                .set('millisecond', 0);

                var secondUploadAttemptTime = moment()
                .set('hour', 12)
                .set('minute', 0)
                .set('second', 0)
                .set('millisecond', 0);



                var MAX_DUMP_UPLOAD_ATTEMPTS = 3;

                var DATE_FORMAT = 'YYYY-MM-DD';

                return $q.resolve()
                .then(
                  function(){
                    //if current date is different that lastDumpUploadAttemptAt, clear attempts
                    if (
                      !settings.lastDumpUploadAttemptAt ||
                      currentTime.format(DATE_FORMAT) !==
                      settings.lastDumpUploadAttemptAt.format(DATE_FORMAT)
                    ) {
                      settings.dumpUploadAttempts = 0;

                      return Settings.set('dump_upload_attempts', 0);
                    }
                  }
                )
                .then(
                  function(){
                    // if last success upload date is not today and
                    // if date is after secondUploadAttemptTime
                    // and last upload attempt is lesser than secondUploadAttemptTime
                    // clear attempts
                    if (
                      (
                        !settings.lastSuccessfulDumpUploadAt ||
                        currentTime.format(DATE_FORMAT) !==
                        settings.lastSuccessfulDumpUploadAt.format(DATE_FORMAT)
                      ) &&
                      currentTime >= secondUploadAttemptTime &&
                      settings.lastDumpUploadAttemptAt <= secondUploadAttemptTime
                    ) {

                      settings.dumpUploadAttempts = 0;
                      return Settings.set('dump_upload_attempts', 0);
                    }
                  }
                )
                .then(
                  function(){

                    //if dump upload attempts is lesser than maximum daily number
                    if (settings.dumpUploadAttempts < MAX_DUMP_UPLOAD_ATTEMPTS) {

                      // if not uploaded after update, upload the dump
                      if (!settings.dumpUploadedAfterUpdate) {


                        beforeUploadPromise()
                        .then(
                          function(){
                            self.export()
                            .then(
                              function(){
                                Settings.set('dump_uploaded_after_update', 1);
                              }
                            )
                            .catch(
                              function(){

                                Settings.set('dump_upload_attempts', ++settings.dumpUploadAttempts);
                              }
                            );
                          }
                        );
                      } else if (
                        (
                          currentTime >= firstUploadAttemptTime
                        ) &&
                        (
                          !settings.lastSuccessfulDumpUploadAt ||
                          (
                            settings.lastSuccessfulDumpUploadAt &&
                            settings.lastSuccessfulDumpUploadAt.format(DATE_FORMAT) !==
                            currentTime.format(DATE_FORMAT)
                          )
                        )
                      ) {
                        // if dump not uploaded today
                        // and the time is right
                        // upload the dump
                        beforeUploadPromise()
                        .then(
                          function(){
                            self.export()
                            .catch(
                              function(){
                                Settings.set('dump_upload_attempts', settings.dumpUploadAttempts++);
                              }
                            );
                          }
                        );


                      } else {

                      }
                    } else {

                    }
                  }
                );
              }
            );
          }
        );
      },
      function(){

      }
    );
  };

  return self;
});
