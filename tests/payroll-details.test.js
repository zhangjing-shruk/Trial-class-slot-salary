import test from 'node:test';import assert from 'node:assert/strict';
import {payrollDetailText,payrollDetailHtml,copyPayrollDetail} from '../src/payroll-details.js';
const row=()=>({teacher:{name:'Teacher Example',teacherId:'TEST001',currency:'EGP',payMode:'slot'},lesson:500,hourlyPay:0,compensation:2700,bonus:700,conversionBonus:0,adjustments:-100,total:3800});
test('salary copy follows the requested template and exactly matches signed adjustment and displayed totals',()=>{
 const r=row(),before=JSON.stringify(r);
 assert.equal(payrollDetailText(r,'2026-10-20','2026-11-19'),[
 '这是2026-10-20 — 2026-11-19的工资','教师姓名：Teacher ExampleTEST001','完课工资：500.00 EGP','半薪补偿：2,700.00 EGP','晚间奖励：700.00 EGP','转化奖励：0.00 EGP','扣费：-100.00 EGP','总工资：3,800.00 EGP','','注意：工资将于本月最后一个工作日发放，请注意查收。'].join('\n'));
 assert.equal(JSON.stringify(r),before);
});
test('period comes from current week month or custom selection rather than a hardcoded range',()=>{
 for(const [start,end] of [['2026-11-15','2026-11-21'],['2026-11-01','2026-11-30'],['2026-12-20','2027-01-19']])assert.ok(payrollDetailText(row(),start,end).startsWith(`这是${start} — ${end}的工资`));
});
test('hourly teachers include hourly wages so copied components reconcile with total',()=>{
 const r={...row(),teacher:{...row().teacher,name:'Hourly Example',payMode:'hourly'},lesson:0,hourlyPay:8640,compensation:0,bonus:0,conversionBonus:120,adjustments:0,total:8760};
 const text=payrollDetailText(r,'2026-10-20','2026-11-19');assert.ok(text.includes('时长工资：8,640.00 EGP'));assert.ok(text.includes('总工资：8,760.00 EGP'));
});
test('JOD uses three decimal places, positive manual adjustments are explicitly additions, and English follows interface language',()=>{
 const r={...row(),teacher:{name:'JOD Example',teacherId:'001',currency:'JOD'},lesson:108,compensation:142.5,bonus:0,conversionBonus:4.5,adjustments:1.5,total:256.5};
 const text=payrollDetailText(r,'2026-11-01','2026-11-30','en');assert.ok(text.includes('Conversion bonus: 4.500 JOD'));assert.ok(text.includes('Deductions: +1.500 JOD (positive manual adjustment: added pay)'));assert.ok(text.includes('Total salary: 256.500 JOD'));assert.ok(text.includes('Teacher name: JOD Example001'));assert.ok(!/[\u4e00-\u9fff]/.test(text));
});
test('rich clipboard text keeps heading bold and escapes teacher-supplied markup',()=>{
 const text=payrollDetailText({...row(),teacher:{name:'Sara <img src=x>',teacherId:'001',currency:'EGP'}},'2026-11-01','2026-11-30');
 const html=payrollDetailHtml(text);assert.ok(html.includes('<strong>这是2026-11-01'));assert.ok(html.includes('&lt;img src=x&gt;001'));assert.ok(!html.includes('<img'));
});

test('clipboard copy always establishes plain text and retains it if rich formatting is unavailable',async()=>{
 const previousNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),previousClipboardItem=globalThis.ClipboardItem,calls=[];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>calls.push(['text',text]),write:async()=>{calls.push(['html']);throw Error('Rich clipboard unavailable');}}}});
 globalThis.ClipboardItem=class {constructor(items){this.items=items;}};
 try{await copyPayrollDetail('Salary details');assert.deepEqual(calls,[['text','Salary details'],['html']]);}
 finally{if(previousNavigator)Object.defineProperty(globalThis,'navigator',previousNavigator);else delete globalThis.navigator;if(previousClipboardItem===undefined)delete globalThis.ClipboardItem;else globalThis.ClipboardItem=previousClipboardItem;}
});
