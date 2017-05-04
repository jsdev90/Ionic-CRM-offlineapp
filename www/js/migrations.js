angular.module('app.services.migrations', [])
.factory('DbMigrator', function ($q, $http, DBA, DEFAULT_DATE_FORMAT) {
    var errors = [];
    var self = this;

    // Get migrations from file and execute them in order

    self.migrate =  function(){
        return $http.get('migrations.sql')
        .then(
            function(result){
                return DBA.query('create table if not exists `migrations` (`name` TEXT NOT NULL, status TEXT DEFAULT NULL, migrated_at TEXT NOT NULL)')
                .then(function(){
                    return result;
                });
            }
        )
        .then(function(migrationsResponse){
            return DBA.query('select name from migrations where status is null')
            .then(function(executedMigrations){
                executedMigrations = DBA.getAll(executedMigrations);
                executedMigrations = executedMigrations.map(function(executedMigration){
                    return executedMigration.name;
                });
                
                
                return {
                    executedMigrations: executedMigrations,
                    migrationsHtml: migrationsResponse.data
                };
            });
        })
        .then(
            function(result){
                // using DOM parser for its support for nodes
                // and multiline query strings without the need for escaping
                errors = [];
                var html = result.migrationsHtml;
                var tempDocument = document.implementation.createHTMLDocument();
                tempDocument.body.innerHTML = html;
                var migrationElements = tempDocument.body.children;
                var migrations = {};

                try {
                    for(var i = 0; i < migrationElements.length; i++ ){
                        var migrationElement = migrationElements[i];
                        var name = migrationElement.dataset.name.trim();
                        var sql = migrationElement.innerHTML.trim();
                        sql = sql.replace('&lt;','<');
                        var comment = migrationElement.dataset.comment;

                        var newMigration = {
                            sql: sql,
                            name: name,
                            comment: comment
                        };

                        if (!name || !name.length) {
                            throw new Error('Unique migration name is required.');
                        }

                        if (!sql || !sql.length) {
                            throw new Error('Sql is required.');
                        }

                        //check if migration not registered
                        if (migrations.hasOwnProperty(name)) {
                            throw new Error('Migration with name ' + name + ' already registered; Aborting migrations.');
                        }

                        //check if not fired yet, if so - schedule for run
                        if (result.executedMigrations.indexOf(name) === -1) {
                            migrations[name] = newMigration;
                        }
                    }

                    var lastPromise;
                    for (var key in migrations) {
                        var migration = migrations[key];

                        var runningMigrationCallback = function(processedMigration){
                            
                            
                            if (processedMigration.comment) {
                                
                            }
                            
                            

                            return $q.resolve();
                        };

                        var migrationFiredCallback = function(processedMigration){
                            return DBA.query(processedMigration.sql).then(
                                function(){
                                    return DBA.query('insert into migrations(name,migrated_at) values(?,?)', [processedMigration.name, DBA.getTimestamp()]);
                                },
                                function(err){
                                    errors.push(err);
                                    return DBA.query('insert into migrations(name,status,migrated_at) values(?,?,?)', [processedMigration.name, err.message, DBA.getTimestamp()]);
                                }
                            );
                        };

                        var boundRunningMigrationCallback = runningMigrationCallback.bind(null, migration),
                        boundFiredMigrationCallback = migrationFiredCallback.bind(null, migration);

                        //execute in order of occurence in migrations.sql
                        if (!lastPromise) {
                            lastPromise = boundRunningMigrationCallback()
                            .then(boundFiredMigrationCallback);
                        } else {
                            lastPromise = lastPromise
                            .then(boundRunningMigrationCallback)
                            .then(boundFiredMigrationCallback)
                            ;
                        }
                    }

                    return lastPromise;
                } catch (e) {
                    alert(e.message);
                }
            }
        )
        .then(function(){
            if (errors.length) {
                if (window.confirm('Update error occured. Would you like to retry?')) {
                    self.migrate();
                    return true;
                } else {
                    return false;
                }
            }
        });
    };

    return self;
})
;
