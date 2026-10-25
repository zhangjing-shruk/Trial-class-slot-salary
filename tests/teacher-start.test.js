import test from 'node:test';
import assert from 'node:assert/strict';
import {teacherHasStarted,teacherStartDate,effectiveSlots,scheduleFor,saveFixedSchedule,saveDateSchedule,calculate,scheduleEditorState} from '../src/payroll.js';
import {scheduleBlocks} from '../src/schedule-display.js';
const ranges=[1,2,3,4].map(day=>({day,start:'19:00',end:'21:00'}));
const fixture=()=>({rate:150,currency:'EGP',schedules:[{effective:'2026-10-20',ranges:structuredClone(ranges)}]});
test('moving the first template from 20th to 22nd removes earlier slots and starts on Thursday',()=>{
 const t=fixture();saveFixedSchedule(t,'2026-10-22',ranges,[],'2026-10-20');
 assert.equal(teacherStartDate(t),'2026-10-22');assert.equal(teacherHasStarted(t,'2026-10-21'),false);
 assert.deepEqual(effectiveSlots(t,'2026-10-20'),[]);assert.deepEqual(effectiveSlots(t,'2026-10-21'),[]);
 assert.equal(effectiveSlots(t,'2026-10-22').length,4);assert.equal(effectiveSlots(t,'2026-10-23').length,0);
 assert.equal(effectiveSlots(t,'2026-10-26').length,4);assert.equal(scheduleEditorState(t,'2026-10-25').effective,'2026-10-22');
 assert.equal(t.scheduleAudit[0].effective,'2026-10-20');
});
test('a start boundary blocks old versions, date overrides, extras, pay and bonuses before the start',()=>{
 const t={...fixture(),scheduleStart:'2026-10-22',dateSchedules:{'2026-10-21':{ranges:[{start:'19:00',end:'21:00'}]}}};
 const r={completed:3,exceptions:[{kind:'add',start:'19:00',end:'21:00'}],adjustments:[{amount:100}]};
 assert.deepEqual(scheduleFor(t,'2026-10-21'),[]);assert.deepEqual(scheduleBlocks(t,'2026-10-21',r),[]);
 assert.equal(calculate(t,'2026-10-21',r).total,0);assert.equal(calculate(t,'2026-10-21',r).completed,0);
 assert.throws(()=>saveDateSchedule(t,'2026-10-21',[],'before start'));
});
test('moving a legacy imported first date also blocks the earlier imported schedule',()=>{
 const t={...fixture(),schedules:[{effective:'2026-10-18',ranges}]};
 const state=scheduleEditorState(t,'2026-10-25');saveFixedSchedule(t,'2026-10-22',ranges,[],state.sourceEffective);
 assert.equal(teacherStartDate(t),'2026-10-22');assert.equal(effectiveSlots(t,'2026-10-20').length,0);
});
test('moving an effective date cannot invalidate recorded pay, and does not partially mutate data',()=>{
 const t=fixture(),before=JSON.stringify(t);assert.throws(()=>saveFixedSchedule(t,'2026-10-22',ranges,['2026-10-20'],'2026-10-20'));assert.equal(JSON.stringify(t),before);
});
test('editing a later template date preserves legitimate earlier history and future templates',()=>{
 const t={...fixture(),schedules:[{effective:'2026-10-20',ranges},{effective:'2026-10-28',ranges:[{day:3,start:'18:00',end:'21:00'}]}]};
 saveFixedSchedule(t,'2026-10-29',[{day:4,start:'18:00',end:'21:00'}],[],'2026-10-28');
 assert.equal(teacherStartDate(t),'2026-10-20');assert.equal(effectiveSlots(t,'2026-10-21').length,4);assert.equal(effectiveSlots(t,'2026-10-29').length,6);
});
