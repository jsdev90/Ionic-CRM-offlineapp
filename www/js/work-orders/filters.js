angular.module('app.work-orders.filters', [])
.filter('workOrderStatus', ['WORK_ORDER_STATUS', function(WORK_ORDER_STATUS){
    return function(input) {

        switch(input){
            case WORK_ORDER_STATUS.issued: {
                return 'Issued';
            }
                break;

            case WORK_ORDER_STATUS.confirmed: {
                return 'Confirmed';
            }
                break;

            case WORK_ORDER_STATUS.in_progress: {
                return 'In Progress';
            }
                break;

            case WORK_ORDER_STATUS.in_progress_and_hold: {
                return 'In Progress & Hold'
            }
                break;

            case WORK_ORDER_STATUS.completed: {
                return 'Completed';
            }
                break;

            case WORK_ORDER_STATUS.cancelled: {
                return 'Cancelled';
            }
                break;
        }

        return input;
    };
}])
;