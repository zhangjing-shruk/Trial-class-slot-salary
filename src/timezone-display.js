import {formatTime} from './time-format.js';
const offsets=new Map();
function offsetFor(timeZone,date){
 const name=new Intl.DateTimeFormat('en-US',{timeZone,timeZoneName:'longOffset'}).formatToParts(new Date(`${date}T12:00:00Z`)).find(p=>p.type==='timeZoneName').value;
 if(name==='GMT'||name==='UTC')return 0;
 const match=name.match(/GMT([+-])(\d{2}):(\d{2})/);
 if(!match)throw Error('Unsupported time zone offset');
 return (match[1]==='+'?1:-1)*(Number(match[2])*60+Number(match[3]));
}
// Display-only conversion: availability and payroll keep their unchanged Cairo wall-clock values.
export function saudiOffsetMinutes(date){
 if(!offsets.has(date))offsets.set(date,offsetFor('Asia/Riyadh',date)-offsetFor('Africa/Cairo',date));
 return offsets.get(date);
}
export function saudiClock(date,cairoMinutes,language='zh'){
 const total=cairoMinutes+saudiOffsetMinutes(date),day=Math.floor(total/1440),minute=((total%1440)+1440)%1440;
 return formatTime(minute)+(day>0?(language==='en'?' (+1 day)':'（次日）'):day<0?(language==='en'?' (-1 day)':'（前日）'):'');
}
