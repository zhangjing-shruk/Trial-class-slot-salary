import {ref,watchEffect} from 'vue';
import {translate} from './translations.js';
import {formatTimeText} from './time-format.js';
let stored='zh';try{stored=localStorage.getItem('slot-salary-language')||'zh';}catch{}
export const locale=ref(stored==='en'?'en':'zh');
export const tr=value=>formatTimeText(translate(value,locale.value));
export function setLanguage(value){locale.value=value==='en'?'en':'zh';try{localStorage.setItem('slot-salary-language',locale.value);}catch{}}
export const subjectValue=value=>({'English':'英语','Math':'数学','Arabic':'阿拉伯语'}[value]||value);
watchEffect(()=>{if(typeof document==='undefined')return;document.documentElement.lang=locale.value==='en'?'en':'zh-CN';document.title=locale.value==='en'?'Slot Ledger · Trial Lesson Scheduling & Payroll':'课时簿 · 体验课排班与薪资';});
