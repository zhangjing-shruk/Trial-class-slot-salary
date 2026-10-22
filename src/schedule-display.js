import {scheduleFor,slotsFor,effectiveSlots,clock} from './payroll.js';
export function scheduleBlocks(teacher,date,record={}){
 const base=new Set(slotsFor(scheduleFor(teacher,date)));
 const added=new Set((record.exceptions||[]).filter(e=>e.kind==='add').flatMap(e=>slotsFor([e])));
 const override=Boolean(teacher.dateSchedules?.[date]);
 const blocks=[];
 for(const m of effectiveSlots(teacher,date,record.exceptions||[])){
  const kind=override||(!base.has(m)&&added.has(m))?'TEM':'FIX';
  const last=blocks.at(-1);
  if(last&&last.kind===kind&&last.end===clock(m))last.end=clock(m+30);
  else blocks.push({start:clock(m),end:clock(m+30),kind});
 }
 return blocks;
}
