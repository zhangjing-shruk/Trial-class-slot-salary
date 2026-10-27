import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeSubjectSlots} from '../src/availability-summary.js';
import {effectiveSlots,datesBetween,saveScheduleChange} from '../src/payroll.js';
const days=datesBetween('2026-10-25','2026-10-31');
const ranges=Array.from({length:7},(_,day)=>({day,start:'13:00',end:'15:00'}));
const teacher=(id,subject)=>({id,subject,schedules:[{effective:'2026-10-20',ranges:structuredClone(ranges)}]});
const sets=(teachers,records={})=>days.map(d=>new Map(teachers.map(t=>[t.id,new Set(effectiveSlots(t,d,records[`${t.id}:${d}`]?.exceptions||[]))])));
test('counts simultaneous teachers separately and reconciles subject, daily and weekly totals',()=>{
 const teachers=[teacher('a','英语'),teacher('b','英语'),teacher('c','数学'),teacher('d','阿拉伯语')];
 const summary=summarizeSubjectSlots(teachers,sets(teachers));
 assert.deepEqual(summary.rows.map(r=>r.daily[0]),[8,4,4]);assert.deepEqual(summary.daily,[16,16,16,16,16,16,16]);assert.equal(summary.total,112);assert.equal(summary.rows.reduce((n,r)=>n+r.total,0),112);
});
test('summary includes date overrides, closed days, additional slots and leave without double counting',()=>{
 const teachers=[teacher('a','英语'),teacher('b','数学')];teachers[0].dateSchedules={'2026-10-26':{ranges:[]},'2026-10-27':{ranges:[{start:'14:00',end:'15:00'}]}};
 const records={'b:2026-10-26':{exceptions:[{kind:'add',start:'14:00',end:'16:00'},{kind:'leave',start:'13:00',end:'13:30'}]}};
 const summary=summarizeSubjectSlots(teachers,sets(teachers,records));assert.equal(summary.rows[0].daily[1],0);assert.equal(summary.rows[0].daily[2],2);assert.equal(summary.rows[1].daily[1],5);assert.equal(summary.daily[1],5);
});
test('respects teacher starting dates and future schedule changes within the week',()=>{
 const teachers=[teacher('a','阿拉伯语')];teachers[0].scheduleStart='2026-10-27';
 saveScheduleChange(teachers[0],'2026-10-30',Array.from({length:7},(_,day)=>({day,start:'17:00',end:'20:00'})));
 const summary=summarizeSubjectSlots(teachers,sets(teachers));assert.deepEqual(summary.rows[2].daily,[0,0,4,4,4,6,6]);assert.equal(summary.total,24);
});
test('empty subjects show zeros and resigned teachers are excluded',()=>{
 const teachers=[{...teacher('a','英语'),deletedAt:'2026-10-25'}];const summary=summarizeSubjectSlots(teachers,sets(teachers));assert.equal(summary.rows.length,3);assert.equal(summary.total,0);assert.deepEqual(summary.daily,[0,0,0,0,0,0,0]);
});

test('workday average uses Sunday through Thursday divided by five and weekly average uses all seven days',()=>{
 const members=[teacher('a','英语'),teacher('b','数学')];
 const daily=[2,4,6,8,10,12,14];
 const maps=daily.map(n=>new Map([['a',new Set(Array.from({length:n},(_,i)=>i))],['b',new Set([0])]]));
 const summary=summarizeSubjectSlots(members,maps);
 assert.equal(summary.rows[0].workdayAverage,6);assert.equal(summary.rows[0].weeklyAverage,8);
 assert.equal(summary.rows[1].workdayAverage,1);assert.equal(summary.rows[1].weeklyAverage,1);
 assert.equal(summary.workdayAverage,7);assert.equal(summary.weeklyAverage,9);
});
test('daily averages include closed days and retain precision until display',()=>{
 const members=[teacher('a','英语')],maps=days.map((_,i)=>new Map([['a',new Set(i===6?[0]:[])]]));
 const summary=summarizeSubjectSlots(members,maps);
 assert.equal(summary.rows[0].workdayAverage,0);assert.equal(summary.rows[0].weeklyAverage,1/7);
 assert.equal(summary.workdayAverage,0);assert.equal(summary.weeklyAverage,1/7);assert.equal(summary.rows[1].weeklyAverage,0);
});
