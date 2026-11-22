const validDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
const entryFields=entry=>JSON.stringify([entry.date,entry.amount,entry.reason||'',!!entry.voided,entry.currency]);
export function otherSalaryEntries(data,teacherId,start,end=start){
 return (data.otherSalary?.[teacherId]||[]).filter(entry=>!entry.voided&&entry.date>=start&&entry.date<=end).sort((a,b)=>a.date.localeCompare(b.date));
}
export function otherSalaryForDay(data,teacherId,date){
 const otherEntries=otherSalaryEntries(data,teacherId,date);
 return {otherEntries,other:otherEntries.reduce((sum,e)=>sum+Math.round(Number(e.amount)*1000),0)/1000};
}
export function saveOtherSalary(data,teacherId,start,end,drafts){
 const teacher=data.teachers.find(t=>t.id===teacherId);
 if(!teacher||!['EGP','JOD'].includes(teacher.currency))throw Error('请先补充老师币种。');
 if(!validDate(start)||!validDate(end)||start>end)throw Error('请选择有效日期范围');
 const original=data.otherSalary?.[teacherId]||[],entries=new Map(original.map(e=>[e.id,{...e}])),ids=new Set(),audit=[],now=new Date().toISOString();
 for(const draft of drafts){
  if(!draft.id||ids.has(draft.id))throw Error('其他工资记录重复，请重新打开后重试。');ids.add(draft.id);
  const old=entries.get(draft.id);
  if(old&&(old.date<start||old.date>end))throw Error('只能修改当前工资周期内的其他记录。');
  if(draft.voided&&!old)continue;
  if(!old&&(draft.amount===''||draft.amount===null||draft.amount===undefined)&&!String(draft.reason||'').trim())continue;
  let next;
  if(draft.voided)next={...old,voided:true,updatedAt:now};
  else{
   const amount=Number(draft.amount),scale=teacher.currency==='JOD'?1000:100;
   if(draft.amount===''||draft.amount===null||!Number.isFinite(amount)||amount===0||!Number.isSafeInteger(Math.round(amount*scale))||Math.abs(amount*scale-Math.round(amount*scale))>1e-7)throw Error('请输入有效的非零金额，EGP 最多两位小数，JOD 最多三位小数。');
   if(!validDate(draft.date)||draft.date<start||draft.date>end)throw Error('其他工资日期必须在当前选择的工资周期内。');
   if(old?.currency&&old.currency!==teacher.currency)throw Error('其他工资记录币种与老师币种不一致，请先核对。');
   next={id:draft.id,date:draft.date,amount:Math.round(amount*scale)/scale,reason:String(draft.reason||'').trim(),currency:teacher.currency,voided:false,createdAt:old?.createdAt||now,updatedAt:now};
  }
  if(old&&entryFields(old)===entryFields(next))continue;
  if(old)audit.push({teacherId,entry:{...old},changedAt:now});
  entries.set(next.id,next);
 }
 // Preserve entries outside this period, and omitted rows. Removal is explicit, reversible voiding.
 data.otherSalary??={};data.otherSalary[teacherId]=[...entries.values()];
 if(audit.length){data.otherSalaryAudit??=[];data.otherSalaryAudit.push(...audit);}
}
