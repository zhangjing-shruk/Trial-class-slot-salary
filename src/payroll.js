import {START_DATE,inOperatingPeriod,clampStart} from './operating-period.js';
export const WEEKDAYS = ['周日','周一','周二','周三','周四','周五','周六'];
export const cairoToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const weekday = d => new Date(`${d}T12:00:00Z`).getUTCDay();
export const minutes = t => { if(!/^\d{2}:\d{2}$/.test(t)) throw Error('时间格式无效'); const [h,m]=t.split(':').map(Number); if(h>24||m>59||(h===24&&m!==0))throw Error('时间无效');return h*60+m; };
export const clock = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export function slotsFor(ranges){const s=new Set();for(const r of ranges){const a=minutes(r.start),b=minutes(r.end);if(a%30||b%30||b<=a)throw Error('时间须为整点或半点，且结束晚于开始');for(let n=a;n<b;n+=30){if(s.has(n))throw Error('时间段不能重叠');s.add(n);}}return [...s].sort((a,b)=>a-b);}
// The first working date is a boundary, independent of later weekly template versions.
export function teacherStartDate(teacher){return clampStart(teacher.scheduleStart||[...(teacher.schedules||[])].map(s=>s.effective).sort()[0]||START_DATE);}
export const teacherHasStarted=(teacher,date)=>inOperatingPeriod(date)&&date>=teacherStartDate(teacher);
export function fixedScheduleFor(teacher,date){if(!teacherHasStarted(teacher,date))return [];return [...(teacher.schedules||[])].filter(s=>s.effective<=date).sort((a,b)=>b.effective.localeCompare(a.effective))[0]?.ranges.filter(r=>Number(r.day)===weekday(date))||[];}
export function scheduleFor(teacher,date){if(!teacherHasStarted(teacher,date))return [];return teacher.dateSchedules?.[date]?.ranges ?? fixedScheduleFor(teacher,date);}
export function scheduleEditorState(teacher,today){
 const versions=[...(teacher.schedules||[])].sort((a,b)=>b.effective.localeCompare(a.effective));
 const version=versions.find(v=>v.effective===teacher.lastScheduleEffective)||versions[0];
 return {effective:clampStart(version?.effective||today),ranges:JSON.parse(JSON.stringify(version?.ranges||[])),version:version?clampStart(version.effective):'new',sourceEffective:version?.effective||null};
}
export function saveDateSchedule(teacher,date,ranges,reason,hasDailyRecord=false){
 if(!inOperatingPeriod(date))throw Error('系统从 2026-10-20 开始记录，请选择该日或之后的日期。');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date+'T12:00:00Z').getTime()))throw Error('请选择有效日期');
 if(!teacherHasStarted(teacher,date))throw Error('该日期早于老师排班开始日期。');
 if(hasDailyRecord)throw Error('该日期已录入工资，请在每日记录中通过异常调整时间，以保留原始排班');
 if(!reason.trim())throw Error('请填写排班备注');
 slotsFor(ranges);
 teacher.dateSchedules??={};teacher.dateSchedules[date]={ranges:ranges.map(r=>({start:r.start,end:r.end})),reason:reason.trim()};
}
export function saveFixedSchedule(teacher,effective,ranges,recordDates=[],sourceEffective=null){
 // Build the complete update before applying it so a later payroll conflict cannot leave a partial save.
 const candidate=JSON.parse(JSON.stringify(teacher));
 updateFixedSchedule(candidate,effective,ranges,recordDates,sourceEffective);
 Object.assign(teacher,candidate);
}
const daySignature=(ranges,day)=>JSON.stringify(ranges.filter(r=>Number(r.day)===day).map(r=>({start:r.start,end:r.end})).sort((a,b)=>a.start.localeCompare(b.start)));
function updateFixedSchedule(teacher,effective,ranges,recordDates=[],sourceEffective=null){
 if(!inOperatingPeriod(effective))throw Error('系统从 2026-10-20 开始记录，请选择该日或之后的日期。');
 const parsed=new Date(effective+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(effective)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==effective)throw Error('请选择有效日期');
 const source=(teacher.schedules||[]).find(s=>s.effective===sourceEffective);
 if(source&&source.effective!==effective){
  const lo=source.effective<effective?source.effective:effective,hi=source.effective>effective?source.effective:effective;
  if(recordDates.some(d=>d>=lo&&d<hi))throw Error('移动生效日期会影响已录入工资，请先核对已有记录。');
 }
 const existing=(teacher.schedules||[]).find(s=>s.effective===effective);
 const prior=source?JSON.parse(JSON.stringify(source)):null;
 const previousTeacher=JSON.parse(JSON.stringify(teacher));
 const nextVersion=[...(teacher.schedules||[])].filter(s=>s.effective>effective).sort((a,b)=>a.effective.localeCompare(b.effective))[0];
 if(!source&&recordDates.some(d=>d>=effective&&(!nextVersion||d<nextVersion.effective)))throw Error('该排班适用期间已有工资记录，请通过每日记录的异常调整，避免改动已录入工资。');
 for(let d=0;d<7;d++)slotsFor(ranges.filter(r=>Number(r.day)===d));
 const next={effective,ranges:JSON.parse(JSON.stringify(ranges))};
 if(source&&source.effective!==effective){
  if(clampStart(source.effective)===teacherStartDate(teacher))teacher.scheduleStart=effective;
  teacher.scheduleAudit??=[];teacher.scheduleAudit.push({...JSON.parse(JSON.stringify(source)),movedTo:effective});
  teacher.schedules=teacher.schedules.filter(s=>s!==source);
 }
 if(!(teacher.schedules||[]).length&&!teacher.scheduleStart)teacher.scheduleStart=effective;
 if(existing){teacher.scheduleAudit??=[];teacher.scheduleAudit.push(JSON.parse(JSON.stringify(existing)));teacher.schedules[teacher.schedules.indexOf(existing)]=next;}
 else{teacher.schedules??=[];teacher.schedules.push(next);}
 // Edits to a saved weekday also update later templates still inheriting the old hours.
 // An explicitly different later weekday remains an independent planned change.
 if(prior&&sourceEffective===effective){
  const changedDays=Array.from({length:7},(_,day)=>day).filter(day=>daySignature(prior.ranges,day)!==daySignature(ranges,day));
  const blockedDays=new Set();
  for(const later of teacher.schedules.filter(s=>s.effective>effective).sort((a,b)=>a.effective.localeCompare(b.effective))){
   const inherited=changedDays.filter(day=>!blockedDays.has(day)&&daySignature(later.ranges,day)===daySignature(prior.ranges,day));
   for(const day of changedDays)if(!inherited.includes(day))blockedDays.add(day);
   if(!inherited.length)continue;
   teacher.scheduleAudit??=[];teacher.scheduleAudit.push({...JSON.parse(JSON.stringify(later)),updatedFrom:effective});
   later.ranges=[...later.ranges.filter(r=>!inherited.includes(Number(r.day))),...ranges.filter(r=>inherited.includes(Number(r.day))).map(r=>({...r}))];
  }
  if(recordDates.some(d=>JSON.stringify(slotsFor(scheduleFor(previousTeacher,d)))!==JSON.stringify(slotsFor(scheduleFor(teacher,d)))))throw Error('该排班适用期间已有工资记录，请通过每日记录的异常调整，避免改动已录入工资。');
 }
 teacher.lastScheduleEffective=effective;
}
export function effectiveSlots(teacher,date,exceptions=[]){if(!teacherHasStarted(teacher,date))return [];const s=new Set(slotsFor(scheduleFor(teacher,date)));for(const e of exceptions.filter(e=>e.kind==='add'))for(const m of slotsFor([e]))s.add(m);for(const e of exceptions.filter(e=>e.kind!=='add'))for(const m of slotsFor([e]))s.delete(m);return [...s].sort((a,b)=>a-b);}
export const payModeLabel = mode => mode==='hourly'?'按开放时长':'按 slot 完课与补偿';
export function calculate(teacher,date,record={}){
 if(!teacherHasStarted(teacher,date))return {excluded:true,payMode:teacher.payMode||'slot',paidHours:0,hourlyPay:0,slots:[],completed:0,remaining:0,halfPaySlots:0,slotRate:0,lesson:0,compensation:0,bonusHours:0,bonus:0,adjustments:0,total:0};
 if(!Number.isFinite(teacher.rate)||teacher.rate<=0||!['EGP','JOD'].includes(teacher.currency))throw Error('请先补充老师时薪和币种');
 const payMode=teacher.payMode||'slot';
 if(!['slot','hourly'].includes(payMode))throw Error('计薪方式无效');
 const slots=effectiveSlots(teacher,date,record.exceptions||[]);
 const completed=Number(record.completed??0);
 if(!Number.isInteger(completed)||completed<0||completed>slots.length)throw Error(`完课数必须为 0–${slots.length} 的整数`);
 const slotRate=Math.round(teacher.rate*1000/2),remaining=slots.length-completed;
 const lesson=payMode==='slot'?completed*slotRate:0;
 const compensation=payMode==='slot'?Math.round(remaining*slotRate/2):0;
 const hourlyPay=payMode==='hourly'?slots.length*slotRate:0;
 const paidHours=payMode==='hourly'?slots.length/2:0;
 const evening=slots.filter(m=>m>=1020&&m<1260);
 let streak=0,prev=-999,bonusHours=0;
 for(const m of evening){if(m===prev+30)streak++;else{bonusHours+=Math.floor(streak/2);streak=1;}prev=m;}
 bonusHours+=Math.floor(streak/2);
 if(teacher.currency!=='EGP'||payMode==='hourly')bonusHours=0;
 const bonus=bonusHours*100000;
 const adjustments=(record.adjustments||[]).reduce((s,a)=>s+Math.round(a.amount*1000),0);
 return {payMode,paidHours,hourlyPay:hourlyPay/1000,slots,completed,remaining,halfPaySlots:payMode==='slot'?remaining:0,slotRate:slotRate/1000,lesson:lesson/1000,compensation:compensation/1000,bonusHours,bonus:bonus/1000,adjustments:adjustments/1000,total:(lesson+compensation+hourlyPay+bonus+adjustments)/1000};
}
export function datesBetween(start,end){if(!start||!end||start>end)throw Error('请选择有效日期范围');const days=[];for(let d=new Date(start+'T12:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1)){if(days.length>=366)throw Error('一次最多统计 366 天');days.push(d.toISOString().slice(0,10));}return days;}
export function payrollDates(start,end){return datesBetween(start,end).filter(inOperatingPeriod);}
