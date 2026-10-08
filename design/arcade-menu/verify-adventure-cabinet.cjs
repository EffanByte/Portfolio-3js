const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
(async()=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'adventure-cabinet-'));
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new',`--user-data-dir=${profile}`,'--remote-debugging-port=9242','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','about:blank'],{windowsHide:true,stdio:'ignore'});
  let ws;
  const errors=[];
  try {
    let url;
    for(let i=0;i<60;i++){try{url=(await(await fetch('http://localhost:9242/json')).json()).find(x=>x.type==='page')?.webSocketDebuggerUrl;if(url)break;}catch{}await new Promise(r=>setTimeout(r,150));}
    ws=new WebSocket(url);await new Promise(r=>ws.onopen=r);
    const pending=new Map(),scripts=new Map();let id=0,pauseResolver;
    ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Debugger.scriptParsed')scripts.set(m.params.scriptId,m.params.url);else if(m.method==='Debugger.paused')pauseResolver?.(m.params.callFrames);else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description).join(' '));};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});ws.send(JSON.stringify({id:requestId,method,params}));});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
    await send('Runtime.enable');await send('Page.enable');await send('Debugger.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:945,height:532,deviceScaleFactor:1,mobile:false});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await send('Page.navigate',{url:'http://localhost:5173/'});
    await new Promise(r=>setTimeout(r,4000));
    let trigger;
    for(let attempt=0;attempt<20;attempt++) {
      const paused=new Promise((resolve,reject)=>{pauseResolver=resolve;setTimeout(()=>reject(Error('No render-loop debug frame')),10000).unref();});
      const renderLine=(await fs.readFile('main.js','utf8')).split('\n').findIndex(line=>line.includes('  updateCoinAnimation(time);'));
      const breakpoint=await send('Debugger.setBreakpointByUrl',{urlRegex:'/main\\.js(?:\\?.*)?$',lineNumber:renderLine});
      const frames=await paused;
      const frame=frames.find(f=>(scripts.get(f.location.scriptId)??f.url??'').includes('/main.js'));
      assert(frame,'Render loop has its main.js module context');
      trigger=await send('Debugger.evaluateOnCallFrame',{callFrameId:frame.callFrameId,expression:"(()=>{if(!ArcadeMachine||!screen)return {ready:false};const artworkVisible=!!arcadeHtmlScreen&&!screen.visible;const noiseStopped=arcadeScreenMaterial===null;insertCoin();panCameratoScreen();return {ready:true,artworkVisible,noiseStopped,coinStarted:true,screenWidth:screen.geometry.parameters.width*1000,screenHeight:screen.geometry.parameters.height*1000}})()",returnByValue:true});
      await send('Debugger.removeBreakpoint',{breakpointId:breakpoint.breakpointId});
      await send('Debugger.resume');
      if(trigger.exceptionDetails)throw Error(trigger.exceptionDetails.exception?.description??trigger.exceptionDetails.text);
      if(trigger.result.value.ready)break;
      await new Promise(r=>setTimeout(r,1500));
    }
    assert(trigger.result.value.ready,'Arcade model loaded before verification');
    assert(trigger.result.value.artworkVisible,'Artwork is on the cabinet screen before a coin is inserted');
    assert(trigger.result.value.noiseStopped,'Noise rendering is stopped when the artwork is placed');
    let ready=false;
    for(let i=0;i<100;i++){ready=await evaluate("(()=>{const f=document.querySelector('.arcade-screen-frame');return !!f&&f.contentDocument?.querySelectorAll('.menu-item').length===4&&[...f.contentDocument.images].filter(i=>!i.closest('[hidden]')).every(i=>i.complete&&i.naturalWidth>0)})()");if(ready)break;await new Promise(r=>setTimeout(r,100));}
    assert(ready,'The cabinet screen loads all redesigned artwork');
    await new Promise(r=>setTimeout(r,2800));
    assert.equal(await evaluate("document.querySelectorAll('.arcade-screen-frame').length"),1,'Coin animation keeps the existing artwork screen');
    assert.equal(await evaluate("document.querySelector('.arcade-screen-frame').contentDocument.getElementById('menu-title').textContent"),'Choose your adventure.');
    const capture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await fs.writeFile('design/arcade-menu/adventure-menu-in-cabinet.png',Buffer.from(capture.data,'base64'));
    const point=await evaluate("(()=>{const f=document.querySelector('.arcade-screen-frame'),b=f.getBoundingClientRect(),e=f.contentDocument.querySelector('[data-section=contact]'),r=e.getBoundingClientRect();return {x:b.x+(r.x+r.width/2)*b.width/f.clientWidth,y:b.y+(r.y+r.height/2)*b.height/f.clientHeight,projectedWidth:b.width,projectedHeight:b.height}})()");
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:point.x,y:point.y});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:point.x,y:point.y});
    assert.equal(await evaluate("document.querySelector('.arcade-screen-frame').contentDocument.querySelector('[aria-pressed=true]').dataset.section"),'contact','Real pointer input reaches a colorful card through the projected iframe');
    const clickScreen=async selector=>{
      const location=await evaluate(`(()=>{const f=document.querySelector('.arcade-screen-frame'),b=f.getBoundingClientRect(),e=f.contentDocument.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return {x:b.x+(r.x+r.width/2)*b.width/f.clientWidth,y:b.y+(r.y+r.height/2)*b.height/f.clientHeight}})()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...location});
      await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...location});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...location});
    };
    await clickScreen('[data-section=projects]');
    for(let i=0;i<100;i++){if(await evaluate("(()=>{const d=document.querySelector('.arcade-screen-frame').contentDocument;return !d.getElementById('projects-view').hidden&&[...d.querySelectorAll('.project-preview img')].every(i=>i.complete&&i.naturalWidth>0)})()"))break;await new Promise(r=>setTimeout(r,100));}
    assert.equal(await evaluate("document.querySelector('.arcade-screen-frame').contentDocument.querySelectorAll('.project-card').length"),3,'The real cabinet opens the project GIF grid');
    const galleryCapture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await fs.writeFile('design/arcade-menu/projects-grid-in-cabinet.png',Buffer.from(galleryCapture.data,'base64'));
    await clickScreen('[data-project=water-renderer]');
    assert.equal(await evaluate("document.querySelector('.arcade-screen-frame').contentDocument.getElementById('project-title').textContent"),'Water Renderer','A real pointer click opens project details inside the cabinet');
    for(let i=0;i<100;i++){if(await evaluate("(()=>{const i=document.querySelector('.arcade-screen-frame').contentDocument.getElementById('project-gif');return i.complete&&i.naturalWidth>0})()"))break;await new Promise(r=>setTimeout(r,100));}
    const detailCapture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await fs.writeFile('design/arcade-menu/project-detail-in-cabinet.png',Buffer.from(detailCapture.data,'base64'));
    assert.deepEqual(errors,[],'No cabinet browser errors');
    const result={passed:true,artworkVisibleBeforeCoin:true,pointerHitTesting:true,projectsNavigation:true,screen:trigger.result.value,projection:point,errors};
    await fs.writeFile('design/arcade-menu/adventure-cabinet-verification.json',JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));await send('Browser.close');
  }finally{ws?.close();if(browser.exitCode===null)browser.kill();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
