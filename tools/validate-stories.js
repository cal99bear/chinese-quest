/* =========================================================================
   Dev-only validator for the reading library.
   Every character a child can meet must carry a reading; every story must be
   a short controlled-vocabulary reader.
   Run:  node tools/validate-stories.js
   ========================================================================= */
const path = require('path');
const root = path.join(__dirname, '..');
const D = require(path.join(root, 'js', 'data.js'));
const S = require(path.join(root, 'js', 'stories.js'));

let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('  ERROR  ' + m); };
const warn = (m) => { warns++; console.log('  warn   ' + m); };

console.log('Stories: ' + S.STORIES.length);

/* per-character readings: build the same map the app builds */
const bank = {};
D.ALL_WORDS.forEach((w) => { if (w.zh.length === 1 && !bank[w.zh]) bank[w.zh] = w.py; });
const map = Object.assign({}, bank);
Object.keys(S.STORY_WORDS).forEach((c) => { map[c] = S.STORY_WORDS[c][0]; });

const PUNCT = /[。，、！？；：\s]/;

/* ---- every character the child can meet must be readable ----------------- */
const missing = {};
S.STORIES.forEach((st) => {
  const surfaces = [st.title + st.titleEn].concat(
    st.lines.map((l) => l[0]),
    st.questions.map((q) => q.q + q.options.join(''))
  );
  surfaces.forEach((txt) => {
    txt.split('').forEach((c) => {
      if (PUNCT.test(c)) return;
      if (/[A-Za-z0-9]/.test(c)) return;
      if (!map[c]) (missing[c] = missing[c] || []).push(st.id);
    });
  });
});
const missKeys = Object.keys(missing);
if (missKeys.length) {
  err(missKeys.length + ' character(s) have no reading: ' +
    missKeys.map((c) => c + ' (' + [...new Set(missing[c])].join(',') + ')').join('  '));
} else {
  console.log('  ✅ every story character has a reading (' + Object.keys(map).length + ' known characters)');
}

/* ---- story shape --------------------------------------------------------- */
S.STORIES.forEach((st) => {
  const id = st.id;
  if (!st.title || !st.titleEn) err(id + ': missing title');
  if (!st.emoji) err(id + ': missing emoji');
  if (!st.theme) err(id + ': missing theme');
  if (![1, 2, 3].includes(st.level)) err(id + ': bad level ' + st.level);
  if (!D.THEMES.some((t) => t.id === st.theme)) err(id + ': unknown theme ' + st.theme);
  if (st.chars >= 100) err(id + ': ' + st.chars + ' characters — must be under 100');
  if (st.chars < 20) warn(id + ': only ' + st.chars + ' characters');
  if (st.lines.length < 5) warn(id + ': only ' + st.lines.length + ' sentences');
  st.lines.forEach((l, i) => {
    if (!l[0] || !l[1]) err(id + ' line ' + i + ': needs Chinese and English');
    const last = l[0].slice(-1);
    if (!PUNCT.test(last)) err(id + ' line ' + i + ': does not end with punctuation');
    else if (last === '，' && i === st.lines.length - 1) {
      err(id + ' line ' + i + ': a story cannot end on a comma');
    }
  });
  if (!st.questions.length) err(id + ': no comprehension questions');
  st.questions.forEach((q, i) => {
    if (!q.q || !q.en) err(id + ' q' + i + ': needs Chinese and English');
    if (!Array.isArray(q.options) || q.options.length < 3) err(id + ' q' + i + ': needs 3+ options');
    if (!(q.answer >= 0 && q.answer < q.options.length)) err(id + ' q' + i + ': bad answer index');
    const dups = q.options.filter((o, k) => q.options.indexOf(o) !== k);
    if (dups.length) err(id + ' q' + i + ': duplicate options ' + dups.join(','));
  });
  /* the answer to every question must actually appear in the story */
  st.questions.forEach((q, i) => {
    const right = q.options[q.answer];
    if (st.text.indexOf(right) < 0 && right.length > 1) {
      warn(id + ' q' + i + ': the answer "' + right + '" is not literally in the story');
    }
  });
});

/* ---- balanced coverage --------------------------------------------------- */
const ids = S.STORIES.map((s) => s.id);
if (new Set(ids).size !== ids.length) err('duplicate story ids');
const byLevel = [1, 2, 3].map((l) => S.STORIES.filter((s) => s.level === l).length);
okSummary();
function okSummary() {
  console.log('  levels: ' + byLevel.join(' / ') + '  (easy / medium / hard)');
  const total = S.STORIES.reduce((n, s) => n + s.chars, 0);
  console.log('  characters per story: ' + S.STORIES.map((s) => s.chars).join(', ') +
    '   (total ' + total + ', longest ' + Math.max(...S.STORIES.map((s) => s.chars)) + ')');
}
console.log('\n' + (errors ? '❌ ' : '✅ ') + errors + ' error(s), ' + warns + ' warning(s)');
process.exit(errors ? 1 : 0);
