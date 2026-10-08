const {spawn} = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');

(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'arcade-projects-'));
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=9243',
    '--no-first-run', '--no-default-browser-check', 'about:blank'
  ], {windowsHide: true, stdio: 'ignore'});
  let ws;
  const errors = [];
  const checks = [];
  try {
    let url;
    for (let i = 0; i < 60; i++) {
      try { url = (await (await fetch('http://localhost:9243/json')).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
      if (url) break;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert(url, 'Chrome debugging endpoint is available');
    ws = new WebSocket(url);
    await new Promise(resolve => { ws.onopen = resolve; });
    const pending = new Map();
    let id = 0;
    ws.onmessage = ({data}) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        message.error ? request.reject(Error(JSON.stringify(message.error))) : request.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(a => a.value ?? a.description).join(' '));
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id;
      pending.set(requestId, {resolve, reject});
      ws.send(JSON.stringify({id: requestId, method, params}));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async (expression, message) => {
      for (let i = 0; i < 160; i++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw Error(message);
    };
    const loaded = "[...document.images].filter(i=>!i.closest('[hidden]')).every(i=>i.complete&&i.naturalWidth>0)";
    const key = async (key, vk) => {
      await send('Input.dispatchKeyEvent', {type: key === 'Enter' ? 'keyDown' : 'rawKeyDown', key, code: key, windowsVirtualKeyCode: vk, ...(key === 'Enter' ? {text: '\r'} : {})});
      await send('Input.dispatchKeyEvent', {type: 'keyUp', key, code: key, windowsVirtualKeyCode: vk});
    };
    const click = async selector => {
      const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      await send('Input.dispatchMouseEvent', {type: 'mouseMoved', ...point});
      await send('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...point});
      await send('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...point});
    };
    const screenshot = async name => {
      const capture = await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
      await fs.writeFile(`design/arcade-menu/${name}.png`, Buffer.from(capture.data, 'base64'));
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {width: 610, height: 530, deviceScaleFactor: 1, mobile: false});
    await send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
    await send('Page.navigate', {url: 'http://localhost:5173/arcadescreen.html'});
    await waitFor(`document.readyState==='complete' && !!document.querySelector('[data-section=projects]') && ${loaded}`, 'Menu did not load');
    await evaluate('document.fonts.ready');
    assert.equal(await evaluate("document.querySelectorAll('.project-card').length"), 0, 'GIF previews are deferred until Projects opens');
    await click('[data-section=projects]');
    await waitFor(`!document.getElementById('projects-view').hidden && document.querySelectorAll('.project-card').length===3 && ${loaded}`, 'Project GIFs did not load');
    assert.equal(await evaluate("document.getElementById('menu-view').hidden"), true);
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.project-card-title')].map(e=>e.textContent)"), ['Water Renderer', 'Starship Sling', 'Reinforcement Learning Trained AI Agent']);
    assert.equal(await evaluate("getComputedStyle(document.getElementById('project-grid')).gridTemplateColumns.split(' ').length"), 3);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=610 && document.documentElement.scrollHeight<=530'), true, 'Gallery fits the arcade viewport');
    assert.equal(await evaluate("(()=>{const g=document.getElementById('project-grid');return g.scrollHeight<=g.clientHeight})()"), true, 'All three gallery cards fit without scrolling at the arcade viewport');
    assert.equal(await evaluate("[...document.querySelectorAll('.project-card')].every(c=>{const t=c.querySelector('.project-card-title').getBoundingClientRect(),r=c.getBoundingClientRect();return t.right<=r.right&&t.bottom<=r.bottom-3})"), true, 'All complete project names fit their cards');
    await screenshot('projects-grid-610x530');
    checks.push('Projects opens a three-card GIF gallery', 'GIF filenames are the project titles', 'Gallery and complete titles fit 610 x 530', 'GIFs load only when Projects opens');
    for (const [index, projectId, imageName] of [[0, 'water-renderer', 'water'], [1, 'starship-sling', 'starship'], [2, 'reinforcement-learning-agent', 'agent']]) {
      await click(`[data-project=${projectId}]`);
      await waitFor(`!document.getElementById('project-detail-view').hidden && ${loaded}`, 'Detail GIF did not load');
      assert.equal(await evaluate('document.getElementById("project-title").textContent'), await evaluate(`arcadeProjects[${index}].title`));
      assert.equal(await evaluate('decodeURIComponent(document.getElementById("project-gif").src).split("/").pop()'), await evaluate(`arcadeProjects[${index}].file`));
      assert.equal(await evaluate('document.querySelectorAll("#project-story p").length'), 2);
      assert.equal(await evaluate('document.activeElement.id'), 'project-title', 'Detail title receives focus');
      assert.equal(await evaluate('document.documentElement.scrollWidth<=610 && document.documentElement.scrollHeight<=530'), true, 'Detail fits the cabinet viewport');
      assert.equal(await evaluate("(()=>{const s=document.querySelector('.project-detail-scroll');return s.scrollHeight<=s.clientHeight})()"), true, 'The complete project explanation fits the arcade display');
      await screenshot(`project-${imageName}-610x530`);
      await key('Escape', 27);
      assert.equal(await evaluate('document.activeElement.dataset.project'), projectId, 'Back restores the selected card');
    }
    checks.push('Each card opens its matching GIF and explanation', 'Detail focus and Escape restore the selected card');
    await key('Home', 36);
    await key('ArrowRight', 39);
    assert.equal(await evaluate('document.activeElement.dataset.project'), 'starship-sling');
    await key('Enter', 13);
    assert.equal(await evaluate('document.getElementById("project-title").textContent'), 'Starship Sling');
    await click('#next-project');
    assert.equal(await evaluate('document.getElementById("project-title").textContent'), 'Reinforcement Learning Trained AI Agent');
    await click('#next-project');
    assert.equal(await evaluate('document.getElementById("project-title").textContent'), 'Water Renderer');
    await key('ArrowLeft', 37);
    assert.equal(await evaluate('document.getElementById("project-title").textContent'), 'Reinforcement Learning Trained AI Agent');
    await click('#back-to-projects');
    await click('#back-to-menu');
    assert.equal(await evaluate('document.activeElement.dataset.section'), 'projects');
    checks.push('Arrow keys and Enter open a project', 'Previous/next project controls wrap', 'Back buttons return to the menu');
    await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 700, deviceScaleFactor: 1, mobile: false});
    await click('[data-section=projects]');
    await key('Home', 36);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=390'), true);
    assert.equal(await evaluate("getComputedStyle(document.getElementById('project-grid')).gridTemplateColumns.split(' ').length"), 1);
    await screenshot('projects-grid-390x700');
    await key('End', 35);
    assert.equal(await evaluate('document.activeElement.dataset.project'), 'reinforcement-learning-agent');
    assert.equal(await evaluate("(()=>{const a=document.activeElement.getBoundingClientRect(),g=document.getElementById('project-grid').getBoundingClientRect();return a.top>=g.top&&a.bottom<=g.bottom})()"), true, 'Keyboard focus scrolls the selected mobile card into view');
    await key('Enter', 13);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=390'), true);
    await screenshot('project-agent-390x700');
    assert.equal(await evaluate("(()=>{const s=document.querySelector('.project-detail-scroll');s.scrollTop=s.scrollHeight;const p=s.querySelector('.project-story p:last-child').getBoundingClientRect(),r=s.getBoundingClientRect();return p.bottom<=r.bottom})()"), true, 'All mobile explanation text can be reached');
    assert.equal(await evaluate("document.getAnimations().filter(a=>a.playState==='running').length"), 0, 'Reduced motion disables UI animations');
    checks.push('Mobile gallery has no horizontal clipping', 'Mobile keyboard focus scrolls into view', 'All detail text is reachable on mobile', 'Reduced motion disables UI animations');
    assert.deepEqual(errors, []);
    const result = {passed: true, checks, errors};
    await fs.writeFile('design/arcade-menu/projects-verification.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    await send('Browser.close');
  } finally { ws?.close(); if (browser.exitCode === null) browser.kill(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
