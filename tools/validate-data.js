/* Dev-only integrity check for the Chinese Quest content bank.
   Run:  node tools/validate-data.js                                        */
const path = require('path');
const D = require(path.join(__dirname, '..', 'js', 'data.js'));

let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('  ERROR  ' + m); };
const warn = (m) => { warns++; console.log('  warn   ' + m); };

const TONE_MARKS = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü';
const PY_OK = new RegExp('^[a-z' + TONE_MARKS + "]+$");

console.log('Themes: ' + D.THEMES.length + '   Words: ' + D.ALL_WORDS.length);

const seenZh = new Map();
const seenEmoji = new Map();

D.THEMES.forEach((t) => {
  const localEmoji = new Map();
  t.words.forEach((w) => {
    const tag = t.id + '/' + w.zh;
    // required fields
    ['zh', 'py', 'zy', 'en', 'em'].forEach((k) => {
      if (!w[k] || !String(w[k]).trim()) err(tag + ' missing field "' + k + '"');
    });
    // traditional-only sanity: no simplified-only glyphs that we know we never want
    // syllable alignment: one pinyin syllable and one zhuyin syllable per character
    const pySyl = w.py.trim().split(/\s+/);
    const zySyl = w.zy.trim().split(/\s+/);
    if (pySyl.length !== [...w.zh].length) {
      err(tag + ' pinyin syllables ' + pySyl.length + ' != characters ' + [...w.zh].length + '  ("' + w.py + '")');
    }
    if (zySyl.length !== [...w.zh].length) {
      err(tag + ' zhuyin syllables ' + zySyl.length + ' != characters ' + [...w.zh].length + '  ("' + w.zy + '")');
    }
    // pinyin alphabet check
    pySyl.forEach((s) => {
      if (!PY_OK.test(s)) err(tag + ' odd pinyin syllable "' + s + '"');
      if (/[1-5]/.test(s)) err(tag + ' pinyin uses a number instead of a tone mark: "' + s + '"');
      if (/[A-Z]/.test(s)) warn(tag + ' pinyin syllable is uppercase: "' + s + '"');
    });
    // zhuyin character check
    zySyl.forEach((s) => {
      // syllable = optional ˙ (neutral-tone dot) + bopomofo letters + optional tone mark (ˉˊˇˋ)
      if (!/^˙?[\u3105-\u3129\u31A0-\u31BF]+[\u02C9\u02CA\u02C7\u02CB]?$/.test(s)) err(tag + ' odd zhuyin syllable "' + s + '"');
    });
    // no trailing tone mark style "ma1"
    if (/[0-9]/.test(w.py)) err(tag + ' pinyin contains digits');
    // duplicates
    if (seenZh.has(w.zh)) err('duplicate Chinese word "' + w.zh + '" in ' + t.id + ' and ' + seenZh.get(w.zh));
    seenZh.set(w.zh, t.id);
    if (localEmoji.has(w.em)) warn(t.id + ' emoji reused inside theme: ' + w.em + ' (' + w.zh + ' & ' + localEmoji.get(w.em) + ')');
    localEmoji.set(w.em, w.zh);
    seenEmoji.set(w.em, (seenEmoji.get(w.em) || 0) + 1);
  });
  // theme needs enough words for a 6-option quiz plus matching pairs
  if (t.words.length < D.CONFIG.difficulty.hard.options) {
    err('theme ' + t.id + ' has only ' + t.words.length + ' words (need >= ' + D.CONFIG.difficulty.hard.options + ')');
  }
});

// Content that is deliberately shared across themes (a word may appear in one theme only,
// but an emoji may be reused across themes; flag only heavy reuse).
[...seenEmoji.entries()].filter(([, n]) => n > 2).forEach(([e, n]) => warn('emoji ' + e + ' used ' + n + ' times across themes'));

// games / shop / badges consistency
D.GAMES.forEach((g) => { if (!g.id || !g.emoji || !g.zh) err('bad GAMES entry ' + JSON.stringify(g)); });
D.SHOP.forEach((s) => { if (!(s.price > 0)) err('bad SHOP price for ' + s.id); });
D.BADGES.forEach((b) => { if (!b.id || !b.emoji) err('bad BADGES entry ' + JSON.stringify(b)); });
if (D.PET_STAGES[0].xp !== 0) err('first PET_STAGE must start at 0 xp');
for (let i = 1; i < D.PET_STAGES.length; i++) {
  if (D.PET_STAGES[i].xp <= D.PET_STAGES[i - 1].xp) err('PET_STAGES xp must increase');
}

console.log('\n' + (errors ? '❌ ' : '✅ ') + errors + ' error(s), ' + warns + ' warning(s)');
process.exit(errors ? 1 : 0);
