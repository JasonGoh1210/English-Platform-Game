const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/learning.js'),'utf8');
const c={};vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('const byId')).replace(/^import .+$/gm,'').replaceAll('export function','function'),c);
const receipt=()=>({ok:true,stats:{total:3,correct:1,wrong:1,timedOut:1,questionsSeen:2,accuracy:33.3},nextCursor:null,mistakes:[{
  attemptId:7,question:{type:'TRUE_FALSE',question:'An old saved question.'},correctAnswer:false,submittedAnswer:true,timedOut:false,explanation:'Historical explanation.',explanationZh:'原来的解释。'
}]});
test('Learning preserves false answers, zero attempts and historical text',()=>{
  assert.equal(c.validLearningReceipt(receipt()),true);
  const empty=receipt();empty.stats={total:0,correct:0,wrong:0,timedOut:0,questionsSeen:0,accuracy:null};empty.mistakes=[];
  assert.equal(c.validLearningReceipt(empty),true);
});
test('Learning rejects contradictory totals, forged accuracy and duplicate mistake IDs',()=>{
  for(const mutate of [r=>r.stats.total=9,r=>r.stats.questionsSeen=4,r=>r.stats.accuracy=101,r=>r.mistakes.push({...r.mistakes[0]}),r=>r.nextCursor=-2]) {
    const r=receipt();mutate(r);assert.equal(c.validLearningReceipt(r),false);
  }
});
test('Malformed sentence choices and answer objects are not treated as valid learning snapshots',()=>{
  const r=receipt();r.mistakes[0].question={type:'SENTENCE_BUILDER',question:'Build',words:['We',{}]};r.mistakes[0].correctAnswer=['We','learn'];
  assert.equal(c.validLearningReceipt(r),false);
  r.mistakes[0].question.words=['We','learn'];assert.equal(c.validLearningReceipt(r),true);
  r.mistakes[0].correctAnswer={answer:'We learn'};assert.equal(c.validLearningReceipt(r),false);
});
test('Practice feedback must match the original snapshot and preserve false as an answer',()=>{
  const item=receipt().mistakes[0],result={ok:true,practice:{...item,correct:true}};
  assert.equal(c.validPracticeReceipt(result,item),true);
  result.practice.correctAnswer=true;assert.equal(c.validPracticeReceipt(result,item),false);
  result.practice.correctAnswer=false;result.practice.question={type:'TRUE_FALSE',question:'Another question'};
  assert.equal(c.validPracticeReceipt(result,item),false);
});
