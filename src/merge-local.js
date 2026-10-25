import {teacherLabel} from './teachers.js';
import {seed,applyConfirmedPayRules} from './import-data.js';
import {START_DATE} from './operating-period.js';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=x=>JSON.parse(JSON.stringify(x));
export function mergeLocalChanges(local,remote){
 const baseline={teachers:clone(seed.teachers)};applyConfirmedPayRules(baseline);
 const result=clone(remote),conflicts=[];let changed=0;
 for(const teacher of local.teachers||[]){
  if(teacher.id==='demo-zhang')continue;
  const base=baseline.teachers.find(t=>t.id===teacher.id);
  const target=result.teachers.find(t=>t.id===teacher.id);
  if(target?.deletedAt||teacher.deletedAt)continue;
  if(!target){if(!base||!equal(teacher,base)){result.teachers.push(clone(teacher));changed++;}continue;}
  for(const field of ['name','teacherId','scheduleStart','gender','subject','rate','currency','payMode','schedules','dateSchedules']){
   const value=teacher[field];if(value===undefined||equal(value,base?.[field])||equal(value,target[field]))continue;
   if(equal(target[field],base?.[field])){target[field]=clone(value);changed++;}
   else conflicts.push({teacher:teacherLabel(teacher),field,local:value,shared:target[field]});
  }
 }
 for(const [key,value]of Object.entries(local.records||{})){
  if(key.slice(-10)<START_DATE)continue;
  if(key.startsWith('demo-zhang:'))continue;
  if(result.records[key]===undefined){result.records[key]=clone(value);changed++;}
  else if(!equal(value,result.records[key]))conflicts.push({teacher:key,field:'dailyRecord',local:value,shared:result.records[key]});
 }
 return {data:result,conflicts,changed};
}
