export const SUMMARY_SUBJECTS=['英语','数学','阿拉伯语'];
// Use the very same effective-slot sets shown by the timetable, counting each teacher separately.
export function summarizeSubjectSlots(teachers,daySlots){
 const rows=SUMMARY_SUBJECTS.map(subject=>{
  const members=teachers.filter(t=>t.subject===subject&&!t.deletedAt);
  const daily=daySlots.map(slots=>members.reduce((sum,t)=>sum+(slots.get(t.id)?.size||0),0));
  return {subject,daily,total:daily.reduce((sum,n)=>sum+n,0)};
 });
 const daily=daySlots.map((_,i)=>rows.reduce((sum,r)=>sum+r.daily[i],0));
 return {rows,daily,total:daily.reduce((sum,n)=>sum+n,0)};
}
