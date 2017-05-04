angular.module('app.surveys.services', [])
.factory('Survey', function(DBA,$q,$http,SurveyQuestion,SurveyResult){
  var self = this;

  self.sync = function(){
    var promises = [];
    return DBA.findAsArray('select * from survey_results where sync = 0')
    .then(
      function(answers){
        return $http({
          url: '/mobile/surveys/sync',
          method: 'post',
          data: {
            answers: answers
          }
        })
        .then(function(response){
          var data = response.data.response;

          
          // TODO update status
          //return self.updateStatus('survey_results', data)
          return $q.resolve()
          .then(
            function(){

              var nextQuestionPromise = $q.resolve();
              if (data.questions && data.questions.length) {
                data.questions.forEach(
                  function(questionData){
                    var storeSurveyQuestion = SurveyQuestion.storeSurveyQuestion.bind(SurveyQuestion, questionData);
                    nextQuestionPromise = nextQuestionPromise.then(
                      function(){
                        storeSurveyQuestion();
                      }
                    );
                  }
                );
                promises.push(nextQuestionPromise);
              }

              var nextSurveyPromise = $q.resolve();
              if (data.surveys && data.surveys.length) {
                data.surveys.forEach(
                  function(surveyData){
                    var storeSurvey = self.storeSurvey.bind(self, surveyData);
                    nextSurveyPromise = nextSurveyPromise.then(
                      function(){
                        return storeSurvey();
                      }
                    );
                  }
                );
                promises.push(nextSurveyPromise);
              }

              return $q.all(promises);
            }
          );
        }
      );
    });
  };

  self.getAllSurveysForWorkOrderId = function(workOrderId){
    return DBA.findAsArray(
      ' select *, ' +
      ' (select count(1) from survey_questions sq where sq.survey_id = s.survey_id) total, ' +
      ' (select count(1) from survey_results sr where sr.survey_instance_id = s.survey_instance_id and sr.answer is not null and length(trim(sr.answer)) > 0) answered ' +
      ' from surveys s ' +
      ' where table_name = \'work_order\' and record_id = ? ',
      [
        workOrderId
      ]
    );
  };

  self.getSurveyBySurveyInstanceId = function(surveyInstanceId){
    return DBA.findOrNull('select * from surveys where survey_instance_id = ?', [
      surveyInstanceId
    ]);
  };

  self.getUnansweredSurveysForWorkOrderId = function(workOrderId){
    return DBA.findOrNull(
      'select' +
      ' (select count(1) from surveys s where s.record_id = wo.work_order_id) as total,' +
      ' (select count(1) from surveys s2 ' +
      ' where s2.record_id = wo.work_order_id ' +
      ' and ' +
      ' (select count(1) from survey_results sr ' +
      ' where sr.survey_instance_id = s2.survey_instance_id and sr.answer is not null ' +
      ' and length(trim(sr.answer)) > 0) ' +
      ' >= ' +
      ' (select count(1) from survey_questions sq where sq.survey_id = s2.survey_id) ) as answered ' +
      ' from work_orders wo where wo.work_order_id = ?',
      [
        workOrderId
      ]
    );
  };

  self.storeSurvey = function(surveyData){
    return DBA.findOrNull(
      'select * from surveys where survey_instance_id = ?',
      [
        surveyData.survey_instance_id
      ]
    )
    .then(
      function(existingSurvey){
        if (!existingSurvey) {
          
          return DBA.query(
            '' +
            ' insert into surveys ' +
            ' ( ' +
            ' survey_instance_id, ' +
            ' survey_id, ' +
            ' name, ' +
            ' table_name, ' +
            ' record_id, ' +
            ' created_at ' +
            ' ) values (?,?,?,?,?,?)',
            [
              surveyData.survey_instance_id,
              surveyData.survey_id,
              surveyData.name,
              surveyData.table_name,
              surveyData.record_id,
              DBA.getTimestamp()
            ]
          );
        }
        
      }
    );
  };

  return self;
})
.factory('SurveyQuestion', function(DBA, $q, Logger){
  var self = this;

  self.getAllQuestionsForSurveyIdAndInstanceId = function(surveyId, surveyInstanceId){
    return DBA.findAsArray(
      ' select sq.*, sr.answer, sr.uuid ' +
      ' from survey_questions sq left join survey_results sr on sr.survey_question_id = sq.survey_question_id and sr.survey_instance_id = ? ' +
      ' where sq.survey_id = ? order by sq.order_by asc',
      [
        surveyInstanceId,
        surveyId
      ]
    )
    .then(function(questions){
      questions = questions.map(function(question){
        if (question.options && question.options.length) {
          try {
            question.options = JSON.parse(question.options);
          } catch (e) {
            Logger.warning(e);
          }

        }
        return question;
      });
      return questions;
    })
    ;
  };

  self.storeSurveyQuestion = function(questionData){
    return DBA.findOrNull(
      'select * from survey_questions where survey_question_id = ?',
      [
        questionData.survey_question_id
      ]
    )
    .then(function(existingSurveyQuestion){
      if (existingSurveyQuestion) {
        return updateSurveyQuestion(questionData);
      } else {
        return saveSurveyQuestion(questionData);
      }
    });
  };

  var saveSurveyQuestion = function(questionData){
    return DBA.query(
      '' +
      ' insert into survey_questions ' +
      ' ( ' +
      ' survey_question_id, ' +
      ' survey_id, ' +
      ' title, ' +
      ' help_text, ' +
      ' type, ' +
      ' options, ' +
      ' order_by, ' +
      ' required, ' +
      ' created_at ' +
      ' ) values (?,?,?,?,?,?,?,?,?)',
      [
        questionData.survey_question_id,
        questionData.survey_id,
        questionData.title,
        questionData.help_text,
        questionData.type,
        questionData.options,
        questionData.order_by,
        questionData.required,
        DBA.getTimestamp()
      ]
    );
  };

  var updateSurveyQuestion = function(questionData){
    return DBA.query(
      '' +
      ' update survey_questions ' +
      ' set ' +
      ' title = ?, ' +
      ' help_text = ?, ' +
      ' type = ?, ' +
      ' options = ?, ' +
      ' order_by = ?, ' +
      ' required = ?, ' +
      ' created_at = ? where survey_question_id = ?',
      [
        questionData.title,
        questionData.help_text,
        questionData.type,
        questionData.options,
        questionData.order_by,
        questionData.required,
        DBA.getTimestamp(),
        questionData.survey_question_id
      ]
    );
  };

  return self;
})
.factory('SurveyResult', function(DBA, $q){
  var self = this;

  self.storeSurveyResult = function(resultData){
    if (resultData.uuid) {
      updateSurveyResult(resultData);
    } else {
      saveSurveyResult(resultData);
    }
  };

  self.storeSyncedSurveyResult = function(resultData){
    return DBA.findOrNull('select * from survey_results sr where sr.survey_result_id = ?', [resultData.survey_result_id])
    .then(function(existingSurveyResult){
      resultData.sync = 1;
      if (existingSurveyResult) {
        return updateSurveyResultByResultId(resultData);
      } else {
        return saveSurveyResult(resultData);
      }
    })
    ;
  };

  var updateSurveyResult = function(resultData){
    return DBA.query(
      'update survey_results ' +
      ' set answer = ?, ' +
      ' sync = 0 ' +
      ' where uuid = ? ',
      [
        resultData.answer,
        resultData.uuid
      ]
    );
  };

  var updateSurveyResultByResultId = function(resultData){
    return DBA.query(
      'update survey_results ' +
      ' set answer = ?, ' +
      ' sync = 1 ' +
      ' where survey_result_id = ? ',
      [
        resultData.answer,
        resultData.survey_result_id
      ]
    );
  };

  var saveSurveyResult = function(resultData){
    return DBA.query(
      'insert into survey_results ' +
      ' ( ' +
      ' uuid, ' +
      ' survey_instance_id, ' +
      ' survey_question_id, ' +
      ' answer, ' +
      ' created_at, ' +
      ' sync, ' +
      ' survey_result_id ' +
      ' )  values (?,?,?,?,?,?,?)',
      [
        DBA.getUuid(),
        resultData.survey_instance_id,
        resultData.survey_question_id,
        resultData.answer,
        DBA.getTimestamp(),
        typeof resultData.sync === 'undefined' ? 0 : resultData.sync,
        resultData.survey_result_id || null
      ]
    );
  };

  return self;
})
;
