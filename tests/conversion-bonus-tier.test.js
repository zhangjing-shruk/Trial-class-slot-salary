import test from 'node:test';import assert from 'node:assert/strict';
import {buildPayrollReport,payrollExportRows} from '../src/payroll-report.js';
import {savePayrollConversionCount,resetPayrollConversionCount} from '../src/payroll-conversion-override.js';
import {payrollDetailText} from '../src/payroll-details.js';
const period=['2026-11-01','2026-11-30'];
const fixture=(count,currency='EGP',rate='50EGP')=>({teachers:[{id:'t',name:'Example',currency,rate:100,conversionBonus:rate,schedules:[]}],records:{},conversions:{'t:2026-11-10':{converted:count}},otherSalary:{t:[{id:'other',date:'2026-11-15',currency,amount:-20,reason:'Other deduction'}]}});
test('9 earns normal pay, 10 and 11 double the whole bonus, and other salary stays unchanged',()=>{
 for(const [count,bonus]of [[9,450],[10,1000],[11,1100]]){const data=fixture(count),before=JSON.stringify(data);const r=buildPayrollReport(data,...period)[0];assert.equal(r.conversionBonus,bonus);assert.equal(r.total,bonus-20);assert.equal(r.converted,count);assert.equal(JSON.stringify(data),before);}
});
test('period threshold combines purchases across dates rather than requiring ten purchases in one day',()=>{
 const data=fixture(6);data.conversions['t:2026-11-12']={converted:4};const r=buildPayrollReport(data,...period)[0];assert.equal(r.conversionBonus,1000);assert.equal(r.days,0);assert.equal(r.sourceConverted,10);
 assert.equal(buildPayrollReport(data,'2026-11-10','2026-11-10')[0].conversionBonus,300);
});
test('manual count crosses the threshold in both directions and reset restores the source tier',()=>{
 const data=fixture(9);savePayrollConversionCount(data,'t',...period,10);assert.equal(buildPayrollReport(data,...period)[0].conversionBonus,1000);savePayrollConversionCount(data,'t',...period,8);assert.equal(buildPayrollReport(data,...period)[0].conversionBonus,400);resetPayrollConversionCount(data,'t',...period);assert.equal(buildPayrollReport(data,...period)[0].conversionBonus,450);assert.equal(data.conversions['t:2026-11-10'].converted,9);
});
test('60 EGP and 1.5 JOD rates also double, and copied detail explains the calculation',()=>{
 for(const [currency,rate,bonus] of [['EGP','60EGP',1200],['JOD','1.5JOD',30]]){const data=fixture(10,currency,rate),r=buildPayrollReport(data,...period)[0];assert.equal(r.conversionBonus,bonus);assert.equal(r.conversionBonusMultiplier,2);assert.ok(payrollDetailText(r,...period).includes('× 2)'));}
});
test('Excel summary and daily reconciliation keep counts and totals exact without duplicating rewards',()=>{
 for(const count of [9,10,12]){const data=fixture(count);savePayrollConversionCount(data,'t',...period,10);const report=buildPayrollReport(data,...period),{summary,details}=payrollExportRows(report,data.records);assert.equal(summary[0]['转化奖励'],1000);assert.equal(summary[0]['转化奖励倍率'],2);assert.equal(details.reduce((n,d)=>n+d['转化人数'],0),10);assert.equal(details.reduce((n,d)=>n+d['转化奖励'],0),1000);assert.equal(details.reduce((n,d)=>n+d['总计'],0),summary[0]['合计']);}
});
