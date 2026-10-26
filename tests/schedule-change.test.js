import test from 'node:test';import assert from 'node:assert/strict';
import {saveScheduleChange,scheduleChangeEditorState,scheduleFor,effectiveSlots,calculate,teacherStartDate} from '../src/payroll.js';
import {scheduleBlocks} from '../src/schedule-display.js';
const week=(start,end)=>[0,1,2,3,4,5,6].map(day=>({day,start,end}));
const old=week('13:00','16:00'),updated=week('17:00','21:00');
const fixture=()=>({rate:200,currency:'EGP',scheduleStart:'2026-10-22',schedules:[{effective:'2026-10-22',ranges:structuredClone(old)}],dateSchedules:{'2026-10-31':{ranges:[{start:'18:00',end:'19:00'}],reason:'Specific date'}}});
test('October 30 change preserves old hours through October 29 and switches every derived view from October 30',()=>{
 const t=fixture(),before=structuredClone(t),oldPay=calculate(t,'2026-10-29',{completed:3});
 saveScheduleChange(t,'2026-10-30',updated,['2026-10-22','2026-10-29']);
 assert.equal(t.schedules.length,2);assert.deepEqual(t.schedules[0],before.schedules[0]);assert.equal(teacherStartDate(t),'2026-10-22');
 assert.deepEqual(calculate(t,'2026-10-29',{completed:3}),oldPay);
 assert.equal(scheduleFor(t,'2026-10-29')[0].start,'13:00');assert.equal(scheduleFor(t,'2026-10-30')[0].start,'17:00');
 assert.equal(effectiveSlots(t,'2026-10-29').length,6);assert.equal(effectiveSlots(t,'2026-10-30').length,8);
 assert.deepEqual(scheduleBlocks(t,'2026-10-30'),[{start:'17:00',end:'21:00',kind:'FIX'}]);
 assert.equal(scheduleFor(t,'2026-11-02')[0].start,'17:00');assert.equal(calculate(t,'2026-10-30',{completed:4}).bonus,400);
});
test('date-specific arrangements, exceptions and hourly rules are preserved',()=>{
 const t=fixture(),overrides=JSON.stringify(t.dateSchedules);saveScheduleChange(t,'2026-10-30',updated);
 assert.equal(JSON.stringify(t.dateSchedules),overrides);assert.equal(effectiveSlots(t,'2026-10-31').length,2);assert.equal(scheduleBlocks(t,'2026-10-31')[0].kind,'TEM');
 const record={completed:2,exceptions:[{kind:'leave',start:'17:00',end:'18:00'}]};assert.equal(effectiveSlots(t,'2026-10-30',record.exceptions).length,6);
 t.payMode='hourly';assert.equal(calculate(t,'2026-10-30',record).hourlyPay,600);
});
test('already recorded pay in the new schedule interval prevents all mutation',()=>{
 const t=fixture(),before=JSON.stringify(t);assert.throws(()=>saveScheduleChange(t,'2026-10-30',updated,['2026-10-30']),/已有工资记录/);assert.equal(JSON.stringify(t),before);
});
test('duplicate dates and changes before teacher start cannot replace or move the initial schedule',()=>{
 const t=fixture(),before=JSON.stringify(t);for(const date of ['2026-10-20','2026-10-22'])assert.throws(()=>saveScheduleChange(t,date,updated));
 saveScheduleChange(t,'2026-10-30',updated);const after=JSON.stringify(t);assert.throws(()=>saveScheduleChange(t,'2026-10-30',old),/该日期已有固定排班/);assert.equal(JSON.stringify(t),after);assert.equal(JSON.stringify(t.schedules[0]),JSON.stringify(JSON.parse(before).schedules[0]));
});
test('new change editor copies the schedule valid at the chosen date without changing saved data',()=>{
 const t=fixture();saveScheduleChange(t,'2026-11-10',updated);const before=JSON.stringify(t);
 const state=scheduleChangeEditorState(t,'2026-10-30');assert.deepEqual(state.ranges,old);state.ranges[0].start='12:00';assert.equal(JSON.stringify(t),before);
 assert.deepEqual(scheduleChangeEditorState(t,'2026-11-11').ranges,updated);
});
test('an explicitly scheduled later change still takes over on its own date',()=>{
 const t=fixture();saveScheduleChange(t,'2026-11-10',week('12:00','14:00'));saveScheduleChange(t,'2026-10-30',updated,['2026-11-11']);
 assert.equal(scheduleFor(t,'2026-11-09')[0].start,'17:00');assert.equal(scheduleFor(t,'2026-11-10')[0].start,'12:00');
});
