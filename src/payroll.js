export const WEEKDAYS = ['周日','周一','周二','周三','周四','周五','周六'];
export const cairoToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const weekday = d => new Date(`${d}T12:00:00Z`).getUTCDay();
export const minutes = t => { if(!/^\d{2}:\d{2}$/.test(t)) throw Error('时间格式无效'); const [h,m]=t.split(':').map(Number); if(h>24||m>59||(h===24&&m!==0))throw Error('时间无效');return h*60+m; };
export const clock = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export function slotsFor(ranges){const s=new Set();for(const r of ranges){const a=minutes(r.start),b=minutes(r.end);if(a%30||b%30||b<=a)throw Error('时间须为整点或半点，且结束晚于开始');for(let n=a;n<b;n+=30){if(s.has(n))throw Error('时间段不能重叠');s.add(n);}}return [...s].sort((a,b)=>a-b);}
export function fixedScheduleFor(teacher,date){return [...(teacher.schedules||[])].filter(s=>s.effective<=date).sort((a,b)=>b.effective.localeCompare(a.effective))[0]?.ranges.filter(r=>Number(r.day)===weekday(date))||[];}
export function scheduleFor(teacher,date){return teacher.dateSchedules?.[date]?.ranges ?? fixedScheduleFor(teacher,date);}
export function saveDateSchedule(teacher,date,ranges,reason,hasDailyRecord=false){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date+'T12:00:00Z').getTime()))throw Error('请选择有效日期');
 if(hasDailyRecord)throw Error('该日期已录入工资，请在每日记录中通过异常调整时间，以保留原始排班');
 if(!reason.trim())throw Error('请填写排班备注');
 slotsFor(ranges);
 teacher.dateSchedules??={};teacher.dateSchedules[date]={ranges:ranges.map(r=>({start:r.start,end:r.end})),reason:reason.trim()};
}
export function saveFixedSchedule(teacher,effective,ranges,recordDates=[]){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(effective))throw Error('请选择生效日期');
 const latest=[...(teacher.schedules||[])].sort((a,b)=>b.effective.localeCompare(a.effective))[0];
 if(latest&&effective<latest.effective)throw Error(`生效日不能早于最新版本 ${latest.effective}`);
 if(recordDates.some(d=>d>=effective))throw Error('生效日期涉及已录入的工资记录，请选择这些记录之后的日期');
 for(let d=0;d<7;d++)slotsFor(ranges.filter(r=>Number(r.day)===d));
 const next={effective,ranges:JSON.parse(JSON.stringify(ranges))};
 if(latest?.effective===effective){teacher.scheduleAudit??=[];teacher.scheduleAudit.push(JSON.parse(JSON.stringify(latest)));teacher.schedules[teacher.schedules.indexOf(latest)]=next;}
 else{teacher.schedules??=[];teacher.schedules.push(next);}
}
export function effectiveSlots(teacher,date,exceptions=[]){const s=new Set(slotsFor(scheduleFor(teacher,date)));for(const e of exceptions.filter(e=>e.kind==='add'))for(const m of slotsFor([e]))s.add(m);for(const e of exceptions.filter(e=>e.kind!=='add'))for(const m of slotsFor([e]))s.delete(m);return [...s].sort((a,b)=>a-b);}
export const payModeLabel = mode => mode==='hourly'?'按开放时长':'按 slot 完课与补偿';
export function calculate(teacher,date,record={}){
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
