import openpyxl,json,re,hashlib
from pathlib import Path
from collections import defaultdict,Counter
source=Path('/Users/zhangjing/Downloads/Trial Class Slot-NEW-Khusussi.xlsx')
w=openpyxl.load_workbook(source,data_only=True);s=w['slot']; subject=None; people={};cells=[]
def minute(h,m):return (int(h)%12+12)*60+int(m)
def clock(m):return f'{m//60:02}:{m%60:02}'
for row in s.iter_rows():
 label=str(row[0].value or '').strip()
 if label in ['English','Math','Arabic']:subject={'English':'英语','Math':'数学','Arabic':'阿拉伯语'}[label];continue
 mt=re.fullmatch(r'(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})PM',label)
 if not mt:continue
 a,b=minute(*mt.groups()[:2]),minute(*mt.groups()[2:]);assert b-a==30,(row[0].coordinate,label)
 for c in row[1:6]:
  if not c.value:continue
  raw=str(c.value);names=[re.sub(r'\s+',' ',x).strip() for x in re.split(r'[/\\\n]+',raw) if x.strip()]
  for name in names:
   name={'Hadir ElNagga':'Hadir ElNaggar','ara Diaa':'Sara Diaa'}.get(name,name)
   ident=subject+'|'+name.casefold()
   if ident not in people:people[ident]={'id':'xlsx-'+hashlib.sha256(ident.encode()).hexdigest()[:16],'name':name,'subject':subject,'gender':'未提供','rate':None,'currency':'','schedules':[],'source':{'file':source.name,'sheet':'slot','cells':[]},'_slots':defaultdict(set)}
   p=people[ident];p['_slots'][c.column-2].add(a);p['source']['cells'].append(c.coordinate)
  cells.append({'cell':c.coordinate,'subject':subject,'day':c.column-2,'start':a,'names':names,'raw':raw})
for p in people.values():
 ranges=[]
 for d,slots in sorted(p.pop('_slots').items()):
  for m in sorted(slots):
   if ranges and ranges[-1]['day']==d and ranges[-1]['end']==clock(m):ranges[-1]['end']=clock(m+30)
   else:ranges.append({'day':d,'start':clock(m),'end':clock(m+30)})
 p['schedules']=[{'effective':'2026-10-18','ranges':ranges}]
manifest={'id':'khusussi-slot-2026-10-18-v1','source':source.name,'sheet':'slot','effective':'2026-10-18','teachers':list(people.values()),'cells':cells,'notes':['仅导入 slot 总表，日期工作表和 report 未作为固定排班导入。','表格未提供性别、时薪和币种，保留待补充；不会自动计算工资。','原表只包含周日到周四，周五周六未设置。','导入固定模板默认从 2026-10-18 起生效，不回填历史工资。','已按用户确认合并 Hadir ElNagga → Hadir ElNaggar（C16）、ara Diaa → Sara Diaa（C18）；原单元格文字保留供核对。']}
Path('src/data/imported-slots.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'teachers':len(people),'subjects':dict(Counter(p['subject'] for p in people.values())),'occupiedCells':len(cells),'teacherSlots':sum(len(c['names']) for c in cells),'names':[{'name':p['name'],'subject':p['subject'],'ranges':p['schedules'][0]['ranges']} for p in people.values()]},ensure_ascii=False,indent=2))
