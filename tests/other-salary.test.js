import test from 'node:test';import assert from 'node:assert/strict';
import {saveOtherSalary,otherSalaryEntries} from '../src/other-salary.js';
import {salaryForDay,buildPayrollReport,payrollExportRows} from '../src/payroll-report.js';
import {payrollDetailText} from '../src/payroll-details.js';
const fixture=(currency='EGP')=>({teachers:[{id:'t',name:'Teacher Example',teacherId:'TEST001',currency,rate:currency==='EGP'?150:10,conversionBonus:currency==='EGP'?'50EGP':'1.5JOD',schedules:[{effective:'2026-10-20',ranges:[{day:0,start:'16:00',end:'21:00'}]}]}],records:{'t:2026-11-22':{completed:4,exceptions:[],adjustments:[{amount:-10,reason:'Existing manual adjustment'}]}},conversions:{'t:2026-11-22':{converted:2}}});
const period=['2026-11-01','2026-11-30'];
const entry=(id,date,amount,reason='')=>({id,date,amount,reason});
test('other additions and deductions are separate from existing manual adjustments and included exactly once',()=>{
 const data=fixture(),records=JSON.stringify(data.records),before=salaryForDay(data,data.teachers[0],'2026-11-22').total;
 saveOtherSalary(data,'t',...period,[entry('a','2026-11-22',100,'Extra pay'),entry('b','2026-11-22',-30,'Deduction')]);
 const pay=salaryForDay(data,data.teachers[0],'2026-11-22');assert.equal(pay.other,70);assert.equal(pay.adjustments,-10);assert.equal(pay.total,before+70);assert.equal(JSON.stringify(data.records),records);
 const [report]=buildPayrollReport(data,...period);assert.equal(report.other,70);assert.equal(report.total,pay.total);assert.equal(report.otherEntries.length,2);
});
test('entry-only dates do not invent lesson wages and custom ranges count dated entries once',()=>{
 const data=fixture();saveOtherSalary(data,'t',...period,[entry('a','2026-11-23',80),entry('b','2026-11-29',-10)]);
 assert.equal(salaryForDay(data,data.teachers[0],'2026-11-23').total,80);assert.equal(salaryForDay(data,data.teachers[0],'2026-11-23').compensation,0);
 assert.equal(buildPayrollReport(data,'2026-11-22','2026-11-28')[0].other,80);assert.equal(buildPayrollReport(data,...period)[0].other,70);assert.equal(buildPayrollReport(data,...period)[0].days,1);
});
test('editing an entry updates the same identity and preserves entries outside the selected period',()=>{
 const data=fixture();saveOtherSalary(data,'t',...period,[entry('a','2026-11-22',100),entry('b','2026-11-29',10)]);
 saveOtherSalary(data,'t','2026-11-22','2026-11-28',[entry('a','2026-11-23',120,'Corrected')]);
 assert.equal(data.otherSalary.t.length,2);assert.equal(data.otherSalary.t.find(e=>e.id==='b').amount,10);assert.equal(data.otherSalaryAudit.length,1);assert.equal(buildPayrollReport(data,...period)[0].other,130);
});
test('voiding is reversible and retains the prior record and audit history',()=>{
 const data=fixture();saveOtherSalary(data,'t',...period,[entry('a','2026-11-22',100,'Keep note')]);
 saveOtherSalary(data,'t',...period,[{...data.otherSalary.t[0],voided:true}]);assert.equal(buildPayrollReport(data,...period)[0].other,0);assert.equal(data.otherSalary.t[0].reason,'Keep note');assert.equal(data.otherSalary.t.length,1);
 saveOtherSalary(data,'t',...period,[{...data.otherSalary.t[0],voided:false}]);assert.equal(buildPayrollReport(data,...period)[0].other,100);assert.equal(data.otherSalaryAudit.length,2);
});
test('JOD precision is kept and invalid amounts or dates cannot partially update saved data',()=>{
 const data=fixture('JOD');saveOtherSalary(data,'t',...period,[entry('a','2026-11-22',1.125),entry('b','2026-11-22',-0.001)]);assert.equal(buildPayrollReport(data,...period)[0].other,1.124);
 const before=JSON.stringify(data);for(const bad of [entry('x','2026-11-22',0),entry('x','2026-11-22',1.0001),entry('x','2026-12-01',10),entry('x','2026-11-31',10),entry('x','2026-11-22','')]){
  bad.reason='Entry note';assert.throws(()=>saveOtherSalary(data,'t',...period,[entry('valid','2026-11-22',1),bad]));assert.equal(JSON.stringify(data),before);
 }
 const egp=fixture();assert.throws(()=>saveOtherSalary(egp,'t',...period,[entry('a','2026-11-22',1.005)]));
});
test('copy and Excel include other totals and notes and all financial totals reconcile',()=>{
 const data=fixture();saveOtherSalary(data,'t',...period,[entry('a','2026-11-22',100,'Extra payment'),entry('b','2026-11-23',-30,'Correction')]);
 const report=buildPayrollReport(data,...period),{summary,details}=payrollExportRows(report,data.records);
 assert.equal(summary[0]['其他'],70);assert.ok(summary[0]['其他备注'].includes('Extra payment'));assert.equal(details.reduce((n,r)=>n+r['总计'],0),summary[0]['合计']);assert.equal(details.reduce((n,r)=>n+r['其他'],0),70);
 const text=payrollDetailText(report[0],...period);assert.ok(text.includes('其他：+70.00 EGP'));assert.ok(text.includes('2026-11-23：-30.00 EGP · Correction'));assert.ok(text.includes('扣费：-10.00 EGP'));
 const en=payrollDetailText(report[0],...period,'en');assert.ok(en.includes('Other: +70.00 EGP'));
});
test('net-zero entries retain their notes, and empty new rows are ignored',()=>{
 const data=fixture();saveOtherSalary(data,'t',...period,[entry('a','2026-11-23',10,'Addition'),entry('b','2026-11-23',-10,'Deduction'),entry('empty','2026-11-22','')]);
 assert.equal(data.otherSalary.t.length,2);const [r]=buildPayrollReport(data,...period);assert.equal(r.other,0);assert.equal(r.otherEntries.length,2);assert.ok(payrollDetailText(r,...period).includes('Addition'));
});
test('a row from another period cannot be accidentally overwritten using its identity',()=>{
 const data=fixture();saveOtherSalary(data,'t',...period,[entry('a','2026-11-29',100)]);const before=JSON.stringify(data);
 assert.throws(()=>saveOtherSalary(data,'t','2026-11-22','2026-11-28',[entry('a','2026-11-23',20)]));assert.equal(JSON.stringify(data),before);
});
