<script setup>
import {ref,computed} from 'vue';
import {tr,locale} from './i18n.js';
import {cairoToday,weekday} from './payroll.js';
import {teacherLabel} from './teachers.js';
import {compareConversions,conversionPeriod,rateChange} from './conversions.js';
import {conversionImage} from './conversion-image.js';
const props=defineProps({data:Object});
const emit=defineEmits(['edit']);
const mode=ref('month'),anchor=ref(cairoToday()),subject=ref(''),search=ref(''),sort=ref('rate');
const copy=(zh,en)=>locale.value==='en'?en:zh;
const add=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const bounds=computed(()=>conversionPeriod(anchor.value||cairoToday(),mode.value));
const previousBounds=computed(()=>conversionPeriod(anchor.value||cairoToday(),mode.value,-1));
const rows=computed(()=>compareConversions(props.data,anchor.value||cairoToday(),mode.value,{subject:subject.value,search:search.value,sort:sort.value}));
const previousTotals=computed(()=>rows.value.reduce((sum,r)=>({completed:sum.completed+r.previous.completed,converted:sum.converted+r.previous.converted}),{completed:0,converted:0}));
const previousLabel=computed(()=>copy(mode.value==='week'?'上周':'上月',mode.value==='week'?'Last week':'Last month'));
const exporting=ref(false),exportMessage=ref('');
const changeText=n=>n===null?copy('暂无对比','No comparison'):Math.abs(n)<0.05?copy('持平','Unchanged'):`${n>0?'↑ +':'↓ '}${n.toFixed(1)} ${copy('个百分点','pp')}`;
const changeClass=n=>n===null?'muted':Math.abs(n)<0.05?'trend-flat':n>0?'trend-up':'trend-down';
const overallChange=computed(()=>rateChange(totals.value.completed?totals.value.converted/totals.value.completed:null,previousTotals.value.completed?previousTotals.value.converted/previousTotals.value.completed:null));
async function exportReport(toClipboard=false){
 exporting.value=true;exportMessage.value='';
 try{
  const blob=await conversionImage({title:copy('体验课转化报告','Trial Conversion Report'),period:`${copy(mode.value==='week'?'本周':'本月',mode.value==='week'?'This week':'This month')}: ${bounds.value.join(' – ')}`,previousPeriod:`${previousLabel.value}: ${previousBounds.value.join(' – ')}`,scope:`${tr(subject.value||'全部科目')} · ${rows.value.length} ${copy('位老师','teachers')}${search.value?' · '+search.value:''}`,
   summary:[{label:copy('本期完课 / 付费人数','Completed / paying students'),value:`${totals.value.completed} / ${totals.value.converted}`},{label:copy('整体转化率','Overall conversion rate'),value:percent(totals.value.completed?totals.value.converted/totals.value.completed:null)},{label:copy('较上期转化率变化','Rate change from previous period'),value:changeText(overallChange.value)}],
   headers:[tr('老师'),tr('科目'),copy('完课数','Completed'),copy('付费人数','Paid'),copy('本期转化率','Current rate'),previousLabel.value+copy('转化率',' rate'),copy('转化率变化','Rate change'),copy('付费人数变化','Paid change')],
   rows:rows.value.map(r=>[teacherLabel(r.teacher),tr(r.teacher.subject),r.completed,r.converted,percent(r.rate),percent(r.previous.rate),{text:changeText(r.change),color:r.change===null?'#87928c':r.change>=0?'#176d54':'#c05042'},`${r.converted-r.previous.converted>0?'+':''}${r.converted-r.previous.converted}`]),
   notes:[copy('转化数按付费日期、完课数按体验课日期统计；无完课数据时转化率为 —，不计算升降。','Purchases use the payment date; completions use the trial date. No completions: —; no rate comparison.'),copy('对比完整自然周 / 月；尚未结束的周期数据会继续更新。生成日期：','Full calendar periods are compared; ongoing periods continue updating. Generated: ')+cairoToday()]});
  if(toClipboard){
   if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error(copy('当前浏览器不支持复制图片，请使用导出 PNG。','Clipboard images are not supported; use Export PNG.'));
   await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);exportMessage.value=copy('图片已复制，可直接粘贴到周报。','Image copied. Paste it into your report.');
  }else{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`trial-conversion-${mode.value}-${bounds.value[0]}-${bounds.value[1]}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);exportMessage.value=copy('PNG 已导出，包含当前筛选的全部老师和对比数据。','PNG exported with all filtered teachers and comparisons.');}
 }catch(error){exportMessage.value=error.message||copy('图片导出失败，请重试。','Image export failed. Please retry.');}finally{exporting.value=false;}
}
const totals=computed(()=>rows.value.reduce((sum,r)=>({completed:sum.completed+r.completed,converted:sum.converted+r.converted}),{completed:0,converted:0}));
const percent=n=>n===null?'—':(n*100).toFixed(1)+'%';
function shift(n){if(mode.value==='week'){anchor.value=add(anchor.value||cairoToday(),n*7);return;}const d=new Date((anchor.value||cairoToday()).slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);anchor.value=d.toISOString().slice(0,10);}
</script>
<template>
 <div class="board-controls"><div class="segmented"><button :class="{chosen:mode==='week'}" @click="mode='week'">{{tr('按周')}}</button><button :class="{chosen:mode==='month'}" @click="mode='month'">{{tr('按月')}}</button></div><button class="secondary" @click="shift(-1)">{{copy('上一期','Previous')}}</button><input type="date" v-model="anchor" :aria-label="copy('转化统计日期','Conversion report date')"/><button class="secondary" @click="shift(1)">{{copy('下一期','Next')}}</button><span class="muted">{{bounds[0]}} – {{bounds[1]}}</span><button class="primary" :disabled="exporting" @click="exportReport()">{{copy('导出 PNG 图片','Export PNG')}}</button><button class="secondary" :disabled="exporting" @click="exportReport(true)">{{copy('复制图片','Copy image')}}</button></div>
 <p v-if="exportMessage" role="status" class="info-bar">{{exportMessage}}</p>
 <div class="info-bar">{{copy('转化数按购买付费课当天统计，完课数按体验课当天统计。转化率 = 本期付费学员数 ÷ 本期体验课完课数，可能超过 100%。10 月 20 日前可手动补录完课数，不影响工资。每周从周日开始。','Conversions use the purchase date; completions use the trial date. Rate = purchases in this period ÷ completed trials in this period and may exceed 100%. Before October 20, completions are manual and do not affect pay. Weeks start on Sunday.')}}</div>
 <div class="report-cards conversion-stats"><article class="stat-card"><div class="stat-label">{{copy('体验课完课数','Completed trials')}}</div><div class="stat-number">{{totals.completed}}</div></article><article class="stat-card"><div class="stat-label">{{copy('转化付费学员数','Paying students')}}</div><div class="stat-number">{{totals.converted}}</div></article><article class="stat-card"><div class="stat-label">{{copy('整体转化率','Overall conversion rate')}}</div><div class="stat-number">{{percent(totals.completed?totals.converted/totals.completed:null)}}</div><p :class="changeClass(overallChange)">{{previousLabel}} {{percent(previousTotals.completed?previousTotals.converted/previousTotals.completed:null)}} · {{changeText(overallChange)}}</p></article></div>
 <p class="muted conversion-comparison-period">{{previousLabel}}：{{previousBounds[0]}} – {{previousBounds[1]}} · {{copy('按完整自然周 / 月对比；本期尚未结束时，数据会继续更新。','Full calendar periods; the current period may still be in progress.')}}</p><section class="panel"><div class="panel-title directory-header"><h2>{{copy('老师体验课转化','Trial conversions by teacher')}} <span>{{rows.length}}</span></h2><div class="directory-filters"><input type="search" v-model="search" :placeholder="copy('搜索老师姓名或 ID…','Search name or ID…')" :aria-label="copy('搜索转化老师','Search conversion teachers')"/><select v-model="subject" :aria-label="copy('转化科目筛选','Conversion subject filter')"><option value="">{{tr('全部科目')}}</option><option v-for="s in ['英语','阿拉伯语','数学']" :value="s">{{tr(s)}}</option></select><select v-model="sort" :aria-label="copy('转化排序','Conversion sort')"><option value="rate">{{copy('转化率：从高到低','Conversion rate: high to low')}}</option><option value="converted">{{copy('转化数：从高到低','Paying students: high to low')}}</option><option value="completed">{{copy('完课数：从高到低','Completed trials: high to low')}}</option></select></div></div>
 <div class="table-scroll"><table><thead><tr><th>{{tr('老师')}}</th><th>{{tr('科目')}}</th><th>{{copy('体验课完课数','Completed trials')}}</th><th>{{copy('转化付费学员数','Paying students')}}</th><th>{{copy('转化率','Conversion rate')}}</th><th>{{previousLabel}}{{copy('转化率',' rate')}}</th><th>{{copy('转化率变化','Rate change')}}</th><th>{{copy('付费人数变化','Paid change')}}</th><th></th></tr></thead><tbody><tr v-for="r in rows" :key="r.teacher.id"><td><strong>{{teacherLabel(r.teacher)}}</strong></td><td>{{tr(r.teacher.subject)}}</td><td>{{r.completed}}</td><td>{{r.converted}}</td><td><strong>{{percent(r.rate)}}</strong></td><td>{{percent(r.previous.rate)}}<small class="schedule-source">{{r.previous.completed}} {{copy('完课','completed')}} / {{r.previous.converted}} {{copy('付费','paid')}}</small></td><td :class="changeClass(r.change)">{{changeText(r.change)}}</td><td>{{r.converted-r.previous.converted>0?'+':''}}{{r.converted-r.previous.converted}}</td><td><button class="text-button" @click="emit('edit',r.teacher,anchor||cairoToday(),bounds)">{{copy('录入 / 查看明细','Edit / view details')}}</button></td></tr></tbody></table></div><div v-if="!rows.length" class="empty-state">{{copy('没有符合条件的老师','No matching teachers')}}</div><div class="table-footer">{{copy('无完课数据时转化率显示 —；整体转化率按总转化数 ÷ 总完课数计算。','No completions: —. Overall rate uses total conversions divided by total completions.')}}</div></section>
</template>
