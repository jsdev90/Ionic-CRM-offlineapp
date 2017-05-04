angular.module('app.surveys.controllers', [])
.config(function($stateProvider){
    $stateProvider
    .state('surveys', {
        url: '/surveys/:workOrderUuid',
        controller: 'SurveyListCtrl',
        templateUrl: 'views/surveys/list.html'
    })
    .state('survey-preview', {
        url: '/survey/:surveyInstanceId',
        controller: 'SurveyCtrl',
        templateUrl: 'views/surveys/preview.html'
    })
    ;
})
.controller('SurveyListCtrl', function($scope, Survey, WorkOrder, $state){
    $scope.wo = {};
    $scope.surveys = [];

    $scope.$on('$stateChangeSuccess', function(){
        if ($state.is('surveys')) {
            WorkOrder.getByUuid($state.params.workOrderUuid)
            .then(function(wo){
                $scope.wo = wo;
                return Survey.getAllSurveysForWorkOrderId(wo.work_order_id);
            })
            .then(function(surveys){
                $scope.surveys = surveys;
            })
            ;
        }
    });
})
.controller('SurveyCtrl', function($scope, $q, $state, $ionicPopup, Survey, SurveyQuestion, SurveyResult, $cordovaToast){
    $scope.survey = {};
    $scope.forms = {};
    $scope.questions = [];
    $scope.answers = {};

    function getSurveyBySurveyInstanceId(surveyInstanceId){
        

        $scope.answers = {};
        Survey.getSurveyBySurveyInstanceId(surveyInstanceId)
        .then(function(survey){
            $scope.survey = survey;
            return SurveyQuestion.getAllQuestionsForSurveyIdAndInstanceId(survey.survey_id, surveyInstanceId)
            .then(function(questions){
                $scope.questions = questions;
                questions.forEach(
                    function(question){
                        $scope.answers[question.survey_question_id] = {
                            answer: question.answer ? question.answer : '',
                            survey_instance_id: survey.survey_instance_id,
                            survey_question_id: question.survey_question_id,
                            uuid: question.uuid
                        };
                    }
                );
            });
        })
        ;
    }

    var goBack = function(){};

    $scope.$on('$stateChangeSuccess', function(e, ts, tp, fs, fp){
        if ($state.is('survey-preview')) {
            getSurveyBySurveyInstanceId($state.params.surveyInstanceId);

            goBack = function(){
                if (window.cordova) {
                    $cordovaToast.showLongBottom('Your responses have been saved.');
                }
                $state.go(fs.name, fp, {location: 'replace'});
            };
        }
    });

    // Validate and store data
    $scope.submit = function(){
        $scope.forms.surveyForm.$submitted = true;
        if ($scope.forms.surveyForm.$valid) {
            var promises = [];

            for (var survey_question_id in $scope.answers) {
                if ($scope.answers.hasOwnProperty(survey_question_id)) {
                    var answer = $scope.answers[survey_question_id];

                    var resultData = {
                        uuid: answer.uuid,
                        answer: answer.answer,
                        survey_question_id: answer.survey_question_id,
                        survey_instance_id: answer.survey_instance_id,
                        sync: 0
                    };

                    promises.push(SurveyResult.storeSurveyResult(resultData));
                }
            }

            $q.all(promises).then(
                function(){
                    
                    $scope.forms.surveyForm.$submitted = false;
                    goBack();
                }
            );

        } else {
            $ionicPopup.alert({title: 'Error', template: 'Please fill in required fields'});
        }
    };
})
;
