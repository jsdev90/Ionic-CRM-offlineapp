angular.module('app.filters', [])
.filter('stripUnderscores', [function(){
   return function(input){
       return input.replace('_', ' ');
   }
}])
.filter('yesNo', [function(){

    return function(input){
        if (input) {
            return 'Yes';
        } else {
            return 'No';
        }
        return input;
    }
}])
;
