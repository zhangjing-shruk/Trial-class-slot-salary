import test from 'node:test';import assert from 'node:assert/strict';
import {saudiClock,saudiOffsetMinutes} from '../src/timezone-display.js';
import {effectiveSlots,calculate} from '../src/payroll.js';
test('Saudi reference is one hour ahead during Cairo winter and equal during summer',()=>{
 assert.equal(saudiOffsetMinutes('2026-10-30'),60);assert.equal(saudiClock('2026-10-30',13*60),'2:00 PM');
 assert.equal(saudiOffsetMinutes('2026-10-29'),0);assert.equal(saudiClock('2026-10-29',13*60),'1:00 PM');
 assert.equal(saudiOffsetMinutes('2026-07-01'),0);assert.equal(saudiOffsetMinutes('2026-12-01'),60);
});
test('half hours, noon and midnight retain AM/PM and explicitly mark next-day Saudi times',()=>{
 assert.equal(saudiClock('2026-10-30',690),'12:30 PM');
 assert.equal(saudiClock('2026-10-30',1380),'12:00 AM（次日）');
 assert.equal(saudiClock('2026-10-30',1410,'en'),'12:30 AM (+1 day)');
 assert.equal(saudiClock('2026-10-30',1440,'en'),'1:00 AM (+1 day)');
});
test('reference conversion does not change stored availability, pay or Cairo time values',()=>{
 const t={rate:150,currency:'EGP',schedules:[{effective:'2026-10-20',ranges:[{day:5,start:'16:00',end:'21:00'}]}]};
 const original=JSON.stringify(t),pay=calculate(t,'2026-10-30',{completed:4}),slots=effectiveSlots(t,'2026-10-30');
 for(const time of slots)saudiClock('2026-10-30',time);
 assert.equal(JSON.stringify(t),original);assert.deepEqual(effectiveSlots(t,'2026-10-30'),slots);
 assert.deepEqual(calculate(t,'2026-10-30',{completed:4}),pay);assert.equal(pay.total,925);
});
