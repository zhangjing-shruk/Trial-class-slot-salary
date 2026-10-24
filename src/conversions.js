import {START_DATE} from './operating-period.js';
import {datesBetween} from './payroll.js';
import {activeTeachers,teacherLabel} from './teachers.js';
export function conversionDay(data,teacherId,date){
 const key=`${teacherId}:${date}`,entry=data.conversions?.[key];
 const completed=Number(date<START_DATE?entry?.completed??0:data.records?.[key]?.completed??0);
 const converted=Number(entry?.converted??0);
 return {date,completed,converted,rate:completed>0?converted/completed:null,recorded:!!entry||!!data.records?.[key]};
}
export function validateConversion(completed,converted){
 if(completed===''||converted===''||completed===null||converted===null||![completed,converted].every(n=>Number.isSafeInteger(Number(n))&&Number(n)>=0))throw Error('完课数和转化数必须为非负整数。');
}
export function saveConversion(data,teacherId,date,completed,converted){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('请选择有效日期。');
 if(!activeTeachers(data).some(t=>t.id===teacherId))throw Error('老师档案不存在或已删除。');
 const actual=date<START_DATE?completed:conversionDay(data,teacherId,date).completed;
 validateConversion(actual,converted);
 data.conversions??={};
 data.conversions[`${teacherId}:${date}`]={converted:Number(converted),...(date<START_DATE?{completed:Number(actual)}:{})};
}
export function conversionRows(data,start,end,{subject='',search='',sort='rate'}={}){
 const days=datesBetween(start,end),needle=search.trim().toLowerCase();
 const rows=activeTeachers(data).filter(t=>(!subject||t.subject===subject)&&teacherLabel(t).toLowerCase().includes(needle)).map(teacher=>{
  const items=days.map(d=>conversionDay(data,teacher.id,d));
  const completed=items.reduce((sum,d)=>sum+d.completed,0),converted=items.reduce((sum,d)=>sum+d.converted,0);
  return {teacher,completed,converted,rate:completed>0?converted/completed:null,items};
 });
 return rows.sort((a,b)=>(b[sort]??-1)-(a[sort]??-1)||teacherLabel(a.teacher).localeCompare(teacherLabel(b.teacher)));
}

export function conversionPeriod(anchor,mode='month',offset=0){
 const date=new Date(anchor+'T12:00:00Z');
 if(mode==='week'){
  date.setUTCDate(date.getUTCDate()-date.getUTCDay()+offset*7);
  const start=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+6);
  return [start,date.toISOString().slice(0,10)];
 }
 date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+offset);
 const start=date.toISOString().slice(0,10);date.setUTCMonth(date.getUTCMonth()+1,0);
 return [start,date.toISOString().slice(0,10)];
}
export const rateChange=(current,previous)=>current===null||previous===null?null:(current-previous)*100;
export function compareConversions(data,anchor,mode,options={}){
 const current=conversionRows(data,...conversionPeriod(anchor,mode),options);
 const previous=new Map(conversionRows(data,...conversionPeriod(anchor,mode,-1),options).map(r=>[r.teacher.id,r]));
 return current.map(r=>({...r,previous:previous.get(r.teacher.id),change:rateChange(r.rate,previous.get(r.teacher.id)?.rate??null)}));
}
