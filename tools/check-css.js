/* =========================================================================
   Dev-only consistency check: every CSS class the game renders must exist in
   the stylesheet. (The reverse list is informational.)
   Run:  node tools/check-css.js
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const css = ['style.css', 'style3d.css'].map(function (f) {
  return fs.readFileSync(path.join(root, 'css', f), 'utf8');
}).join('\n');
const styled = new Set();
css.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.[A-Za-z][\w-]*/g)
  .forEach((m) => styled.add(m.slice(1)));

/* every "selector { declarations }" pair, for the layout check below */
const cssRules = [];
(css.replace(/\/\*[\s\S]*?\*\//g, '').match(/([^{}]+)\{([^{}]*)\}/g) || []).forEach((block) => {
  const at = block.indexOf('{');
  cssRules.push({ sel: block.slice(0, at), decl: block.slice(at + 1, -1) });
});
function declsFor(cls) {
  const re = new RegExp('\\.' + cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])');
  return cssRules.filter((r) => re.test(r.sel)).map((r) => r.decl).join(';');
}

const used = new Map();
const tagUse = new Map();        // class -> the set of HTML tags carrying it
const elements = [];             // every <tag class="..."> found in the markup
function note(cls, where) {
  if (!/^[a-z][a-z0-9_-]*[a-z0-9]$/.test(cls)) return;   // skip fragments like "board--"
  if (!used.has(cls)) used.set(cls, where);
}

['index.html', 'js/app.js', 'js/games.js', 'js/battle.js', 'js/core.js', 'js/skills.js'].forEach((f) => {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  // class="a b"
  (src.match(/class\s*=\s*(?:\\?["'])([^"'\\]*)/g) || []).forEach((m) => {
    m.replace(/^class\s*=\s*(?:\\?["'])/, '').split(/\s+/).forEach((c) => note(c, f));
  });
  // classList.add/remove/toggle('x')
  const clRe = /classList\.(?:add|remove|toggle)\(\s*(['"])([^'"]+)\1/g;
  let cl;
  while ((cl = clRe.exec(src))) note(cl[2], f);
  // which tag carries which class  (<span class="x">  vs  <div class="x">)
  const tagRe = /<([a-z][a-z0-9]*)\b[^>]*?class\s*=\s*(?:\\?["'])([^"'\\]*)/g;
  let tm;
  while ((tm = tagRe.exec(src))) {
    const classes = tm[2].split(/\s+/).filter(Boolean);
    classes.forEach((c) => {
      note(c, f);
      if (!tagUse.has(c)) tagUse.set(c, new Set());
      tagUse.get(c).add(tm[1]);
    });
    if (classes.length) elements.push({ tag: tm[1], classes: classes, where: f });
  }
  // util.el('div', 'some-class another')
  (src.match(/(?:util|\$)\.el\(\s*'[a-z]+'\s*,\s*'([^']+)'/g) || []).forEach((m) => {
    const inner = m.match(/,\s*'([^']+)'/)[1];
    inner.split(/\s+/).forEach((c) => note(c, f));
  });
});

/* classes applied as string fragments during template concatenation */
['board--4', 'board--6', 'board--8', 'options--2', 'options--3', 'options--4', 'options--6',
  'is-active', 'is-on', 'is-owned', 'is-equipped', 'badge--locked', 'gamecard--battle',
  'side--p1', 'side--p2', 'fighter--p1', 'fighter--p2',
  'filled', 'lost', 'locked', 'on', 'mid', 'low', 'ok', 'bad', 'used', 'dim', 'hidden'
].forEach((c) => note(c, 'dynamic'));

/* Layout trap: width/height/transform/animation do nothing on a plain inline
   box. A class used only on <span> & co. needs a display (or absolute
   positioning), unless its parent is a flex/grid container which blockifies it
   — those verified cases are listed in INLINE_OK. This is what silently broke
   the memory-match flip. */
const INLINE_TAGS = ['span', 'a', 'b', 'i', 'em', 'strong', 'small', 'label', 'code'];
const GEOMETRY = /(?:^|[;\s])(width|height|aspect-ratio|transform|transform-style|animation|perspective)\s*:/;
const BLOCKIFY = /(?:^|[;\s])(display|position|float)\s*:/;
/* Verified safe because a flex/grid parent blockifies them. */
const INLINE_OK = new Set(['playerchip__av', 'dot', 'heart', 'stat__icon']);
const layoutIssues = [];
const seenEl = new Set();
elements.forEach((el) => {
  if (INLINE_TAGS.indexOf(el.tag) < 0) return;
  if (el.classes.some((c) => INLINE_OK.has(c))) return;
  const decl = el.classes.map(declsFor).join(';');
  if (!GEOMETRY.test(decl) || BLOCKIFY.test(decl)) return;
  const key = el.tag + ':' + el.classes.join('.');
  if (seenEl.has(key)) return;
  seenEl.add(key);
  layoutIssues.push('<' + el.tag + ' class="' + el.classes.join(' ') + '"> in ' + el.where +
    ' — inline boxes ignore width/height/transform; add display or position');
});

const missing = [...used.keys()].filter((c) => !styled.has(c)).sort();
const orphan = [...styled].filter((c) => !used.has(c)).sort();

console.log('CSS classes defined:   ' + styled.size);
console.log('classes the code uses: ' + used.size);
console.log('\nrendered but NOT styled (' + missing.length + '):');
missing.forEach((c) => console.log('  ✗ .' + c + '   (from ' + used.get(c) + ')'));
console.log('\ninline-element layout traps (' + layoutIssues.length + '):');
layoutIssues.forEach((c) => console.log('  ✗ ' + c));
console.log('\nnot seen by the static scan (' + orphan.length + ') — informational:');
console.log('  ' + orphan.map((c) => '.' + c).join(' '));

process.exit((missing.length || layoutIssues.length) ? 1 : 0);
