import test from 'node:test';import assert from 'node:assert/strict';
import {savePayrollConversionCount,resetPayrollConversionCount,payrollConversionOverride} from '../src/payroll-conversion-override.js';
import {buildPayrollReport,payrollExportRows,salaryForDay} from '../src/payroll-report.js';
import {conversionRows} from '../src/conversions.js';import {payrollDetailText} from '../src/payroll-details.js';
const period=['2026-11-20','2026-11-30'];
const fixture=(currency='EGP')=>({teachers:[{id:'t',name:'Example',teacherId:'TEST001',currency,rate:currency==='EGP'?150:10,conversionBonus:currency==='EGP'?'50EGP':'1.5JOD',schedules:[{effective:'2026-10-20',ranges:[{day:0,start:'16:00',end:'21:00'}]}]}],records:{'t:2026-11-22':{completed:4,adjustments:[{amount:-10,reason:'Manual adjustment'}]}},conversions:{'t:2026-11-22':{converted:3}},otherSalary:{t:[{id:'extra',date:'2026-11-23',amount:15,currency,reason:'Other pay'}]}});
test('manual count changes only the selected payroll period and automatically recalculates bonus and total',()=>{
 const data=fixture(),base=buildPayrollReport(data,...period)[0],records=JSON.stringify(data.records),conversions=JSON.stringify(data.conversions),other=JSON.stringify(data.otherSalary);
 savePayrollConversionCount(data,'t',...period,6);const row=buildPayrollReport(data,...period)[0];
 assert.equal(row.converted,6);assert.equal(row.sourceConverted,3);assert.equal(row.conversionBonus,300);assert.equal(row.total,base.total+150);assert.equal(row.days,base.days);assert.equal(row.other,base.other);assert.equal(row.adjustments,base.adjustments);assert.equal(row.lesson,base.lesson);
 assert.equal(JSON.stringify(data.records),records);assert.equal(JSON.stringify(data.conversions),conversions);assert.equal(JSON.stringify(data.otherSalary),other);
 assert.equal(conversionRows(data,...period)[0].converted,3);assert.equal(salaryForDay(data,data.teachers[0],'2026-11-22').converted,3);
});
test('zero is valid and reducing count removes the correct bonus without changing actual purchases',()=>{
 const data=fixture(),base=buildPayrollReport(data,...period)[0];savePayrollConversionCount(data,'t',...period,0);const row=buildPayrollReport(data,...period)[0];assert.equal(row.converted,0);assert.equal(row.conversionBonus,0);assert.equal(row.total,base.total-150);assert.equal(data.conversions['t:2026-11-22'].converted,3);
});
test('re-saving replaces the count rather than stacking adjustments, and restoring returns to current source data',()=>{
 const data=fixture();savePayrollConversionCount(data,'t',...period,6);savePayrollConversionCount(data,'t',...period,4);assert.equal(buildPayrollReport(data,...period)[0].conversionBonus,200);assert.equal(data.payrollConversionOverrideAudit.length,1);
 data.conversions['t:2026-11-22'].converted=5;assert.equal(buildPayrollReport(data,...period)[0].converted,4);
 resetPayrollConversionCount(data,'t',...period);assert.equal(payrollConversionOverride(data,'t',...period),null);assert.equal(buildPayrollReport(data,...period)[0].converted,5);
});
test('a different, nested or overlapping payroll range does not inherit an override',()=>{
 const data=fixture();savePayrollConversionCount(data,'t',...period,6);
 for(const range of [['2026-11-01','2026-11-30'],['2026-11-22','2026-11-28'],['2026-11-20','2026-11-29']])assert.equal(buildPayrollReport(data,...range)[0].converted,3);
 assert.equal(buildPayrollReport(data,...period)[0].converted,6);
});
test('JOD count adjustments preserve three-decimal bonus precision, and counts may exceed completed trials',()=>{
 const data=fixture('JOD');savePayrollConversionCount(data,'t',...period,7);const row=buildPayrollReport(data,...period)[0];assert.equal(row.conversionBonus,10.5);assert.equal(row.items.reduce((sum,item)=>sum+item.total,0),row.total);
 assert.ok(payrollDetailText(row,...period,'en').includes('Conversion bonus: 10.500 JOD'));
});
test('summary, detailed exports and copied salary totals reconcile with the manual count',()=>{
 const data=fixture();savePayrollConversionCount(data,'t',...period,1);const report=buildPayrollReport(data,...period),{summary,details}=payrollExportRows(report,data.records);
 assert.equal(summary[0]['转化人数'],1);assert.equal(summary[0]['原始转化人数'],3);assert.equal(summary[0]['计奖人数来源'],'人工设置');
 assert.equal(details.reduce((sum,item)=>sum+item['转化人数'],0),1);assert.equal(details.reduce((sum,item)=>sum+item['转化奖励'],0),50);assert.equal(details.reduce((sum,item)=>sum+item['总计'],0),summary[0]['合计']);
 assert.equal(details.at(-1)['排班来源'],'工资周期转化人数调整');assert.equal(details.at(-1)['转化人数'],-2);assert.equal(details.at(-1)['调整原因'],'');
 assert.ok(payrollDetailText(report[0],...period).includes('转化奖励：50.00 EGP'));
});
test('invalid counts or dates never mutate data and no explanation is required',()=>{
 const data=fixture(),before=JSON.stringify(data);for(const value of ['',' ',null,-1,0.5,NaN,Infinity]){assert.throws(()=>savePayrollConversionCount(data,'t',...period,value));assert.equal(JSON.stringify(data),before);}
 assert.throws(()=>savePayrollConversionCount(data,'t','2026-11-31','2026-12-01',1));assert.equal(JSON.stringify(data),before);
 savePayrollConversionCount(data,'t',...period,'8');assert.equal(buildPayrollReport(data,...period)[0].converted,8);
});
test('no reward standard means count can change while salary stays unchanged',()=>{
 const data=fixture();data.teachers[0].conversionBonus='';const total=buildPayrollReport(data,...period)[0].total;savePayrollConversionCount(data,'t',...period,9);const row=buildPayrollReport(data,...period)[0];assert.equal(row.converted,9);assert.equal(row.conversionBonus,0);assert.equal(row.total,total);
});
