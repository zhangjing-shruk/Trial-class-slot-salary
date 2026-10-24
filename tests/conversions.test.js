import test from 'node:test';
import assert from 'node:assert/strict';
import {conversionDay,conversionRows,saveConversion,validateConversion,conversionPeriod,compareConversions,rateChange} from '../src/conversions.js';
const fixture=()=>({teachers:[{id:'a',name:'Sara',teacherId:'001',subject:'英语'},{id:'b',name:'B',subject:'数学'},{id:'c',name:'C',subject:'英语'},{id:'old',name:'Old',deletedAt:'2026-10-23',subject:'英语'}],records:{'a:2026-10-20':{completed:10,exceptions:[],adjustments:[]},'b:2026-10-20':{completed:2}}});
test('historical completions and conversions never create or change payroll',()=>{const data=fixture(),before=JSON.stringify(data.records);saveConversion(data,'a','2026-10-19',20,5);assert.equal(JSON.stringify(data.records),before);assert.deepEqual(conversionDay(data,'a','2026-10-19'),{date:'2026-10-19',completed:20,converted:5,rate:.25,recorded:true});});
test('since cutoff denominator always comes from payroll and does not duplicate manual completion values',()=>{const data=fixture();saveConversion(data,'a','2026-10-20',999,3);assert.equal(conversionDay(data,'a','2026-10-20').rate,.3);assert.deepEqual(data.conversions['a:2026-10-20'],{converted:3});data.records['a:2026-10-20'].completed=12;assert.equal(conversionDay(data,'a','2026-10-20').rate,.25);});
test('conversion entries can be backfilled and replaced without duplicate counting',()=>{const data=fixture();saveConversion(data,'a','2026-10-20',10,2);saveConversion(data,'a','2026-10-20',10,4);assert.equal(conversionRows(data,'2026-10-18','2026-10-24')[0].converted,4);});
test('current directory roster includes zero data teachers and excludes resigned teachers',()=>{const rows=conversionRows(fixture(),'2026-10-18','2026-10-24');assert.equal(rows.length,3);assert.equal(rows.find(r=>r.teacher.id==='c').rate,null);});
test('period boundaries, subjects, ID searches and descending sort use selected data',()=>{const data=fixture();saveConversion(data,'a','2026-10-19',20,5);saveConversion(data,'a','2026-10-20',10,3);saveConversion(data,'b','2026-10-20',2,2);assert.equal(conversionRows(data,'2026-10-18','2026-10-24')[0].teacher.id,'b');const month=conversionRows(data,'2026-10-01','2026-10-31',{subject:'英语',search:'001',sort:'converted'});assert.equal(month.length,1);assert.equal(month[0].completed,30);assert.equal(month[0].converted,8);assert.equal(month[0].rate,8/30);assert.equal(conversionRows(data,'2026-10-20','2026-10-20',{sort:'completed'})[0].completed,10);});
test('invalid counts and calendar dates do not mutate state',()=>{const data=fixture(),before=JSON.stringify(data);for(const counts of [[-1,0],[2,.5],['',0],[null,0],[1,NaN]])assert.throws(()=>validateConversion(...counts));assert.throws(()=>saveConversion(data,'old','2026-10-19',10,1));assert.throws(()=>saveConversion(data,'a','2026-02-30',10,1));assert.equal(JSON.stringify(data),before);});
test('purchases on October 25 remain separate from the October 22 trial cohort',()=>{const data=fixture();data.records['a:2026-10-22']={completed:1};saveConversion(data,'a','2026-10-25',0,1);assert.equal(conversionDay(data,'a','2026-10-22').converted,0);assert.equal(conversionDay(data,'a','2026-10-25').converted,1);assert.equal(conversionDay(data,'a','2026-10-25').recorded,true);assert.equal(data.records['a:2026-10-25'],undefined);assert.equal(conversionRows(data,'2026-10-25','2026-10-31').find(r=>r.teacher.id==='a').rate,null);});
test('purchases can exceed current period completions and rates may exceed 100 percent',()=>{const data=fixture();saveConversion(data,'b','2026-10-20',2,5);assert.equal(conversionDay(data,'b','2026-10-20').rate,2.5);validateConversion(0,3);data.records['b:2026-10-20'].completed=1;assert.equal(conversionRows(data,'2026-10-18','2026-10-24').find(r=>r.teacher.id==='b').rate,5);});

test('weekly comparisons cross years and monthly comparisons respect leap February',()=>{
 assert.deepEqual(conversionPeriod('2026-01-01','week'),['2025-12-28','2026-01-03']);
 assert.deepEqual(conversionPeriod('2026-01-01','week',-1),['2025-12-21','2025-12-27']);
 assert.deepEqual(conversionPeriod('2024-03-31','month',-1),['2024-02-01','2024-02-29']);
 assert.deepEqual(conversionPeriod('2026-01-31','month',-1),['2025-12-01','2025-12-31']);
});
test('teacher comparisons match internal identity and show percentage point differences',()=>{
 const data=fixture();saveConversion(data,'a','2026-10-12',20,2);saveConversion(data,'a','2026-10-20',10,3);
 const row=compareConversions(data,'2026-10-22','week',{search:'001'})[0];
 assert.equal(row.previous.completed,20);assert.equal(row.previous.converted,2);
 assert.ok(Math.abs(row.change-20)<1e-10);
 assert.equal(compareConversions(data,'2026-10-22','week',{subject:'数学'}).length,1);
});
test('no previous denominator never becomes a false zero percent comparison',()=>{
 assert.equal(rateChange(.2,null),null);assert.equal(rateChange(null,.2),null);
 assert.equal(rateChange(0,0),0);assert.equal(rateChange(.1,.2),-10);
 const row=compareConversions(fixture(),'2026-10-22','week').find(r=>r.teacher.id==='a');assert.equal(row.change,null);
});
test('comparison totals retain full-period weighted denominators rather than averaging teacher rates',()=>{
 const data=fixture();saveConversion(data,'a','2026-10-20',10,2);saveConversion(data,'b','2026-10-20',2,2);
 saveConversion(data,'a','2026-09-15',40,4);saveConversion(data,'b','2026-09-15',10,1);
 const rows=compareConversions(data,'2026-10-22','month');
 const sum=rows.reduce((a,r)=>({completed:a.completed+r.previous.completed,converted:a.converted+r.previous.converted}),{completed:0,converted:0});
 assert.equal(sum.converted/sum.completed,.1);assert.equal(rows.length,3);
});
