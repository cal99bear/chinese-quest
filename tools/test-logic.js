/* Dev-only logic test for the Chinese Quest engine (no browser required).
   Run:  node tools/test-logic.js                                          */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const disk = {};
const localStorage = {
  getItem: (k) => (k in disk ? disk[k] : null),
  setItem: (k, v) => { disk[k] = String(v); },
  removeItem: (k) => { delete disk[k]; }
};

const win = { localStorage };
const ctx = {
  window: win, localStorage, console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON, String, Number, Boolean, Array, Object,
  parseInt, parseFloat, isNaN, isFinite, RegExp, Error, Promise, Map, Set
};
ctx.globalThis = ctx;
vm.createContext(ctx);

function run(file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
run('js/data.js');
run('js/stories.js');
run('js/core.js');
run('js/skills.js');

/* data.js uses `const`, so it lives in the context's lexical scope, not on ctx */
const G = (name) => vm.runInContext(name, ctx);
const CQ = ctx.CQ;
const S = CQ.store, U = CQ.util;
const PET_STAGES = G('PET_STAGES'), SHOP = G('SHOP'), BADGES = G('BADGES');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra ? '  → ' + extra : '')); }
}
function group(t) { console.log('\n▸ ' + t); }

/* ---------------------------------------------------------------- state -- */
group('profiles');
S.load();
const first = S.me();
ok(!!first && !!first.name, 'a profile is created on first load');
ok(S.data.freshInstall === true, 'fresh install flag is set');
const second = S.addProfile('Amy', '🐼');
ok(S.profiles().length === 2, 'a second player can be added', String(S.profiles().length));
ok(S.me().id === second.id, 'adding a player makes them active');
S.setActive(first.id);
ok(S.me().id === first.id, 'profiles can be switched');
ok(S.removeProfile(first.id) === true && S.profiles().length === 1, 'a profile can be removed');
ok(S.removeProfile(second.id) === false, 'the last profile cannot be removed');
S.addProfile('Bo', '🐻');                         // two players again for later tests
S.setActive(S.profiles()[0].id);

/* ------------------------------------------------------------------ srs -- */
group('spaced repetition');
const meId = S.me().id;
const otherId = S.profiles().filter((p) => p.id !== meId)[0].id;
S.resetProfile(meId);
const word = CQ.words[0];
for (let i = 0; i < 6; i++) S.record(word, true);
let st = S.wordState(word.zh);
ok(st.box === 5, 'six correct answers reach the top box', 'box=' + st.box);
ok(st.due > Date.now(), 'a mastered word is scheduled in the future');
S.record(word, false);
st = S.wordState(word.zh);
ok(st.box === 4, 'a wrong answer lowers the box', 'box=' + st.box);
ok(st.ok === 6 && st.bad === 1, 'per-word counters are tracked', st.ok + '/' + st.bad);
ok(S.me().stats.correct === 6 && S.me().stats.wrong === 1, 'profile stats are tracked');

group('per-player isolation');
const other = CQ.words[5];
S.recordFor(otherId, other, true);
ok(S.data.profiles[otherId].words[other.zh].seen === 1, 'recordFor writes to the other player');
ok(!S.me().words[other.zh], 'recordFor does not leak into the active player');
ok(S.studiedCount() === 1, 'studied count is per player', String(S.studiedCount()));
S.addXpFor(otherId, 200);
ok(S.data.profiles[otherId].xp === 200 && S.me().xp === 0, 'addXpFor is profile-scoped');
const coinsBefore = S.data.profiles[otherId].coins, myCoinsBefore = S.me().coins;
S.addCoinsFor(otherId, 50);
ok(S.data.profiles[otherId].coins === coinsBefore + 50 && S.me().coins === myCoinsBefore, 'addCoinsFor is profile-scoped');
S.markPlayedFor(otherId);
ok(S.data.profiles[otherId].daily.games === 1 && S.me().daily.games === 0, 'markPlayedFor is profile-scoped');

group('word selection');
const pick = S.pickWords(10, 'animals');
ok(pick.length === 10, 'pickWords returns the requested count', String(pick.length));
ok(new Set(pick.map((w) => w.zh)).size === 10, 'pickWords returns no duplicate words');
ok(new Set(pick.map((w) => w.em)).size === 10, 'pickWords returns no duplicate pictures');
ok(pick.every((w) => w.theme === 'animals'), 'pickWords respects the theme filter');
let themeOk = true;
CQ.themes.forEach((theme) => {
  const big = S.pickWords(8, theme.id);
  if (new Set(big.map((w) => w.em)).size !== big.length || big.length !== Math.min(8, CQ.words.filter((w) => w.theme === theme.id).length)) themeOk = false;
});
ok(themeOk, 'every theme can fill the largest board with unique pictures');
const fresh = CQ.words[20];
S.record(fresh, false);                            // box 0 → due immediately
ok(S.wordState(fresh.zh).due <= Date.now(), 'a word answered wrong is due straight away');
let offered = false;
for (let i = 0; i < 40 && !offered; i++) offered = S.pickWords(3, 'all').some((w) => w.zh === fresh.zh);
ok(offered, 'the weak word is offered again during review');
ok(U.syllables(word) === word.zh.length, 'syllable helper matches character count for ' + word.zh);

/* ------------------------------------------------------------- rewards -- */
group('rewards, pet and daily quest');
S.resetProfile(meId);
ok(S.stageOf(S.me().xp) === 0, 'a new dragon starts as an egg');
let r = S.addXp(60);
ok(S.me().xp === 60, 'xp accumulates');
ok(r.dailyDone === true, 'the daily goal grants its bonus');
ok(S.me().coins === 20 + 15, 'daily bonus coins are paid', String(S.me().coins));
r = S.addXp(70);
ok(S.stageOf(S.me().xp) === 1 && r.stageUp === true, 'the dragon evolves at the xp threshold');
S.addXp(4000);
ok(S.stageOf(S.me().xp) === PET_STAGES.length - 1, 'the dragon reaches the final stage');

group('streak');
const today = U.dayKey();
const yest = U.dayKey(new Date(Date.now() - 86400000));
S.me().streak = { count: 3, best: 3, last: yest };
S.me().daily = { day: yest, xp: 0, games: 0, done: false };
ok(S.markPlayed() === 4, 'a consecutive day increments the streak');
ok(S.me().daily.games === 1 && S.me().daily.day === today, 'the daily counter rolls over');
S.me().streak.last = U.dayKey(new Date(Date.now() - 3 * 86400000));
ok(S.markPlayed() === 1, 'a missed day resets the streak to 1');

group('coins and shop');
S.me().coins = 100;
ok(S.spend(40) === true && S.me().coins === 60, 'coins can be spent');
ok(S.spend(9999) === false, 'you cannot overspend');
S.me().coins = 500;
const item = SHOP[0];
ok(S.buy(item) === true, 'an item can be bought');
ok(S.buy(item) === false, 'the same item cannot be bought twice');
ok(S.me().owned.indexOf(item.id) >= 0, 'the item is recorded as owned');
ok(S.equip(item.id) === item.id, 'an owned item can be equipped');
ok(S.equippedItem().id === item.id, 'the equipped item is reported');
ok(S.equip(item.id) === null, 'equipping again takes it off');
S.me().coins = 5;
ok(S.buy(SHOP[1]) === false, 'you cannot buy what you cannot afford');

group('badges');
S.resetProfile(meId);
S.me().stats.games = 1;
S.me().coins = 600;
S.me().bossCleared = true;
const ids = S.evaluateBadges().map((b) => b.id);
ok(ids.indexOf('first_game') >= 0, 'first-game badge unlocks');
ok(ids.indexOf('coins500') >= 0, 'coin badge unlocks');
ok(ids.indexOf('boss_clear') >= 0, 'boss badge unlocks');
ok(S.evaluateBadges().length === 0, 'badges are not awarded twice');
ok(S.hasBadge('first_game') === true, 'hasBadge reports the badge');
ok(BADGES.every((b) => !!b.zh && !!b.emoji), 'every badge has a label and an icon');

group('mastery + helpers');
S.resetProfile(meId);
const m = S.mastery('all');
ok(m.total === CQ.words.length && m.known === 0, 'mastery starts empty');
const w2 = CQ.words[3];
for (let i = 0; i < 4; i++) S.record(w2, true);
ok(S.mastery('all').known === 1, 'a word answered well counts as mastered');
ok(U.stars(10, 10) === 3 && U.stars(8, 10) === 2 && U.stars(5, 10) === 1 && U.stars(1, 10) === 0, 'star grading');
const ds = U.distractors(CQ.words, CQ.words[0], 5, U.optionKeys('meaning'));
ok(ds.length === 5 && ds.every((d) => d.zh !== CQ.words[0].zh), 'distractors exclude the answer');
ok(ds.every((d) => d.em !== CQ.words[0].em), 'picture distractors exclude the answer picture');
const samePinyin = [{ zh: 'a', py: 'x', em: '1' }, { zh: 'b', py: 'x', em: '2' }, { zh: 'c', py: 'y', em: '3' }];
const lp = U.distractors(samePinyin, samePinyin[0], 5, U.optionKeys('listen'));
ok(!lp.some((d) => d.py === 'x'), 'listening distractors exclude homophones');
ok(U.primaryKey('pinyin')({ py: 'māo' }) === 'māo', 'primary key follows the question format');

group('levels + stars');
S.setActive(meId);
S.resetProfile(meId);
ok(CQ.levels.length === 40, '40 levels are generated', String(CQ.levels.length));
ok(CQ.levels.every((l) => !!l.theme && !!l.kind && l.n >= 1), 'every level is well formed');
ok(CQ.levels.every((l) => ['meaning', 'listen', 'pinyin', 'battle', 'boss'].indexOf(l.kind) >= 0),
  'every level points at a real game mode');
ok(CQ.levels.filter((l) => l.boss).length === 10, 'ten boss levels');
ok(CQ.levels.every((l, i) => l.n === i + 1), 'levels are numbered in order');
ok(S.isLevelUnlocked(1) === true, 'level 1 is open from the start');
ok(S.isLevelUnlocked(2) === false, 'level 2 is locked until level 1 is passed');
ok(S.currentLevel() === 1, 'the journey starts at level 1');
var lr = S.setLevelStars(1, 2);
ok(S.levelStars(1) === 2, 'stars are stored against the level');
ok(lr.improved === true && lr.bonus > 0, 'the first clear pays a coin bonus', String(lr.bonus));
ok(lr.unlockedNext === true, 'passing a level unlocks the next one');
ok(S.isLevelUnlocked(2) === true, 'level 2 is now open');
var lr2 = S.setLevelStars(1, 1);
ok(S.levelStars(1) === 2, 'a weaker replay does not lower the record');
ok(lr2.improved === false && lr2.bonus === 0, 'a weaker replay pays no bonus');
ok(S.totalStars() === 2, 'total stars add up', String(S.totalStars()));
ok(S.currentLevel() === 2, 'the journey moves on to level 2');
var lprog = S.levelProgress();
ok(lprog.passed === 1 && lprog.total === 40 && lprog.current === 2, 'level progress is summarised');

group('weekly league + ranking');
S.addProfile('Rival', '🦊');
var rivalId = S.profiles().filter((p) => p.name === 'Rival')[0].id;
S.setActive(meId);
S.resetProfile(meId);
S.addXp(100);
ok(S.me().weekly.xp === 100, 'xp also counts towards the weekly league');
S.setActive(rivalId);
S.addXp(400);
var board = S.leaderboard('all');
ok(board.length === S.profiles().length, 'every saved player is ranked', String(board.length));
ok(board[0].name === 'Rival' && board[0].score === 400, 'the all-time board sorts by xp', board[0].name);
ok(board[0].me === true, 'the active player is flagged');
ok(board.filter(function (r) { return r.id === meId; })[0].score === 100,
  'each row carries its own player score');
ok(board[board.length - 1].id === meId, 'the lowest score sits last', board[board.length - 1].name);
ok(board[board.length - 1].score <= board[0].score, 'the board runs from high to low');
ok(board[0].pet && board[0].pet.emoji, 'each row carries the dragon stage');
S.me().weekly = { key: '2020-01-06', xp: 5 };
ok(S.weekXp(S.me()) === 0, 'the weekly score resets on a new week');
var week = S.leaderboard('week');
ok(week[0].weekXp >= week[week.length - 1].weekXp, 'the weekly board is sorted by weekly xp');
ok(week[0].name !== 'Rival', 'the all-time leader can lose the weekly board', week[0].name);
ok(week.filter(function (r) { return r.name === 'Rival'; })[0].weekXp === 0,
  'a player whose week has rolled over drops down the weekly board');
S.setActive(meId);

group('tracing score (control of error)');
var Sk = ctx.Skills;
var CELLS = 16, N = CELLS * CELLS;
function grid(fn) {
  var a = [];
  for (var i = 0; i < N; i++) a.push(fn(i % CELLS, Math.floor(i / CELLS)) ? 1 : 0);
  return a;
}
var bar = grid(function (x, y) { return x >= 3 && x <= 6 && y >= 2 && y <= 12; });
ok(Sk.traceScore(bar, bar) === 100, 'a perfect trace scores 100');
ok(Sk.traceScore(bar, new Array(N).fill(0)) === 0, 'no ink scores 0');
ok(Sk.traceScore(new Array(N).fill(0), bar) === 0, 'no model character scores 0');
ok(Sk.traceScore(bar, grid(function (x, y) { return x >= 3 && x <= 6 && y >= 2 && y <= 7; })) >= 55,
  'tracing half the character still passes');
ok(Sk.traceScore(bar, new Array(N).fill(1)) < CQ.config.tracePass, 'scribbling over everything fails');
ok(Sk.traceScore(bar, grid(function (x, y) { return x >= 12 && x <= 14; })) < 40,
  'ink far from the character scores low');
ok(Sk.traceScore(bar, bar.slice(0, 4)) === 0, 'mismatched grids are rejected');

group('speech matching (when recognition is available)');
ok(Sk.matchesSpeech('貓', '貓') === true, 'an exact match counts');
ok(Sk.matchesSpeech('貓。', '貓') === true, 'punctuation is ignored');
ok(Sk.matchesSpeech('我喜歡貓', '貓') === true, 'a sentence containing the word counts');
ok(Sk.matchesSpeech('狗', '貓') === false, 'a different word does not count');
ok(Sk.matchesSpeech('', '貓') === false, 'silence does not count');
ok(Sk.matchesSpeech(null, '貓') === false, 'a missing transcript does not count');

group('daily level quota');
S.setActive(meId);
S.resetProfile(meId);
ok(S.levelLimit() === 3, 'three levels a day by default', String(S.levelLimit()));
ok(S.levelsClearedToday() === 0 && S.levelQuotaLeft() === 3, 'the day starts with the full quota');
ok(S.markLevelCleared(1) === 1, 'clearing a level spends one');
ok(S.markLevelCleared(1) === 1, 'replaying a level does not spend another');
ok(S.canPlayLevel(1) === true, 'a passed level can always be replayed');
ok(S.canPlayLevel(2) === true, 'a new level is still allowed');
S.setLevelStars(2, 2);            // level 2 is passed as well as counted
S.markLevelCleared(2);
S.markLevelCleared(3);
ok(S.levelQuotaLeft() === 0, 'the quota can run out', String(S.levelQuotaLeft()));
ok(S.canPlayLevel(4) === false, 'a new level is blocked once the quota is spent');
ok(S.canPlayLevel(2) === true, 'passed levels stay replayable when the quota is spent');
S.me().settings.levelLimit = 0;
ok(S.canPlayLevel(9) === true, 'the limit can be switched off');
ok(S.levelQuotaLeft() === Infinity, 'no limit means no countdown');
S.me().settings.levelLimit = 3;
S.me().daily = { day: '2020-01-01', xp: 0, games: 0, done: false, cleared: ['1', '2', '3'] };
S.rollDay();
ok(S.levelsClearedToday() === 0, 'a new day restores the quota');

group('daily four-skill check');
S.resetProfile(meId);
ok(S.examToday() === null, 'no check is recorded at first');
S.saveExam({ byStrand: { listen: { ok: 1, n: 3 } }, total: 6, items: 12, perfect: false, stars: 1 });
ok(S.examToday() && S.examToday().total === 6, 'the result is stored for today');
S.saveExam({ byStrand: {}, total: 4, items: 12, perfect: false, stars: 1 });
ok(S.examToday().total === 6, 'a weaker attempt does not replace the day record');
S.saveExam({ byStrand: {}, total: 12, items: 12, perfect: true, stars: 3 });
ok(S.examToday().total === 12 && S.examToday().perfect === true, 'a perfect attempt replaces it');
ok(S.me().perfectExam === true, 'the perfect check is remembered');

group('stories + skill counters');
ok(CQ.stories.length === 8, 'eight stories are loaded', String(CQ.stories.length));
ok(CQ.stories.every(function (s) { return s.chars < 100; }), 'every story is under 100 characters');
ok(CQ.stories.every(function (s) { return s.chars >= 85; }), 'every story is a full ~100-character reader',
  CQ.stories.map(function (s) { return s.chars; }).join(','));
ok(CQ.stories.every(function (s) { return s.lines.length >= 5 && s.questions.length >= 2; }),
  'every story has sentences and questions');
ok(CQ.stories.every(function (s) { return s.emoji && s.titleEn && s.level >= 1; }), 'every story is complete');
ok(!!CQ.charPy['貓'] && !!CQ.charPy['我'] && !!CQ.charPy['的'],
  'the character reader covers both bank words and sight words');
ok(CQ.strands.length === 4, 'four language strands are defined');
ok(CQ.strands.map(function (s) { return s.id; }).join(',') === 'listen,speak,read,write',
  'the strands are listening, speaking, reading and writing');
ok(CQ.strands.every(function (s) { return s.zh && s.en && s.how; }), 'every strand is documented');
var st1 = S.finishStory('kitten', 1, 2);
ok(st1.first === true, 'the first read of a story is recorded');
ok(S.storiesRead() === 1, 'the story counts as read');
S.finishStory('kitten', 2, 2);
ok(S.storyState('kitten').score === 2, 'a better comprehension score is kept');
S.resetProfile(meId);
S.addSkill('speak', 3);
S.addSkill('speak');
ok(S.skillCount('speak') === 4, 'skill counters accumulate', String(S.skillCount('speak')));
for (var w = 0; w < 10; w++) S.addSkill('write');
S.me().stats.games = 1;
var earned = S.evaluateBadges().map(function (b) { return b.id; });
ok(earned.indexOf('writer10') >= 0, 'the writing badge unlocks at ten traced characters');

group('the daily story lesson');
var TS = Sk.todayStory();
ok(!!TS && !!TS.id, 'a story is chosen for today', TS && TS.id);
ok(Sk.todayStory() === TS, 'the choice is stable through the day');
ok(CQ.stories.some(function (s) { return s.id === TS.id; }), 'the daily story comes from the library');
['listen', 'speak', 'read', 'write'].forEach(function (st) {
  var items = Sk.lessonItems(st, TS);
  ok(items.length === 3, 'the ' + st + ' stage sets three tasks', String(items.length));
  ok(items.every(function (it) { return it.strand === st; }), 'the ' + st + ' tasks belong to that strand');
  ok(items.every(function (it) { return it && typeof it.mount === 'function' && it.word; }),
    'the ' + st + ' tasks can each be mounted');
});
ok(Sk.lessonItems('write', TS).some(function (it) { return it.word.em === '🧩'; }),
  'the writing stage includes the fill-the-blank task');
ok(Sk.lessonItems('read', TS).length === 3, 'the reading stage is built from the story');
ok(Sk.charMs('。', 0.7) > Sk.charMs('我', 0.7), 'a full stop pauses longer than a character');
ok(Sk.charMs('我', 0.5) > Sk.charMs('我', 0.7), 'a slower rate spends longer on each character');
ok(Sk.charMs('我', 0.7) > 0, 'every character takes real time to read');

/* ------------------------------------------------------------ integrity -- */
group('content integrity');
ok(CQ.words.length === 109, 'the word bank has 109 words', String(CQ.words.length));
ok(CQ.games.length === 8, 'eight game modes are registered', String(CQ.games.length));
ok(CQ.games.filter((g) => g.id === 'battle').length === 1, 'battle mode is registered');
ok(CQ.words.every((w) => w.py.split(/\s+/).length === w.zh.length), 'pinyin aligns with characters everywhere');
ok(CQ.words.every((w) => w.zy.split(/\s+/).length === w.zh.length), 'zhuyin aligns with characters everywhere');
ok(CQ.words.every((w) => w.em && w.en && w.theme), 'every word has emoji, meaning and theme');
ok(new Set(CQ.words.map((w) => w.zh)).size === CQ.words.length, 'no duplicate words');
const emCount = {};
CQ.words.forEach((w) => { emCount[w.em] = (emCount[w.em] || 0) + 1; });
const shared = Object.keys(emCount).filter((e) => emCount[e] > 1);
ok(shared.length === 0, 'no emoji is shared by two words', shared.join(' '));

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
