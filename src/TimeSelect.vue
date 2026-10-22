<script setup>
import {computed} from 'vue';
import {clock} from './payroll.js';
import {formatTime} from './time-format.js';
import {locale} from './i18n.js';
const props=defineProps({modelValue:String,end:Boolean});
const emit=defineEmits(['update:modelValue']);
const options=computed(()=>Array.from({length:props.end?48:48},(_,i)=>(i+(props.end?1:0))*30));
</script>
<template><select :value="modelValue" :aria-label="locale==='en'?(end?'End time':'Start time'):(end?'结束时间':'开始时间')" @change="emit('update:modelValue',$event.target.value)"><option v-if="!modelValue" disabled value="">{{locale==='en'?'Select time':'选择时间'}}</option><option v-for="m in options" :key="m" :value="clock(m)">{{formatTime(m)}}</option></select></template>
