const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/battle-review.js'),'utf8').replaceAll('export function','function');
const c={};vm.createContext(c);vm.runInContext(source,c);
const t=key=>({'battle.true':'正确 (TRUE)','battle.false':'错误 (FALSE)','review.noAnswer':'未提交答案','review.invalidAnswer':'无效答案'})[key];
test('Review preserves false and null as different outcomes and displays sentence order',()=>{
  assert.equal(c.formatReviewAnswer(false,t),'错误 (FALSE)');assert.equal(c.formatReviewAnswer(null,t),'未提交答案');
  assert.equal(c.formatReviewAnswer(['We','have','completed','the','assignment'],t),'We have completed the assignment');
});
test('Recorded text remains literal; malformed answer objects do not impersonate a sentence',()=>{
  const text='<img src=x onerror="alert(1)">';assert.equal(c.formatReviewAnswer(text,t),text);
  assert.equal(c.formatReviewAnswer({answer:'Banana'},t),'无效答案');assert.equal(c.formatReviewAnswer(['We',{}],t),'无效答案');
});
