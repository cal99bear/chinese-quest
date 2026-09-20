/* =========================================================================
   Dev-only test for the software 3D renderer.
   Verifies the projection maths, depth sorting, shading and the graceful
   degradation paths — the parts a screenshot would otherwise have to prove.
   Run:  node tools/test-3d.js
   ========================================================================= */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let rafCb = null;
const ctx = {
  console,
  Math, Array, Object, String, Number, Boolean, JSON, Date, parseInt, parseFloat, isNaN, isFinite,
  setTimeout, clearTimeout,
  requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
  cancelAnimationFrame: () => {},
  performance: { now: () => 0 },
  window: { devicePixelRatio: 1 }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'engine3d.js'), 'utf8'), ctx, { filename: 'engine3d.js' });
const CQ3D = ctx.CQ3D;

let pass = 0, fail = 0;
const ok = (c, label, extra) => {
  if (c) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + extra : '')); }
};
const group = (t) => console.log('\n▸ ' + t);
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 0.15);

/* a canvas 2D context that records what the renderer draws */
function recorder() {
  const rec = { polys: [], current: null, fills: 0, clears: 0, style: null, texts: [] };
  const start = () => { rec.current = []; };
  const add = (x, y) => { if (rec.current) rec.current.push([x, y]); };
  return {
    rec,
    setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, clip() {},
    clearRect() { rec.clears++; },
    beginPath() { start(); },
    moveTo(x, y) { add(x, y); },
    lineTo(x, y) { add(x, y); },
    quadraticCurveTo() {}, arc() {}, arcTo() {}, rect() {},
    closePath() {},
    fill() { rec.fills++; rec.polys.push({ pts: rec.current || [], style: rec.style }); },
    stroke() {},
    fillRect() {}, strokeRect() {}, fillText(t) { rec.texts.push(t); }, strokeText() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 10 }),
    set fillStyle(v) { rec.style = v; },
    get fillStyle() { return rec.style; },
    strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: 'left'
  };
}

/* ------------------------------------------------------------- meshes ---- */
group('mesh generation');
const names = Object.keys(CQ3D.shapes);
ok(['orb', 'gem', 'star', 'trophy', 'coin'].every((n) => names.indexOf(n) >= 0),
  'every shape the game uses is available', names.join(','));
names.forEach((n) => {
  const m = CQ3D.shape(n, 'gold');
  let bad = 0;
  m.f.forEach((f) => {
    if (f.i.length < 3) bad++;
    f.i.forEach((ix) => { if (!(ix >= 0 && ix < m.v.length)) bad++; });
  });
  const finite = m.v.every((v) => v.every((c) => isFinite(c)));
  ok(bad === 0 && finite && m.f.length > 20,
    'shape "' + n + '" is a valid mesh', m.v.length + ' verts / ' + m.f.length + ' faces / bad=' + bad);
});
ok(CQ3D.shape('orb', 'jade').f.length === CQ3D.shape('orb', 'ice').f.length,
  'the same shape with another palette keeps its geometry');

/* --------------------------------------------------------- projection ---- */
group('projection maths');
const tri = { v: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], f: [{ i: [0, 1, 2], c: '#ff0000' }] };
let r = recorder();
let drawn = CQ3D.render(r, tri, { cx: 100, cy: 100, scale: 50, dist: 3.4, rotX: 0, rotY: 0 });
ok(drawn === 1, 'one face is drawn', String(drawn));
let pts = r.rec.polys[0].pts;
ok(pts.length === 3, 'the triangle keeps three points');
ok(near(pts[0][0], 150) && near(pts[0][1], 100), 'a vertex on +x projects right of centre', JSON.stringify(pts[0]));
ok(near(pts[1][0], 100) && near(pts[1][1], 50), 'a vertex on +y projects above centre (canvas y is inverted)');
ok(near(pts[2][0], 100) && near(pts[2][1], 100), 'a far vertex on the axis stays centred but shrinks');

r = recorder();
CQ3D.render(r, tri, { cx: 100, cy: 100, scale: 50, dist: 3.4, rotX: 0, rotY: Math.PI / 2 });
pts = r.rec.polys[0].pts;
ok(near(pts[0][0], 100), 'rotating 90° about y swings +x onto the view axis', JSON.stringify(pts[0]));
ok(near(pts[2][0], 50), 'and swings +z out to the left');

r = recorder();
CQ3D.render(r, tri, { cx: 100, cy: 100, scale: 50, dist: 3.4, rotX: 0, rotY: Math.PI * 2 });
pts = r.rec.polys[0].pts;
ok(near(pts[0][0], 150) && near(pts[1][1], 50), 'a full turn returns to the start');

/* ------------------------------------------------------- depth sorting --- */
group('depth sorting (painter’s algorithm)');
const twoTris = {
  v: [[1, 0, 1], [1, 1, 1], [1, -1, 1],      // far, at z = +1
      [-1, 0, -1], [-1, 1, -1], [-1, -1, -1]], // near, at z = -1
  f: [{ i: [0, 1, 2], c: '#ff0000' }, { i: [3, 4, 5], c: '#00ff00' }]
};
r = recorder();
CQ3D.render(r, twoTris, { cx: 100, cy: 100, scale: 50, dist: 3.4, rotX: 0, rotY: 0 });
const first = r.rec.polys[0].pts[0][0], second = r.rec.polys[1].pts[0][0];
ok(first > 100, 'the far face is painted first', 'x=' + first.toFixed(1));
ok(second < 100, 'the near face is painted last', 'x=' + second.toFixed(1));

/* ------------------------------------------------------------- shading --- */
group('shading');
r = recorder();
CQ3D.render(r, CQ3D.shape('orb', 'gold'), { cx: 60, cy: 60, scale: 40 });
const styles = r.rec.polys.map((p) => p.style);
ok(styles.length > 20, 'a full orb is drawn', String(styles.length));
ok(styles.every((s) => /^rgb\(\d+,\d+,\d+\)$/.test(s)), 'every face is shaded to an rgb() colour', styles[0]);
const vals = styles.map((s) => Number(s.slice(4, -1).split(',')[0]));
ok(Math.max(...vals) - Math.min(...vals) > 20, 'lighting actually varies across faces',
  Math.min(...vals) + '…' + Math.max(...vals));
ok(styles.every((s) => s.slice(4, -1).split(',').every((n) => +n >= 0 && +n <= 255)), 'colour channels stay in range');
r = recorder();
CQ3D.shadow(r, 50, 80, 30, 8, 0.3);
ok(r.rec.fills === 1, 'a contact shadow is drawn');

/* --------------------------------------------------------------- mount --- */
group('animated controller');
const fakeCtx = recorder();
const canvas = { getContext: () => fakeCtx, width: 0, height: 0 };
const ctrl = CQ3D.mount(canvas, { size: 120, shape: 'orb', paused: false });
ok(ctrl.ok === true, 'the controller mounts');
ok(canvas.width === 120 && canvas.height === 120, 'the canvas is sized for the device pixel ratio',
  canvas.width + 'x' + canvas.height);
ok(typeof rafCb === 'function', 'an animation frame is requested');
const before = fakeCtx.rec.fills;
rafCb(120);
ok(fakeCtx.rec.fills > before, 'a frame renders geometry', String(fakeCtx.rec.fills));
ok(fakeCtx.rec.clears > 0, 'the frame is cleared first');
ctrl.pause();
const paused = fakeCtx.rec.fills;
rafCb(240);
ok(fakeCtx.rec.fills === paused, 'a paused controller draws nothing');
ctrl.resume();
rafCb(360);
ok(fakeCtx.rec.fills > paused, 'resuming draws again');
ctrl.setShape('gem', 'ice');
ctrl.burst(500);
rafCb(480);
ok(true, 'setShape and burst are safe');
ctrl.destroy();
ok(true, 'destroy is safe');

group('graceful degradation');
ok(CQ3D.mount({ getContext: () => null }, {}).ok === false, 'no 2D context → a harmless no-op controller');
ok(CQ3D.mount(null, {}).ok === false, 'a missing canvas is tolerated');
const bad = { getContext: () => { throw new Error('blocked'); } };
ok(CQ3D.mount(bad, {}).ok === false, 'a throwing getContext is caught');
ok(CQ3D.mount(canvas, {}).ok === true, 'mounting still works after a failure');

group('global switch');
const c2 = CQ3D.mount({ getContext: () => recorder(), width: 0, height: 0 }, { size: 100, paused: false });
CQ3D.setEnabled(false);
ok(CQ3D.isEnabled() === false, 'the global switch turns 3D off');
ok(c2.paused === true, 'live controllers are paused');
CQ3D.setEnabled(true);
ok(c2.paused === false, 'and resumed when switched back on');
c2.destroy();

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
