angular.module('app.media.services', [])
.factory('MediaProvider', function(DBA, $q, Storage){

    // This service is resposible for retrieving picture and
    // videos list (or any other stored file type)
    function getFilePageCountForUuid(uuid, fileType, options){
        return $q(
            function(resolve, reject){
                options = options ? options : {perPage: 10};
                DBA.query('select count(1) as total from files where object_uuid = ? and type = ?', [uuid, fileType])
                .then(
                    function(result){
                        var count = DBA.get(result).total;
                        var pages = Math.ceil(count / options.perPage);

                        resolve(pages);
                    }
                );
            }
        );
    }

    // Get files of certain type for uuid
    function getFilesForUuid(uuid, fileType, options){

        if (!options)
        options = {};

        var page = options.page || 0;
        var perPage = options.perPage || 10;
        var readFiles = [];

        return $q(function(resolve, reject){
            DBA.query('select * from files where object_uuid = ? and type = ? limit ? offset ?', [uuid, fileType, perPage, (page - 1) * perPage])
            .then(function(files){

                files = DBA.getAll(files);

                if (!window.cordova) {
                    resolve(readFiles);
                } else {


                    // Some paths & mapping here
                    // check Storage.resolveFilePath for details
                    readFiles = files.map(function(file){
                      //if photo, get both thumbnail and full path
                      if (fileType === 'photo') {
                        var thumbnailPath = file.thumbnail && file.thumbnail.length ? file.thumbnail : file.filename;
                        return {
                          thumbnail: file.thumbnail,
                          thumbnailPath: Storage.resolveFilePath(thumbnailPath),
                          fullSizePath: Storage.resolveFilePath(file.filename),
                          filename: file.filename,
                          uuid: file.uuid,
                          type: file.type
                        };
                      } else {
                        //return just full path
                        return {
                          path: Storage.resolveFilePath(file.filename),
                          uuid: file.uuid
                        };
                      }

                    });

                    resolve(readFiles);
                }
            },
            function(error){
                reject(error);
            })
            ;
        });
    }

    function getVideosForUuid(uuid, options){
        return getFilesForUuid(uuid, 'video', options);
    }

    function getPhotosForUuid(uuid, options){
        return getFilesForUuid(uuid, 'photo', options)
        .then(
          function(photos){
            var thumbnailPromises = [];
            photos.forEach(function(photo){
              thumbnailPromises.push(
                // If thumbnails are not present, we generate them
                // for backwards compatibility with previous versions
                // where this feature was not present
                Storage.genereteMissingThumbnailForPhotoRecord(photo)
                .then(
                  function(generatedThumbnailPath){
                    // If new path was generated, updated it
                    // otherwise use the old one
                    if (generatedThumbnailPath) {
                      photo.thumbnailPath = generatedThumbnailPath;
                    }
                  }
                )
              );
            });

            return $q.all(thumbnailPromises)
            .then(
              function(){
                return photos;
              }
            );
          }
        );
    }

    function getPhotosPageCountForUuid(uuid, options){
        return getFilePageCountForUuid(uuid, 'photo', options);
    }

    return {
        getPhotosForUuid: getPhotosForUuid,
        getPhotosPageCountForUuid: getPhotosPageCountForUuid,
        getVideosForUuid: getVideosForUuid
    };
})
;
