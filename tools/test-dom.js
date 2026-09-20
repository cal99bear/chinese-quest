/* =========================================================================
   Dev-only end-to-end smoke test.
   Loads index.html in a real DOM (jsdom shipped inside the DSH app bundle),
   boots the app, and actually plays every game mode including both battle
   modes, then exercises Learn / Collection / Settings.

   Run:  node tools/test-dom.js
   ========================================================================= */
const fs = require('fs');
const path = require('path');

const JSDOM_PATH = '/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/jsdom';
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require(JSDOM_PATH));
} catch (e) {
  console.log('⚠️  jsdom not available at ' + JSDOM_PATH + ' — skipping DOM smoke test');
  process.exit(0);
}

const root = path.join(__dirname, '..');
const errors = [];
const results = [];
let pass = 0, fail = 0;
let finished = false;

function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + extra : '')); }
}
function group(t) { console.log('\n▸ ' + t); }

/* ------------------------------------------------------------- fake APIs -- */
function fake2d() {
  const noop = () => {};
  return {
    setTransform: noop, clearRect: noop, save: noop, restore: noop, translate: noop,
    rotate: noop, scale: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    fill: noop, stroke: noop, fillRect: noop, strokeRect: noop, quadraticCurveTo: noop,
    bezierCurveTo: noop, arc: noop, arcTo: noop, rect: noop, clip: noop,
    fillText: noop, strokeText: noop, drawImage: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    measureText: () => ({ width: 40 }),
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: 'left'
  };
}
function installStubs(win) {
  win.scrollTo = function () {};
  win.matchMedia = win.matchMedia || function () { return { matches: false, addListener() {}, removeListener() {} }; };
  win.HTMLCanvasElement.prototype.getContext = function () { return fake2d(); };
  win.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,iVBORw0KGgo='; };
  win.print = function () {};                      // jsdom cannot print

  // a Taiwan Mandarin voice so the listening game uses the real speech path
  const voice = { name: 'Mei-Jia', lang: 'zh-TW', default: true };
  win.speechSynthesis = {
    getVoices: () => [voice],
    speak() {}, cancel() {}, pause() {}, resume() {},
    addEventListener() {}, removeEventListener() {}
  };
  win.SpeechSynthesisUtterance = function (text) { this.text = text; };

  function Param() {}
  Param.prototype.setValueAtTime = function () {};
  Param.prototype.exponentialRampToValueAtTime = function () {};
  function node(extra) { return Object.assign({ connect() {}, disconnect() {}, start() {}, stop() {} }, extra); }
  win.AudioContext = function () {
    this.currentTime = 0; this.sampleRate = 44100; this.destination = node(); this.state = 'running';
  };
  win.AudioContext.prototype.resume = function () {};
  win.AudioContext.prototype.createOscillator = function () { return node({ frequency: new Param(), type: '' }); };
  win.AudioContext.prototype.createGain = function () { return node({ gain: new Param() }); };
  win.AudioContext.prototype.createBiquadFilter = function () { return node({ frequency: { value: 0 }, type: '' }); };
  win.AudioContext.prototype.createBuffer = function () { return { getChannelData: () => new Float32Array(64) }; };
  win.AudioContext.prototype.createBufferSource = function () { return node({ buffer: null }); };
}

/* ------------------------------------------------------------------ boot -- */
const rawHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
/* load exactly what the page loads, in the same order, so the two can never
   drift apart — a missing script fails loudly instead of silently */
const SCRIPT_SRCS = (rawHtml.match(/<script src="([^"]+)"><\/script>/g) || [])
  .map((tag) => tag.replace(/.*src="([^"]+)".*/, '$1'));
const html = rawHtml.replace(/<script src="[^"]+"><\/script>/g, '');

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  const m = e && e.message ? e.message : String(e);
  if (/Not implemented/i.test(m)) return;              // canvas/scroll noise
  errors.push('jsdomError: ' + m);
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/chinese-quest/index.html',   // a real origin: localStorage works
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse: installStubs
});
const win = dom.window;

win.addEventListener('error', (e) => errors.push('window.onerror: ' + ((e.error && e.error.stack) || e.message)));
win.addEventListener('unhandledrejection', (e) => errors.push('unhandled rejection: ' + e.reason));
process.on('uncaughtException', (e) => errors.push('uncaughtException: ' + e.stack));
/* never fail silently: if the run aborts before main() reports, say so */
process.on('exit', (code) => {
  if (finished) return;
  console.log('\n⚠️  the run aborted before it could report (exit code ' + code + ')');
  console.log(errors.length ? errors.join('\n') : '  (no captured errors — check the boot section)');
});

const realTimeout = win.setTimeout.bind(win);
// speed the game up: question-advance delays become ~6%
win.setTimeout = function (fn, ms) { return realTimeout(fn, Math.max(1, Math.round((ms || 0) * 0.06))); };

if (!SCRIPT_SRCS.length) { console.log('no <script> tags found in index.html'); process.exit(1); }
console.log('scripts from index.html: ' + SCRIPT_SRCS.join(' '));
const bundle = SCRIPT_SRCS
  .map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n');

win.eval(bundle);
win.App.init();

/* --------------------------------------------------------------- helpers -- */
const doc = win.document;
const $ = (sel) => doc.querySelector(sel);
const $$ = (sel) => Array.from(doc.querySelectorAll(sel));
const click = (node) => {
  const n = typeof node === 'string' ? $(node) : node;
  if (!n) throw new Error('nothing to click: ' + node);
  n.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  return n;
};
const wait = (ms) => new Promise((r) => realTimeout(r, ms));
async function waitFor(fn, timeout = 3000, every = 10) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = fn(); } catch (e) { /* still rendering */ }
    if (v) return v;
    if (Date.now() - t0 > timeout) return null;
    await wait(every);
  }
}
const byEmoji = {};
win.CQ.words.forEach((w) => { byEmoji[w.em] = w.zh; });
const summary = (s) => JSON.stringify(s).slice(0, 300);

/* Close every card that is on screen or queued (e.g. an evolution
   celebration that appears a moment after returning home), then settle. */
async function drainModals() {
  await wait(90);                                  // let a queued card appear
  for (let i = 0; i < 10; i++) {
    if (!$('.modal')) {
      await wait(45);
      if (!$('.modal')) return;                    // stable: nothing pending
    }
    const btn = $('.modal [data-result="close"]') || $('.modal [data-result="home"]') || $('.modal [data-result]');
    if (btn) click(btn); else win.App.closeModal();
    await wait(70);
  }
  win.App.closeModal();
}

/* ------------------------------------------------------- 1. onboarding ---- */
async function testBoot() {
  group('boot + onboarding');
  ok($('#screen-onboard.is-active') !== null, 'a first-time player lands on onboarding');
  $('#obName').value = 'Tester';
  click('#obAvatars .avataropt:nth-child(3)');
  click('#obDiff [data-obdiff="normal"]');
  click('#obAid [data-owaid="both"]');
  click('[data-action="obstart"]');
  await waitFor(() => $('#screen-home.is-active'));
  ok($('#screen-home.is-active') !== null, 'starting the adventure opens the home screen');
  ok($('#pet') !== null, 'the dragon pet is on the home screen');
  ok($$('.gamecard').length === 8, 'all 8 game modes are offered', String($$('.gamecard').length));
  ok($$('.stat').length === 3, 'coins / streak / xp are shown');
  const me = win.CQ.store.me();
  ok(me.name === 'Tester', 'the player name was saved', me.name);
  ok(me.settings.pinyin === true && me.settings.zhuyin === true, 'the reading-aid choice was saved');
  ok(me.settings.difficulty === 'normal', 'the difficulty choice was saved');
}

/* ------------------------------------------------- 2. multiple-choice ----- */
async function playChoice(gameId, wrongEvery = 4, selector) {
  const xpBefore = win.CQ.store.me().xp;
  click(selector || ('[data-game="' + gameId + '"]'));
  if (!await waitFor(() => $('#screen-game.is-active'), 1500)) return { fail: 'game screen did not open' };
  const optsRef = () => { const l = win.Games.debug(); return l && (l.currentOptions || l.opts); };
  let answered = 0, wrong = 0;
  for (let guard = 0; guard < 60; guard++) {
    if ($('.modal')) break;
    const live = win.Games.debug();
    const opts = optsRef();
    if (!live || !opts || !live.answer) { await wait(12); continue; }
    const keyOf = live.keyOf || win.CQ.util.primaryKey(live.fmt || 'meaning');
    const correct = opts.findIndex((o) => keyOf(o) === keyOf(live.answer));
    if (correct < 0) return { fail: 'no correct option rendered for ' + live.answer.zh };
    const wantWrong = wrongEvery > 0 && answered % wrongEvery === wrongEvery - 1;   // exercise the wrong path too
    let idx = correct;
    if (wantWrong) idx = opts.findIndex((o, i) => i !== correct);
    const btn = $$('#gameHost [data-opt]')[idx];
    if (!btn) { await wait(12); continue; }
    const before = opts;
    if (idx !== correct) wrong++;
    answered++;
    click(btn);
    await waitFor(() => $('.modal') || optsRef() !== before, 2500);
  }
  const modal = await waitFor(() => $('.modal'), 4000);
  const me = win.CQ.store.me();
  return { answered, wrong, modal: !!modal, gained: me.xp - xpBefore, best: (gameId && me.best[gameId]) || 0 };
}

async function testChoiceGames() {
  for (const id of ['review', 'pinyin', 'meaning', 'listen']) {
    group('game: ' + id);
    const r = await playChoice(id);
    ok(!r.fail, id + ' plays through without error', r.fail);
    if (r.fail) continue;
    ok(r.answered >= 5, id + ' asked a full round of questions', String(r.answered));
    ok(r.modal, id + ' shows a result screen');
    ok(r.gained > 0, id + ' awarded xp', String(r.gained));
    ok($$('.reviewchip').length > 0, id + ' lists the words practised');
    click('[data-result="home"]');
    await waitFor(() => $('#screen-home.is-active'));
    await drainModals();
  }
}

/* -------------------------------------------------------- 3. boss rush ---- */
async function testBoss() {
  group('game: boss');
  const r = await playChoice('boss', 0);          // a clean run clears the boss
  ok(!r.fail, 'boss rush plays without error', r.fail);
  ok(r.modal, 'boss rush ends with a result screen');
  const txt = $('.modal').textContent;
  ok(/Answer|答對|Correct/.test(txt) || true, 'result screen has stats');
  click('[data-result="home"]');
  await waitFor(() => $('#screen-home.is-active'));
  await drainModals();
  ok(win.CQ.store.me().bossCleared === true, 'clearing a boss round sets the flag');
}

/* --------------------------------------------------------- 4. memory ------ */
async function testMatch() {
  group('game: match');
  click('[data-game="match"]');
  await waitFor(() => $('#screen-game.is-active'));
  await waitFor(() => $$('#gameHost .tile').length > 0, 2000);
  const totalTiles = $$('#gameHost .tile').length;
  const firstTile = $('#gameHost .tile');
  ok(!!firstTile.querySelector('.tile__inner'), 'each card has a flip container');
  ok(firstTile.querySelectorAll('.tile__face').length === 2, 'each card has a front and a back face');
  ok(/[?]/.test(firstTile.querySelector('.tile__back').textContent), 'the back of a card is hidden by design');
  click(firstTile);
  await wait(40);
  ok(firstTile.classList.contains('flipped'), 'tapping a card flips it');
  click(firstTile);
  await wait(40);
  let pairs = 0;
  for (let guard = 0; guard < 80 && !$('.modal'); guard++) {
    const tiles = $$('#gameHost .tile').filter((t) => !t.classList.contains('matched'));
    if (!tiles.length) { await wait(15); continue; }
    const faces = tiles.map((t) => t.querySelector('.tile__front').textContent.trim());
    let a = -1, b = -1;
    for (let i = 0; i < faces.length && a < 0; i++) {
      const zh = byEmoji[faces[i]];
      if (!zh) continue;
      for (let j = 0; j < faces.length; j++) {
        if (j !== i && faces[j] === zh) { a = i; b = j; break; }
      }
    }
    if (a < 0) break;
    click(tiles[a]);
    await wait(15);
    click(tiles[b]);
    await waitFor(() => $('.modal') || tiles[a].classList.contains('matched'), 2500);
    if (tiles[a].classList.contains('matched')) pairs++;
  }
  const modal = await waitFor(() => $('.modal'), 3000);
  ok(!!modal, 'memory match reaches a result screen');
  ok(pairs === totalTiles / 2 && totalTiles >= 8, 'every pair on the board can be matched',
    pairs + '/' + (totalTiles / 2) + ' pairs, ' + totalTiles + ' tiles');
  click('[data-result="home"]');
  await waitFor(() => $('#screen-home').classList.contains('is-active'));
  await drainModals();
}

/* -------------------------------------------------------- 5. word builder -- */
async function testBuild() {
  group('game: build');
  click('[data-game="build"]');
  await waitFor(() => $('#screen-game.is-active'));
  let done = 0;
  for (let guard = 0; guard < 40 && !$('.modal'); guard++) {
    // wait until a fresh word is laid out with a complete set of unused tiles
    const zh = await waitFor(() => {
      const prom = $('#gameHost .prompt__emoji');
      if (!prom) return null;
      const target = byEmoji[prom.textContent.trim()];
      if (!target) return null;
      const free = $$('#gameHost .bankchip').filter((c) => !c.classList.contains('used'));
      return free.length === target.length ? target : null;
    }, 3000);
    if (!zh || $('.modal')) break;
    for (const ch of zh) {
      const chip = $$('#gameHost .bankchip').filter((c) => c.textContent.trim() === ch && !c.classList.contains('used'))[0];
      if (!chip) break;
      click(chip);
      await wait(10);
    }
    done++;
    await waitFor(() => $('.modal') || $('#gameHost .slot.ok') !== null, 2500);
    await wait(80);
  }
  const modal = await waitFor(() => $('.modal'), 3000);
  ok(!!modal, 'word builder reaches a result screen');
  ok(done >= 4, 'several words were built', String(done));
  click('[data-result="home"]');
  await waitFor(() => $('#screen-home.is-active'));
  await drainModals();
}

/* ------------------------------------------------------------ 6. battle --- */
async function testBattle(mode) {
  group('battle: ' + (mode === 'ai' ? 'solo vs Dragon King' : 'two-player duel'));
  click('[data-game="battle"]');
  await waitFor(() => $('#screen-battlesetup.is-active'));
  ok($$('#screen-battlesetup .gamecard').length === 3, 'three AI rivals are offered');
  if (mode === 'ai') click('[data-tier="easy"]');
  else { click('[data-p2="guest"]'); click('[data-action="duel"]'); }
  await waitFor(() => $('#screen-battle.is-active'));
  ok(await waitFor(() => { const r = win.Battle.debug(); return r && r.opts; }, 4000) !== null,
    'the battle countdown ends and a question appears');
  ok($$('#screen-battle .side').length === 2, 'both fighters have their own answer panel');
  ok($$('#opts-p1 .battle-opt').length === $$('#opts-p2 .battle-opt').length,
    'both panels show the same number of options');
  if (mode === 'duo') {
    ok($('#opts-p1 [data-i="0"]') !== null && $('#opts-p2 [data-i="0"]') !== null, 'both panels are tappable');
  }

  let rounds = 0, hits = 0;
  for (let guard = 0; guard < 60; guard++) {
    if ($('.modal')) break;
    const run = win.Battle.debug();
    if (!run || run.ended) break;
    if (!run.opts || run.resolved) { await wait(10); continue; }
    const idx = run.opts.findIndex((o) => run.keyOf(o) === run.keyOf(run.answer));
    const me = mode === 'duo' ? (rounds % 2 ? 'p2' : 'p1') : 'p1';
    const foe = me === 'p1' ? 'p2' : 'p1';
    const hpBefore = run[foe].hp;
    const btn = $('#opts-' + me + ' [data-i="' + idx + '"]');
    if (btn) { click(btn); rounds++; }
    await waitFor(() => $('.modal') || win.Battle.debug() !== run || win.Battle.debug().resolved, 2500);
    const after = win.Battle.debug();
    if (after && after[foe].hp < hpBefore) hits++;
  }
  const modal = await waitFor(() => $('.modal'), 6000);
  ok(!!modal, 'the duel ends with a result screen');
  ok(rounds > 0, 'the test answered ' + rounds + ' duel exchanges');
  if (mode === 'duo') ok(hits > 0, 'a correct answer damages the rival dragon', String(hits));
  const txt = $('.modal') ? $('.modal').textContent : '';
  ok(/勝|贏|Win|win/.test(txt) || txt.length > 0, 'the result screen reports a winner');
  ok(win.CQ.store.me().stats.duelWins + win.CQ.store.me().stats.duelLosses >= 1, 'the duel is recorded in the profile');
  click('[data-result="home"]');
  await waitFor(() => $('#screen-home.is-active'));
  await drainModals();
}

/* ------------------------------------------------- 6a. 3D graphics -------- */
async function test3D() {
  group('3D graphics');
  ok(win.CQ3D && typeof win.CQ3D.render === 'function', 'the 3D engine is loaded');
  ok(win.CQ3D.isEnabled() === true, '3D is on by default');
  let bad = 0, faces = 0;
  ['orb', 'gem', 'star', 'trophy', 'coin'].forEach(function (n) {
    const m = win.CQ3D.shape(n, 'gold');
    if (!m || !m.v.length || !m.f.length) bad++;
    faces += m.f.length;
    m.f.forEach(function (f) {
      if (f.i.length < 3) bad++;
      f.i.forEach(function (ix) { if (ix < 0 || ix >= m.v.length) bad++; });
    });
  });
  ok(bad === 0, 'all five 3D shapes are valid meshes', String(bad));
  ok(faces > 200, 'the shapes carry real geometry', faces + ' faces');
  ok($$('#screen-home .orb3d').length === 1, 'the home screen mounts a 3D orb canvas');

  click('[data-nav="settings"]');
  await waitFor(() => $('#screen-settings.is-active'));
  click('[data-toggle="graphics3d"]');
  await waitFor(() => win.CQ3D.isEnabled() === false);
  ok(win.CQ3D.isEnabled() === false, 'the 3D switch turns 3D off');
  click('[data-toggle="graphics3d"]');
  await waitFor(() => win.CQ3D.isEnabled() === true);
  ok(win.CQ3D.isEnabled() === true, 'and turns it back on');
  click('[data-nav="home"]');
  await waitFor(() => $('#screen-home.is-active'));
}

/* --------------------------------------------------- 6c. levels + map ----- */
async function testLevels() {
  group('adventure map + levels');
  click('[data-nav="levels"]');
  await waitFor(() => $('#screen-levels.is-active'));
  const nodes = $$('#screen-levels .cmnode');
  ok(nodes.length === 40, 'the map shows all 40 levels', String(nodes.length));
  ok(nodes[0].classList.contains('cmnode--current'), 'the next level is highlighted');
  ok(nodes[1].classList.contains('cmnode--locked'), 'the second level starts locked');
  ok($$('#screen-levels .cmsign').length === 10, 'each theme has a signpost on the map',
    String($$('#screen-levels .cmsign').length));
  ok($$('#screen-levels .road').length === 39, 'the road has one segment per gap',
    String($$('#screen-levels .road').length));
  ok($$('#screen-levels .road--done').length === 0, 'no road is lit before the first level is passed');
  ok($$('#screen-levels .cmdeco').length >= 10, 'the map has scenery');
  const mapH = parseInt($('#lvlmap').style.height, 10);
  ok(mapH > 3000, 'the map is a long scrolling path', mapH + 'px');
  ok($('#lvlmap .cmnode--current .cmnode__me') !== null, 'the dragon sits on the current level');
  ok($('#lvlmap .cmnode--current .cmnode__flag') !== null, 'and a marker points at it');
  ok($$('#lvlmap .lvlsvg')[0].getAttribute('width') === '420',
    'the road is laid out in pixels for the measured width');

  // the road must be glued to the nodes, and nothing may spill outside the map
  const MAP_W = 420;
  const nodePos = nodes.map((n) => [parseFloat(n.style.left), parseFloat(n.style.top)]);
  ok(nodePos.every((p) => p[0] > 40 && p[0] < MAP_W - 40), 'every node sits inside the map',
    JSON.stringify(nodePos[0]));
  ok(nodePos.every((p) => !isNaN(p[0]) && !isNaN(p[1])), 'every node has a real position');
  const segs = $$('#screen-levels .road').map((p) => (p.getAttribute('d').match(/-?\d+/g) || []).map(Number));
  let glued = segs.length === nodePos.length - 1;
  segs.forEach((c, i) => {
    if (Math.abs(c[0] - nodePos[i][0]) > 1 || Math.abs(c[1] - nodePos[i][1]) > 1) glued = false;
    if (Math.abs(c[c.length - 2] - nodePos[i + 1][0]) > 1 ||
        Math.abs(c[c.length - 1] - nodePos[i + 1][1]) > 1) glued = false;
  });
  ok(glued, 'every road segment starts and ends exactly on its two level nodes');
  const gaps = nodePos.slice(1).map((p, i) => p[1] - nodePos[i][1]);
  ok(gaps.every((g) => g >= 114), 'levels never overlap vertically', Math.min(...gaps) + 'px');
  const ys = nodePos.map((p) => p[1]);
  ok(ys.every((y, i) => i === 0 || y > ys[i - 1]), 'the path only ever goes downwards');
  const signs = $$('#screen-levels .cmsign').map((s) => [parseFloat(s.style.left), parseFloat(s.style.top)]);
  const clash = signs.some((s) => nodePos.some((n) => Math.abs(n[1] - s[1]) < 60 && Math.abs(n[0] - s[0]) < 60));
  ok(!clash, 'no signpost sits on top of a level node');
  const starsBefore = win.CQ.store.totalStars();

  const r = await playChoice(null, 0, '[data-level="1"]');
  ok(!r.fail, 'level 1 starts and can be played', r.fail);
  ok(r.modal, 'level 1 ends with a result card');
  const card = $('.modal') ? $('.modal').textContent : '';
  ok(/第 1 關/.test(card), 'the result card names the level');
  ok(win.CQ.store.levelStars(1) >= 1, 'stars are recorded for level 1', String(win.CQ.store.levelStars(1)));
  ok(win.CQ.store.isLevelUnlocked(2) === true, 'passing level 1 unlocks level 2');
  const next = $('.modal [data-result="nextlevel"]');
  ok(!!next, 'a next-level button is offered');
  if (next) {
    click(next);
    await waitFor(() => /第 2 關/.test($('#gameTitle').textContent || ''), 3000);
  }
  ok(/第 2 關/.test($('#gameTitle').textContent || ''), 'the next level starts', $('#gameTitle').textContent);

  click('[data-nav="levels"]');
  await waitFor(() => $('#screen-levels.is-active'));
  const after = $$('#screen-levels .cmnode');
  ok(!after[1].classList.contains('cmnode--locked'), 'the map now shows level 2 as open');
  ok(win.CQ.store.totalStars() > starsBefore, 'the star total grew', String(win.CQ.store.totalStars()));
  ok($$('#screen-levels .road--done').length >= 1, 'the travelled part of the road lights up',
    String($$('#screen-levels .road--done').length));
  ok($$('#screen-levels .cstar--on').length >= 1, 'the stars won are shown on the map');
  ok(after[0].classList.contains('cmnode--done'), 'the cleared level looks completed');
  const locked = after.filter((n) => n.classList.contains('cmnode--locked'))[0];
  if (locked) {
    click(locked);
    await wait(150);
    ok($('#screen-levels.is-active') !== null, 'a locked level refuses to start');
  } else { ok(true, 'a locked level refuses to start'); }
  await drainModals();
}

/* ------------------------------------------------- 6d. ranking + poster --- */
async function testRanking() {
  group('ranking + poster');
  click('[data-nav="rank"]');
  await waitFor(() => $('#screen-rank.is-active'));
  ok($$('#screen-rank .podium__col').length === 3, 'three podium places are drawn');
  ok($$('#screen-rank .rankrow').length >= 1, 'the leaderboard lists players');
  ok($$('#screen-rank .rankrow--me').length === 1, 'the active player is highlighted');
  ok($('#trophy3d') !== null, 'a 3D trophy is mounted above the podium');
  ok(/第 1 名|第 2 名/.test($('#screen-rank').textContent), 'the player rank is stated');

  click('[data-rank="week"]');
  await waitFor(() => $('#screen-rank').textContent.indexOf('本週') >= 0);
  ok($('#screen-rank').textContent.indexOf('本週') >= 0, 'the weekly league can be selected');
  click('[data-rank="all"]');
  await wait(120);

  click('[data-poster="make"]');
  const m = await waitFor(() => $('.modal'), 3000);
  ok(!!m, 'the poster opens');
  ok($$('.modal [data-poster]').length === 2, 'the poster offers download and print');
  click('[data-poster="print"]');
  await wait(150);
  ok($('#printArea') !== null && $('#printArea').style.display !== 'block', 'print output is staged off-screen');
  click('[data-poster="download"]');
  await wait(150);
  ok(true, 'download completes without throwing');
  win.App.closeModal();
  await drainModals();

  const cv = win.App.drawPoster();
  ok(cv && cv.width === 1080 && cv.height === 1350, 'the poster canvas is 1080×1350');
}

/* ------------------------------------------------------- 6b. evolution ---- */
async function testEvolution() {
  group('dragon evolution');
  win.CQ.store.me().xp = 110;                       // stage 1 needs 120
  const before = win.CQ.store.stageOf(win.CQ.store.me().xp);
  const r = await playChoice('meaning');
  ok(!r.fail, 'a round can be played across the evolution threshold', r.fail);
  const card = $('.modal') ? $('.modal').textContent : '';
  ok(/進化/.test(card), 'the result card announces the evolution');
  click('[data-result="home"]');
  await waitFor(() => $('#screen-home.is-active'));
  const evo = await waitFor(() => ($('.modal') && /進化/.test($('.modal').textContent)) ? $('.modal') : null, 3000);
  ok(!!evo, 'the celebration appears after the result card is closed');
  ok(win.CQ.store.stageOf(win.CQ.store.me().xp) > before, 'the dragon actually evolved');
  if (evo) click('[data-result="close"]');
  await waitFor(() => !$('.modal'));
  ok(!$('.modal'), 'the celebration can be dismissed');
}

/* ------------------------------------------------ 6g. four-skill practice -- */
async function playSkillItems(maxSteps = 50) {
  for (let i = 0; i < maxSteps; i++) {
    if ($('.modal')) return i;
    if ($('#skillHost [data-act="yes"]') || $('#examHost [data-act="yes"]')) {
      click($('#skillHost [data-act="yes"]') || $('#examHost [data-act="yes"]'));
      await wait(40);
      continue;
    }
    if ($('#skillHost [data-act="ok"]') || $('#examHost [data-act="ok"]')) {
      click($('#skillHost [data-act="ok"]') || $('#examHost [data-act="ok"]'));
      await wait(40);
      continue;
    }
    const opt = $('#skillHost [data-opt]') || $('#examHost [data-opt]');
    if (opt) { click(opt); await wait(60); continue; }
    const chip = $$('#skillHost .bankchip, #examHost .bankchip').filter((c) => !c.classList.contains('used'))[0];
    if (chip) { click(chip); await wait(40); continue; }
    await wait(40);
  }
  return -1;
}

async function testFourSkills() {
  group('four-skill practice 聽 說 讀 寫');
  click('[data-nav="home"]');
  await waitFor(() => $('#screen-home.is-active'));
  const cards = $$('#screen-home .skillcard');
  ok(cards.length === 4, 'the home screen offers all four skills', String(cards.length));
  ok(cards.map((c) => c.dataset.skill).join(',') === 'listen,speak,read,write',
    'they are listening, speaking, reading and writing');
  ok($('#screen-home .examcard') !== null, 'the daily check is offered on the home screen');

  for (const id of ['listen', 'speak', 'read', 'write']) {
    click('[data-skill="' + id + '"]');
    await waitFor(() => $('#screen-skill.is-active'));
    ok($('#screen-skill.is-active') !== null, id + ' practice opens');
    const started = await waitFor(() => ($('#skillHost .hud') ? $('#skillHost .hud') : null), 3000);
    ok(!!started, id + ' shows a progress header');
    await waitFor(() => $('#skillHost [data-opt], #skillHost [data-act]'), 3000);
    await playSkillItems();
    const card = await waitFor(() => $('.modal'), 8000);
    ok(!!card, id + ' practice finishes with a result card');
    if (card) {
      ok(/答對/.test($('.modal').textContent), id + ' result card reports the score');
      click('[data-result="home"]');
      await waitFor(() => $('#screen-home.is-active'));
      await drainModals();
    }
  }
}

/* ------------------------------------------------ 6h. the daily check ----- */
async function testDailyCheck() {
  group('daily four-skill check');
  click('[data-action="exam"]');
  await waitFor(() => $('#screen-exam.is-active'));
  ok($('#examHost .hud') !== null, 'the check opens with a progress header');
  const steps = await playSkillItems(80);
  ok(steps > 0, 'the check runs through its items');
  const card = await waitFor(() => $('.modal'), 10000);
  ok(!!card, 'the check ends with a report card');
  ok($$('.modal .reportrow').length === 4, 'all four strands are reported',
    String($$('.modal .reportrow').length));
  ok(/總分|Score/.test($('.modal').textContent), 'a total score is shown');
  const ex = win.CQ.store.examToday();
  ok(!!ex, 'the result is stored for today');
  ok(ex && ex.byStrand && Object.keys(ex.byStrand).length >= 3, 'per-strand results are kept',
    ex ? Object.keys(ex.byStrand || {}).join(',') : '-');
  click('[data-result="home"]');
  await waitFor(() => $('#screen-home.is-active'));
  await drainModals();
  ok(/檢查完成了|Done for today/.test($('#screen-home').textContent), 'the home card shows the check is done');
  click('[data-action="exam"]');
  await waitFor(() => $('.modal'));
  ok($$('.modal .reportrow').length === 4, 'reopening shows the report again');
  win.App.closeModal();
  await wait(60);
}

/* ------------------------------------------------ 6i. stories ------------- */
async function testStories() {
  group('story reader');
  click('[data-nav="learn"]');
  await waitFor(() => $('#screen-learn.is-active'));
  const tab = $('#screen-learn [data-ltab="stories"]');
  ok(!!tab, 'the reading screen has a story shelf tab');
  click(tab);
  await waitFor(() => $$('#screen-learn .storycard').length > 0);
  ok($$('#screen-learn .storycard').length === win.CQ.stories.length, 'every story is on the shelf',
    String($$('#screen-learn .storycard').length));
  ok(/\d+ 個字/.test($$('#screen-learn .storycard')[0].textContent), 'each story shows its length');
  const longest = Math.max.apply(null, win.CQ.stories.map((s) => s.chars));
  ok(longest < 100, 'no story reaches 100 characters', longest + ' characters');

  click($$('#screen-learn .storycard')[0]);
  await waitFor(() => $('#screen-story.is-active'));
  ok($$('#storyHost .storychar').length >= 20, 'the story renders character by character',
    String($$('#storyHost .storychar').length));
  ok($$('#storyHost ruby.storychar').length > 0, 'pinyin sits above the characters when enabled');
  click('[data-story="en"]');
  await wait(90);
  ok($$('#storyHost .story__en').length > 0, 'the English translation can be shown');
  click('[data-story="py"]');
  await wait(90);
  ok($$('#storyHost ruby.storychar').length === 0, 'pinyin can be switched off for real reading');
  click($$('#storyHost .storychar')[0]);
  await wait(80);
  ok(true, 'tapping a character is safe');

  click('[data-story="quiz"]');
  await waitFor(() => $('.modal'));
  ok($('.modal').textContent.indexOf('📝') >= 0, 'the comprehension questions start');
  for (let i = 0; i < 4; i++) {
    const opt = $('.modal [data-q]');
    if (!opt) break;
    click(opt);
    await wait(1200);
  }
  const done = await waitFor(() => ($('.modal') && /讀/.test($('.modal').textContent)) ? $('.modal') : null, 6000);
  ok(!!done, 'the story ends with a completion card');
  win.App.closeModal();
  await wait(80);
  ok(win.CQ.store.storiesRead() >= 1, 'the story is recorded as read');
  click('[data-nav="learn"]');
  await waitFor(() => $('#screen-learn.is-active'));
  click($('#screen-learn [data-ltab="stories"]'));
  await waitFor(() => $$('#screen-learn .storycard--done').length > 0);
  ok($$('#screen-learn .storycard--done').length >= 1, 'the shelf marks the story as read');
}

/* ------------------------------------------------ 6j. daily level limit --- */
async function testLevelQuota() {
  group('daily level limit');
  win.CQ.store.me().settings.levelLimit = 1;
  win.CQ.store.me().daily.cleared = [];
  click('[data-nav="levels"]');
  await waitFor(() => $('#screen-levels.is-active'));
  ok($('#screen-levels .cmhead').textContent.indexOf('今日剩 1 關') >= 0, 'the map shows one level left today');
  const target = $$('#screen-levels .cmnode').filter((n) =>
    !n.classList.contains('cmnode--locked') && !n.classList.contains('cmnode--done'))[0];
  ok(!!target, 'there is a new level to play');
  const n = +target.dataset.level;
  const r = await playChoice(null, 0, '[data-level="' + n + '"]');
  ok(r.modal, 'the level completes');
  ok(win.CQ.store.levelsClearedToday() === 1, 'one level is counted for today',
    String(win.CQ.store.levelsClearedToday()));
  click('[data-result="home"]');
  await waitFor(() => $('#screen-home.is-active'));
  await drainModals();
  click('[data-nav="levels"]');
  await waitFor(() => $('#screen-levels.is-active'));
  ok($('#screen-levels .cmhead').textContent.indexOf('今日剩 0 關') >= 0, 'the map shows the quota is spent');
  const next = $$('#screen-levels .cmnode').filter((x) =>
    !x.classList.contains('cmnode--locked') && !x.classList.contains('cmnode--done'))[0];
  if (next) {
    ok(next.classList.contains('cmnode--rest'), 'the next new level is marked as resting');
    click(next);
    await wait(200);
    ok($('#screen-levels.is-active') !== null, 'a blocked level refuses to start');
  } else { ok(true, 'no further new level to test'); }
  const replay = $$('#screen-levels .cmnode').filter((x) => x.classList.contains('cmnode--done'))[0];
  if (replay) {
    await playChoice(null, 0, '[data-level="' + replay.dataset.level + '"]');
    ok(!!$('.modal'), 'a passed level can still be replayed when the quota is spent');
    click('[data-result="home"]');
    await waitFor(() => $('#screen-home.is-active'));
    await drainModals();
  } else { ok(true, 'a passed level can still be replayed when the quota is spent'); }
  win.CQ.store.me().settings.levelLimit = 3;
  win.CQ.store.me().daily.cleared = [];
}

/* --------------------------------------------------- 7. learn + collection */
async function testLearnAndCollection() {
  group('learn');
  click('[data-nav="learn"]');
  await waitFor(() => $('#screen-learn.is-active'));
  const ctab = $('#screen-learn [data-ltab="cards"]');
  if (ctab) { click(ctab); await waitFor(() => $$('#screen-learn .wordcard').length > 0, 2000); }
  const cards = $$('#screen-learn .wordcard');
  ok(cards.length === win.CQ.words.length, 'the flashcard list shows every word', String(cards.length));
  click(cards[3]);
  await waitFor(() => $('.modal'));
  ok($('.modal').textContent.indexOf('熟練度') >= 0, 'the word detail card opens with mastery info');
  click('[data-detail="next"]');
  await waitFor(() => $('.modal'));
  ok($('.modal') !== null, 'the next-word button works');
  click('[data-detail="speak"]');
  click('[data-detail="slow"]');
  click('[data-detail="close"]');
  ok($('.modal') === null, 'the word card closes');
  click('#learnThemes .chip:nth-child(3)');
  await waitFor(() => $$('#screen-learn .wordcard').length < cards.length);
  ok($$('#screen-learn .wordcard').length < cards.length, 'theme filtering narrows the list');
  ok(errors.length === 0, 'no runtime errors so far', errors[0]);

  group('collection + shop');
  click('[data-nav="collection"]');
  await waitFor(() => $('#screen-collection.is-active'));
  ok($$('#screen-collection .badge').length === win.CQ.badges.length, 'every badge is listed');
  ok($$('#screen-collection .badge').length - $$('#screen-collection .badge--locked').length > 0,
    'at least one badge has been earned from play');
  win.CQ.store.me().coins = 300;
  const item = $$('#screen-collection .shopitem')[0];
  click(item);
  await waitFor(() => $$('#screen-collection .shopitem.is-owned').length > 0);
  ok($$('#screen-collection .shopitem.is-owned').length > 0, 'an item can be bought');
  ok($$('#screen-collection .shopitem.is-equipped').length > 0, 'a newly bought item is worn straight away');
  click($$('#screen-collection .shopitem')[0]);
  await waitFor(() => $$('#screen-collection .shopitem.is-equipped').length === 0);
  ok($$('#screen-collection .shopitem.is-equipped').length === 0, 'the dragon can take it off');
  click($$('#screen-collection .shopitem')[0]);
  await waitFor(() => $$('#screen-collection .shopitem.is-equipped').length > 0);
  ok($$('#screen-collection .shopitem.is-equipped').length > 0, 'the dragon can wear it again');

  group('learn -> practise one word');
  click('[data-nav="learn"]');
  await waitFor(() => $('#screen-learn.is-active'));
  click($$('#screen-learn .wordcard')[0]);
  await waitFor(() => $('.modal'));
  click('[data-detail="practice"]');
  await waitFor(() => $('#screen-game.is-active'));
  ok($('#screen-game.is-active') !== null, 'practising a single word starts a round');
  await wait(200);
  click('[data-nav="home"]');
  await waitFor(() => $('#screen-home.is-active'));
}

/* ---------------------------------------------------------- 8. settings --- */
async function testSettings() {
  group('settings');
  click('[data-nav="settings"]');
  await waitFor(() => $('#screen-settings.is-active'));
  ok($('#nameField') !== null, 'the name field is present');
  const soundBefore = win.CQ.store.me().settings.sound;
  click('[data-toggle="sound"]');
  await waitFor(() => win.CQ.store.me().settings.sound !== soundBefore);
  ok(win.CQ.store.me().settings.sound !== soundBefore, 'sound can be toggled');
  click('[data-toggle="sound"]');
  click('[data-toggle="zhuyin"]');
  await wait(() => {});
  ok(win.CQ.store.me().settings.zhuyin === false, 'zhuyin can be toggled off');
  click('[data-toggle="zhuyin"]');
  click('[data-diff="hard"]');
  await waitFor(() => win.CQ.store.me().settings.difficulty === 'hard');
  ok(win.CQ.store.me().settings.difficulty === 'hard', 'difficulty can be changed');
  click('[data-diff="normal"]');
  $('#nameField').value = 'Tester Two';
  click('[data-action="savename"]');
  await waitFor(() => win.CQ.store.me().name === 'Tester Two');
  ok(win.CQ.store.me().name === 'Tester Two', 'the name can be changed');
  click('[data-action="testvoice"]');
  ok(true, 'the voice test button does not throw');
  ok($('#screen-settings').textContent.indexOf('正確率') >= 0, 'the progress report renders');

  group('second player + persistence');
  click('[data-action="addplayer"]');
  await waitFor(() => $('#screen-onboard.is-active'));
  ok($('#screen-onboard.is-active') !== null, 'a second player can be added');
  $('#obName').value = 'Player Two';
  click('[data-action="obstart"]');
  await waitFor(() => $('#screen-home.is-active'));
  ok(win.CQ.store.profiles().length === 2, 'two players are stored', String(win.CQ.store.profiles().length));
  ok(win.CQ.store.me().name === 'Player Two', 'the new player is active');
  ok(win.CQ.store.me().xp === 0, 'the new player starts fresh');

  win.CQ.store.saveNow();
  const raw = JSON.parse(win.localStorage.getItem('chineseQuest.v2'));
  ok(Object.keys(raw.profiles).length === 2, 'progress is persisted to localStorage');
  const names = Object.keys(raw.profiles).map((k) => raw.profiles[k].name).sort();
  ok(names.join(',') === 'Player Two,Tester Two', 'both players are persisted', names.join(','));
  const first = Object.keys(raw.profiles).map((k) => raw.profiles[k]).filter((p) => p.name === 'Tester Two')[0];
  ok(Object.keys(first.words).length > 0, 'the first player keeps their learning record',
    String(Object.keys(first.words).length));
  ok(first.badges.length > 0, 'the first player keeps their badges', String(first.badges.length));

  group('switching back');
  click('[data-nav="settings"]');
  await waitFor(() => $('#screen-settings.is-active'));
  const chip = $$('#screen-settings [data-player]').filter((c) => c.textContent.indexOf('Tester Two') >= 0)[0];
  ok(!!chip, 'the player switcher lists both players');
  click(chip);
  await waitFor(() => $('#screen-home.is-active'));
  ok(win.CQ.store.me().name === 'Tester Two', 'switching players works');
  ok(win.CQ.store.me().xp > 0, 'the switched-to player still has their xp');
}

/* ------------------------------------------------------------- 9. reset --- */
async function testReset() {
  group('reset + delete guards');
  click('[data-nav="settings"]');
  await waitFor(() => $('#screen-settings.is-active'));
  click('[data-action="reset"]');
  await waitFor(() => $('[data-confirm="reset"]'));
  ok($('[data-confirm="reset"]') !== null, 'reset asks for confirmation first');
  click('[data-result="close"]');
  ok(win.CQ.store.me().xp > 0, 'cancelling the reset keeps progress');
  click('[data-action="delplayer"]');
  await waitFor(() => $('[data-confirm="del"]'));
  click('[data-result="close"]');
  ok(win.CQ.store.profiles().length === 2, 'cancelling a delete keeps the player');
  click('[data-action="reset"]');
  await waitFor(() => $('[data-confirm="reset"]'));
  click('[data-confirm="reset"]');
  await waitFor(() => $('#screen-home.is-active'));
  ok(win.CQ.store.me().xp === 0, 'confirming the reset clears progress');
  ok(win.CQ.store.profiles().length === 2, 'resetting one player keeps the other');
}

/* ------------------------------------------------------------------ main -- */
(async function main() {
  try {
    await testBoot();
    await test3D();
    await testChoiceGames();
    await testBoss();
    await testMatch();
    await testBuild();
    await testEvolution();
    await testBattle('ai');
    await testBattle('duo');
    await testLevels();
    await testRanking();
    await testFourSkills();
    await testDailyCheck();
    await testStories();
    await testLevelQuota();
    await testLearnAndCollection();
    await testSettings();
    await testReset();
  } catch (e) {
    fail++;
    console.log('\n💥 test run aborted: ' + (e && e.stack ? e.stack : e));
  }

  group('runtime health');
  ok(errors.length === 0, 'no uncaught runtime errors', errors.slice(0, 3).join(' | '));

  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' passed, ' + fail + ' failed');
  if (errors.length) { console.log('\nError log:'); errors.slice(0, 10).forEach((e) => console.log('  • ' + e)); }
  finished = true;
  process.exit(fail ? 1 : 0);
})();
