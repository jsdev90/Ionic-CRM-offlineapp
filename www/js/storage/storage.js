angular.module('app.storage', [])
.constant('STORAGE_EVENTS', {photoSaved: 'storage.photoSaved', videoSaved: 'storage.videoSaved'})
.constant('PRIVATE_APP_FILES_DIRECTORY_NAME', '.crm-files')
.constant('PUBLIC_APP_FILES_DIRECTORY_NAME', 'Pictures')
.constant('THUMBNAIL_TARGET_WIDTH', 300)
.factory('Storage', function(
  $cordovaFile,
  $cordovaFileTransfer,
  DBA,
  $q,
  $http,
  GpsLocation,
  Logger,
  $rootScope,
  DEFAULT_DATE_FORMAT,
  STORAGE_EVENTS,
  PRIVATE_APP_FILES_DIRECTORY_NAME,
  PUBLIC_APP_FILES_DIRECTORY_NAME,
  Account,
  $cordovaGoogleAnalytics,
  $ionicPlatform,
  ThumbnailService,
  THUMBNAIL_TARGET_WIDTH
){

  var self = this;

  $ionicPlatform.ready(function(){
    if (window.cordova && window.cordova.getAppVersion && !self.currentVersion) {
      window.cordova.getAppVersion.getVersionNumber(function (version) {
        self.currentVersion = version.trim();
      });
    }
  });

  function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
    byteString = atob(dataURI.split(',')[1]);
    else
    byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
  }

  // Generate file name
  function getFileName(fileType, extras){
    var extension = '';
    //todo proper extension detection
    switch(fileType) {
      case 'video': {
        extension = 'mp4';
      }
      break;

      case 'photo': {
        extension = 'jpg';
      }
      break;

      case 'signature': {
        extension = 'jpg';
      }
      break;
    }

    var fileName = '';

    if (fileType === 'signature') {
      var signatureOwnerName = extras.signatureOwnerName.trim();
      signatureOwnerName = signatureOwnerName.replace(/\s+/g, '_');
      signatureOwnerName = signatureOwnerName.replace(/[^A-z0-9_]/g, '');
      var signatureOwnerTitle = extras.signatureOwnerTitle.trim();
      signatureOwnerTitle = signatureOwnerTitle.replace(/\s+/g, '_');
      signatureOwnerTitle = signatureOwnerTitle.replace(/[^A-z0-9_]/g, '');

      fileName = fileType + '_' + extras.relatedObjectId + '_' + signatureOwnerName + '_' + signatureOwnerTitle + '_' + new Date().getTime() + '.' + extension;
    } else {
      fileName = fileType + '_' + new Date().getTime() + '.' + extension;
    }

    return fileName;
  }

  // Update file location info when available
  function updateFileGpsCoords(fileUuid, coords){
    DBA.query('update files set gps_coords = ? where uuid = ?', [coords.latitude + ' ' + coords.longitude, fileUuid]);
  }

  // Create required app directories on external data storage
  // if they do not exist
  function preparePhotoDirectories(){
    var promise = $cordovaFile.checkDir(cordova.file.externalRootDirectory, PRIVATE_APP_FILES_DIRECTORY_NAME);
    promise = promise.then(
      function(foundEntry){
        if (!(foundEntry && foundEntry.isDirectory)) {
          throw new Error('Not a directory!');
        }
      },
      function(error){
        console.warn('Directory .crm-files does not exist, attempting creation...');
        return $cordovaFile.createDir(cordova.file.externalRootDirectory, PRIVATE_APP_FILES_DIRECTORY_NAME);
      }
    )
    .then(
      function(){
        var privateAppFilesDirectory =
        cordova.file.externalRootDirectory +
        '/' +
        PRIVATE_APP_FILES_DIRECTORY_NAME;

        return $cordovaFile.checkDir(privateAppFilesDirectory + '/', 'thumbnails')
        .then(
          function(foundEntry){
            if (!(foundEntry && foundEntry.isDirectory)) {
              throw new Error('Not a directory!');
            }
          },
          function(error){

            console.warn('Directory .crm-files/thumbnails does not exist, attempting creation...');
            return $cordovaFile.createDir(privateAppFilesDirectory, 'thumbnails');
          }
        );
      }
    );

    return promise;
  }

  // Generate single thumbnail
  function generateThumbnail(filePath){

    if (!filePath || !filePath.length || filePath.indexOf('/') === -1) {
      throw new Error('Invalid path for thumbnail generation');
    }

    var filePathStartIndex = filePath.lastIndexOf('/') + 1;
    if (filePathStartIndex >= filePath.length) {
      throw new Error('Path does not contain filename');
    }

    var originalFileName = filePath.substring(filePathStartIndex);

    if (!originalFileName.length) {
      throw new Error('File name is too short');
    }

    var privateAppFilesDirectory =
    cordova.file.externalRootDirectory +
    '/' +
    PRIVATE_APP_FILES_DIRECTORY_NAME;

    return ThumbnailService
    .generate(filePath, {
      returnType: 'blob',
      encoderOptions: 1,
      type: 'image/jpeg',
      width: THUMBNAIL_TARGET_WIDTH
    })
    .then(
      function(thumbnailBlob){
        return $cordovaFile.writeFile(privateAppFilesDirectory + '/thumbnails/', originalFileName, thumbnailBlob, true);
      }
    )
    .then(
      function(){
        return privateAppFilesDirectory + '/thumbnails/' + originalFileName;
      }
    );
  }

  // Generate thumbnail for legacy file (photo without thumbnail)
  function genereteMissingThumbnailForPhotoRecord(fileRecord){

    if (fileRecord.filename && fileRecord.filename.indexOf(PRIVATE_APP_FILES_DIRECTORY_NAME) === -1) {
      console.warn('skipping, legacy file not moved to private app files directory');
      return $q.resolve();
    }

    if (fileRecord.type === 'photo' && !fileRecord.thumbnail) {
      return $q(function(resolve, reject){
        //check if full sized file exists
        window.resolveLocalFileSystemURL(
          resolveFilePath(fileRecord.filename),
          function (fileEntry) {
            resolve();
          },
          function(){
            reject();
          }
        );
      }
    )
    //make sure that directories exist
    .then(preparePhotoDirectories)
    .then(
      function(){
        //generate photo thumbnail && update db record
        return generateThumbnail(fileRecord.filename)
        .then(
          function(storedThumbnailImagePath){
            return DBA.query(
              'update files set thumbnail = ? where uuid = ?',
              [
                storedThumbnailImagePath,
                fileRecord.uuid
              ]
            )
            .then(
              function(){
                return storedThumbnailImagePath;
              }
            );
          }
        );
      }
    );
  } else if (fileRecord.type === 'photo' && fileRecord.thumbnail) {

    return $q.resolve();
  } else if (fileRecord.type !== 'photo') {

    return $q.resolve();
  }
}

//save photos
function savePhotoFileWithUri(fileUri, fileInfo){
  var fileType, relatedObjectType, relatedObjectUuid, fileTypeId, description, fromGallery;

  fileType = fileInfo.fileType;
  relatedObjectType = fileInfo.relatedObjectType;
  relatedObjectUuid = fileInfo.relatedObjectUuid;
  relatedObjectId = fileInfo.relatedObjectId || null;
  fileTypeId = fileInfo.fileTypeId || null;
  description = fileInfo.description || null;


  if (!fileTypeId) {
    Logger.warning('Storage.savePhotoFileWithUri - fileTypeId not specified - relatedObjectType: ' + relatedObjectType + ' relatedObjectUuid: ' + relatedObjectUuid);
  }

  if (!window.cordova) {

    return;
  }

  fromGallery = true;
  if (fileUri.indexOf('content')===-1) {
    fromGallery = false;
  }

  var d = new Date(),
  n = d.getTime(),
  newFileName = n + ".jpg";

  //make sure the directories exist
  return preparePhotoDirectories()
  .then(
    function(){
      /*
      we need to move file to user gallery and to hidden directory,
      to prevent accidental deletion before sync process completes
      */

      var publicPhotoDirectoryPath = cordova.file.externalRootDirectory + PUBLIC_APP_FILES_DIRECTORY_NAME,
      privatePhotoDirectoryPath = cordova.file.externalRootDirectory + PRIVATE_APP_FILES_DIRECTORY_NAME;


      if (fromGallery) {
        //use cordova file transfer instead

        return $cordovaFileTransfer
        .download(resolveFilePath(fileUri), privatePhotoDirectoryPath + '/' + newFileName, {}, true)
        .catch(
          function(error){
            Logger.error('Error copying file from gallery to private directory', error);
            throw error;
          }
        );
      } else {
        //Grab the file name of the photo in the temporary directory
        var currentName = fileUri.replace(/^.*[\\\/]/, '');


        return $cordovaFile.copyFile(
          fileUri.replace(currentName, ''),
          currentName,
          cordova.file.externalRootDirectory + PUBLIC_APP_FILES_DIRECTORY_NAME,
          newFileName
        )
        .then(
          function(publicFileCopySuccess){
            //add to media gallery
            mediaRefresh.scanMedia(publicFileCopySuccess.nativeURL);


            return $cordovaFile.copyFile(
              fileUri.replace(currentName, ''),
              currentName,
              cordova.file.externalRootDirectory + PRIVATE_APP_FILES_DIRECTORY_NAME,
              newFileName
            );
          }
        )
        .catch(
          function(error){
            Logger.error('Error copying file from url to private directory', error);
            throw error;
          }
        );
      }
    }
  )
  .then(
    function(fileData){
      return getChecksum(fileData.nativeURL)
      .then(
        function(checksum){

          return {
            fileData: fileData,
            checksum: checksum
          };
        }
      );
    }
  )
  .then(
    function(successfulySavedFile){
      // generate and save thumbnail
      // in PRIVATE_APP_FILES_DIRECTORY_NAME/thumbnails
      // create thumbnails folder if it does not exist

      var privateAppFilesDirectory =
      cordova.file.externalRootDirectory +
      '/' +
      PRIVATE_APP_FILES_DIRECTORY_NAME;

      return $q.resolve()
      .then(
        function(){

          return generateThumbnail(successfulySavedFile.fileData.nativeURL)
          .then(
            function(generatedThumbnailPath){
              successfulySavedFile.thumbnail = {
                nativeURL: generatedThumbnailPath
              };
              return successfulySavedFile;
            }
          );
        }
      );
    }
  )
  .then(
    function(successfulySavedFile){
      return $q(
        function(resolve){
          successfulySavedFile.fileData.getMetadata(
            function(metadata){
              resolve(metadata);
            }
          );
        }
      )
      .then(
        function(metadata){
          return storeFileInformationInDb(
            fileType,
            fileTypeId,
            successfulySavedFile.fileData.nativeURL,
            relatedObjectType,
            relatedObjectUuid,
            relatedObjectId,
            description,
            successfulySavedFile.checksum,
            metadata.size,
            successfulySavedFile.thumbnail.nativeURL
          );
        }
      );
    }
  )
  .catch(
    function(error){
      throw error;
    }
  );
}

function saveFile(dataUri, fileInfo){
  var fileType, relatedObjectType, relatedObjectUuid, fileTypeId, description;
  var blob = dataURItoBlob(dataUri);

  fileType = fileInfo.fileType;
  relatedObjectType = fileInfo.relatedObjectType;
  relatedObjectUuid = fileInfo.relatedObjectUuid;
  relatedObjectId = fileInfo.relatedObjectId || null;
  fileTypeId = fileInfo.fileTypeId || null;
  description = fileInfo.description || '';

  if (!fileTypeId) {
    Logger.warning('Storage.saveFile - fileTypeId not specified - relatedObjectType: ' + relatedObjectType + ' relatedObjectUuid: ' + relatedObjectUuid );
  }

  if (!window.cordova) {

    return;
  }

  var fileName = getFileName(fileType, fileInfo);

  return $q(function(resolve, reject){
    return $cordovaFile.writeFile(window.cordova.file.dataDirectory, fileName, blob, true)
    .then(
      function(savedFile){
        return getChecksum(window.cordova.file.dataDirectory + fileName)
        .then(function(checksum){
          return $q(
            function(resolve){
              fileData.getMetadata(
                function(metadata){
                  {
                    resolve(
                      {
                        fileData: {
                          nativeURL: window.cordova.file.dataDirectory + fileName
                        },
                        checksum: checksum,
                        metadata: metadata
                      }
                    );
                  }
                }
              );
            }
          );
        });
      }
    )
    .then(
      function(fileDataAndChecksum){
        return storeFileInformationInDb(
          fileType,
          fileTypeId,
          fileDataAndChecksum.fileData.nativeURL,
          relatedObjectType,
          relatedObjectUuid,
          relatedObjectId,
          description,
          fileDataAndChecksum.checksum,
          fileDataAndChecksum.metadata.size
        );
      }
    ).then(
      function(){
        resolve();
      },
      function(error){
        Logger.error('Error saving signature file', error);
        reject(error);
      }
    );
  });
}

function moveVideosToAppDataDirectoryAndSave(videoData, fileInfo){

  var relatedObjectType = fileInfo.relatedObjectType;
  var relatedObjectUuid = fileInfo.relatedObjectUuid;
  var relatedObjectId = fileInfo.relatedObjectId;
  var description = fileInfo.description || '';


  var promise;
  var fileType = 'video';

  if (!window.cordova) {

    return;
  }

  return $q(function(resolve, reject){
    var videoFile = videoData[0];
    var fileName = getFileName(fileType);

    return $cordovaFile.moveFile(videoFile.fullPath.replace(videoFile.name, ''), videoFile.name, window.cordova.file.dataDirectory, fileName)
    .then(
      function(fileData){
        return getChecksum(fileData.nativeURL)
        .then(
          function(checksum){
            return $q(
              function(resolve){
                fileData.getMetadata(
                  function(metadata){
                    resolve(
                      {
                        fileData: fileData,
                        checksum: checksum,
                        metadata: metadata
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
      function(fileDataAndChecksum){
        return storeFileInformationInDb(
          fileType,
          0,
          fileDataAndChecksum.fileData.nativeURL,
          relatedObjectType,
          relatedObjectUuid,
          relatedObjectId,
          description,
          fileDataAndChecksum.checksum,
          fileDataAndChecksum.metadata.size
        );
      }
    )
    .then(
      function(){
        if (videoData.indexOf(videoFile) === videoData.length - 1) {
          $rootScope.$broadcast(STORAGE_EVENTS.videoSaved);
          resolve();
        }
      }
    )
    .catch(function(err){
      reject(err);
    });
  });
}

function saveSignatureFile(dataUri, fileInfo){
  return saveFile(dataUri, {
    fileType: 'signature',
    fileTypeId: fileInfo.fileTypeId,
    relatedObjectType: 'time_sheet',
    relatedObjectUuid: fileInfo.relatedObjectUuid,
    relatedObjectId: fileInfo.relatedObjectId,
    signatureOwnerName: fileInfo.signatureOwnerName,
    signatureOwnerTitle: fileInfo.signatureOwnerTitle,
    description: fileInfo.description
  });
}

function savePhoto(fileUri, fileInfo){
  fileInfo.fileType = 'photo';
  return savePhotoFileWithUri(fileUri, fileInfo);
}

function removePhoto(relatedObjectUuid, relatedObjectType){
  var sql = 'select * from files where object_uuid = ? and object_type = ?';
  return DBA.findOrNull(sql, [
    relatedObjectUuid,
    relatedObjectType
  ])
  .then(
    function(file){
      if (file.filename.indexOf('file://') !== -1) {
        var fileName = file.filename.split('/');
        fileName = fileName ? fileName[fileName.length - 1] : '';
        var filePath = file.filename.replace(fileName, '');

        if (fileName.length && filePath.length) {
          return $cordovaFile.removeFile(filePath, fileName)
          .then(
            function(){
              return file;
            }
          );
        }
        return file;
      } else {
        return file;
      }
    }
  )
  .then(
    function(file){

      return DBA.query('delete from files where uuid = ?', [file.uuid]);
    }
  )
  .catch(function(err){
    throw err;
  })
  ;
}

function getChecksum(fileUri){
  return $q(function(resolve, reject){
    window.resolveLocalFileSystemURL(
      fileUri,
      function (fileEntry) {
        md5chksum.file(
          fileEntry,
          function(checksum){
            resolve(checksum);
          },
          function(error){
            Logger.error('Error generating checksum for file', error);
            reject(error);
          }
        );
      },
      function(error){
        Logger.error('Could not resolve fileUri for checksum generation');
        reject(error);
      }
    );
  });
}

function storeFileInformationInDb(fileType, fileTypeId, fileUri, relatedObjectType, relatedObjectUuid, relatedObjectId, description, checksum, size, thumbnailUrl){
  var uuid = DBA.getUuid();
  var sql = '' +
  ' insert into files ' +
  ' ( ' +
  '   uuid, ' +
  '   type, ' +
  '   type_id, ' +
  '   filename, ' +
  '   object_type, ' +
  '   object_uuid, ' +
  '   object_id, ' +
  '   created_at, ' +
  '   gps_coords, ' +
  '   description, ' +
  '   crc, ' +
  '   size, ' +
  '   thumbnail ' +
  ' ) ' +
  ' values (?,?,?,?,?,?,?,?,?,?,?,?,?)';

  return DBA.query(sql, [
    uuid,
    fileType,
    fileTypeId,
    fileUri,
    relatedObjectType,
    relatedObjectUuid,
    relatedObjectId,
    DBA.getTimestamp(),
    '0 0',
    description,
    checksum,
    size,
    thumbnailUrl ? thumbnailUrl : null
  ])
  .then(
    function(){
      GpsLocation.getCurrent()
      .then(function(coords){
        updateFileGpsCoords(uuid, coords);
      });
      $rootScope.$broadcast(STORAGE_EVENTS.photoSaved, {fileUri: fileUri, thumbnailUrl: thumbnailUrl, uuid: uuid});
    }
  )
  .then(
    function(){
      return {
        uuid: uuid,
        thumbnail: thumbnailUrl,
        filename: fileUri
      };
    }
  );
}

// Resolves android file paths so that they can be used as
// src parameter for img elements
function resolveFilePath(path){

  if (!path) {
    return path;
  }

  //content path problem resolved here
  if (path.substring(0,21)=="content://com.android" && path.indexOf('%3A') !== -1) {
    var photo_split=path.split("%3A");
    path="content://media/external/images/media/"+photo_split[1];
  }

  //add file directory if not present
  if (
    path.indexOf('file://') === -1 &&
    path.indexOf('content://') === -1
  ) {
    path = cordova.file.dataDirectory + path;
  }

  //remove timestamp after question mark


  return path;
}

// Get table name for records associated to files
function getRelatedTableForObjectType(objectType){
  var relatedTable = objectType.trim();
  switch (relatedTable) {
    case 'work_order': {
      relatedTable = 'work_orders';
    }
    break;

    case 'asset': {
      relatedTable = 'link_asset_person_wo';
    }
    break;

    case 'time_sheet':{
      relatedTable = 'time_sheets';
    }
    break;
  }
  return relatedTable;
}

// Syncing files requires including some additional information
// about related objects. This method retrieves associated object
// for uploaded file, depending on object_type
function getRelatedObjectForFileRecord(fileRecord){
  var relatedTable = getRelatedTableForObjectType(fileRecord.object_type);
  return $q(function(resolve, reject){
    if (relatedTable == 'link_asset_person_wo') {
      if (!fileRecord.object_id) {
        DBA.findOrNull('select woa.link_asset_person_wo_id from work_order_assets woa where woa.uuid = ?', [fileRecord.object_uuid])
        .then(function(asset){
          if (asset){

            resolve(asset);
          } else {
            DBA.findOrNull('select woa.link_asset_person_wo_id from work_order_assets woa where woa.asset_uuid = ? limit 1', [fileRecord.object_uuid])
            .then(
              function(oldAssetRelation){

                resolve(oldAssetRelation);
              }
            );
          }
        });
      } else {

        DBA.findOrNull('select link_asset_person_wo_id from work_order_assets where link_asset_person_wo_id = ?', [fileRecord.object_id])
        .then(function(existingWoa){
          if (existingWoa) {

            resolve(existingWoa);
          } else {
            DBA.findOrNull('select woa.link_asset_person_wo_id from work_order_assets woa where woa.asset_uuid = ? limit 1', [fileRecord.object_uuid])
            .then(
              function(oldAssetRelation){

                resolve(oldAssetRelation);
              }
            );
          }
        });

      }
    } else {
      DBA.findOrNull('select * from ' + relatedTable + ' where uuid = ?', [fileRecord.object_uuid])
      .then(function(workOrder){

        resolve(workOrder);
      });
    }
  });
}

function removeOldSyncedFiles(){
  return DBA.findAsArray(
    'select * from files where sync = 1 and date(created_at) < date(\'now\', \'-60 day\')'
  )
  .then(
    function(syncedFiles){
      var monthAgo = moment().subtract(1, 'months').utc();
      var oldSyncedFiles = syncedFiles.filter(
        function(item){
          var fileDate = moment(new Date(item.created_at)).utc();
          return fileDate < monthAgo;
        }
      );
      return oldSyncedFiles;
    }
  )
  .then(
    function(oldSyncedFiles){
      oldSyncedFiles.forEach(
        function(oldFile){
          if (oldFile.sync !== 3 && oldFile.filename.indexOf('.jp') !== -1) {
            var re = /[a-zA-Z0-9]{5,}\.((jpe?g)|(mp4))/;
            var filename = oldFile.filename.match(re);
            filename = filename.length ? filename[0] : null;
            var directory = oldFile.filename.replace(re, '');

            if (filename && directory) {
              $cordovaFile.removeFile(directory, filename)
              .then(
                function(){

                },
                function(err){
                  console.warn('Could not remove outdated file for user. It does not exist. File uuid: ' + oldFile.uuid);
                }
              );
            }
          }
          DBA.query('delete from files where uuid = ?', [oldFile.uuid]);
        }
      );
    }
  );
}

function updateFilesSyncStatus(){
  friendlysol.FsUpload.getUploads(
    null,
    friendlysol.FsCompletionStatus.ALL,
    function(uploads){
      uploads.forEach(
        function(uploadedFile){
          if(uploadedFile.success){
            friendlysol.FsUpload.deleteUploads(
              [
                uploadedFile.id
              ],
              friendlysol.FsCompletionStatus.ALL,
              function(){
                // Update file, set sync and id fields after upload
                DBA.query(
                  'update files set id = ?, sync = 1 where uuid = ?',
                  [
                    uploadedFile.response.data.response.syncs[0].object_id,
                    uploadedFile.response.data.response.syncs[0].uuid
                  ]
                );
              },
              function(err){
                Logger.error('Could not clear the queue for file ' + uploadedFile.id);
              }
            );
          }
        }
      );
    }
  );
}

function syncFiles(onSingleUploadDoneCallback) {
  // Only sync files with updated object_id and sync = 0
  return DBA.findAsArray(
    'select f.* from files f where f.sync = 0 and f.object_id is not null'
  )
  .then(
    function(files){
      return Account.getCurrent()
      .then(
        function(currentAccount){

          $cordovaGoogleAnalytics.trackEvent('Force sync all', currentAccount.person_id + ' - valid files to sync: ' + files.length);

          return {
            account: currentAccount,
            files: files
          };
        }
      );
    }
  )
  .then(
    function(data){
      friendlysol.FsUpload.getUploads(
        null,
        friendlysol.FsCompletionStatus.ALL,
        function(uploads){
          // Build array containing ids of files that are already queued for upload


          var currentAccount = data.account;

          $cordovaGoogleAnalytics.trackEvent('Force sync all', currentAccount.person_id + ' - all uploads in queue: ' + uploads.length);

          var uploadsMap = {};

          var queuedFiles = [];
          if (uploads && uploads.length) {
            queuedFiles = uploads.map(
              function(queuedFile){
                uploadsMap[queuedFile.id] = queuedFile;
                return queuedFile.id;
              }
            );
          }

          if (onSingleUploadDoneCallback) {
            onSingleUploadDoneCallback();
          }

          data.files.forEach(
            function(file){
              // If file has not been queued for upload yet, queue it
              if (queuedFiles.indexOf(file.uuid) === -1) {
                var pathArray = file.filename.split('/');
                var fileName = pathArray[pathArray.length - 1];
                var uploadRequest = new friendlysol.FsUploadRequest(
                  file.uuid,
                  data.account.url + '/mobile/files/sync',
                  file.filename,
                  fileName
                );

                // Add headers
                uploadRequest.addHeader('Authorization', 'Bearer ' + data.account.token);
                uploadRequest.addHeader(
                  'User-Info',
                  'App version: ' + self.currentVersion +
                  ' Phone Number: ' + data.account.phone +
                  ' Username: ' + data.account.username +
                  ' Person id: ' + data.account.person_id
                );



                if (!file.description) {
                  file.description = '-';
                }

                if (file.gps_coords) {
                  file.gps_location = file.gps_coords;
                  delete file.gps_coords;
                }

                if (file.object_type === 'work_order') {
                  file.object_type = 'link_person_wo';
                }

                if (file.object_type === 'asset') {
                  file.object_type = 'link_asset_person_wo';
                }

                if (file.hasOwnProperty('type')) {
                  delete file.type;
                }

                if (file.hasOwnProperty('id')) {
                  delete file.id;
                }

                if (file.hasOwnProperty('thumbnail')) {
                  delete file.thumbnail;
                }

                // Add form fields
                for (key in file) {
                  if (file.hasOwnProperty(key) && file != null) {

                    uploadRequest.addParam(key, ''+file[key]);
                  }
                }

                // Start upload
                uploadRequest.start(
                  function(result){
                    // Update files table on success
                    if (result.success && result.completed) {
                      DBA.query(
                        'update files set id = ?, sync = 1 where uuid = ?',
                        [
                          result.response.data.response.syncs[0].object_id,
                          result.response.data.response.syncs[0].uuid
                        ]
                      )
                      .then(
                        function(){
                          if (onSingleUploadDoneCallback) {
                            onSingleUploadDoneCallback();
                          }
                        }
                      );
                    }
                  },
                  function(error){
                    console.error(error);
                    Logger.error(error);
                  }
                );
              // If file has been already queued
              } else {
                console.warn('File ' + file.uuid + ' already queued for upload');
                var queuedFileData = uploadsMap[file.uuid];
                // If file from app db found in upload queue
                if (queuedFileData){
                  if(queuedFileData.success){
                    friendlysol.FsUpload.deleteUploads(
                      [
                        queuedFileData.id
                      ],
                      friendlysol.FsCompletionStatus.ALL,
                      function(){
                        // Update file, set sync and id fields after upload
                        DBA.query(
                          'update files set id = ?, sync = 1 where uuid = ?',
                          [
                            queuedFileData.response.data.response.syncs[0].object_id,
                            queuedFileData.response.data.response.syncs[0].uuid
                          ]
                        )
                        .then(
                          function(){
                            if (onSingleUploadDoneCallback) {
                              onSingleUploadDoneCallback();
                            }
                          }
                        );
                      },
                      function(err){
                        Logger.error('Could not clear the queue for file ' + queuedFileData.id);
                      }
                    );
                  } else if (queuedFileData.error) {
                    console.log(queuedFileData.error);
                    var uploadHttpStatus = queuedFileData && queuedFileData.error ? queuedFileData.error.status : null;
                    var maxAttemptsReached = queuedFileData && queuedFileData.error && queuedFileData.error.type === 'max_attempts_reached' ? true : false;
                    // dont report 498 and 422 statuses or max_attempts_reached, instead - requeue the file,
                    // as form data associated with file might have changed
                    if (
                      !!~[
                        422, 498
                      ].indexOf(+uploadHttpStatus) || maxAttemptsReached
                    ) {
                      console.info('[file sync] clear upload status for file ' + queuedFileData.id);
                      Logger.debug('[file sync] clear upload status for file ' + queuedFileData.id);
                      friendlysol.FsUpload.deleteUploads(
                        [
                          queuedFileData.id
                        ],
                        friendlysol.FsCompletionStatus.ALL
                      );
                    } else {
                      Logger.error('[file sync] person ' + currentAccount.person_id, queuedFileData.error);
                    }
                  }
                }
              }
            }
          );
        },
        function(error){
          Logger.error(error);
        }
      );
    }
  );

}

return {
  saveSignatureFile: saveSignatureFile,
  savePhoto: savePhoto,
  moveVideosToAppDataDirectoryAndSave: moveVideosToAppDataDirectoryAndSave,
  resolveFilePath: resolveFilePath,
  removePhoto: removePhoto,
  getChecksum: getChecksum,
  syncFiles: syncFiles,
  removeOldSyncedFiles: removeOldSyncedFiles,
  genereteMissingThumbnailForPhotoRecord: genereteMissingThumbnailForPhotoRecord,
  updateFilesSyncStatus: updateFilesSyncStatus
};
}
);
