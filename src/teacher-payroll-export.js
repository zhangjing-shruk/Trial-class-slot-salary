import {datesBetween,WEEKDAYS,weekday,scheduleFor,slotsFor,effectiveSlots,teacherHasStarted,payModeLabel} from './payroll.js';
import {salaryForDay,buildPayrollReport,payrollExportRows} from './payroll-report.js';
import {scheduleBlocks} from './schedule-display.js';
import {teacherLabel} from './teachers.js';
import {formatTime} from './time-format.js';
import {saudiClock} from './timezone-display.js';
import {translate} from './translations.js';
const removalName=kind=>({leave:'请假移除',absent:'缺席移除',late:'异常移除',other:'异常移除'}[kind]||'异常移除');
export function teacherPayrollExport(data,teacherId,start,end,language='zh'){
 const teacher=data.teachers.find(t=>t.id===teacherId);if(!teacher)throw Error('老师档案不存在或已删除。');
 const en=language==='en';
 const dates=datesBetween(start,end),report=buildPayrollReport({...data,teachers:[teacher]},start,end)[0];
 const label=teacherLabel(teacher),daily=[],slots=[];
 for(const date of dates){
  const record=data.records?.[`${teacherId}:${date}`];let pay,issue='';
  try{pay=salaryForDay(data,teacher,date,record);}catch(error){issue=error.message;pay=salaryForDay(data,teacher,date,null);}
  const opened=effectiveSlots(teacher,date,record?.exceptions||[]);
  const base=scheduleFor(teacher,date),blocks=scheduleBlocks(teacher,date,record||{});
  daily.push({'日期':date,'星期':WEEKDAYS[weekday(date)],'老师':label,'币种':teacher.currency||'',
   '工资记录状态':issue?'记录待核对':pay.hasPayrollRecord?'已录入课时工资':'未录入课时工资',
   '计薪方式':payModeLabel(teacher.payMode),'原排班时段':base.map(r=>`${formatTime(r.start)}–${formatTime(r.end)}`).join('；'),
   '有效开放时段':blocks.map(r=>`${formatTime(r.start)}–${formatTime(r.end)} ${r.kind}`).join('；'),'原排班slot数':slotsFor(base).length,'有效开放slot数':opened.length,'有效开放小时':opened.length/2,
   '完课数':pay.hasPayrollRecord?pay.completed:'','半薪slot数':pay.hasPayrollRecord?pay.halfPaySlots:'','时薪':teacher.rate||'',
   'slot全薪单价':teacher.rate?teacher.rate/2:'','slot半薪单价':teacher.payMode==='hourly'?'不适用':teacher.rate?teacher.rate/4:'',
   '计薪小时':pay.paidHours,'晚间奖励小时':pay.bonusHours,'完课工资':pay.lesson,'时长工资':pay.hourlyPay,'半薪补偿':pay.compensation,'晚间奖励':pay.bonus,
   '原始付费转化人数':pay.converted,'周期计奖人数调整':0,'转化奖励':pay.conversionBonus,'人工调整':pay.adjustments,'其他':pay.other,'总计':pay.total,
   '排班备注':teacher.dateSchedules?.[date]?.reason||'',
   '时间异常及原因':(record?.exceptions||[]).map(e=>`${en?({add:'Extra opening',leave:'Leave',absent:'Absence',late:'Removed',other:'Removed'}[e.kind]||e.kind):e.kind==='add'?'临时加时':removalName(e.kind)} ${formatTime(e.start)}–${formatTime(e.end)} ${e.reason||''}`).join('；'),
   '人工调整备注':(record?.adjustments||[]).map(e=>`${e.amount} ${e.reason||''}`).join('；'),
   '其他备注':pay.otherEntries.map(e=>`${e.amount} ${e.currency} ${e.reason||''}`).join('；'),'核对提示':issue?translate(issue,language):!pay.hasPayrollRecord?(en?'No lesson-pay record; completions are not confirmed as zero. No lesson wages were automatically added.':'未录入不代表已确认零完课；未自动计算课时工资。'):''});
  if(!teacherHasStarted(teacher,date))continue;
  const baseSet=new Set(slotsFor(base)),added=new Set((record?.exceptions||[]).filter(e=>e.kind==='add').flatMap(e=>slotsFor([e]))),effective=new Set(opened);
  for(const time of [...new Set([...baseSet,...added])].sort((a,b)=>a-b)){
   const affecting=(record?.exceptions||[]).filter(e=>slotsFor([e]).includes(time));
   slots.push({'日期':date,'星期':WEEKDAYS[weekday(date)],'老师':label,
    '开罗开始时间':formatTime(time),'开罗结束时间':formatTime(time+30),'沙特开始时间':saudiClock(date,time,language),'沙特结束时间':saudiClock(date,time+30,language),
    '排班来源':baseSet.has(time)?teacher.dateSchedules?.[date]?'指定日期排班':'固定模板':'临时加时',
    'slot状态':effective.has(time)?'有效开放':affecting.filter(e=>e.kind!=='add').map(e=>removalName(e.kind)).join(' / ')||'已移除',
    '有效slot数':effective.has(time)?1:0,'异常备注':affecting.map(e=>e.reason||'').filter(Boolean).join('；')});
  }
 }
 for(const adjustment of report.items.filter(item=>item.payrollConversionAdjustment)){
  const context=adjustment.payrollConversionAdjustment;
  daily.push({'日期':`${start} — ${end}`,'星期':'周期调整','老师':label,'币种':teacher.currency||'','工资记录状态':'周期奖金调整（非当日课时工资）',
   '有效开放slot数':0,'完课工资':0,'时长工资':0,'半薪补偿':0,'晚间奖励':0,'原始付费转化人数':0,'周期计奖人数调整':adjustment.converted,
   '转化奖励':adjustment.conversionBonus,'人工调整':0,'其他':0,'总计':adjustment.total,
   '核对提示':en?`Original conversions: ${context.original}; payroll count: ${context.converted}; multiplier: ${context.multiplier||1}. Period bonus reconciliation, not a day's lesson wages.`:`原始转化 ${context.original}；本周期计奖 ${context.converted}；奖励倍率 ×${context.multiplier||1}。仅为周期奖励差额，不属于某日课时工资。`});
 }
 const {summary}=payrollExportRows([report],data.records);
 const overview=[{'工资周期':`${start} — ${end}`,...summary[0],
  '有效开放slot总数':daily.reduce((n,row)=>n+(row['有效开放slot数']||0),0),
  '核对说明':en?'All schedules use Cairo local time. Unrecorded days earn no automatic lesson wages. Period bonus adjustments are listed separately. Slot rows show openings or removals, not individual lesson completion: only daily completed totals are recorded. Please identify the exact disputed date, slot count and amount.':'排班和时段按开罗当地时间保存。未录入日期不自动计算课时工资。周期奖励调整单独列示。slot表仅表示开放/移除状态，不表示具体哪一格已完课，系统只记录每日完课总数。请核对具体日期、slot数量及差额。'}];
 if(!en)return {summary:overview,daily,slots};
 const labels={'周期汇总':'Period summary','工资周期':'Payroll period','日期':'Date','星期':'Weekday','老师':'Teacher','工资记录状态':'Payroll record status','原排班时段':'Base opening times','有效开放时段':'Effective opening times','原排班slot数':'Base slots','有效开放slot数':'Effective slots','有效开放小时':'Effective open hours','半薪slot数':'Half-pay slots','slot全薪单价':'Full slot rate','slot半薪单价':'Half slot rate','晚间奖励小时':'Evening bonus hours','原始付费转化人数':'Original paying students','周期计奖人数调整':'Period conversion count adjustment','时间异常及原因':'Time exceptions and reasons','人工调整备注':'Manual adjustment notes','核对提示':'Reconciliation note','核对说明':'How to reconcile','有效开放slot总数':'Total effective slots','开罗开始时间':'Cairo start','开罗结束时间':'Cairo end','沙特开始时间':'Saudi start','沙特结束时间':'Saudi end','slot状态':'Slot status','有效slot数':'Effective slot count','异常备注':'Exception notes','原排班':'Base schedule','已录入课时工资':'Lesson wages recorded','未录入课时工资':'No lesson wage record','记录待核对':'Review record','周期调整':'Period adjustment','周期奖金调整（非当日课时工资）':'Period bonus adjustment (not daily lesson pay)','有效开放':'Effective opening','请假移除':'Removed: leave','缺席移除':'Removed: absence','异常移除':'Removed: exception','已移除':'Removed','不适用':'Not applicable'};
 const enums=['星期','工资记录状态','计薪方式','排班来源','slot状态','科目','计奖人数来源'];
 const localize=rows=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[labels[key]||translate(key,'en'),enums.includes(key)&&typeof value==='string'?value.split(' / ').map(part=>labels[part]||translate(part,'en')).join(' / '):value])));
 return {summary:localize(overview),daily:localize(daily),slots:localize(slots)};
}

// One teacher, one worksheet, one calendar day per row; period-only reconciliation follows the dates.
export function singleTeacherPayrollTable(data,teacherId,start,end,language='zh'){
 const source=teacherPayrollExport(data,teacherId,start,end),en=language==='en';
 const columns={'日期':'Date','星期':'Weekday','有效开放时段':'Open times (Cairo)','有效开放slot数':'Open slots','完课数':'Completed lessons','半薪slot数':'Half-pay slots','原始付费转化人数':'Converted students','周期计奖人数调整':'Period conversion adjustment','完课工资':'Completed lesson pay','时长工资':'Hourly pay','半薪补偿':'Half-pay compensation','晚间奖励':'Evening bonus','转化奖励':'Conversion bonus','人工调整':'Manual adjustments','其他':'Other','总计':'Total salary','工资记录状态':'Record status','备注':'Notes'};
 const rows=source.daily.map(row=>{
  const notes=['排班备注','时间异常及原因','人工调整备注','其他备注','核对提示'].map(key=>row[key]?`${en?({'排班备注':'Schedule','时间异常及原因':'Time exceptions','人工调整备注':'Manual adjustments','其他备注':'Other','核对提示':'Reconciliation'}[key]):key}: ${row[key]}`:'').filter(Boolean).join('；');
  return Object.fromEntries(Object.keys(columns).map(key=>[key,key==='备注'?notes:row[key]??'']));
 });
 const total={'日期':en?'TOTAL':'合计','备注':en?'Period adjustments are listed separately above; unrecorded days are not confirmed zero-completion days.':'周期奖励调整已单独列在日期记录之后；未录入日期不代表已确认零完课。'};
 for(const key of Object.keys(columns).slice(3,16))total[key]=rows.reduce((sum,row)=>sum+Math.round(Number(row[key]||0)*1000),0)/1000;
 rows.push(total);
 if(en){
  // Use the existing English daily report for statuses and user-facing generated explanations.
  const localized=teacherPayrollExport(data,teacherId,start,end,'en').daily;
  rows.forEach((row,i)=>{if(i<localized.length){row['星期']=localized[i]['Weekday'];row['工资记录状态']=localized[i]['Payroll record status'];const parts=['Schedule note','Time exceptions and reasons','Manual adjustment notes','Other notes','Reconciliation note'].map(key=>localized[i][key]).filter(Boolean);row['备注']=parts.join('; ');}});
 }
 return {teacher:source.summary[0]['老师'],currency:source.summary[0]['币种'],period:`${start} — ${end}`,rows:en?rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[columns[key]||key,value]))):rows};
}
