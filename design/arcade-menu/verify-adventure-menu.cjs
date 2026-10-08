const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');

(async()=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'adventure-menu-'));
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
    '--headless=new',`--user-data-dir=${profile}`,'--remote-debugging-port=9241',
    '--no-first-run','--no-default-browser-check','about:blank'
  ],{windowsHide:true,stdio:'ignore'});
  let ws;
  const errors=[];
  try {
    let url;
    for(let i=0;i<60;i++){
      try{url=(await(await fetch('http://localhost:9241/json')).json()).find(x=>x.type==='page')?.webSocketDebuggerUrl;if(url)break;}catch{}
      await new Promise(r=>setTimeout(r,150));
    }
    assert(url,'Chrome debugging endpoint is available');
    ws=new WebSocket(url);await new Promise(r=>ws.onopen=r);
    let id=0;const pending=new Map();
    ws.onmessage=({data})=>{
      const m=JSON.parse(data);
      if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
      else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
      else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description).join(' '));
    };
    const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});ws.send(JSON.stringify({id:requestId,method,params}));});
    const evaluate=async expression=>{
      const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
      return result.result.value;
    };
    const key=async(key,code=key,vk)=>{await send('Input.dispatchKeyEvent',{type:key==='Enter'?'keyDown':'rawKeyDown',key,code,windowsVirtualKeyCode:vk,...(key==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});};
    const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(`design/arcade-menu/${name}.png`,Buffer.from(r.data,'base64'));};
    await send('Runtime.enable');await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:610,height:530,deviceScaleFactor:1,mobile:false});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await send('Page.navigate',{url:'http://localhost:5173/arcadescreen.html'});
    for(let i=0;i<80;i++){if(await evaluate("document.readyState==='complete'&&document.querySelectorAll('.menu-item').length===4&&[...document.images].filter(i=>!i.closest('[hidden]')).every(i=>i.complete&&i.naturalWidth>0)"))break;await new Promise(r=>setTimeout(r,100));}
    await evaluate('document.fonts.ready');
    assert.equal(await evaluate("[...document.images].filter(i=>!i.closest('[hidden]')).every(i=>i.complete&&i.naturalWidth>0)"),true,'Every artwork asset loaded');
    const geometry=await evaluate(`['.screen','.status-bar','.identity','.credit','main','.menu-panel','.panel-heading','.eyebrow','h1','.intro','.menu-grid','.menu-item','.item-sprite','.menu-label','.item-caption','.selection-bar','.selection-message','.dialogue-sprite','.selection-copy','.selected-name','#section-description','.step-controls','.position','.step-button','.screen-footer'].map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector,x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,color:s.color,backgroundColor:s.backgroundColor}})`);
    await fs.writeFile('design/arcade-menu/adventure-browser-geometry.json',JSON.stringify(geometry,null,2));
    assert.equal(await evaluate("document.documentElement.scrollWidth<=610&&document.documentElement.scrollHeight<=530"),true,'Arcade viewport is not clipped');
    assert.equal(await evaluate("[...document.querySelectorAll('.menu-item')].every(e=>e.querySelector('.menu-label').getBoundingClientRect().width<=e.clientWidth-8)"),true,'All menu labels fit their cards');
    await screenshot('adventure-menu-610x530');
    await evaluate("window.menuEvents=[];window.addEventListener('arcademenu:select',e=>menuEvents.push(e.detail.section));document.querySelector('.menu-item').focus()");
    await key('ArrowRight','ArrowRight',39);
    assert.equal(await evaluate("document.activeElement.dataset.section+'|'+document.querySelector('[aria-pressed=true]').dataset.section"),'experience|experience','Arrow key moves selection and focus');
    await key('Enter','Enter',13);
    assert.deepEqual(await evaluate('menuEvents'),['experience'],'Native Enter emits the section event');
    assert.equal(await evaluate("document.getElementById('dialogue-sprite').src.endsWith('adventure-journal.png')"),true,'Dialogue portrait follows selection');
    await key('End','End',35);
    assert.equal(await evaluate("document.querySelector('[aria-pressed=true]').dataset.section"),'contact','End selects the final card');
    await evaluate("document.getElementById('next').click()");
    assert.equal(await evaluate("document.querySelector('[aria-pressed=true]').dataset.section"),'projects','Next wraps to first card');
    await evaluate("document.getElementById('previous').click()");
    assert.equal(await evaluate("document.querySelector('[aria-pressed=true]').dataset.section"),'contact','Previous wraps to last card');
    assert.equal(await evaluate("document.getAnimations().filter(a=>a.playState==='running').length"),0,'Reduced motion disables all animation');
    await evaluate('choose(0);document.activeElement.blur()');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    const motion=await evaluate("[...document.querySelectorAll('.card-float')].map(e=>({duration:getComputedStyle(e).animationDuration,delay:getComputedStyle(e).animationDelay}))");
    assert.equal(new Set(motion.map(m=>m.duration+'|'+m.delay)).size,4,'Cards have independent idle timing');
    await evaluate("document.querySelectorAll('.menu-item')[3].click()");
    await new Promise(r=>setTimeout(r,120));
    assert.equal(await evaluate("document.querySelectorAll('.menu-item')[3].classList.contains('is-confirmed')"),true,'Selection pop is active');
    assert.equal(await evaluate("[...document.querySelectorAll('.menu-item')[3].querySelectorAll('.card-particle')].some(e=>+getComputedStyle(e).opacity>0)"),true,'Sparkle burst becomes visible');
    await new Promise(r=>setTimeout(r,450));
    assert.equal(await evaluate("document.querySelectorAll('.menu-item')[3].classList.contains('is-confirmed')"),false,'Selection animation clears');
    const hover=await evaluate("(()=>{const r=document.querySelectorAll('.menu-item')[1].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:hover.x,y:hover.y});
    await new Promise(r=>setTimeout(r,220));
    assert.equal(await evaluate("getComputedStyle(document.querySelectorAll('.menu-item')[1].querySelector('.item-sprite')).scale"),'1.12','Hover enlarges the colorful sprite');
    await screenshot('adventure-menu-hover-610x530');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:1,mobile:false});
    await evaluate('choose(0);document.activeElement.blur()');
    await new Promise(r=>setTimeout(r,100));
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.menu-grid')).gridTemplateColumns.split(' ').length"),2,'Narrow screen uses two columns');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=390'),true,'Mobile has no horizontal clipping');
    await screenshot('adventure-menu-390x700');
    await evaluate("document.querySelector('.menu-item').focus()");
    await key('ArrowDown','ArrowDown',40);
    assert.equal(await evaluate('document.activeElement.dataset.section'),'about','Mobile down arrow moves one row');
    assert.deepEqual(errors,[],'No browser console errors');
    await fs.writeFile('design/arcade-menu/adventure-browser-verification.json',JSON.stringify({passed:true,checks:['all image assets loaded','desktop no clipping','all labels fit','roving arrow-key selection','native Enter event','dialogue portrait follows selection','End and previous/next','reduced motion','independent card idle timing','selection pop and sparkle burst','hover enlarges artwork','mobile grid and row navigation','no console errors'],motion,errors},null,2));
    console.log(JSON.stringify({passed:true,checks:13,motion,errors}));
    await send('Browser.close');
  } finally {ws?.close();if(browser.exitCode===null)browser.kill();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
