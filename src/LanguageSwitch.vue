<script setup>
import {locale,setLanguage,tr} from './i18n.js';
</script>
<template><div class="language-switch" role="group" :aria-label="tr('界面语言')"><button type="button" :class="{selected:locale==='zh'}" :aria-pressed="locale==='zh'" @click="setLanguage('zh')">中文</button><button type="button" :class="{selected:locale==='en'}" :aria-pressed="locale==='en'" @click="setLanguage('en')">English</button></div></template>
