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
    const pencil=style!=='flat';
    const paper=style==='whiteboard'?'#fbfcf8':style==='flat'?'#f3f0e8':'#f8f4eb';
    ctx.fillStyle=paper;ctx.fillRect(0,0,W,H);
    if(pencil){
      ctx.globalAlpha=.085;ctx.strokeStyle='#8c8477';ctx.lineWidth=1;
      for(let i=0;i<180;i++){const x=rnd(seed,i)*W,y=rnd(seed+7,i)*H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+rnd(seed,i+30)*11,y+(rnd(seed,i+80)-.5)*2);ctx.stroke();}
      ctx.globalAlpha=1;
    }
    const classroom=/classroom|class room|lesson|teacher|blackboard/.test(setting);
    const schoolGate=/(school gate|school entrance|school exterior|outside the school|schoolyard)/.test(setting);
    const bedroom=/(bedroom|bed room|sleep|wakes up|bedside)/.test(setting);
    const study=/(study desk|study room|homework|library|desk covered|bookshelf)/.test(setting);
    const street=/(street|road|pavement|sidewalk|neighbourhood|neighborhood|walking path|bus stop)/.test(setting);
    const shop=/(shop|store|market|bakery|cafe|restaurant)/.test(setting);
    const nature=/(park|forest|garden|mountain|beach|nature|field|lake)/.test(setting);
    const office=/(office|startup|workplace|studio)/.test(setting);
    const floor=(y,color)=>{ctx.fillStyle=color;ctx.fillRect(0,y,W,H-y);line(ctx,0,y,W,y,3,'#aaa294',1,seed+90);};
    const windowUnit=(x,y,w,h)=>{roundRect(ctx,x,y,w,h,5,'#dce9e8','#87958d');ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(x+8,y+8,w*.43,h*.42);line(ctx,x+w/2,y+3,x+w/2,y+h-3,5,'#87958d',0,seed+91);line(ctx,x+3,y+h/2,x+w-3,y+h/2,5,'#87958d',0,seed+92);};
    const plant=(x,y,scale=1)=>{ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);line(ctx,0,0,0,-65,7,'#766c58',1,seed+93);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ellipse(ctx,Math.cos(a)*22,-58+Math.sin(a)*17,14,25,a*.35,['#9eae91','#b4bf9d','#8fa58c'][i%3],'#788e78',1.5);}roundRect(ctx,-24,0,48,30,5,'#b98d70','#896c58');ctx.restore();};
    const clouds=()=>{for(let i=0;i<4;i++){const x=((i*350+130+t*(5+i%2*2))%(W+150))-70,y=94+(i%3)*48;ellipse(ctx,x,y,40,15,0,'#fffdf8','#d4d0c7',1.3);ellipse(ctx,x+30,y-5,29,19,0,'#fffdf8','#d4d0c7',1.3);ellipse(ctx,x+55,y,34,14,0,'#fffdf8','#d4d0c7',1.3);}};
    if(bedroom){
      ctx.fillStyle='#eee5d8';ctx.fillRect(0,0,W,560);windowUnit(115,110,230,190);ellipse(ctx,1060,126,38,38,0,'#edc878','#c6a76a',2);
      // bed, pillow, blanket and bedside lamp establish a real bedroom silhouette
      roundRect(ctx,515,380,570,170,16,'#ad8d79','#79675a');roundRect(ctx,535,365,160,65,18,'#f4efe4','#c8bca9');ctx.fillStyle='#c4a5a0';ctx.beginPath();ctx.moveTo(690,392);ctx.quadraticCurveTo(860,355,1070,405);ctx.lineTo(1070,535);ctx.lineTo(690,535);ctx.closePath();ctx.fill();ctx.strokeStyle='#8c7770';ctx.lineWidth=3;ctx.stroke();
      roundRect(ctx,180,390,120,125,8,'#a98262','#725d4c');line(ctx,240,390,240,355,5,'#6d5c4e',0,seed);ellipse(ctx,240,348,25,12,0,'#f0d99d','#a38b5d',2);roundRect(ctx,190,515,100,24,4,'#8d6f58','#715743');
      roundRect(ctx,850,100,210,96,5,'#e8e1d3','#a79b88');ctx.fillStyle='#6e685e';ctx.font='italic 22px Georgia';ctx.fillText('A NEW DAY',885,157);
      floor(550,'#dcd4c7');
    }else if(study){
      ctx.fillStyle='#eee8dc';ctx.fillRect(0,0,W,570);windowUnit(90,95,195,175);
      roundRect(ctx,135,310,220,180,8,'#9f795c','#735a46');for(let i=0;i<3;i++){line(ctx,150,350+i*48,340,350+i*48,5,'#6c5848',0,seed+i);}
      for(let i=0;i<9;i++){const x=165+(i%3)*55,y=286-Math.floor(i/3)*15;roundRect(ctx,x,y,30,48,2,['#c98b6f','#8da6a0','#d5b86f'][i%3],'#766b5e');}
      roundRect(ctx,440,420,620,24,5,'#ad8867','#795f49');line(ctx,485,443,485,568,10,'#80664e',1,seed);line(ctx,1015,443,1015,568,10,'#80664e',1,seed+1);
      roundRect(ctx,900,275,90,140,5,'#e2d2b7','#9e8b70');ctx.fillStyle='#5e5c53';ctx.font='18px Georgia';ctx.fillText('NOTES',916,310);for(let i=0;i<4;i++)line(ctx,916,330+i*16,974,330+i*16,1,'#aaa08f',.2,seed+i);
      // desk lamp
      line(ctx,1100,420,1083,315,8,'#6f716b',1,seed+3);line(ctx,1083,315,1130,278,7,'#6f716b',1,seed+4);ellipse(ctx,1135,276,32,13,.35,'#e8d29c','#9f8b64',2);floor(570,'#ded7ca');
    }else if(classroom){
      ctx.fillStyle='#eee9dc';ctx.fillRect(0,0,W,500);windowUnit(92,110,230,185);
      roundRect(ctx,440,105,620,260,8,'#d7e0d2','#747e70');ctx.fillStyle='#f7f5ea';ctx.font='bold 31px Georgia';ctx.fillText('TODAY WE LEARN',520,178);line(ctx,515,200,965,200,3,'#f8f4e7',2,seed);ctx.font='20px Georgia';ctx.fillText('Ask • Explore • Discover',555,245);
      // perspective rows of desks
      for(let row=0;row<2;row++)for(let col=0;col<3;col++){const x=175+col*360+row*70,y=435+row*62;roundRect(ctx,x,y,230,17,3,row?'#bd9b7b':'#aa8767','#775f4c');line(ctx,x+18,y+16,x+13,y+88,6,'#80664e',.7,seed+row*7+col);line(ctx,x+210,y+16,x+216,y+88,6,'#80664e',.7,seed+row*7+col+2);}
      floor(575,'#d8d1c4');
    }else if(schoolGate){
      ctx.fillStyle='#dfe9e8';ctx.fillRect(0,0,W,430);clouds();
      // school facade with portico and clear gate structure
      roundRect(ctx,270,125,740,330,10,'#e9dfcd','#8b806f');roundRect(ctx,430,205,420,250,4,'#c8d5cf','#807d70');
      for(let i=0;i<5;i++){const x=320+i*160;roundRect(ctx,x,175,78,260,5,'#f6f0e4','#a69a87');roundRect(ctx,x+17,210,44,74,2,'#b9d1d4','#8a9992');}
      roundRect(ctx,450,90,380,80,8,'#f7f1e5','#807568');ctx.fillStyle='#43574e';ctx.textAlign='center';ctx.font='bold 29px Georgia';ctx.fillText('SUNRISE SCHOOL',640,140);ctx.textAlign='left';
      // gate bars and boundary
      ctx.fillStyle='#718b81';ctx.fillRect(0,490,W,11);for(let x=0;x<W;x+=58)ctx.fillRect(x,440,8,150);plant(125,535,.9);plant(1150,535,.9);floor(590,'#cdbfa9');
    }else if(street){
      ctx.fillStyle='#dfe9e9';ctx.fillRect(0,0,W,430);clouds();
      // distant houses and layered treeline
      for(let i=0;i<6;i++){const x=i*220-25,h=160+(rnd(seed,i)-.5)*80;roundRect(ctx,x,435-h,174,h,5,['#e7d9c9','#d8e2dc','#e8e1d4'][i%3],'#a39a8c');ctx.beginPath();ctx.moveTo(x-10,435-h);ctx.lineTo(x+86,390-h);ctx.lineTo(x+184,435-h);ctx.closePath();ctx.fillStyle=['#9c8572','#87998c','#a78f7c'][i%3];ctx.fill();for(let w=0;w<2;w++)for(let r=0;r<2;r++){ctx.fillStyle='#a9c2bf';ctx.fillRect(x+30+w*70,435-h+30+r*48,28,30);}}
      for(let i=0;i<5;i++)plant(60+i*300,445,.65);
      ctx.fillStyle='#c7c2b8';ctx.fillRect(0,445,W,100);ctx.fillStyle='#b6a894';ctx.fillRect(0,545,W,175);line(ctx,0,545,W,545,4,'#8d8375',1,seed);for(let i=0;i<6;i++){const x=((i*260+t*48)%(W+240))-120;line(ctx,x,635,x+90,635,4,'#f6f0df',0,seed+i);}
    }else if(shop){
      ctx.fillStyle='#eee4d5';ctx.fillRect(0,0,W,550);roundRect(ctx,190,110,900,400,14,'#d8d8c9','#807969');roundRect(ctx,260,170,760,245,6,'#b7d0cb','#807b70');ctx.fillStyle='#f3eadb';ctx.font='bold 38px Georgia';ctx.textAlign='center';ctx.fillText('CORNER MARKET',640,145);ctx.textAlign='left';
      for(let i=0;i<5;i++){roundRect(ctx,290+i*145,325,115,90,5,['#d6a27d','#d7c27f','#9bb29e'][i%3],'#817665');ellipse(ctx,346+i*145,345,22,22,0,'#e8cfa5','#8a7a5c',1.5);}
      floor(555,'#d6ccba');
    }else if(nature){
      ctx.fillStyle='#dce9e2';ctx.fillRect(0,0,W,470);clouds();ctx.fillStyle='#becdb2';ctx.beginPath();ctx.moveTo(0,475);ctx.quadraticCurveTo(330,275,680,470);ctx.quadraticCurveTo(950,300,1280,455);ctx.lineTo(1280,720);ctx.lineTo(0,720);ctx.closePath();ctx.fill();
      for(let i=0;i<10;i++){const x=30+i*140,y=440+rnd(seed,i)*45;plant(x,y,.72+rnd(seed,i+20)*.45);}floor(575,'#c8cdb0');
    }else if(office){
      ctx.fillStyle='#e7e8e2';ctx.fillRect(0,0,W,555);windowUnit(875,95,250,190);roundRect(ctx,160,390,900,26,5,'#8b8174','#5b554d');for(let i=0;i<4;i++)line(ctx,200+i*270,414,200+i*270,570,9,'#756c61',1,seed+i);roundRect(ctx,490,245,250,145,7,'#343f43','#252c2d');ctx.fillStyle='#9cc2b3';ctx.font='23px monospace';ctx.fillText('> CREATE()',520,310);floor(570,'#d4d1c8');
    }else{
      ctx.fillStyle='#eee9df';ctx.fillRect(0,0,W,550);windowUnit(115,115,220,185);roundRect(ctx,850,120,220,160,8,'#d7dfd2','#858c7d');plant(1110,520,.85);floor(570,'#dfd8cc');clouds();
    }
    if(pencil){const g=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,760);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(75,65,50,.13)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  }
  function drawCharacter(ctx, character, index, count, t, word, style, seed, action='', camera='', sceneDuration=6) {
    const name=character?.name||`Character ${index+1}`;
    const identity=hash(character?.id||name);
    const color=character?.color||['#4d83ae','#cb8c76','#8a9b78','#b58bba'][identity%4];
    const skins=['#edc5a5','#c98e6b','#a96f50','#f1d2b7','#d9a782','#8e5b43'];
    const skin=character?.skinColor||skins[identity%skins.length];
    const hair=character?.hairColor||['#302923','#49352f','#1f2426','#7a5138','#302b40'][Math.floor(identity/7)%5];
    const styles=['short','spiky','bob','curly','long','bun'];
    const hairStyle=String(character?.hairStyle||styles[Math.floor(identity/13)%styles.length]).toLowerCase();
    const accessory=String(character?.accessory||(['glasses','headband','none','freckles'][Math.floor(identity/19)%4])).toLowerCase();
    const faceShape=String(character?.faceShape||(['oval','round','angular'][Math.floor(identity/23)%3])).toLowerCase();
    const trousers=character?.pantsColor||['#4b596c','#62604e','#594a58','#3e5e5c'][Math.floor(identity/11)%4];
    let mode=/run|sprint/.test(action)?'run':/walk|travel|head out|set off|approach|leave/.test(action)?'walk':/jump|leap|celebrat|cheer|high five|spring upright/.test(action)?'jump':/stretch|yawn/.test(action)?'stretch':/wave|greet|hello|goodbye|farewell/.test(action)?'wave':/write|draw|note|study|read|open.*book/.test(action)?'write':/pack|backpack|school bag|pick up|bend|reach down|lift/.test(action)?'bend':/sit|class|desk|chair|settle/.test(action)?'sit':/point|explain|present|show/.test(action)?'point':'talk';
    // Turn compound action descriptions into a timed micro-choreography instead
    // of freezing the character in one selected pose for the entire scene.
    const motionRules=[[/\b(run|runs|running|sprint|sprints)\b/g,'run'],[/\b(walk|walks|walking|enter|enters|approach|approaches|leave|leaves|head|heads)\b/g,'walk'],[/\b(wake|wakes|waking|stand|stands|turn|turns)\b/g,'talk'],[/\b(sit|sits|sitting|settle|settles)\b/g,'sit'],[/\b(stretch|stretches|stretching|yawn|yawns)\b/g,'stretch'],[/\b(wave|waves|waving|greet|greets)\b/g,'wave'],[/\b(pack|packs|packing|place|places|put|puts|pick|picks|lift|lifts|bend|bends|reach|reaches|check|checks)\b/g,'bend'],[/\b(open|opens|write|writes|writing|read|reads|study|studies|draw|draws)\b/g,'write'],[/\b(jump|jumps|jumping|leap|leaps|celebrate|celebrates|cheer|cheers)\b/g,'jump'],[/\b(point|points|explain|explains|show|shows|present|presents)\b/g,'point']];
    const motions=[];for(const [re,m] of motionRules){for(const hit of action.matchAll(re))motions.push({at:hit.index,mode:m});}motions.sort((a,b)=>a.at-b.at);const sequence=[];for(const item of motions){if(sequence[sequence.length-1]!==item.mode)sequence.push(item.mode);}if(sequence.length>1){const phaseSpan=Math.max(.65,(Number(sceneDuration)||6)/sequence.length);mode=sequence[Math.min(sequence.length-1,Math.floor(Math.max(0,t)/phaseSpan))];}
    const phase=t*(mode==='run'?7:mode==='walk'?4:2.6)+index*1.83;
    const stride=(mode==='walk'||mode==='run')?Math.sin(phase)*(mode==='run'?.75:.52):0;
    const bob=mode==='jump'?Math.abs(Math.sin(t*4+index))*48:mode==='walk'||mode==='run'?Math.abs(Math.sin(phase))*8:Math.sin(t*1.8+index)*2.2;
    const lean=mode==='bend'?.25:mode==='write'?.12:mode==='run'?.13:0;
    const baseX=count===1?640:300+(index/Math.max(1,count-1))*680+(Math.sin(t*.7+index)*5);
    const x=baseX+((mode==='walk'||mode==='run')?Math.sin(t*(mode==='run'?1.1:.65)+index)*35:0);
    const y=567-bob;
    const speaking=!!word&&(!word.speaker||String(word.speaker).toLowerCase().includes(name.toLowerCase())||index===0);
    const mouthOpen=speaking?(.15+Math.abs(Math.sin(t*17+seed%9))*.75):.025;
    const emotion=String(character?.emotion||'curious').toLowerCase();
    const headTilt=(mode==='bend'?.16:mode==='write'?.10:mode==='run'?.08:0)+Math.sin(t*1.3+index)*.025;
    const armSwing=(mode==='walk'||mode==='run')?Math.sin(phase)*26:Math.sin(t*2.8+index)*6;
    ctx.save();ctx.translate(x,y);ctx.rotate(lean*.15);ctx.scale(Number(character?.heightScale)||1,Number(character?.heightScale)||1);
    ellipse(ctx,0,2,66,12,0,'rgba(58,54,47,.12)',null);
    // legs have separate hip/knee/ankle articulation and different silhouettes
    const hipY=-96, kneeA={x:-17+stride*35,y:-52-Math.max(0,stride)*8}, kneeB={x:18-stride*35,y:-54+Math.max(0,stride)*8};
    if(mode==='sit'){
      line(ctx,-13,hipY,-30,-62,10,trousers,1.1,seed+1);line(ctx,-30,-62,-74,-54,9,trousers,1,seed+2);line(ctx,14,hipY,35,-62,10,trousers,1.1,seed+3);line(ctx,35,-62,78,-54,9,trousers,1,seed+4);
      line(ctx,-74,-54,-54,-48,8,'#3b3935',1,seed+5);line(ctx,78,-54,98,-48,8,'#3b3935',1,seed+6);
    }else{
      line(ctx,-13,hipY,kneeA.x,kneeA.y,11,trousers,1.1,seed+1);line(ctx,kneeA.x,kneeA.y,-24+stride*55,-4,9,trousers,1,seed+2);line(ctx,-24+stride*55,-4,-47+stride*63,-2,9,'#3b3935',1,seed+3);
      line(ctx,14,hipY,kneeB.x,kneeB.y,11,trousers,1.1,seed+4);line(ctx,kneeB.x,kneeB.y,25-stride*55,-4,9,trousers,1,seed+5);line(ctx,25-stride*55,-4,48-stride*63,-2,9,'#3b3935',1,seed+6);
    }
    // torso varies by identity and posture
    const bodyW=Number(character?.bodyWidth)|| (identity%3===0?1.12:identity%3===1?.9:1);
    ctx.save();ctx.rotate(lean);ctx.scale(bodyW,1);
    ctx.beginPath();ctx.moveTo(-29,-205);ctx.quadraticCurveTo(-49,-189,-38,-110);ctx.quadraticCurveTo(0,-91,38,-110);ctx.quadraticCurveTo(49,-178,29,-205);ctx.quadraticCurveTo(0,-221,-29,-205);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#34352f';ctx.lineWidth=4;ctx.stroke();
    // clothing detail varies by character
    const pattern=String(character?.shirtPattern||(['vertical','plain','stripe','badge','buttons'][Math.floor(identity/5)%5]));
    if(pattern==='vertical'){for(let i=0;i<5;i++)line(ctx,-22+i*11,-188,-17+i*10,-121,1.1,'rgba(45,49,46,.28)',.6,seed+i+10);}else if(pattern==='stripe'){for(let i=0;i<4;i++){ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(-31,-190+i*18,62,7);}}else if(pattern==='badge'){ellipse(ctx,20,-174,8,8,0,'#f1d18a','#6d675b',1);}
    ctx.restore();
    // articulated arms with action-specific poses
    const skinStroke='#34352f';let leftElbow={x:-55-armSwing*.35,y:-145},leftHand={x:-65-armSwing*.4,y:-113},rightElbow={x:55+armSwing*.35,y:-145},rightHand={x:65+armSwing*.4,y:-119};
    if(mode==='wave'){rightElbow={x:65,y:-220};rightHand={x:78,y:-286+Math.sin(t*8)*9};}
    if(mode==='stretch'){leftElbow={x:-55,y:-250};leftHand={x:-78,y:-292+Math.sin(t*2)*4};rightElbow={x:55,y:-250};rightHand={x:78,y:-292+Math.sin(t*2)*4};}
    if(mode==='jump'){leftElbow={x:-61,y:-229};leftHand={x:-86,y:-271};rightElbow={x:61,y:-229};rightHand={x:87,y:-271};}
    if(mode==='point'){rightElbow={x:63,y:-169};rightHand={x:120,y:-192};}
    if(mode==='write'){rightElbow={x:45,y:-137};rightHand={x:85,y:-91};}
    if(mode==='bend'){leftElbow={x:-60,y:-120};leftHand={x:-78,y:-79};rightElbow={x:57,y:-121};rightHand={x:76,y:-79};}
    if(mode==='sit'){leftElbow={x:-54,y:-145};leftHand={x:-70,y:-108};rightElbow={x:55,y:-145};rightHand={x:75,y:-108};}
    line(ctx,-28,-190,leftElbow.x,leftElbow.y,10,'#34352f',1.5,seed+20);line(ctx,leftElbow.x,leftElbow.y,leftHand.x,leftHand.y,8,'#34352f',1.2,seed+21);ellipse(ctx,leftHand.x,leftHand.y,9,11,0,skin,skinStroke,2);
    line(ctx,28,-190,rightElbow.x,rightElbow.y,10,'#34352f',1.5,seed+22);line(ctx,rightElbow.x,rightElbow.y,rightHand.x,rightHand.y,8,'#34352f',1.2,seed+23);ellipse(ctx,rightHand.x,rightHand.y,9,11,0,skin,skinStroke,2);
    if(mode==='point'){line(ctx,rightHand.x,rightHand.y,rightHand.x+23,rightHand.y-9,4,skin,0,seed+24);}
    // neck and distinctive face silhouette
    roundRect(ctx,-11,-231,22,30,5,skin,'#34352f');ctx.save();ctx.translate(0,-263);ctx.rotate(headTilt);
    const faceW=faceShape==='round'?52:faceShape==='angular'?45:48,faceH=faceShape==='round'?48:53;
    ellipse(ctx,0,0,faceW,faceH,0,skin,'#34352f',4);
    // hair silhouettes: six deterministic / model-selectable shapes
    ctx.fillStyle=hair;ctx.strokeStyle='#34352f';ctx.lineWidth=3;ctx.beginPath();
    if(hairStyle==='spiky'){ctx.moveTo(-47,2);ctx.lineTo(-51,-30);ctx.lineTo(-34,-22);ctx.lineTo(-24,-51);ctx.lineTo(-6,-27);ctx.lineTo(12,-54);ctx.lineTo(21,-26);ctx.lineTo(44,-38);ctx.lineTo(48,5);ctx.quadraticCurveTo(20,-8,-12,-8);ctx.closePath();}
    else if(hairStyle==='bob'||hairStyle==='long'){ctx.moveTo(-48,7);ctx.quadraticCurveTo(-64,-49,-12,-57);ctx.quadraticCurveTo(40,-67,49,-20);ctx.lineTo(52,38);ctx.quadraticCurveTo(37,52,33,17);ctx.quadraticCurveTo(-9,-12,-34,20);ctx.lineTo(-40,45);ctx.closePath();}
    else if(hairStyle==='curly'){ctx.moveTo(-48,7);for(let i=0;i<8;i++){const a=Math.PI+(i/7)*Math.PI;ctx.quadraticCurveTo(Math.cos(a)*60,Math.sin(a)*59-5,Math.cos(a+.18)*51,Math.sin(a+.18)*54-5);}ctx.lineTo(45,8);ctx.quadraticCurveTo(10,-25,-34,20);ctx.closePath();}
    else if(hairStyle==='bun'){ctx.moveTo(-47,7);ctx.quadraticCurveTo(-60,-48,-9,-56);ctx.quadraticCurveTo(37,-61,47,-18);ctx.lineTo(42,8);ctx.quadraticCurveTo(5,-19,-33,17);ctx.closePath();}
    else{ctx.moveTo(-47,8);ctx.quadraticCurveTo(-59,-46,-12,-56);ctx.quadraticCurveTo(35,-62,48,-18);ctx.quadraticCurveTo(22,-35,7,-27);ctx.quadraticCurveTo(-17,-41,-34,7);ctx.closePath();}
    ctx.fill();ctx.stroke();
    if(hairStyle==='bun'){ellipse(ctx,29,-52,17,17,0,hair,'#34352f',2);}
    if(hairStyle==='long'){line(ctx,-42,-16,-43,48,9,hair,1,seed+41);line(ctx,42,-17,45,49,9,hair,1,seed+42);}
    for(let i=0;i<3;i++)line(ctx,-30+i*19,-43,-23+i*18,-30,1.3,'rgba(240,226,207,.45)',1,seed+40+i);
    // eyebrows, eyes, pupils and emotion
    const brow=emotion==='surprised'?-28:emotion==='angry'?-22:-30;
    line(ctx,-27,brow,-9,brow+(emotion==='angry'?5:0),3,'#342d29',.5,seed+50);line(ctx,10,brow+(emotion==='angry'?5:0),28,brow,3,'#342d29',.5,seed+51);
    const blink=Math.sin(t*2.5+index*3.3)>.998;
    if(blink){line(ctx,-23,0,-12,0,2,'#34352f',0,seed+60);line(ctx,13,0,24,0,2,'#34352f',0,seed+61);}else{ellipse(ctx,-17,0,6,8,0,'#fffefa','#34352f',1.5);ellipse(ctx,18,0,6,8,0,'#fffefa','#34352f',1.5);ellipse(ctx,-16,1,2.5,3.5,0,'#302d2a',null);ellipse(ctx,19,1,2.5,3.5,0,'#302d2a',null);}
    if(accessory==='glasses'){ctx.strokeStyle='#3d4547';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(-17,0,12,10,0,0,Math.PI*2);ctx.ellipse(18,0,12,10,0,0,Math.PI*2);ctx.moveTo(-5,0);ctx.lineTo(6,0);ctx.stroke();}
    if(accessory==='freckles'){for(let i=0;i<3;i++){ellipse(ctx,-30+i*6,16,1.5,1.5,0,'#9b6856',null);ellipse(ctx,22+i*5,16,1.5,1.5,0,'#9b6856',null);}}
    line(ctx,1,7,5,18,1.8,'#8b7968',.2,seed+70);
    if(mouthOpen>.42){ellipse(ctx,2,27,9,4+mouthOpen*5,0,'#563d37','#654b43',1.5);ctx.fillStyle='#f7e9dd';ctx.fillRect(-3,25,9,2);}else{line(ctx,-9,27,11,27+(emotion==='happy'?-5:emotion==='sad'?4:0),2.8,'#664d43',.5,seed+71);}
    if(emotion==='happy'||emotion==='excited'){ellipse(ctx,-31,16,7,4,0,'#d98f7b',null);ellipse(ctx,31,16,7,4,0,'#d98f7b',null);}
    if(accessory==='headband'){ctx.strokeStyle='#bd6f65';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,49,Math.PI*1.08,Math.PI*1.92);ctx.stroke();}
    ctx.restore();
    // props/accessories attached to character help silhouette and identity
    if(character?.accessory==='backpack'||/backpack|school bag/.test(character?.description||'')){roundRect(ctx,-43,-189,18,65,7,'#9b725c','#59483c');line(ctx,-34,-183,-28,-149,3,'#d5bca0',1,seed+81);}
    ctx.font='600 13px DM Sans, sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(55,55,49,.72)';ctx.fillText(name,0,38);
    ctx.restore();
  }
  function drawProps(ctx, scene, t, seed) {
    const action=String(scene.action||scene.visual?.action||'').toLowerCase();
    if(/backpack|school bag|packs.*bag|bag/.test(action)){
      ctx.save();ctx.translate(810,468+Math.sin(t*2)*2);ctx.rotate(-.04);
      roundRect(ctx,-40,-55,82,105,14,'#587c91','#374c55');roundRect(ctx,-29,-18,60,48,9,'#7595a0','#374c55');
      line(ctx,-33,-47,-53,-12,5,'#b9a58a',1,seed);line(ctx,33,-47,53,-12,5,'#b9a58a',1,seed+1);ellipse(ctx,0,8,6,5,0,'#d8c39c','#5b5549',1);
      ctx.restore();
    }
    if(/book|study|exam|read|homework|notebook|pencil/.test(action)){
      ctx.save();ctx.translate(790,480+Math.sin(t*2)*2);ctx.rotate(-.05);
      ctx.beginPath();ctx.moveTo(-68,-18);ctx.quadraticCurveTo(-35,-30,0,-12);ctx.quadraticCurveTo(34,-30,68,-18);ctx.lineTo(68,48);ctx.quadraticCurveTo(32,34,0,49);ctx.quadraticCurveTo(-35,34,-68,48);ctx.closePath();ctx.fillStyle='#f3e9d5';ctx.fill();ctx.strokeStyle='#776b5a';ctx.lineWidth=2.5;ctx.stroke();line(ctx,0,-12,0,48,2,'#9c8e7b',.5,seed);for(let i=0;i<3;i++){line(ctx,-53,0+i*12,-9,1+i*12,1,'#aaa092',.3,seed+i);line(ctx,10,1+i*12,54,0+i*12,1,'#aaa092',.3,seed+i+5);}ctx.restore();
    }
    if(/idea|think|realiz|invent|solution/.test(action)){
      const bob=Math.sin(t*3)*7;ellipse(ctx,855,245+bob,34,37,0,'#f5dfa6','#9c8353',2);line(ctx,841,283+bob,837,300+bob,3,'#8e7a4f',0,seed);line(ctx,857,284+bob,857,305+bob,3,'#8e7a4f',0,seed+1);line(ctx,872,283+bob,877,300+bob,3,'#8e7a4f',0,seed+2);ctx.font='bold 34px Georgia';ctx.fillStyle='#8b6b32';ctx.fillText('!',847,258+bob);
    }
    if(/laptop|computer|code|build|website/.test(action)){roundRect(ctx,790,385,175,112,8,'#7e8c89','#424943');ctx.fillStyle='#eff3e8';ctx.fillRect(802,397,151,82);ctx.fillStyle='#52675b';ctx.font='15px monospace';ctx.fillText('> create();',816,426);line(ctx,775,500,982,500,8,'#65716c',1,seed);}
    if(/bus|school bus/.test(action)){ctx.save();ctx.translate(920,460+Math.sin(t*1.5)*2);roundRect(ctx,-100,-75,205,90,16,'#e5b957','#695b43');for(let i=0;i<4;i++)roundRect(ctx,-78+i*43,-62,34,31,4,'#c1d8d6','#6d756f');ellipse(ctx,-58,18,17,17,0,'#454544','#2f302f',2);ellipse(ctx,70,18,17,17,0,'#454544','#2f302f',2);ctx.restore();}
    if(/pencil|draw|write/.test(action)){ctx.save();ctx.translate(920,520);ctx.rotate(-.65);roundRect(ctx,-7,-48,14,90,3,'#e0b65c','#725d37');ctx.fillStyle='#393632';ctx.beginPath();ctx.moveTo(-7,-48);ctx.lineTo(0,-65);ctx.lineTo(7,-48);ctx.closePath();ctx.fill();ctx.restore();}
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
    const camera=String(scene.camera||'').toLowerCase();
    ctx.save();
    if(/close|close-up|extreme/.test(camera)){ctx.translate(-90,-55);ctx.scale(1.16,1.16);}
    else if(/wide|establishing/.test(camera)){ctx.translate(35,10);ctx.scale(.94,.94);}
    else if(/tracking|follow/.test(camera)){ctx.translate(-Math.sin(local*1.25)*30,0);}
    if(sceneChars.length){sceneChars.slice(0,4).forEach((c,i)=>drawCharacter(ctx,c,i,Math.min(4,sceneChars.length),local,word,style,seed+i*5,scene.action||'',camera,scene.duration));}
    else drawCharacter(ctx,{name:'Story guide',emotion:scene.emotion},0,1,local,word,style,seed,scene.action||'',camera,scene.duration);
    drawProps(ctx,scene,local,seed);
    // action-specific ambient motion: birds, sparkles, steam and falling leaves
    const act=String(scene.action||'').toLowerCase();
    if(/bird|fly|outside|street|road/.test(act)){for(let i=0;i<3;i++){const bx=(180+i*250+local*(25+i*8))%(W+80)-40,by=180+i*35+Math.sin(local*2+i)*8;line(ctx,bx-13,by,bx,by-8,2,'#555a55',.3,seed+i);line(ctx,bx,by-8,bx+13,by,2,'#555a55',.3,seed+i+9);}}
    if(/celebrat|happy|success|idea|dream/.test(act)){for(let i=0;i<8;i++){const sx=300+i*95,sy=230+Math.sin(local*3+i)*18;ctx.globalAlpha=.35+.25*Math.sin(local*4+i);ellipse(ctx,sx,sy,3,3,0,'#d2a44e',null);}ctx.globalAlpha=1;}
    ctx.restore();
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
