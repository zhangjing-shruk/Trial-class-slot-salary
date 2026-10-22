import {minutes} from './payroll.js';
export function formatTime(value){
 if(value===null||value===undefined||value==='')return '—';
 const total=typeof value==='number'?value:minutes(value);
 const hour=Math.floor(total/60)%24,minute=total%60;
 return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}${total===1440?' (+1 day)':''}`;
}
export function formatTimeText(value){
 if(typeof value!=='string')return value;
 return value.replace(/\b([01]?\d|2[0-4]):([0-5]\d)(?!\d|:\d|\s*(?:AM|PM)\b)/gi,(full,h,m)=>Number(h)===24&&m!=='00'?full:formatTime(Number(h)*60+Number(m)));
}
