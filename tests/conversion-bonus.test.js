import test from 'node:test';import assert from 'node:assert/strict';
import {validateConversionBonus,conversionBonusFor} from '../src/conversion-bonus.js';
import {salaryForDay,buildPayrollReport,payrollExportRows} from '../src/payroll-report.js';
import {calculate} from '../src/payroll.js';
const fixture=(currency='EGP',conversionBonus='50EGP')=>({teachers:[{id:'t',name:'Sara',teacherId:'001',currency,rate:currency==='JOD'?10:150,conversionBonus,schedules:[{effective:'2026-10-20',ranges:[{day:0,start:'16:00',end:'21:00'}]}]}],records:{'t:2026-11-15':{completed:4,exceptions:[],adjustments:[]}},conversions:{'t:2026-11-15':{converted:3},'t:2026-11-16':{converted:2},'t:2026-10-19':{completed:10,converted:4}}});
test('EGP conversion bonus is added once without changing lesson, half-pay or evening pay',()=>{
 const data=fixture(),t=data.teachers[0],base=calculate(t,'2026-11-15',data.records['t:2026-11-15']);
 const pay=salaryForDay(data,t,'2026-11-15');assert.equal(base.total,925);assert.equal(pay.total,1075);assert.equal(pay.conversionBonus,150);assert.equal(pay.lesson,base.lesson);assert.equal(pay.bonus,400);assert.equal(pay.compensation,225);
});
test('purchases without lesson records earn only conversion pay and are counted on the purchase date',()=>{
 const data=fixture(),t=data.teachers[0],before=JSON.stringify(data);
 const pay=salaryForDay(data,t,'2026-11-16');assert.equal(pay.total,100);assert.equal(pay.lesson,0);assert.equal(pay.compensation,0);assert.equal(pay.bonus,0);assert.equal(pay.hasPayrollRecord,false);
 const [row]=buildPayrollReport(data,'2026-11-15','2026-11-21');assert.equal(row.total,1175);assert.equal(row.conversionBonus,250);assert.equal(row.days,1);assert.equal(row.converted,5);assert.equal(JSON.stringify(data),before);
});
test('all historical conversions include pre-start manual conversion data but never create pre-start lesson wages',()=>{
 const data=fixture();data.records['t:2026-10-19']={completed:3,adjustments:[{amount:100}],exceptions:[]};
 const [row]=buildPayrollReport(data,'2026-10-01','2026-10-31');assert.equal(row.total,200);assert.equal(row.conversionBonus,200);assert.equal(row.lesson,0);assert.equal(row.days,0);assert.equal(row.adjustments,0);assert.equal(row.items[0].completed,0);
});
test('JOD uses 1.5 per student without EGP evening bonuses or currency mixing',()=>{
 const data=fixture('JOD','1.5JOD');assert.equal(conversionBonusFor(data,data.teachers[0],'2026-11-15').conversionBonus,4.5);
 const [row]=buildPayrollReport(data,'2026-11-15','2026-11-21');assert.equal(row.conversionBonus,7.5);assert.equal(row.bonus,0);
 assert.throws(()=>validateConversionBonus('60EGP','JOD'),/币种/);assert.throws(()=>validateConversionBonus('1.5JOD','EGP'),/币种/);assert.throws(()=>validateConversionBonus('100EGP','EGP'));
});
test('unconfigured teachers receive no automatic bonus; changing the chosen rate recalculates historical conversions',()=>{
 const data=fixture('EGP','');assert.equal(buildPayrollReport(data,'2026-11-15','2026-11-21')[0].total,925);
 data.teachers[0].conversionBonus='60EGP';const [row]=buildPayrollReport(data,'2026-11-15','2026-11-21');assert.equal(row.conversionBonus,300);assert.equal(row.total,1225);
});
test('hourly teachers can receive conversion bonuses independently of completion-based pay',()=>{
 const data=fixture();data.teachers[0].payMode='hourly';const pay=salaryForDay(data,data.teachers[0],'2026-11-15');assert.equal(pay.hourlyPay,750);assert.equal(pay.bonus,0);assert.equal(pay.total,900);
});
test('conversion-only Excel details are safe and exported totals reconcile with summary and recorded lesson days',()=>{
 const data=fixture(),report=buildPayrollReport(data,'2026-11-15','2026-11-21'),{summary,details}=payrollExportRows(report,data.records);
 assert.equal(summary[0]['转化奖励'],250);assert.equal(summary[0]['转化人数'],5);assert.equal(summary[0]['合计'],1175);
 assert.equal(details.length,2);assert.equal(details[1]['转化奖励'],100);assert.equal(details[1]['异常原因'],'');assert.equal(details.reduce((n,r)=>n+r['总计'],0),summary[0]['合计']);assert.equal(details[0]['每人转化奖励'],50);
});
test('deleted teacher history and daily unsaved conversion preview retain their rewards',()=>{
 const data=fixture();data.teachers[0].deletedAt='2026-11-18';assert.equal(buildPayrollReport(data,'2026-11-15','2026-11-21')[0].conversionBonus,250);
 assert.equal(salaryForDay(data,data.teachers[0],'2026-11-15',data.records['t:2026-11-15'],4).conversionBonus,200);
 assert.equal(data.conversions['t:2026-11-15'].converted,3);
});
test('late purchases can earn rewards even when conversion count exceeds that day’s trial count',()=>{const data=fixture();assert.equal(salaryForDay(data,data.teachers[0],'2026-11-15',data.records['t:2026-11-15'],8).conversionBonus,400);});
