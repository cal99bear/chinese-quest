/* =========================================================================
   Visual verification: drives the real game in headless Chrome over the
   DevTools protocol (no puppeteer needed) and captures screenshots.
   Run:  node tools/visual-check.js      →  /tmp/cq-shots/*.png
   ========================================================================= */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9223 + (process.pid % 200);
const OUT = '/tmp/cq-shots';
const PROFILE = '/tmp/cq-chrome-' + process.pid;
const root = path.join(__dirname, '..');
const fileUrl = 'file://' + path.join(root, 'index.html');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--disable-extensions', '--mute-audio',
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--user-data-dir=' + PROFILE,
  '--remote-debugging-port=' + PORT,
  '--window-size=430,932',
  fileUrl
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const shots = [];

async function target() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      const page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url)) ||
                   list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a debugging target');
}

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.handlers = {};
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) p.rej(new Error(JSON.stringify(m.error)));
        else p.res(m.result);
      } else if (this.handlers[m.method]) {
        this.handlers[m.method](m.params);
      }
    };
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  on(ev, fn) { this.handlers[ev] = fn; }
}

(async function main() {
  let cdp;
  try {
    const t = await target();
    cdp = new CDP(t.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    cdp.on('Runtime.exceptionThrown', (p) => {
      const d = p.exceptionDetails;
      errors.push('exception: ' + ((d.exception && d.exception.description) || d.text));
    });
    cdp.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') errors.push('console.error: ' + p.args.map((a) => a.value || a.description).join(' '));
    });

    const js = async (expression) => {
      const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
      return r.result.value;
    };
    const size = (w, h) => cdp.send('Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    const drain = async () => { await js('App.closeModal(); \'ok\''); await sleep(120); };
    const shot = async (name) => {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png');
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      shots.push(name);
      return file;
    };

    await sleep(900);
    await size(430, 932);
    await sleep(300);
    await shot('01-onboarding');

    await js(`document.querySelector('#obName').value='Amy';
              document.querySelectorAll('[data-obavatar]')[2].click();
              document.querySelector('[data-action="obstart"]').click(); 'ok'`);
    await sleep(600);
    await shot('02-home');

    await js(`document.querySelector('#gamegrid').scrollIntoView({block:'center'}); 'ok'`);
    await sleep(400);
    await shot('03-home-games');

    console.log('boot ok; playing a round…');
    await js(`document.querySelector('[data-game="meaning"]').click(); 'ok'`);
    await sleep(600);
    await shot('04-picture-pick');

    await js(`(()=>{const l=Games.debug();const i=l.currentOptions.findIndex(o=>l.keyOf(o)===l.keyOf(l.answer));
              document.querySelectorAll('#gameHost [data-opt]')[i].click();return 'ok';})()`);
    await sleep(450);
    await shot('05-answer-feedback');

    // finish the round to capture the result card
    await js(`(async()=>{for(let n=0;n<14;n++){
                if(document.querySelector('.modal')) return 'done';
                const l=Games.debug(); if(!l||!l.currentOptions){await new Promise(r=>setTimeout(r,120));continue;}
                const i=l.currentOptions.findIndex(o=>l.keyOf(o)===l.keyOf(l.answer));
                const b=document.querySelectorAll('#gameHost [data-opt]')[i]; if(b) b.click();
                await new Promise(r=>setTimeout(r,700));
              } return 'timeout';})()`);
    await sleep(500);
    await shot('06-result-card');

    // memory board
    await js(`App.closeModal(); Games.stop(); App.show('home'); document.querySelector('[data-game="match"]').click(); 'ok'`);
    await sleep(700);
    await shot('07-memory-match');

    // word builder
    await js(`Games.stop(); App.show('home'); document.querySelector('[data-game="build"]').click(); 'ok'`);
    await sleep(700);
    await shot('08-word-builder');

    // tablet: battle lobby + arena
    await size(900, 1000);
    await js(`Games.stop(); App.show('home'); 'ok'`);
    await sleep(400);
    await js(`document.querySelector('[data-game="battle"]').click(); 'ok'`);
    await sleep(500);
    await shot('09-battle-lobby');

    await js(`document.querySelector('[data-p2="guest"]').click(); document.querySelector('[data-action="duel"]').click(); 'ok'`);
    await js(`(async()=>{for(let i=0;i<80;i++){const r=Battle.debug(); if(r&&r.opts) return 'ready'; await new Promise(x=>setTimeout(x,150));} return 'timeout';})()`);
    await sleep(300);
    await shot('10-battle-arena');

    await js(`(()=>{const r=Battle.debug();const i=r.opts.findIndex(o=>r.keyOf(o)===r.keyOf(r.answer));
              const b=document.querySelector('#opts-p1 [data-i="'+i+'"]'); if(b) b.click(); return 'ok';})()`);
    await sleep(400);
    await shot('11-battle-hit');

    // mobile: learn + word card + collection + settings
    await size(430, 932);
    await js(`Battle.stop(); App.show('learn'); 'ok'`);
    await sleep(500);
    await shot('12-learn');
    await js(`document.querySelectorAll('#screen-learn .wordcard')[0].click(); 'ok'`);
    await sleep(400);
    await shot('13-word-card');
    await js(`App.closeModal(); App.show('collection'); 'ok'`);
    await sleep(400);
    await shot('14-collection');
    await js(`document.querySelector('#screen-collection').scrollIntoView(false);
              window.scrollTo(0, document.body.scrollHeight*0.55); 'ok'`);
    await sleep(300);
    await shot('15-shop-badges');
    await js(`window.scrollTo(0,0); App.show('settings'); 'ok'`);
    await sleep(400);
    await shot('16-settings');

    // adventure map, ranking podium and the generated poster
    await size(430, 932);
    await drain();
    await js('App.show(\'levels\'); \'ok\'');
    await sleep(600);
    await shot('17-adventure-map');
    await js('App.show(\'rank\'); \'ok\'');
    await sleep(700);
    await shot('18-ranking');
    await js('document.querySelector(\'[data-poster="make"]\').click(); \'ok\'');
    await sleep(900);
    await shot('19-ranking-poster');

    console.log('screenshots: ' + shots.length + ' → ' + OUT);
    console.log(errors.length ? 'RUNTIME ERRORS:\n' + errors.join('\n') : '✅ no runtime errors in Chrome');
  } catch (e) {
    console.log('visual check failed: ' + (e && e.stack || e));
  } finally {
    try { if (cdp) cdp.ws.close(); } catch (e) {}
    chrome.kill('SIGKILL');
    await sleep(300);
    fs.rmSync(PROFILE, { recursive: true, force: true });
  }
})();
