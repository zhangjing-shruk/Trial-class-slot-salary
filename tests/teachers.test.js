import test from 'node:test';import assert from 'node:assert/strict';
import {activeTeachers,deleteTeacher,teacherLabel} from '../src/teachers.js';
import {mergeLocalChanges} from '../src/merge-local.js';
import {calculate} from '../src/payroll.js';
const fixture=()=>({teachers:[{id:'t',name:'Teacher Test',rate:150,currency:'EGP',schedules:[{effective:'2026-01-01',ranges:[{day:0,start:'16:00',end:'21:00'}]}]}],records:{'t:2026-10-25':{completed:4}}});
test('deletion removes active profile but preserves historical wages and records',()=>{const x=fixture();deleteTeacher(x,'t','Teacher Test');assert.equal(activeTeachers(x).length,0);assert.equal(x.records['t:2026-10-25'].completed,4);assert.equal(calculate(x.teachers[0],'2026-10-25',x.records['t:2026-10-25']).total,925);});
test('full name confirmation is required before changing the teacher',()=>{const x=fixture();assert.throws(()=>deleteTeacher(x,'t','Wrong'));assert.equal(activeTeachers(x).length,1);assert.throws(()=>deleteTeacher(x,'missing','Teacher Test'));});
test('old browser local data does not resurrect a deleted teacher',()=>{const local=fixture(),remote=fixture();deleteTeacher(remote,'t','Teacher Test');local.teachers[0].rate=200;const merged=mergeLocalChanges(local,remote);assert.equal(activeTeachers(merged.data).length,0);assert.equal(merged.data.teachers[0].rate,150);});

test('teacher labels concatenate name and entered ID, retaining leading zeros',()=>{
 assert.equal(teacherLabel({name:'Sara',teacherId:'001234'}),'Sara001234');
 assert.equal(teacherLabel({name:'Sara'}),'Sara');
 assert.equal(teacherLabel({name:'Sara',teacherId:' 123456 '}),'Sara123456');
 assert.equal(teacherLabel(undefined),'');
});
test('adding an ID preserves internal identity and historical pay, and deletion confirms the displayed label',()=>{
 const x=fixture();x.teachers[0].teacherId='001234';
 assert.equal(x.teachers[0].id,'t');
 assert.equal(calculate(x.teachers[0],'2026-10-25',x.records['t:2026-10-25']).total,925);
 assert.throws(()=>deleteTeacher(x,'t','Teacher Test'));
 deleteTeacher(x,'t','Teacher Test001234');
 assert.equal(x.records['t:2026-10-25'].completed,4);
});
test('local teacher ID edits merge and shared ID conflicts are preserved',()=>{
 const local=fixture(),remote=fixture();local.teachers[0].teacherId='001234';
 assert.equal(mergeLocalChanges(local,remote).data.teachers[0].teacherId,'001234');
 remote.teachers[0].teacherId='other';const result=mergeLocalChanges(local,remote);
 assert.equal(result.data.teachers[0].teacherId,'other');
 assert.equal(result.conflicts[0].teacher,'Teacher Test001234');
});
