import test from 'node:test';import assert from 'node:assert/strict';
import {formatTime,formatTimeText} from '../src/time-format.js';
import {clock,minutes,calculate} from '../src/payroll.js';
test('midnight, noon, afternoon and end-of-day are unambiguous',()=>{assert.equal(formatTime(0),'12:00 AM');assert.equal(formatTime('12:00'),'12:00 PM');assert.equal(formatTime('16:30'),'4:30 PM');assert.equal(formatTime(1440),'12:00 AM (+1 day)');});
test('system rules use 12-hour times while existing AM/PM text and dates are preserved',()=>{assert.equal(formatTimeText('17:00–21:00'),'5:00 PM–9:00 PM');assert.equal(formatTimeText('12:00 PM – 4:00 PM'),'12:00 PM – 4:00 PM');assert.equal(formatTimeText('2026-10-22'),'2026-10-22');assert.equal(formatTimeText(270),270);});
test('all half-hour display labels correspond to unchanged stored time values',()=>{for(let n=0;n<=1440;n+=30){assert.equal(minutes(clock(n)),n);assert.match(formatTime(n),/^\d{1,2}:\d{2} (AM|PM)/);}});
test('time display formatting never changes the payroll calculation',()=>{const t={rate:150,currency:'EGP',schedules:[{effective:'2026-01-01',ranges:[{day:0,start:'16:00',end:'21:00'}]}]};formatTimeText('16:00–21:00');assert.equal(calculate(t,'2026-10-25',{completed:4}).total,925);assert.equal(t.schedules[0].ranges[0].start,'16:00');});
