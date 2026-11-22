import {calculate,effectiveSlots,datesBetween,payModeLabel} from './payroll.js';
import {inOperatingPeriod} from './operating-period.js';
import {conversionBonusFor,periodConversionBonus} from './conversion-bonus.js';
import {teacherLabel} from './teachers.js';
import {formatTime} from './time-format.js';
import {otherSalaryForDay} from './other-salary.js';
import {payrollConversionOverride} from './payroll-conversion-override.js';
const financialKeys=['lesson','compensation','hourlyPay','paidHours','bonus','adjustments','total'];
export function salaryForDay(data,teacher,date,record=data.records?.[`${teacher.id}:${date}`],convertedOverride){
 const hasPayrollRecord=!!record&&inOperatingPeriod(date);
 let base;
 if(hasPayrollRecord)base=calculate(teacher,date,record);
 else{
  const slots=effectiveSlots(teacher,date,record?.exceptions||[]);
  base={payMode:teacher.payMode||'slot',slots,completed:0,remaining:slots.length,halfPaySlots:0,slotRate:teacher.rate/2,bonusHours:0,...Object.fromEntries(financialKeys.map(key=>[key,0]))};
 }
 const reward=conversionBonusFor(data,teacher,date,convertedOverride);
 const extra=otherSalaryForDay(data,teacher.id,date);
 return {...base,...reward,...extra,baseTotal:base.total,total:Math.round(base.total*1000+reward.conversionBonus*1000+extra.other*1000)/1000,hasPayrollRecord};
}
export function buildPayrollReport(data,start,end){
 const days=datesBetween(start,end);
 return data.teachers.map(teacher=>{
  const items=days.flatMap(date=>{
   const record=data.records?.[`${teacher.id}:${date}`],converted=Number(data.conversions?.[`${teacher.id}:${date}`]?.converted||0);
   const extra=otherSalaryForDay(data,teacher.id,date);
   if((!record||!inOperatingPeriod(date))&&!converted&&!extra.otherEntries.length)return [];
   // Preserve existing invalid-record handling while retaining independently earned purchase bonuses.
   let pay;try{pay=salaryForDay(data,teacher,date,record);}catch{pay=salaryForDay(data,teacher,date,null);}
   if(!pay.hasPayrollRecord&&!pay.conversionBonus&&!pay.converted&&!pay.otherEntries.length)return [];
   return [{date,...pay}];
  });
  const sourceConverted=items.reduce((sum,item)=>sum+item.converted,0);
  const override=payrollConversionOverride(data,teacher.id,start,end);
  const periodReward=periodConversionBonus(data,teacher,end,override?.converted??sourceConverted);
  if(override||periodReward.conversionBonusMultiplier===2&&periodReward.conversionBonus>0){
   const currentBonus=items.reduce((sum,item)=>sum+Math.round(item.conversionBonus*1000),0)/1000;
   const reward=periodReward;
   const difference=Math.round(reward.conversionBonus*1000-currentBonus*1000)/1000;
   // This is a payroll-only reconciliation line; daily purchases and conversion analytics stay untouched.
   items.push({date:end,payMode:teacher.payMode||'slot',slots:[],completed:0,remaining:0,halfPaySlots:0,slotRate:teacher.rate/2,bonusHours:0,...Object.fromEntries(financialKeys.map(key=>[key,0])),converted:reward.converted-sourceConverted,conversionBonusRate:reward.conversionBonusRate,conversionBonusOption:reward.conversionBonusOption,conversionBonus:difference,conversionBonusMultiplier:reward.conversionBonusMultiplier,total:difference,baseTotal:0,hasPayrollRecord:false,other:0,otherEntries:[],payrollConversionAdjustment:{start,end,original:sourceConverted,converted:reward.converted,multiplier:reward.conversionBonusMultiplier,countChanged:!!override}});
  }
  const sums=Object.fromEntries([...financialKeys,'completed','converted','conversionBonus','other'].map(key=>[key,items.reduce((sum,item)=>sum+Math.round(item[key]*1000),0)/1000]));
  return {teacher,items,sourceConverted,conversionBonusRate:periodReward.conversionBonusRate,conversionBonusMultiplier:periodReward.conversionBonusMultiplier,conversionCountManuallySet:!!override,days:items.filter(item=>item.hasPayrollRecord).length,otherEntries:items.flatMap(item=>item.otherEntries),...sums};
 });
}
export function payrollExportRows(report,records){
 const summary=report.map(r=>({'老师':teacherLabel(r.teacher),'科目':r.teacher.subject,'币种':r.teacher.currency,'计薪方式':payModeLabel(r.teacher.payMode),'计薪小时':r.paidHours,'时长工资':r.hourlyPay,'已录入天数':r.days,'完课数':r.completed,'转化人数':r.converted,'原始转化人数':r.sourceConverted,'计奖人数来源':r.conversionCountManuallySet?'人工设置':'原始数据','完课工资':r.lesson,'半薪补偿':r.compensation,'晚间奖励':r.bonus,'转化奖励':r.conversionBonus,'转化奖励倍率':r.conversionBonusMultiplier,'人工调整':r.adjustments,'其他':r.other,'其他备注':(r.otherEntries||[]).map(e=>`${e.date} ${e.amount} ${e.currency}${e.reason?' · '+e.reason:''}`).join('；'),'合计':r.total}));
 const details=report.flatMap(r=>r.items.map(x=>({'日期':x.date,'老师':teacherLabel(r.teacher),'币种':r.teacher.currency,'排班来源':x.payrollConversionAdjustment?(x.payrollConversionAdjustment.countChanged?'工资周期转化人数调整':'转化奖励翻倍补差'):r.teacher.dateSchedules?.[x.date]?'指定日期排班':'固定模板','排班备注':x.payrollConversionAdjustment?`${x.payrollConversionAdjustment.start} — ${x.payrollConversionAdjustment.end}: ${x.payrollConversionAdjustment.original} → ${x.payrollConversionAdjustment.converted}${x.payrollConversionAdjustment.multiplier===2?' (×2)':''}`:r.teacher.dateSchedules?.[x.date]?.reason||'','有效slot':x.slots.length,'完课':x.completed,'计薪方式':payModeLabel(x.payMode),'计薪小时':x.paidHours,'时长工资':x.hourlyPay,'半薪slot':x.halfPaySlots,'奖励小时':x.bonusHours,'完课工资':x.lesson,'半薪补偿':x.compensation,'晚间奖励':x.bonus,'转化人数':x.converted,'每人转化奖励':x.conversionBonusRate,'转化奖励':x.conversionBonus,'转化奖励倍率':x.conversionBonusMultiplier||1,'人工调整':x.adjustments,'其他':x.other,'其他备注':(x.otherEntries||[]).map(e=>`${e.amount} ${e.currency}${e.reason?' · '+e.reason:''}`).join('；'),'总计':x.total,'异常原因':x.payrollConversionAdjustment?'':(records?.[`${r.teacher.id}:${x.date}`]?.exceptions||[]).map(e=>`${e.kind} ${formatTime(e.start)}–${formatTime(e.end)} ${e.reason}`).join('；'),'调整原因':x.payrollConversionAdjustment?'':(records?.[`${r.teacher.id}:${x.date}`]?.adjustments||[]).map(a=>`${a.amount} ${a.reason}`).join('；')})));
 return {summary,details};
}
