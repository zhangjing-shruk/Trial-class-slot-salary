import {datesBetween} from './payroll.js';
import {periodConversionBonus} from './conversion-bonus.js';
const keyFor=(teacherId,start,end)=>`${teacherId}:${start}:${end}`;
function validatePeriod(start,end){
 for(const date of [start,end])if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('请选择有效日期范围');
 datesBetween(start,end);
}
export function payrollConversionOverride(data,teacherId,start,end){
 const entry=data.payrollConversionOverrides?.[keyFor(teacherId,start,end)];
 return entry&&!entry.voided?entry:null;
}
export function savePayrollConversionCount(data,teacherId,start,end,value){
 validatePeriod(start,end);
 const teacher=data.teachers.find(t=>t.id===teacherId);if(!teacher)throw Error('老师档案不存在或已删除。');
 if((typeof value==='string'&&!value.trim())||value===null||!Number.isSafeInteger(Number(value))||Number(value)<0)throw Error('转化人数必须为非负整数。');
 const converted=Number(value),reward=periodConversionBonus(data,teacher,end,converted);
 if(!Number.isSafeInteger(Math.round(reward.conversionBonus*1000)))throw Error('转化奖励金额过大，请核对人数。');
 const key=keyFor(teacherId,start,end),old=data.payrollConversionOverrides?.[key];
 if(old&&!old.voided&&old.converted===converted)return;
 if(old){data.payrollConversionOverrideAudit??=[];data.payrollConversionOverrideAudit.push({...old});}
 data.payrollConversionOverrides??={};
 data.payrollConversionOverrides[key]={teacherId,start,end,converted,voided:false,updatedAt:new Date().toISOString()};
}
export function resetPayrollConversionCount(data,teacherId,start,end){
 validatePeriod(start,end);const entry=payrollConversionOverride(data,teacherId,start,end);if(!entry)return;
 data.payrollConversionOverrideAudit??=[];data.payrollConversionOverrideAudit.push({...entry});
 entry.voided=true;entry.updatedAt=new Date().toISOString();
}
