/* ArixCartoon deterministic 2D sketch renderer. No remote assets or runtime dependencies. */
(function () {
  'use strict';
  const W = 1280, H = 720;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (s) => { let h = 2166136261; for (let i=0;i<String(s).length;i++) h = Math.imul(h ^ String(s).charCodeAt(i), 16777619); return h >>> 0; };
  const rnd = (seed, n) => { let x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const line = (ctx, x1,y1,x2,y2, width=3, color='#34352f', wobble=0.8, seed=1) => {
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.beginPath();ctx.moveTo(x1,y1);
    const mx=(x1+x2)/2+(rnd(seed,1)-.5)*wobble, my=(y1+y2)/2+(rnd(seed,2)-.5)*wobble;
    ctx.quadraticCurveTo(mx,my,x2,y2);ctx.stroke();
    if (wobble>0) { ctx.globalAlpha=.22;ctx.lineWidth=Math.max(1,width*.42);ctx.beginPath();ctx.moveTo(x1+1,y1-1);ctx.quadraticCurveTo(mx-1,my+1,x2-1,y2+1);ctx.stroke();ctx.globalAlpha=1; }
  };
  const ellipse = (ctx,x,y,rx,ry,rot=0,fill=null,stroke='#34352f',width=3) => {
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);
    if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  };
  const roundRect = (ctx,x,y,w,h,r,fill,stroke='#d6d0c4') => {ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();};
  const fitText = (ctx, text, maxWidth) => { const words=String(text||'').split(/\s+/); const lines=[]; let row=''; for(const word of words){const next=row?row+' '+word:word;if(ctx.measureText(next).width>maxWidth&&row){lines.push(row);row=word;}else row=next;}if(row)lines.push(row);return lines; };
  function background(ctx, scene, t, style, seed) {
    const setting=String(scene.setting||scene.visual?.setting||'open paper stage').toLowerCase();
    let bg=style==='whiteboard'?'#fbfcf8':style==='flat'?'#f3f0e8':'#f7f3e9';
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // paper grain and hand-drawn ruled marks
    if(style!=='flat'){
      ctx.globalAlpha=.10;ctx.strokeStyle='#928b7c';ctx.lineWidth=1;
      for(let i=0;i<120;i++){const x=rnd(seed,i)*W,y=rnd(seed+7,i)*H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4+rnd(seed,i+30)*9,y+(rnd(seed,i+80)-.5)*2);ctx.stroke();}
      ctx.globalAlpha=1;
      if(style==='whiteboard'){ctx.strokeStyle='#e5e8e1';ctx.lineWidth=1;for(let y=56;y<H;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}}
    }
    const isClass=/class|school|exam|desk|study|office|room/.test(setting);
    const isCity=/street|city|market|shop|road|town/.test(setting);
    const isNature=/park|forest|garden|mountain|beach|nature|field/.test(setting);
    const floor=570;
    if(isClass){
      roundRect(ctx,90,85,1100,420,8,'#eee9dc','#bdb6a8');
      ctx.fillStyle='#e4dfd2';ctx.fillRect(92,492,1096,80);
      // window
      roundRect(ctx,150,125,245,205,3,'#dce9e6','#8d978e');line(ctx,272,127,272,328,5,'#8d978e',0,seed);line(ctx,152,225,393,225,5,'#8d978e',0,seed+1);
      ellipse(ctx,1070,150,34,34,0,'#e9c47d','#c8a867',2);
      // board
      roundRect(ctx,515,132,500,250,5,'#d8e0d3','#777e70');ctx.fillStyle='#f7f4e9';ctx.font='bold 30px Georgia';ctx.fillText('TODAY: YOU CAN DO THIS',560,208);line(ctx,565,245,920,245,3,'#f7f4e9',3,seed+2);
      // table
      roundRect(ctx,420,472,420,20,3,'#ad8867','#80664e');line(ctx,455,490,455,570,8,'#80664e',1,seed+3);line(ctx,810,490,810,570,8,'#80664e',1,seed+4);
    }else if(isCity){
      ctx.fillStyle='#e8e0d1';ctx.fillRect(0,440,W,135);line(ctx,0,440,W,440,5,'#9a9284',2,seed);
      for(let i=0;i<7;i++){let x=30+i*185,h=180+(rnd(seed,i)-.5)*90;roundRect(ctx,x,440-h,150,h,5,['#e7d9c9','#e3e0d2','#d9e2dc'][i%3],'#a39a8c');for(let r=0;r<3;r++)for(let c=0;c<2;c++){ctx.fillStyle='#b5c7c1';ctx.fillRect(x+25+c*52,440-h+25+r*43,23,27);}}
      ctx.fillStyle='#d8c5a5';ctx.fillRect(0,575,W,145);line(ctx,0,575,W,575,3,'#887f72',2,seed+8);
      for(let i=0;i<5;i++){let x=80+i*260;line(ctx,x,650,x+125,650,3,'#f5f0e6',0,seed+i);}
    }else if(isNature){
      ctx.fillStyle='#e9eadb';ctx.fillRect(0,450,W,270);ctx.fillStyle='#d8e2d1';ctx.beginPath();ctx.moveTo(0,470);ctx.quadraticCurveTo(330,280,680,470);ctx.quadraticCurveTo(950,310,1280,450);ctx.fill();
      for(let i=0;i<9;i++){let x=45+i*150,y=415+rnd(seed,i)*55;line(ctx,x,y+65,x,y-30,7,'#756f5a',2,seed+i);for(let k=0;k<4;k++)ellipse(ctx,x+(rnd(seed,k+i*9)-.5)*45,y-38+(rnd(seed,k+i*2)-.5)*35,24,30,0,['#a9b69c','#c1c8a6','#b1bea9'][k%3],'#87947f',1.5);}
      ctx.fillStyle='#d7d2bb';ctx.fillRect(0,570,W,150);
    }else{
      ctx.fillStyle=style==='flat'?'#e8e4d9':'#eee9dd';ctx.fillRect(0,570,W,150);line(ctx,0,570,W,570,3,'#c8c0b2',2,seed);
      ellipse(ctx,1080,145,44,44,0,'#f0dca9','#dac18b',2);
      // floating hand-drawn clouds
      for(let i=0;i<3;i++){let x=(i*390+140+t*8)%(W+180)-80,y=128+i*56;ellipse(ctx,x,y,42,15,0,'#fbfaf5','#d4cfc4',1.5);ellipse(ctx,x+32,y+2,30,13,0,'#fbfaf5','#d4cfc4',1.5);}
    }
    // soft vignette on pencil modes
    if(style!=='flat'){const g=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,760);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(115,102,78,.09)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  }
  function drawCharacter(ctx, character, index, count, t, word, style, seed) {
    const name=character?.name||`Character ${index+1}`;
    const color=character?.color||['#d9b79e','#a9b9ad','#d5c48f','#c8a7a0'][index%4];
    const baseX=count===1?640:390+(index/(Math.max(1,count-1)))*500;
    const x=baseX+Math.sin(t*1.1+index)*5;
    const y=567+Math.sin(t*2.2+index)*2;
    const phase=t*3.1+index*1.7;
    const stride=Math.sin(phase)*.20;
    const speaking=!!word && (!word.speaker || word.speaker.toLowerCase().includes(name.toLowerCase()) || index===0);
    const mouthOpen=speaking?(.18+Math.abs(Math.sin(t*18+seed%9))*.7):.03;
    const emotion=String(character?.emotion||'curious').toLowerCase();
    ctx.save();ctx.translate(x,y);
    // shadow
    ctx.globalAlpha=.12;ellipse(ctx,0,2,65,11,0,'#4b483f',null);ctx.globalAlpha=1;
    // legs, with walking cycle
    line(ctx,-13,-95,-24+stride*28,-4,8,'#393a35',1.3,seed+1);line(ctx,14,-95,27-stride*28,-4,8,'#393a35',1.3,seed+2);
    line(ctx,-24+stride*28,-4,-44+stride*34,-1,8,'#393a35',1,seed+3);line(ctx,27-stride*28,-4,47-stride*34,-1,8,'#393a35',1,seed+4);
    // trousers detail
    line(ctx,-15,-90,-23+stride*28,-20,2,'#9b9689',.7,seed+5);line(ctx,12,-90,23-stride*28,-20,2,'#9b9689',.7,seed+6);
    // torso, shirt shape
    ctx.beginPath();ctx.moveTo(-29,-205);ctx.quadraticCurveTo(-47,-189,-37,-107);ctx.quadraticCurveTo(0,-91,37,-108);ctx.quadraticCurveTo(47,-174,28,-205);ctx.quadraticCurveTo(0,-222,-29,-205);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#34352f';ctx.lineWidth=4;ctx.stroke();
    // shirt pencil detail
    for(let i=0;i<5;i++)line(ctx,-21+i*9,-188,-15+i*9,-120,1,'#827a6a',.8,seed+i+10);
    // arms swing/gesture
    const armSwing=Math.sin(phase)*8;
    line(ctx,-28,-191,-55-armSwing,-143,8,'#363832',1.2,seed+20);line(ctx,-55-armSwing,-143,-61-armSwing,-113,6,'#363832',1,seed+21);
    line(ctx,28,-191,53+armSwing,-146,8,'#363832',1.2,seed+22);line(ctx,53+armSwing,-146,62+armSwing,-124,6,'#363832',1,seed+23);
    ellipse(ctx,-62-armSwing,-109,8,10,0,'#e0bca3','#34352f',2);ellipse(ctx,63+armSwing,-119,8,10,0,'#e0bca3','#34352f',2);
    // neck and head
    roundRect(ctx,-10,-227,20,28,5,'#e3bea3','#34352f');
    ellipse(ctx,0,-261,49,51,0,'#e8c5aa','#34352f',4);
    // hair
    ctx.beginPath();ctx.moveTo(-45,-269);ctx.quadraticCurveTo(-55,-316,-14,-319);ctx.quadraticCurveTo(28,-326,47,-290);ctx.quadraticCurveTo(34,-299,21,-291);ctx.quadraticCurveTo(-8,-301,-27,-278);ctx.quadraticCurveTo(-37,-263,-45,-269);ctx.fillStyle=character?.hairColor||'#454039';ctx.fill();ctx.strokeStyle='#34352f';ctx.lineWidth=3;ctx.stroke();
    for(let i=0;i<4;i++)line(ctx,-30+i*16,-297,-21+i*14,-284,1.5,'#82786b',1,seed+40+i);
    // brows adapt to emotion
    const browY=emotion==='surprised'?-282:emotion==='sad'?-279:-284;
    line(ctx,-27,browY,-9,browY+(emotion==='angry'?4:0),3,'#3a3934',.5,seed+50);
    line(ctx,10,browY+(emotion==='angry'?4:0),28,browY,3,'#3a3934',.5,seed+51);
    // eyes + blink
    const blink=(Math.sin(t*2.7+index*3.4)>0.995)?1:0;
    if(blink){line(ctx,-23,-266,-12,-266,2,'#353630',0,seed+60);line(ctx,12,-266,23,-266,2,'#353630',0,seed+61);}else{ellipse(ctx,-17,-266,5,7,0,'#fffefa','#34352f',1.5);ellipse(ctx,18,-266,5,7,0,'#fffefa','#34352f',1.5);ellipse(ctx,-16,-265,2,3,0,'#34352f',null);ellipse(ctx,19,-265,2,3,0,'#34352f',null);}
    // nose and mouth
    line(ctx,1,-259,5,-246,1.8,'#8b7968',.3,seed+70);
    if(mouthOpen>.45){ellipse(ctx,2,-237,9,4+mouthOpen*5,0,'#563d37','#654b43',1.5);ctx.fillStyle='#f7e9dd';ctx.fillRect(-3,-238,9,2);}else{line(ctx,-9,-237,11,-237+(emotion==='happy'?-4:emotion==='sad'?4:0),2.5,'#664d43',.5,seed+71);}
    if(emotion==='happy'){ellipse(ctx,-31,-249,7,4,0,'#d98f7b',null);ellipse(ctx,31,-249,7,4,0,'#d98f7b',null);}
    // little character label
    ctx.font='600 13px DM Sans, sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(55,55,49,.65)';ctx.fillText(name,0,39);
    ctx.restore();
  }
  function drawProps(ctx, scene, t, seed) {
    const action=String(scene.action||scene.visual?.action||'').toLowerCase();
    if(/book|study|exam|read|homework/.test(action)){ctx.save();ctx.translate(780,475+Math.sin(t*2)*2);ctx.rotate(-.06);roundRect(ctx,-55,-18,110,76,5,'#eee2c7','#635d52');line(ctx,0,-16,0,55,2,'#9a8873',1,seed);ctx.fillStyle='#665e53';ctx.font='16px Georgia';ctx.fillText('NOTES',-35,13);for(let i=0;i<3;i++)line(ctx,-35,26+i*9,35,26+i*9,1,'#a9a092',.3,seed+i);ctx.restore();}
    if(/idea|think|realiz|invent|solution/.test(action)){const bob=Math.sin(t*3)*7;ellipse(ctx,855,245+bob,34,37,0,'#f5dfa6','#9c8353',2);line(ctx,841,283+bob,837,300+bob,3,'#8e7a4f',0,seed);line(ctx,857,284+bob,857,305+bob,3,'#8e7a4f',0,seed+1);line(ctx,872,283+bob,877,300+bob,3,'#8e7a4f',0,seed+2);ctx.font='bold 34px Georgia';ctx.fillStyle='#8b6b32';ctx.fillText('!',847,258+bob);}
    if(/laptop|computer|code|build|website|computer/.test(action)){roundRect(ctx,790,385,175,112,8,'#7e8c89','#424943');ctx.fillStyle='#eff3e8';ctx.fillRect(802,397,151,82);ctx.fillStyle='#52675b';ctx.font='15px monospace';ctx.fillText('> create();',816,426);line(ctx,775,500,982,500,8,'#65716c',1,seed);}
  }
  function activeWord(words, time) { if(!Array.isArray(words))return null; const i=words.findIndex(w=>time>=Number(w.start||0)&&time<=Number(w.end||0));return i<0?null:{...words[i],index:i}; }
  function drawCaption(ctx, project, time, active, fallbackText) {
    const words=Array.isArray(project.words)?project.words:[];
    let tokens=[];
    if(active&&words.length){let a=active.index,b=active.index;while(a>0&&!/[.!?]$/.test(String(words[a-1].word||words[a-1].text||'')))a--;while(b<words.length-1&&!/[.!?]$/.test(String(words[b].word||words[b].text||'')))b++;tokens=words.slice(a,b+1).map((w,i)=>({word:String(w.word||w.text||''),index:a+i}));}
    if(!tokens.length){const text=String(fallbackText||'').trim();if(text)tokens=text.split(/\s+/).slice(0,18).map((word)=>({word,index:-1}));}
    if(!tokens.length)return;
    const font='700 20px Manrope, sans-serif';ctx.save();ctx.font=font;ctx.textAlign='left';
    const maxWidth=1040,lines=[];let lineTokens=[],lineWidth=0;
    for(const token of tokens){const w=ctx.measureText(token.word+' ').width;if(lineWidth+w>maxWidth&&lineTokens.length){lines.push(lineTokens);lineTokens=[];lineWidth=0;}lineTokens.push({...token,width:w});lineWidth+=w;}
    if(lineTokens.length)lines.push(lineTokens);const visible=lines.slice(0,2);const lineHeight=27;const boxHeight=visible.length*lineHeight+22;const y=590-boxHeight/2;
    ctx.fillStyle='rgba(255,254,248,.88)';ctx.strokeStyle='rgba(91,83,69,.2)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(75,y,1130,boxHeight,9);ctx.fill();ctx.stroke();
    visible.forEach((arr,row)=>{const width=arr.reduce((n,t)=>n+t.width,0);let x=(W-width)/2;const yy=y+22+row*lineHeight;for(const token of arr){if(active&&token.index===active.index){ctx.fillStyle='rgba(234,190,169,.58)';ctx.beginPath();ctx.roundRect(x-3,yy-19,token.width-2,25,4);ctx.fill();}ctx.fillStyle=active&&token.index===active.index?'#9a432b':'#302f2a';ctx.fillText(token.word+' ',x,yy);x+=token.width;}});
    ctx.restore();
  }
  function renderFrame(canvas, project, time, settings={}) {
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return {sceneIndex:0,localTime:0,duration:0};
    const scale=Math.max(canvas.width/W,canvas.height/H), ox=(canvas.width-W*scale)/2, oy=(canvas.height-H*scale)/2;ctx.setTransform(scale,0,0,scale,ox,oy);
    const scenes=Array.isArray(project?.scenes)?project.scenes:[];const total=scenes.reduce((s,x)=>s+Math.max(3,Number(x.duration)||6),0);
    if(!scenes.length){ctx.fillStyle='#f7f3e9';ctx.fillRect(0,0,W,H);ctx.fillStyle='#4c4b43';ctx.textAlign='center';ctx.font='700 48px Manrope, sans-serif';ctx.fillText('ArixCartoon',W/2,H/2-10);ctx.font='20px DM Sans';ctx.fillText('Your animation will appear here',W/2,H/2+32);return {sceneIndex:0,localTime:0,duration:0};}
    let t=clamp(time,0,Math.max(.01,total-.001)),idx=0,local=t;
    for(let i=0;i<scenes.length;i++){const d=Math.max(3,Number(scenes[i].duration)||6);if(local<d){idx=i;break;}local-=d;idx=Math.min(i+1,scenes.length-1);}
    const scene=scenes[idx],style=settings.style||project.style||'pencil',seed=hash(scene.id||scene.title||idx);
    ctx.save();background(ctx,scene,local,style,seed);
    // animated pencil-drawn scene border and light flecks
    ctx.strokeStyle='rgba(80,74,62,.25)';ctx.lineWidth=2;ctx.strokeRect(22,22,W-44,H-44);
    for(let i=0;i<9;i++){let x=rnd(seed,i)*W,y=(rnd(seed+2,i)*H+local*(i%3+1)*9)%H;ctx.globalAlpha=.16;ellipse(ctx,x,y,2,2,0,'#8e846e',null);};ctx.globalAlpha=1;
    // scene heading and setting label
    ctx.textAlign='left';ctx.fillStyle='#5c5b53';ctx.font='700 18px Manrope, sans-serif';ctx.fillText(String(scene.title||`Scene ${idx+1}`).toUpperCase(),72,78);
    ctx.font='12px DM Sans, sans-serif';ctx.fillStyle='#8a877d';ctx.fillText(String(scene.setting||'A hand-drawn world').slice(0,72),73,101);
    const chars=Array.isArray(project.characters)?project.characters:[];
    const sceneChars=Array.isArray(scene.characters)&&scene.characters.length?scene.characters.map(id=>chars.find(c=>c.id===id)||chars.find(c=>c.name===id)).filter(Boolean):chars.slice(0,Math.max(1,Math.min(3,chars.length)));
    const allWords=Array.isArray(project.words)?project.words:[];const elapsed=t;
    const word=activeWord(allWords,elapsed);
    if(sceneChars.length){sceneChars.slice(0,4).forEach((c,i)=>drawCharacter(ctx,c,i,Math.min(4,sceneChars.length),local,word,style,seed+i*5));}
    else drawCharacter(ctx,{name:'Story guide',emotion:scene.emotion},0,1,local,word,style,seed);
    drawProps(ctx,scene,local,seed);
    // motion/action card near upper right
    if(scene.action){const actionLines=fitText(ctx,scene.action,330).slice(0,3);ctx.textAlign='right';ctx.font='italic 17px Georgia';ctx.fillStyle='#6e6a60';actionLines.forEach((s,i)=>ctx.fillText(s,1185,150+i*23));}
    if(settings.captions===true){const active=word;const fallback=scene.narration||(scene.dialogue||[]).map(d=>d.text).join(' ');drawCaption(ctx,project,elapsed,active,fallback);}
    // cinematic top/bottom bars for comic and pencil styles, subtle only
    if(style==='comic'){ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.moveTo(930,60);ctx.lineTo(1175,60);ctx.lineTo(1140,145);ctx.lineTo(895,145);ctx.closePath();ctx.fill();ctx.strokeStyle='#3d3b36';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#c45435';ctx.font='900 27px Manrope';ctx.textAlign='center';ctx.fillText(local<1.5?'WHAT IF?':'AND THEN…',1035,111);}
    // bottom scene marker
    ctx.textAlign='left';ctx.font='10px DM Sans';ctx.fillStyle='rgba(62,61,54,.55)';ctx.fillText(`CHAPTER ${String(idx+1).padStart(2,'0')}  /  ${String(scenes.length).padStart(2,'0')}`,70,665);
    ctx.textAlign='right';ctx.fillText(`${Math.min(99,Math.round((local/Math.max(3,scene.duration||6))*100))}%`,1210,665);
    ctx.restore();
    return {sceneIndex:idx,localTime:local,duration:total,scene};
  }
  function thumb(canvas, project, index, style) {
    const scene=project.scenes[index];const ctx=canvas.getContext('2d');const temp=document.createElement('canvas');temp.width=W;temp.height=H;
    const clone={...project,scenes:[scene]};renderFrame(temp,clone,Math.min(1,scene.duration||6),{style});ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(temp,0,0,canvas.width,canvas.height);
  }
  window.ArixCartoonEngine={renderFrame,thumb,activeWord};
})();
