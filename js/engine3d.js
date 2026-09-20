/* =========================================================================
   Chinese Quest — tiny software 3D renderer
   No WebGL, no model files, no downloads. Meshes are generated procedurally
   and rasterised through the canvas 2D API with painter's-algorithm depth
   sorting and flat lambert shading, so 3D works on every device (and simply
   disappears if a canvas is unavailable).

   Used by: the home-screen power orb, the duel coin toss and the ranking
   poster. Public surface:
     CQ3D.render(ctx, mesh, opts)      → draws one frame, returns face count
     CQ3D.mount(canvas, opts)          → animated controller
     CQ3D.shape(name, palette)         → build a mesh
     CQ3D.setEnabled(bool)             → global 3D switch (Settings)
   ========================================================================= */

var CQ3D = (function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* -------------------------------------------------------------- colour -- */
  function shade(hex, k) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    k = k < 0.35 ? 0.35 : (k > 1.4 ? 1.4 : k);
    return 'rgb(' + Math.min(255, (r * k) | 0) + ',' + Math.min(255, (g * k) | 0) + ',' + Math.min(255, (b * k) | 0) + ')';
  }

  /* --------------------------------------------------------------- meshes -- */
  /* Mesh: v = [[x,y,z]…], f = [{ i:[indices], c:'#rrggbb' }] */
  function Mesh() { this.v = []; this.f = []; }

  /* Surface of revolution. profile = [[radius, y]…] top → bottom. */
  function lathe(profile, segs, palette, opts) {
    opts = opts || {};
    var m = new Mesh();
    var rings = profile.length;
    var alt = opts.alternate || 0;
    var squash = opts.squash == null ? 1 : opts.squash;
    for (var s = 0; s < segs; s++) {
      var a = (s / segs) * TAU;
      var mul = (alt && (s % 2)) ? alt : 1;
      var ca = Math.cos(a), sa = Math.sin(a);
      for (var r = 0; r < rings; r++) {
        var p = profile[r];
        m.v.push([ca * p[0] * mul, p[1] * squash, sa * p[0] * mul]);
      }
    }
    for (var s2 = 0; s2 < segs; s2++) {
      var s3 = (s2 + 1) % segs;
      for (var r2 = 0; r2 < rings - 1; r2++) {
        var col = palette[(r2 + (opts.bands || 0)) % palette.length];
        m.f.push({
          i: [s2 * rings + r2, s3 * rings + r2, s3 * rings + r2 + 1, s2 * rings + r2 + 1],
          c: col
        });
      }
    }
    return m;
  }

  function profileSphere(rings, taper) {
    var p = [];
    for (var i = 0; i <= rings; i++) {
      var t = (Math.PI * i) / rings;
      var r = Math.sin(t) * (taper ? (1 - taper * Math.cos(t)) : 1);
      p.push([r, Math.cos(t)]);
    }
    return p;
  }

  var SHAPES = {
    /* the dragon's power orb — an egg at first, a faceted gem later */
    orb: function (pal) {
      return lathe(profileSphere(9, 0.22), 16, pal, { squash: 1.28 });
    },
    gem: function (pal) {
      return lathe([[0, 1.15], [0.40, 0.66], [0.62, 0.10], [0.52, -0.30], [0.30, -0.66], [0, -1.0]], 8, pal);
    },
    star: function (pal) {
      return lathe([[0, 1.05], [0.55, 0.34], [0.50, -0.05], [0, -0.72]], 12, pal, { alternate: 1.55, squash: 0.9 });
    },
    trophy: function (pal) {
      return lathe([[0.66, 0.88], [0.70, 0.74], [0.52, 0.42], [0.24, 0.16], [0.17, -0.42],
        [0.50, -0.50], [0.56, -0.62], [0.52, -0.72], [0, -0.72]], 16, pal);
    },
    coin: function (pal) {
      return lathe([[0, 0.13], [0.38, 0.13], [0.46, 0.07], [0.46, -0.07], [0.38, -0.13], [0, -0.13]], 16, pal);
    },
    shield: function (pal) {
      return lathe([[0, 1.0], [0.62, 0.66], [0.70, 0.18], [0.52, -0.36], [0, -0.95]], 10, pal);
    }
  };

  var PALETTES = {
    egg:   ['#fff2d6', '#ffe0a8', '#f7c977'],
    jade:  ['#5fd39a', '#2fbf71', '#1c8f52'],
    ice:   ['#9cc9ff', '#5b9dff', '#2f6fd0'],
    royal: ['#c9adff', '#8b5cf6', '#6335c9'],
    ember: ['#ffd166', '#ff9f43', '#e8590c'],
    gold:  ['#ffe9a3', '#ffc93c', '#d99a00'],
    rose:  ['#ffc2d4', '#ff7aa2', '#d64a75']
  };

  /* Stage → orb look, so the child can literally see the dragon grow. */
  var STAGE_SHAPES = [
    { shape: 'orb', pal: 'egg' },
    { shape: 'orb', pal: 'jade' },
    { shape: 'gem', pal: 'ice' },
    { shape: 'gem', pal: 'royal' },
    { shape: 'star', pal: 'ember' },
    { shape: 'star', pal: 'gold' }
  ];

  /* -------------------------------------------------------------- render -- */
  function render(ctx, mesh, o) {
    o = o || {};
    var cx = o.cx || 0, cy = o.cy || 0, scale = o.scale || 60;
    var dist = o.dist || 3.4;
    var rotY = o.rotY || 0, rotX = o.rotX || 0;
    var L = o.light || [-0.45, 0.78, 0.44];
    var ln = Math.sqrt(L[0] * L[0] + L[1] * L[1] + L[2] * L[2]) || 1;
    var lx = L[0] / ln, ly = L[1] / ln, lz = L[2] / ln;
    var cY = Math.cos(rotY), sY = Math.sin(rotY);
    var cX = Math.cos(rotX), sX = Math.sin(rotX);

    var n = mesh.v.length, P = new Array(n), R = new Array(n), i;
    for (i = 0; i < n; i++) {
      var v = mesh.v[i];
      var x = v[0] * cY - v[2] * sY;
      var z0 = v[0] * sY + v[2] * cY;
      var y = v[1] * cX - z0 * sX;
      var z = v[1] * sX + z0 * cX;
      var f = dist / (dist + z);
      if (!(f > 0.05)) f = 0.05;
      P[i] = [cx + x * scale * f, cy - y * scale * f];
      R[i] = [x, y, z];
    }

    var list = [];
    for (i = 0; i < mesh.f.length; i++) {
      var face = mesh.f[i], idx = face.i, zs = 0, j;
      for (j = 0; j < idx.length; j++) zs += R[idx[j]][2];
      zs /= idx.length;
      var a = R[idx[0]], b = R[idx[1]], c = R[idx[2]];
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      var d = Math.abs((nx * lx + ny * ly + nz * lz) / nl);
      list.push({ z: zs, idx: idx, k: 0.46 + 0.86 * d, c: face.c });
    }
    list.sort(function (p, q) { return q.z - p.z; });   // far faces first

    for (i = 0; i < list.length; i++) {
      var it = list[i];
      ctx.beginPath();
      var p0 = P[it.idx[0]];
      ctx.moveTo(Math.round(p0[0] * 10) / 10, Math.round(p0[1] * 10) / 10);
      for (j = 1; j < it.idx.length; j++) {
        var pj = P[it.idx[j]];
        ctx.lineTo(Math.round(pj[0] * 10) / 10, Math.round(pj[1] * 10) / 10);
      }
      ctx.closePath();
      var col = shade(it.c, it.k);
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }
    return list.length;
  }

  /* Soft elliptical contact shadow — sells the 3D more than anything else. */
  function shadow(ctx, cx, cy, rx, ry, alpha) {
    if (ctx.createRadialGradient) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(30,45,70,' + (alpha || 0.28) + ')');
      g.addColorStop(1, 'rgba(30,45,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /* --------------------------------------------------------------- mount -- */
  var live = [];                 // every mounted controller (for the global switch)

  function noop() {
    return {
      ok: false, paused: true,
      setShape: function () {}, setPalette: function () {}, burst: function () {},
      pause: function () {}, resume: function () {}, destroy: function () {}, resize: function () {}
    };
  }

  var enabled = true;

  function mount(canvas, opts) {
    opts = opts || {};
    if (!canvas || !canvas.getContext || !enabled) return noop();
    var ctx;
    try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) return noop();

    var size = opts.size || 190;
    var dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var ctrl = {
      ok: true, paused: !!opts.paused, rotX: -0.30, rotY: 0,
      spin: opts.spin == null ? 0.55 : opts.spin,
      burstUntil: 0, fails: 0, mesh: null
    };

    function build() {
      var s = opts.shape ? { shape: opts.shape, pal: opts.palette } : STAGE_SHAPES[ctrl.stage || 0];
      var pal = PALETTES[typeof s.pal === 'string' ? s.pal : 'jade'] || PALETTES.jade;
      if (Array.isArray(s.pal)) pal = s.pal;
      var fn = SHAPES[s.shape] || SHAPES.orb;
      ctrl.mesh = fn(pal);
      ctrl.baseScale = size * (s.shape === 'trophy' ? 0.20 : (s.shape === 'coin' ? 0.62 : 0.27));
    }
    ctrl.stage = opts.stage || 0;
    build();

    ctrl.setStage = function (n) { ctrl.stage = n; if (!opts.shape) build(); };
    ctrl.setShape = function (name, pal) {
      var fn = SHAPES[name] || SHAPES.orb;
      ctrl.mesh = fn(PALETTES[pal] || pal || PALETTES.jade);
    };
    ctrl.burst = function (ms) { ctrl.burstUntil = now() + (ms || 900); };
    ctrl.pause = function () { ctrl.paused = true; };
    ctrl.resume = function () { if (enabled) ctrl.paused = false; };
    ctrl.destroy = function () {
      ctrl.paused = true;
      if (ctrl.raf && cancel) cancel(ctrl.raf);
      ctrl.raf = null;
      var i = live.indexOf(ctrl); if (i >= 0) live.splice(i, 1);
    };

    function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

    var raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : null;
    var cancel = (typeof cancelAnimationFrame === 'function') ? cancelAnimationFrame : null;
    var last = 0, t0 = now();

    function tick(t) {
      if (ctrl.destroyed) return;
      ctrl.raf = raf ? raf(tick) : setTimeout(function () { tick(now()); }, 33);
      if (ctrl.paused) return;
      if (t - last < 33) return;                     // ~30fps is plenty
      last = t;
      var time = (t - t0) / 1000;
      var hot = ctrl.burstUntil > t;
      ctrl.rotY = time * ctrl.spin * (hot ? 3.4 : 1);
      ctrl.rotX = -0.30 + Math.sin(time * 0.8) * 0.12;
      var pop = hot ? 1 + 0.10 * Math.sin((ctrl.burstUntil - t) / 26) : 1;
      try {
        ctx.clearRect(0, 0, size, size);
        shadow(ctx, size / 2, size * 0.82, size * 0.26, size * 0.075, 0.3);
        render(ctx, ctrl.mesh, {
          cx: size / 2, cy: size / 2 + size * 0.04,
          scale: ctrl.baseScale * pop, rotX: ctrl.rotX, rotY: ctrl.rotY
        });
      } catch (e) {
        ctrl.fails++;
        if (ctrl.fails > 3) ctrl.paused = true;      // never let 3D break the game
      }
    }

    if (raf) ctrl.raf = raf(tick);
    else ctrl.raf = setTimeout(function () { tick(now()); }, 33);

    live.push(ctrl);
    return ctrl;
  }

  function setEnabled(on) {
    enabled = !!on;
    live.forEach(function (c) { if (on) c.resume(); else c.pause(); });
  }

  return {
    render: render,
    shadow: shadow,
    mount: mount,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    shape: function (name, pal) { return (SHAPES[name] || SHAPES.orb)(PALETTES[pal] || pal || PALETTES.jade); },
    stageShapes: STAGE_SHAPES,
    palettes: PALETTES,
    shapes: SHAPES
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { CQ3D: CQ3D };
