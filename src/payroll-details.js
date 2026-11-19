import {teacherLabel} from './teachers.js';
function amount(value,currency){
 const number=Number(value??0);if(!Number.isFinite(number))throw Error('工资金额无效。');
 return `${number.toLocaleString('en-US',{minimumFractionDigits:currency==='JOD'?3:2,maximumFractionDigits:currency==='JOD'?3:2})} ${currency}`;
}
export function payrollDetailText(row,start,end,language='zh'){
 if(!start||!end||start>end)throw Error('请选择有效日期范围');
 const en=language==='en',currency=row.teacher.currency||'EGP';
 const lines=[en?`Salary for ${start} — ${end}`:`这是${start} — ${end}的工资`,
 `${en?'Teacher name':'教师姓名'}：${teacherLabel(row.teacher)}`,
 `${en?'Completed lesson pay':'完课工资'}：${amount(row.lesson,currency)}`];
 if(row.teacher.payMode==='hourly'||Number(row.hourlyPay)>0)lines.push(`${en?'Hourly pay':'时长工资'}：${amount(row.hourlyPay,currency)}`);
 lines.push(`${en?'Half-pay compensation':'半薪补偿'}：${amount(row.compensation,currency)}`,
 `${en?'Evening bonus':'晚间奖励'}：${amount(row.bonus,currency)}`,
 `${en?'Conversion bonus':'转化奖励'}：${amount(row.conversionBonus,currency)}`,
 `${en?'Deductions':'扣费'}：${Number(row.adjustments)>0?'+':''}${amount(row.adjustments,currency)}${Number(row.adjustments)>0?(en?' (positive manual adjustment: added pay)':'（人工调整为加款）'):''}`,
 `${en?'Total salary':'总工资'}：${amount(row.total,currency)}`,'',
 en?'Note: Salary will be paid on the last working day of this month. Please check for receipt.':'注意：工资将于本月最后一个工作日发放，请注意查收。');
 return en?lines.map(line=>line.replace('：',': ')).join('\n'):lines.join('\n');
}
export function payrollDetailHtml(text){
 const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 return '<div>'+text.split('\n').map((line,index)=>`<div>${index===0?'<strong>':''}${line?escape(line):'<br>'}${index===0?'</strong>':''}</div>`).join('')+'</div>';
}
export async function copyPayrollDetail(text){
 if(!navigator.clipboard)throw Error('Clipboard is unavailable');
 if(typeof ClipboardItem!=='undefined'&&navigator.clipboard.write){
  try{await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([text],{type:'text/plain'}),'text/html':new Blob([payrollDetailHtml(text)],{type:'text/html'})})]);return;}catch{}
 }
 await navigator.clipboard.writeText(text);
}
