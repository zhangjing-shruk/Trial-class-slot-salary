import test from 'node:test';import assert from 'node:assert/strict';
import {saveFixedSchedule,scheduleFor,effectiveSlots,calculate} from '../src/payroll.js';import {scheduleBlocks} from '../src/schedule-display.js';
const base=[{day:0,start:'13:00',end:'16:00'},{day:1,start:'13:00',end:'16:00'},{day:4,start:'13:00',end:'16:00'}];
const saturday={day:6,start:'13:00',end:'16:00'};
const fixture=()=>({rate:200,currency:'EGP',schedules:[{effective:'2026-10-20',ranges:structuredClone(base)},{effective:'2026-10-22',ranges:structuredClone(base)}]});
test('adding Saturday in the editor updates inherited later templates and all downstream schedules',()=>{
 const t=fixture();saveFixedSchedule(t,'2026-10-20',[...base,saturday],['2026-10-22'],'2026-10-20');
 for(const date of ['2026-10-31','2026-11-07']){
  assert.equal(scheduleFor(t,date)[0].start,'13:00');assert.equal(effectiveSlots(t,date).length,6);
  assert.deepEqual(scheduleBlocks(t,date),[{start:'13:00',end:'16:00',kind:'FIX'}]);
  assert.equal(calculate(t,date,{completed:2}).total,400);
 }
 assert.equal(t.scheduleAudit.length,2);
});
test('date overrides and recorded pay remain unchanged when the underlying fixed Saturday is added',()=>{
 const t=fixture();t.dateSchedules={'2026-10-24':{ranges:[{start:'13:00',end:'16:00'}],reason:'Temporary'}};
 const before=calculate(t,'2026-10-24',{completed:3}).total;
 saveFixedSchedule(t,'2026-10-20',[...base,saturday],['2026-10-22','2026-10-24'],'2026-10-20');
 assert.equal(calculate(t,'2026-10-24',{completed:3}).total,before);
 assert.equal(scheduleBlocks(t,'2026-10-24')[0].kind,'TEM');
});
test('a later explicitly different Saturday stays independent',()=>{
 const t=fixture();t.schedules[1].ranges.push({day:6,start:'18:00',end:'21:00'});
 saveFixedSchedule(t,'2026-10-20',[...base,saturday],[],'2026-10-20');
 assert.equal(scheduleFor(t,'2026-10-31')[0].start,'18:00');
});
test('payroll conflicts in later inherited templates reject the whole update without partial writes',()=>{
 const t=fixture(),before=JSON.stringify(t);
 assert.throws(()=>saveFixedSchedule(t,'2026-10-20',[...base,saturday],['2026-10-31'],'2026-10-20'),/已有工资记录/);
 assert.equal(JSON.stringify(t),before);
});
test('an explicit future change stops inherited edits from resurfacing after that change',()=>{
 const t=fixture();t.schedules[1].ranges.push({day:6,start:'18:00',end:'21:00'});
 t.schedules.push({effective:'2026-11-01',ranges:structuredClone(base)});
 saveFixedSchedule(t,'2026-10-20',[...base,saturday],[],'2026-10-20');
 assert.equal(scheduleFor(t,'2026-11-07').length,0);
});

test('adding a weekend does not block because unrelated weekdays already have payroll',()=>{const t=fixture();const before=calculate(t,'2026-10-26',{completed:3}).total;saveFixedSchedule(t,'2026-10-22',[...base,saturday],['2026-10-26'],'2026-10-22');assert.equal(calculate(t,'2026-10-26',{completed:3}).total,before);assert.equal(effectiveSlots(t,'2026-10-31').length,6);});

test('moving a template date still protects payroll after the new date',()=>{const t=fixture(),before=JSON.stringify(t);assert.throws(()=>saveFixedSchedule(t,'2026-10-23',[{day:1,start:'14:00',end:'16:00'}],['2026-10-26'],'2026-10-22'),/已有工资记录/);assert.equal(JSON.stringify(t),before);});
