angular.module('app.accounts.services', [])
.factory('Account', ['DBA', '$q', function(DBA, $q){
    // Account service is resposible for storing and updating
    // user account information.
    // Authorization token is stored in the accounts table,
    // as well as api url, fallback_url (to be used when primary one is not
    // responding). Device token for push notifications (GCM) is also saved inside
    // accunts table.

    // Store basic account information retrieved from api.friendlycmms.com.
    // Data here is later on updated with token (after correct authorization code).
    // submission.
    function createAccount(accountData){
        return $q(function(resolve, reject){
            var createAccountQuery = 'insert into accounts ('
                + 'uuid, '
                + 'tag,'
                + 'label,'
                + 'url,'
                + 'fallback_url, '
                + 'default_country_prefix) values (?,?,?,?,?,?)';

            var uuid = DBA.getUuid();
            return DBA.query(createAccountQuery, [
                uuid,
                accountData.tag,
                accountData.label,
                accountData.url,
                accountData.fallback_url,
                accountData.default_country_prefix
            ])
            .then(
                function(){
                    resolve(uuid);
                },
                function(error){
                    reject(error);
                }
            );
        });
    }

    // Update person reference (sent in UserInfo header with every request to api)
    function updatePersonId(uuid, personId){
        return DBA.query('update accounts set person_id = ? where uuid = ?', [personId, uuid]);
    }

    // Update username (sent in UserInfo header with every request to api)
    function updateUsername(uuid, username){
        return DBA.query('update accounts set username = ? where uuid = ?', [username, uuid]);
    }


    // Save device token for push notifications - GCM
    function updateDeviceToken(uuid, deviceToken){
        var updateDeviceTokenQuery = 'update accounts set device_token = ? where uuid = ?';
        return DBA.query(updateDeviceTokenQuery, [
            deviceToken,
            uuid
        ]);
    }

    // Update / store Bearer token necessary to access API. Sent with every
    // request
    function updateToken(uuid, token){

        var updateTokenQuery = 'update accounts set token = ? where uuid = ?';

        return $q(function(resolve, reject){
           getCurrent()
               .then(
                   function(){
                        return DBA.query(updateTokenQuery, [token, uuid]);
                   }
               )
               .then(
                   function(){
                        resolve();
                   },
                   function(error){
                       reject(error);
                   }
               );
        });
    }

    // Update phone number. Sent in every request within UserInfo header
    function updatePhone(uuid, phone){
        var updatePhoneQuery = 'update accounts set phone = ? where uuid = ?';

        return $q(function(resolve, reject){
            getCurrent()
                .then(
                    function(){
                        return DBA.query(updatePhoneQuery, [phone, uuid]);
                    }
                )
                .then(
                    function(){
                        resolve();
                    },
                    function(error){
                        reject(error);
                    }
                );
        });
    }

    // Delete account, effectively logging out the user
    function clearAccount(uuid){
        var clearAccount = 'delete from accounts where uuid = ?';
        return $q(function(resolve, reject){
           DBA.query(clearAccount, [uuid]).then(
               function(){
                   resolve();
               },
               function(error){
                   reject(error);
               }
           );
        });
    }

    // Get currently used account information & token.
    function getCurrent(){
        var getCurrentQuery = 'select * from accounts where current = 1 limit 1';

        return $q(function(resolve, reject){
            DBA.findOrNull(getCurrentQuery).then(
                function(result){
                    if (result)
                        resolve(result);
                    else
                        reject({error: 'Account not found'});
                },
                function(error){
                    reject(error);
                }
            );
        });
    }

    // Set used api url to fallback one
    function useFallbackUrl(){
      return DBA.query('update accounts set url = fallback_url where url != fallback_url');
    }

    // Set currently used account (meant as support for multiple user accounts linked to the app)
    function setCurrent(uuid){
        var clearCurrentQuery = 'update accounts set current = 0';
        var updateCurrentQuery = 'update accounts set current = 1 where uuid = ?';

        return $q(function(resolve, reject){
            DBA.query(clearCurrentQuery).then(
                function(){
                    return DBA.query(updateCurrentQuery, [uuid]);
                },
                function(error){
                    reject(error);
                }
            ).then(
                function(){
                    resolve();
                },
                function(error){
                    reject(error);
                }
            );
        });
    }

    // Expose public api
    return {
        createAccount: createAccount,
        setCurrent: setCurrent,
        getCurrent: getCurrent,
        updateToken: updateToken,
        updatePhone: updatePhone,
        clearAccount: clearAccount,
        updateDeviceToken: updateDeviceToken,
        updatePersonId: updatePersonId,
        updateUsername: updateUsername,
        useFallbackUrl: useFallbackUrl
    };
}])
;
