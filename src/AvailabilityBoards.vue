<script setup>
import {formatTime as clock} from './time-format.js';
import {ref,computed,watch} from 'vue';
import {teacherLabel} from './teachers.js';
import {tr,locale} from './i18n.js';
import {ChevronLeft,ChevronRight,Check} from 'lucide-vue-next';
import {WEEKDAYS,cairoToday,weekday,effectiveSlots,teacherHasStarted} from './payroll.js';
const props=defineProps({mode:String,teachers:Array,records:Object,initialTeacher:String,initialDate:String});
const emit=defineEmits(['edit-fixed','edit-date','teacher','date']);
const anchor=ref(props.initialDate||cairoToday()),chosenTeacher=ref(props.initialTeacher||props.teachers[0]?.id||''),subject=ref('英语');
const subjects=computed(()=>['英语','数学','阿拉伯语',...new Set(props.teachers.map(t=>t.subject))].filter((s,i,a)=>a.indexOf(s)===i));
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
const days=computed(()=>{const d=anchor.value||cairoToday();return Array.from({length:7},(_,i)=>addDays(d,i-weekday(d)));});
const teacher=computed(()=>props.teachers.find(t=>t.id===chosenTeacher.value));
const matching=computed(()=>props.teachers.filter(t=>t.subject===subject.value));
const slots=(t,d)=>effectiveSlots(t,d,props.records[`${t.id}:${d}`]?.exceptions||[]);
const daySlots=computed(()=>days.value.map(d=>new Map((props.mode==='teacher'?(teacher.value?[teacher.value]:[]):matching.value).map(t=>[t.id,new Set(slots(t,d))]))));
const times=computed(()=>{const values=daySlots.value.flatMap(map=>[...map.values()].flatMap(s=>[...s]));const first=Math.min(720,...values),last=Math.max(1260,...values);return Array.from({length:(last-first)/30+1},(_,i)=>first+i*30);});
const boardCount=computed(()=>daySlots.value.reduce((n,map)=>n+[...map.values()].reduce((s,set)=>s+set.size,0),0));
const peopleAt=(index,time)=>matching.value.filter(t=>daySlots.value[index]?.get(t.id)?.has(time));
function intervals(d){if(!teacher.value)return [];const values=slots(teacher.value,d),out=[];for(const m of values){if(out.length&&out.at(-1).end===m)out.at(-1).end=m+30;else out.push({start:m,end:m+30});}return out;}
watch(anchor,d=>{if(d)emit('date',d);});
watch(()=>props.initialTeacher,id=>{if(id)chosenTeacher.value=id;});
</script>
<template>
<section class="availability-boards">
 <div class="board-controls"><label v-if="mode==='teacher'" class="board-select-label">{{ tr("选择老师") }}<select v-model="chosenTeacher"><option v-for="t in teachers" :key="t.id" :value="t.id">{{ teacherLabel(t) }} · {{ tr(t.subject) }}</option></select></label><div v-else class="segmented subject-tabs"><button v-for="s in subjects" :key="s" :class="{chosen:subject===s}" @click="subject=s">{{ tr(s) }}</button></div><div class="date-picker"><button :aria-label='tr("看板上一周")' @click="anchor=addDays(anchor||cairoToday(),-7)"><ChevronLeft :size="17"/></button><input :aria-label='tr("看板日期")' type="date" v-model="anchor"/><button :aria-label='tr("看板下一周")' @click="anchor=addDays(anchor||cairoToday(),7)"><ChevronRight :size="17"/></button></div><button class="secondary" @click="anchor=cairoToday()">{{ tr("本周") }}</button></div>
 <div class="board-intro"><span>{{ tr(days[0]) }}{{ tr(" 至 ") }}{{ tr(days[6]) }}{{ tr(" · 开罗时间") }}</span><span>{{ tr("显示有效开放时间，已计入指定日期排班及加时 / 请假等异常") }}</span></div>
 <section v-if="mode==='teacher'&&teacher" class="panel teacher-board-summary"><div class="panel-title"><h2>{{ teacherLabel(teacher) }} <span>{{ tr(teacher.subject) }}</span></h2><button class="secondary" @click="emit('edit-fixed',teacher)">{{ tr("修改固定排班") }}</button></div><div class="board-day-summaries"><article v-for="d in days" :key="d" :class="{weekend:weekday(d)>=5}"><strong>{{ tr(WEEKDAYS[weekday(d)]) }} <small>{{ tr(d.slice(5)) }}</small></strong><span v-for="r in intervals(d)">{{ tr(clock(r.start)) }}–{{ tr(clock(r.end)) }}</span><small v-if="!intervals(d).length">{{ tr("暂无开放时间") }}</small><div class="day-source">{{ tr(teacher.dateSchedules?.[d]?tr('指定日期排班'):tr('固定模板')) }}{{ tr(records[`${teacher.id}:${d}`]?.exceptions?.length?tr(' + 异常调整'):'') }}</div><button class="text-button" :disabled="!teacherHasStarted(teacher,d)" @click="emit('edit-date',teacher,d)">{{ tr("设置当天") }}</button></article></div></section>
 <section class="panel board-matrix"><div class="panel-title"><h2>{{ tr(mode==='teacher'?tr('老师半小时课表'):tr(subject)+tr(' · 每半小时可用老师')) }}</h2><span class="muted">{{ locale==='en' ? `This week: ${boardCount} ${mode==='subject'?'teacher slots':'slots'}` : `本周 ${boardCount} 个${mode==='subject'?'老师 ':''}slot` }}</span></div><div class="table-scroll"><table class="availability-table" :class="{'subject-matrix':mode==='subject'}"><thead><tr><th class="time-sticky">{{ tr("开罗时间") }}</th><th v-for="(d,i) in days" :key="d" :class="{weekend:i>=5,selected:anchor===d}"><button @click="anchor=d">{{ tr(WEEKDAYS[i]) }}<small>{{ tr(d.slice(5)) }}</small></button></th></tr></thead><tbody><tr v-for="time in times" :key="time"><th class="time-sticky">{{ tr(clock(time)) }}<small>– {{ tr(clock(time+30)) }}</small></th><td v-for="(d,i) in days" :key="d" :class="{weekend:i>=5,available:mode==='teacher'&&daySlots[i]?.get(chosenTeacher)?.has(time)}"><template v-if="mode==='teacher'"><span v-if="daySlots[i]?.get(chosenTeacher)?.has(time)" class="availability-mark"><Check :size="13"/>{{ tr("有空") }}</span><span v-else class="empty-dash">—</span></template><template v-else><button v-for="t in peopleAt(i,time)" :key="t.id" class="matrix-teacher" @click="emit('teacher',t.id)">{{ teacherLabel(t) }}</button><span v-if="!peopleAt(i,time).length" class="empty-dash">—</span></template></td></tr></tbody></table></div><div class="table-footer"><span>{{ tr("连续 slot 在老师摘要中合并显示，表格中每行仍为半小时。") }}</span><span>{{ tr("有空表示排班开放，不代表尚未被学生预约。") }}</span></div></section>
</section>
</template>
