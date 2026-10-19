import seed from './data/imported-slots.json' with {type:'json'};
export {seed};
// A one-time additive import. Never replace an existing teacher, schedule or daily record.
export function applySourceImport(data){
 data.imports??=[];
 if(data.imports.some(x=>x.id===seed.id))return data;
 const added=[],conflicts=[];
 const demo=data.teachers.find(t=>t.id==='demo-zhang');
 const demoKeys=Object.keys(data.records).filter(k=>k.startsWith('demo-zhang:'));
 const demoRecord=data.records['demo-zhang:2026-10-18'];
 if(demo&&demo.rate===150&&demo.currency==='EGP'&&JSON.stringify(demo.schedules)==='[{"effective":"2026-01-01","ranges":[{"day":0,"start":"16:00","end":"21:00"}]}]'&&demoKeys.length===1&&demoRecord?.completed===4&&!demoRecord.exceptions?.length&&!demoRecord.adjustments?.length){
  data.demoArchive={teacher:demo,records:{'demo-zhang:2026-10-18':demoRecord}};
  data.teachers=data.teachers.filter(t=>t.id!=='demo-zhang');delete data.records['demo-zhang:2026-10-18'];
 }

 for(const teacher of seed.teachers){
  const existing=data.teachers.find(t=>t.id===teacher.id||(t.name.trim().toLowerCase()===teacher.name.toLowerCase()&&t.subject===teacher.subject));
  if(existing){conflicts.push(teacher.name);continue;}
  data.teachers.push(JSON.parse(JSON.stringify(teacher)));added.push(teacher.id);
 }
 data.imports.push({id:seed.id,source:seed.source,sheet:seed.sheet,effective:seed.effective,added,conflicts});
 return data;
}

// Apply the user's confirmed Dalia rule once, preserving subsequent manual edits.
export function applyConfirmedPayRules(data){
 data.migrations??=[];
 const id='dalia-hourly-270-egp-v1';
 if(data.migrations.some(m=>m.id===id))return data;
 const imported=seed.teachers.find(t=>t.name==='Dalia Bassem'&&t.subject==='英语');
 const teacher=data.teachers.find(t=>t.id===imported?.id)||data.teachers.find(t=>t.name.trim().toLowerCase()==='dalia bassem'&&t.subject==='英语');
 if(!teacher)return data;
 data.migrations.push({id,teacherId:teacher.id,previous:{rate:teacher.rate??null,currency:teacher.currency||'',payMode:teacher.payMode||'slot'}});
 Object.assign(teacher,{rate:270,currency:'EGP',payMode:'hourly'});
 return data;
}
