// Draw report data directly so every filtered teacher is included, even below the screen.
export async function conversionImage({title,period,previousPeriod,scope,headers,rows,summary,notes}){
 await document.fonts.ready;
 const width=1640,padding=46,rowHeight=64,tableTop=270,footerHeight=130;
 const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=(tableTop+rowHeight*(rows.length+1)+footerHeight)*2;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);
 const height=canvas.height/2;
 ctx.fillStyle='#f5f7f6';ctx.fillRect(0,0,width,height);
 ctx.textBaseline='middle';
 const font=(size=18,bold=false)=>{ctx.font=`${bold?'600':'400'} ${size}px "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;};
 const text=(value,x,y,color='#253730',size=18,bold=false)=>{font(size,bold);ctx.fillStyle=color;ctx.fillText(String(value),x,y);};
 text(title,padding,52,'#176d54',32,true);
 text(period,padding,103,'#253730',21,true);
 text(previousPeriod,padding,140,'#718976',17);
 text(scope,width-padding-400,52,'#718976',17);
 summary.forEach((item,i)=>{const x=padding+i*516;ctx.fillStyle='#fff';ctx.fillRect(x,178,498,70);text(item.label,x+18,199,'#718976',15);text(item.value,x+18,229,'#176d54',23,true);});
 const xs=[padding+14,470,610,740,875,1050,1270,1465];
 ctx.fillStyle='#e6efe9';ctx.fillRect(padding,tableTop,width-padding*2,rowHeight);
 headers.forEach((h,i)=>text(h,xs[i],tableTop+rowHeight/2,'#496653',16,true));
 rows.forEach((row,index)=>{const y=tableTop+rowHeight*(index+1);ctx.fillStyle=index%2?'#f1f5f2':'#fff';ctx.fillRect(padding,y,width-padding*2,rowHeight);
  row.forEach((cell,i)=>{const value=typeof cell==='object'?cell.text:cell;const color=typeof cell==='object'?cell.color:undefined;
   font(i===0?18:17,i===0);let label=String(value);const max=(xs[i+1]??(width-padding))-xs[i]-15;
   if(i===0&&ctx.measureText(label).width>max){let size=18;while(size>8&&ctx.measureText(label).width>max){size--;font(size,true);}text(label,xs[i],y+rowHeight/2,color||'#253730',size,true);}
   else text(label,xs[i],y+rowHeight/2,color||'#253730',i===0?18:17,i===0);
  });
 });
 notes.forEach((note,i)=>text(note,padding,height-86+i*28,'#718976',15));
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG generation failed')),'image/png'));
}
