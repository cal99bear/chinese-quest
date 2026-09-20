/* =========================================================================
   Chinese Quest — core engine
   Utilities, persistence (multi-profile), spaced repetition, rewards,
   WebAudio sound effects, speech synthesis and screen effects.
   Exposed as the global `CQ`.
   ========================================================================= */

var CQ = (function () {
  'use strict';

  var CFG = CONFIG;

  /* ================================================================ util == */
  var util = {
    $: function (sel, root) { return (root || document).querySelector(sel); },
    $$: function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },

    el: function (tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    },

    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },

    shuffle: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },

    sample: function (arr, n) { return util.shuffle(arr).slice(0, n); },

    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },

    clamp: function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },

    /* Which keys must stay unique among the options of a question, or a
       distractor would also be a correct answer: a homophone when the child is
       listening, an identical picture when the child is matching a picture. */
    optionKeys: function (fmt) {
      var zh = function (w) { return w.zh; };
      var py = function (w) { return w.py; };
      var em = function (w) { return w.em; };
      if (fmt === 'pinyin') return [py];
      if (fmt === 'listen') return [zh, py];
      return [zh, em];
    },

    /* The key that decides whether a chosen option is the right answer. */
    primaryKey: function (fmt) {
      return fmt === 'pinyin' ? function (w) { return w.py; } : function (w) { return w.zh; };
    },

    /* n distractors from `pool` that can never be mistaken for `answer`.
       `keys` is one key function or an array of them. */
    distractors: function (pool, answer, n, keys) {
      var fns = typeof keys === 'function' ? [keys] : (keys || [function (w) { return w.zh; }]);
      var seen = fns.map(function () { return {}; });
      fns.forEach(function (f, i) { seen[i][String(f(answer))] = 1; });
      var out = [];
      util.shuffle(pool).forEach(function (w) {
        if (out.length >= n) return;
        for (var i = 0; i < fns.length; i++) {
          if (seen[i][String(fns[i](w))]) return;   // would look like a second right answer
        }
        fns.forEach(function (f, i) { seen[i][String(f(w))] = 1; });
        out.push(w);
      });
      return out;
    },

    /* Date helpers — a "day" is a local calendar day */
    dayKey: function (d) {
      d = d || new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    daysBetween: function (aKey, bKey) {
      var a = new Date(aKey + 'T00:00:00'), b = new Date(bKey + 'T00:00:00');
      return Math.round((b - a) / 86400000);
    },

    stars: function (correct, total) {
      if (!total) return 0;
      var pct = correct / total;
      if (pct >= 0.95) return 3;
      if (pct >= 0.75) return 2;
      if (pct >= 0.5) return 1;
      return 0;
    },

    /* "貓" (one char) vs "熊貓" (two) — used for Word Builder eligibility */
    syllables: function (w) { return (w.py || '').trim().split(/\s+/).length; },

    roman: function (n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] || String(n); },

    /* Monday-based week key, so the weekly league resets every Monday. */
    weekKey: function (d) {
      d = d ? new Date(d) : new Date();
      var back = (d.getDay() + 6) % 7;                       // 0 = Monday
      return util.dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back));
    }
  };

  /* ============================================================= storage == */
  var memoryFallback = null;

  function readRaw() {
    try {
      var raw = localStorage.getItem(CFG.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return memoryFallback; }
  }
  function writeRaw(obj) {
    memoryFallback = obj;
    try { localStorage.setItem(CFG.storageKey, JSON.stringify(obj)); } catch (e) { /* private mode */ }
  }

  /* Any reward that is not a finite number counts as zero. */
  function finite(n) {
    n = Math.round(Number(n));
    return isFinite(n) ? n : 0;
  }

  /* A day's counters. Kept in one place so a rollover never drops a field. */
  function newDaily() {
    return { day: util.dayKey(), xp: 0, games: 0, done: false, cleared: [] };
  }

  function freshProfile(name, avatar) {
    return {
      id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      name: name || '小冒險家',
      avatar: avatar || '🐉',
      created: Date.now(),
      xp: 0,
      coins: 20,
      owned: [],
      equipped: null,
      seenStages: [0],
      badges: [],
      words: {},            // zh -> {box,due,ok,bad,seen,last}
      stats: { games: 0, correct: 0, wrong: 0, bestCombo: 0, duelWins: 0, duelLosses: 0, perfect: 0 },
      best: {},             // gameId -> stars
      daily: newDaily(),
      streak: { count: 0, best: 0, last: null },
      levels: {},                                  // level number -> stars (1..3)
      weekly: { key: util.weekKey(), xp: 0 },
      stories: {},                                 // story id -> { done, score }
      skills: { listen: 0, speak: 0, read: 0, write: 0 },
      exam: null,                                  // today's four-skill result
      settings: { pinyin: true, zhuyin: false, sound: true, speech: true, difficulty: 'easy', graphics3d: true, levelLimit: CFG.dailyLevelLimit }
    };
  }

  var Store = {
    data: null,

    load: function () {
      var d = readRaw();
      if (!d || !d.profiles || !Object.keys(d.profiles).length) {
        var p = freshProfile();
        d = { version: 2, activeId: p.id, profiles: {} };
        d.profiles[p.id] = p;
        d.freshInstall = true;
      } else {
        d.freshInstall = false;      // returning player: go straight to the game
      }
      // migrate / repair
      Object.keys(d.profiles).forEach(function (id) {
        var prof = d.profiles[id];
        prof.id = id;
        if (!prof.stats) prof.stats = { games: 0, correct: 0, wrong: 0, bestCombo: 0, duelWins: 0, duelLosses: 0, perfect: 0 };
        if (!prof.daily) prof.daily = newDaily();
        if (!prof.daily.cleared) prof.daily.cleared = [];
        if (!prof.stories) prof.stories = {};
        if (!prof.skills) prof.skills = { listen: 0, speak: 0, read: 0, write: 0 };
        if (prof.exam === undefined) prof.exam = null;
        if (prof.settings.levelLimit === undefined) prof.settings.levelLimit = CFG.dailyLevelLimit;
        if (!isFinite(prof.xp)) prof.xp = 0;          // repair an older corrupted save
        if (!isFinite(prof.coins)) prof.coins = 0;
        if (prof.stats && !isFinite(prof.stats.correct)) prof.stats.correct = 0;
        if (prof.stats && !isFinite(prof.stats.wrong)) prof.stats.wrong = 0;
        if (!prof.streak) prof.streak = { count: 0, best: 0, last: null };
        if (!prof.settings) prof.settings = { pinyin: true, zhuyin: false, sound: true, speech: true, difficulty: 'easy' };
        if (!prof.owned) prof.owned = [];
        if (!prof.badges) prof.badges = [];
        if (!prof.best) prof.best = {};
        if (!prof.words) prof.words = {};
        if (!prof.seenStages) prof.seenStages = [0];
        if (prof.equipped === undefined) prof.equipped = null;
        if (!CFG.difficulty[prof.settings.difficulty]) prof.settings.difficulty = 'easy';
        if (prof.settings.graphics3d === undefined) prof.settings.graphics3d = true;
        if (!prof.levels) prof.levels = {};
        if (!prof.weekly) prof.weekly = { key: util.weekKey(), xp: 0 };
      });
      if (!d.profiles[d.activeId]) d.activeId = Object.keys(d.profiles)[0];
      Store.data = d;
      Store.rollDay();
      return d;
    },

    save: function () {
      if (Store._t) return;
      Store._t = setTimeout(function () {
        Store._t = null;
        writeRaw(Store.data);
      }, 200);
    },

    saveNow: function () {
      if (Store._t) { clearTimeout(Store._t); Store._t = null; }
      writeRaw(Store.data);
    },

    profiles: function () { return Object.keys(Store.data.profiles).map(function (k) { return Store.data.profiles[k]; }); },

    me: function () { return Store.data.profiles[Store.data.activeId]; },

    setActive: function (id) {
      if (Store.data.profiles[id]) { Store.data.activeId = id; Store.rollDay(); Store.saveNow(); }
      return Store.me();
    },

    addProfile: function (name, avatar) {
      var p = freshProfile(name, avatar);
      Store.data.profiles[p.id] = p;
      Store.data.activeId = p.id;
      Store.saveNow();
      return p;
    },

    removeProfile: function (id) {
      if (Object.keys(Store.data.profiles).length <= 1) return false;
      delete Store.data.profiles[id];
      if (Store.data.activeId === id) Store.data.activeId = Object.keys(Store.data.profiles)[0];
      Store.saveNow();
      return true;
    },

    resetProfile: function (id) {
      var old = Store.data.profiles[id];
      var p = freshProfile(old.name, old.avatar);
      p.id = id;
      p.settings = old.settings;
      Store.data.profiles[id] = p;
      Store.saveNow();
      return p;
    },

    /* ---- day rollover: reset daily quest, evaluate streak --------------- */
    rollDay: function () {
      var today = util.dayKey();
      Object.keys(Store.data.profiles).forEach(function (id) {
        var p = Store.data.profiles[id];
        if (p.daily.day !== today) p.daily = newDaily();
      });
      Store.save();
    },

    /* Called once per finished game round (profile-scoped). */
    _markPlayed: function (p) {
      var today = util.dayKey();
      if (p.daily.day !== today) p.daily = newDaily();

      if (p.streak.last !== today) {
        var gap = p.streak.last ? util.daysBetween(p.streak.last, today) : null;
        p.streak.count = (gap === 1) ? p.streak.count + 1 : 1;
        p.streak.last = today;
        p.streak.best = Math.max(p.streak.best || 0, p.streak.count);
      }
      p.daily.games++;
      Store.save();
      return p.streak.count;
    },
    markPlayed: function () { return Store._markPlayed(Store.me()); },
    markPlayedFor: function (pid) {
      var p = Store.data.profiles[pid];
      return p ? Store._markPlayed(p) : 0;
    },

    /* ---- rewards -------------------------------------------------------- */
    stageOf: function (xp) {
      var s = 0;
      for (var i = 0; i < PET_STAGES.length; i++) if (xp >= PET_STAGES[i].xp) s = i;
      return s;
    },

    _addXp: function (p, n) {
      n = Math.round(Number(n));
      if (!isFinite(n)) n = 0;          // never let a bad reward poison xp
      var today = util.dayKey();
      if (p.daily.day !== today) p.daily = newDaily();
      var wk = util.weekKey();
      if (!p.weekly || p.weekly.key !== wk) p.weekly = { key: wk, xp: 0 };
      var before = Store.stageOf(p.xp);
      p.xp += n;
      p.daily.xp += n;
      p.weekly.xp += n;
      var after = Store.stageOf(p.xp);
      var dailyDone = false;
      if (!p.daily.done && p.daily.xp >= CFG.dailyGoalXp) {
        p.daily.done = true;
        p.coins += 15;
        dailyDone = true;
      }
      Store.save();
      return { stageUp: after > before, stage: after, dailyDone: dailyDone, xp: n };
    },
    addXp: function (n) { return Store._addXp(Store.me(), n); },
    addXpFor: function (pid, n) {
      var p = Store.data.profiles[pid];
      return p ? Store._addXp(p, n) : { stageUp: false, stage: 0, dailyDone: false, xp: n };
    },

    addCoins: function (n) {
      var p = Store.me();
      p.coins += finite(n);
      Store.save();
      return p.coins;
    },
    addCoinsFor: function (pid, n) {
      var p = Store.data.profiles[pid];
      if (p) { p.coins += finite(n); Store.save(); }
    },

    spend: function (n) {
      var p = Store.me();
      if (p.coins < n) return false;
      p.coins -= n;
      Store.save();
      return true;
    },

    /* ---- spaced repetition --------------------------------------------- */
    _record: function (p, word, correct) {
      var w = p.words[word.zh] || (p.words[word.zh] = { box: 0, due: 0, ok: 0, bad: 0, seen: 0, last: 0 });
      w.seen++;
      w.last = Date.now();
      if (correct) {
        w.ok++;
        w.box = util.clamp(w.box + 1, 0, CFG.srsIntervals.length - 1);
      } else {
        w.bad++;
        w.box = util.clamp(w.box - 1, 0, CFG.srsIntervals.length - 1);
      }
      w.due = Date.now() + CFG.srsIntervals[w.box];
      if (correct) p.stats.correct++; else p.stats.wrong++;
      Store.save();
      return w;
    },
    record: function (word, correct) { return Store._record(Store.me(), word, correct); },
    recordFor: function (pid, word, correct) {
      var p = Store.data.profiles[pid];
      return p ? Store._record(p, word, correct) : null;
    },

    wordState: function (zh) {
      return Store.me().words[zh] || { box: 0, due: 0, ok: 0, bad: 0, seen: 0, last: 0 };
    },

    /* Words worth practising now: overdue first, weak boxes first, then new,
       then the least recently seen. */
    pickWords: function (n, themeId) {
      var pool = themeId && themeId !== 'all'
        ? ALL_WORDS.filter(function (w) { return w.theme === themeId; })
        : ALL_WORDS.slice();
      var now = Date.now();
      var p = Store.me();
      var score = function (w) {
        var s = p.words[w.zh];
        if (!s || !s.seen) return 1e9 + Math.random() * 100;        // brand new
        if (s.due <= now) return -1e6 + s.box * 1000 + (now - s.due) / -1e6; // overdue: weakest box first
        return s.due;                                              // not due: furthest future last
      };
      var sorted = pool.slice().sort(function (a, b) { return score(a) - score(b); });
      // introduce a little freshness so repeat rounds differ
      var head = sorted.slice(0, Math.max(n * 3, 18));
      var picked = util.sample(head, Math.min(n, head.length));
      if (picked.length < n) {
        var rest = sorted.filter(function (w) { return picked.indexOf(w) < 0; });
        picked = picked.concat(util.sample(rest, n - picked.length));
      }
      // Keep pictures distinct: two words sharing one emoji would make a
      // picture question (and the memory board) ambiguous.
      var seenEm = {}, out = [];
      picked.forEach(function (w) { if (!seenEm[w.em]) { seenEm[w.em] = 1; out.push(w); } });
      if (out.length < n) {
        sorted.forEach(function (w) {
          if (out.length < n && !seenEm[w.em]) { seenEm[w.em] = 1; out.push(w); }
        });
      }
      return out;
    },

    mastery: function (themeId) {
      var words = themeId && themeId !== 'all'
        ? ALL_WORDS.filter(function (w) { return w.theme === themeId; })
        : ALL_WORDS;
      var p = Store.me(), known = 0, started = 0;
      words.forEach(function (w) {
        var s = p.words[w.zh];
        if (!s || !s.seen) return;
        started++;
        if (s.box >= 3) known++;
      });
      return { known: known, started: started, total: words.length };
    },

    studiedCount: function () {
      var p = Store.me(), n = 0;
      Object.keys(p.words).forEach(function (k) { if (p.words[k].seen) n++; });
      return n;
    },

    /* ---- levels --------------------------------------------------------- */
    levelStars: function (n) { return Store.me().levels[n] || 0; },

    totalStars: function () {
      var p = Store.me(), sum = 0;
      Object.keys(p.levels).forEach(function (k) { sum += p.levels[k] || 0; });
      return sum;
    },

    /* One star on a level opens the next one. */
    isLevelUnlocked: function (n) {
      return n <= 1 || Store.levelStars(n - 1) >= 1;
    },

    currentLevel: function () {
      var p = Store.me();
      for (var n = 1; n <= LEVELS.length; n++) {
        if (Store.isLevelUnlocked(n) && !(p.levels[n] >= 1)) return n;
      }
      return LEVELS.length;
    },

    levelProgress: function () {
      var passed = 0;
      for (var n = 1; n <= LEVELS.length; n++) if (Store.levelStars(n) >= 1) passed++;
      return { passed: passed, total: LEVELS.length, stars: Store.totalStars(), current: Store.currentLevel() };
    },

    /* Records the best result for a level; pays a bonus the first time. */
    setLevelStars: function (n, stars) {
      var p = Store.me();
      var before = p.levels[n] || 0;
      var nextWasOpen = n < LEVELS.length ? Store.isLevelUnlocked(n + 1) : true;
      if (stars > before) p.levels[n] = stars;
      var after = p.levels[n] || 0;
      var nextIsOpen = n < LEVELS.length ? after >= 1 : true;
      Store.save();
      var bonus = 0;
      if (after > before) {
        bonus = stars >= 3 ? 20 : 10;
        if (before === 0) bonus += 10;                // first clear — bigger reward
        Store.addCoins(bonus);
      }
      return {
        stars: after, improved: after > before, bonus: bonus,
        unlockedNext: !nextWasOpen && nextIsOpen && n < LEVELS.length
      };
    },

    /* ---- daily level quota ---------------------------------------------- */
    /* Montessori respects the child's rhythm: a few levels a day, then rest.
       Replaying a level already passed is always allowed — that is mastery,
       not advancement. */
    levelLimit: function () {
      var n = Store.me().settings.levelLimit;
      return n === undefined ? CFG.dailyLevelLimit : n;
    },
    levelsClearedToday: function () {
      return (Store.me().daily.cleared || []).length;
    },
    levelQuotaLeft: function () {
      var lim = Store.levelLimit();
      return lim === 0 ? Infinity : Math.max(0, lim - Store.levelsClearedToday());
    },
    canPlayLevel: function (n) {
      var lim = Store.levelLimit();
      if (lim === 0) return true;
      if (Store.levelStars(n) >= 1) return true;         // replaying: always fine
      return Store.levelsClearedToday() < lim;
    },
    markLevelCleared: function (n) {
      var p = Store.me();
      if (p.daily.day !== util.dayKey()) p.daily = newDaily();
      if (!p.daily.cleared) p.daily.cleared = [];
      var key = String(n);
      if (p.daily.cleared.indexOf(key) < 0) p.daily.cleared.push(key);
      Store.save();
      return p.daily.cleared.length;
    },

    /* ---- stories -------------------------------------------------------- */
    storyState: function (id) { return Store.me().stories[id] || null; },
    storiesRead: function () {
      var p = Store.me(), n = 0;
      Object.keys(p.stories).forEach(function (k) { if (p.stories[k].done) n++; });
      return n;
    },
    finishStory: function (id, score, total) {
      var p = Store.me();
      var was = p.stories[id];
      var best = was && was.score > score ? was.score : score;
      p.stories[id] = { done: true, score: best, total: total, day: util.dayKey() };
      Store.save();
      return { first: !was, best: best, total: total };
    },

    /* ---- four-skill practice counters ----------------------------------- */
    addSkill: function (strand, n) {
      var p = Store.me();
      if (!p.skills) p.skills = { listen: 0, speak: 0, read: 0, write: 0 };
      p.skills[strand] = (p.skills[strand] || 0) + (n == null ? 1 : n);
      Store.save();
      return p.skills[strand];
    },
    skillCount: function (strand) {
      var p = Store.me();
      return (p.skills && p.skills[strand]) || 0;
    },

    /* ---- the daily four-skill check ------------------------------------- */
    examToday: function () {
      var p = Store.me();
      return (p.exam && p.exam.day === util.dayKey()) ? p.exam : null;
    },
    /* keeps the best attempt of the day */
    saveExam: function (result) {
      var p = Store.me();
      result.total = finite(result.total);          // a report card is never NaN
      result.items = finite(result.items);
      var today = util.dayKey();
      var prev = (p.exam && p.exam.day === today) ? p.exam : null;
      var better = !prev || result.total > prev.total ||
        (result.total === prev.total && result.perfect && !prev.perfect);
      if (better) p.exam = Object.assign({ day: today }, result);
      if (result.perfect) p.perfectExam = true;
      Store.save();
      return { best: better, exam: p.exam };
    },

    /* ---- ranking -------------------------------------------------------- */
    weekXp: function (prof) {
      var wk = util.weekKey();
      if (!prof.weekly || prof.weekly.key !== wk) { prof.weekly = { key: wk, xp: 0 }; Store.save(); }
      return prof.weekly.xp;
    },

    /* Every player saved on this device, best first. */
    leaderboard: function (scope) {
      var activeId = Store.data.activeId;
      return Store.profiles().map(function (p) {
        var stage = Store.stageOf(p.xp);
        var stars = 0, mastered = 0;
        Object.keys(p.levels || {}).forEach(function (k) { stars += p.levels[k] || 0; });
        Object.keys(p.words || {}).forEach(function (w) { if (p.words[w].box >= 3) mastered++; });
        var week = Store.weekXp(p);
        return {
          id: p.id, name: p.name, avatar: p.avatar,
          xp: p.xp, weekXp: week, score: scope === 'week' ? week : p.xp,
          stage: stage, pet: PET_STAGES[stage], stageName: PET_STAGES[stage].name,
          stars: stars, mastered: mastered, streak: p.streak.count || 0,
          duels: p.stats.duelWins || 0, games: p.stats.games || 0,
          badges: (p.badges || []).length, me: p.id === activeId
        };
      }).sort(function (a, b) {
        return (b.score - a.score) || (b.stars - a.stars) || (b.mastered - a.mastered) ||
               (a.name < b.name ? -1 : 1);
      });
    },

    /* ---- badges --------------------------------------------------------- */
    hasBadge: function (id) { return Store.me().badges.indexOf(id) >= 0; },

    checkBadges: function () { return Store.evaluateBadges(); },

    /* Evaluate every badge; returns the list newly earned (and unlocks them). */
    evaluateBadges: function () {
      var p = Store.me();
      var studied = Store.studiedCount();
      var cond = {
        first_game: p.stats.games >= 1,
        perfect: p.stats.perfect >= 1,
        combo10: p.stats.bestCombo >= 10,
        words30: studied >= 30,
        words60: studied >= 60,
        words100: studied >= 100,
        streak3: (p.streak.best || 0) >= 3,
        streak7: (p.streak.best || 0) >= 7,
        games10: p.stats.games >= 10,
        boss_clear: !!p.bossCleared,
        exam_perfect: !!p.perfectExam,
        reader4: Store.storiesRead() >= 4,
        writer10: Store.skillCount('write') >= 10,
        speaker20: Store.skillCount('speak') >= 20,
        duel_first: (p.stats.duelWins + p.stats.duelLosses) >= 1,
        duel_win: p.stats.duelWins >= 1,
        coins500: p.coins >= 500,
        evolve: Store.stageOf(p.xp) >= 1
      };
      var newly = [];
      BADGES.forEach(function (b) {
        if (cond[b.id] && p.badges.indexOf(b.id) < 0) {
          p.badges.push(b.id);
          p.coins += 10;
          newly.push(b);
        }
      });
      if (newly.length) Store.save();
      return newly;
    },

    setFlag: function (k) { Store.me()[k] = true; Store.save(); },

    /* ---- shop ----------------------------------------------------------- */
    buy: function (item) {
      var p = Store.me();
      if (p.owned.indexOf(item.id) >= 0) return false;
      if (!Store.spend(item.price)) return false;
      p.owned.push(item.id);
      Store.save();
      return true;
    },
    equip: function (id) {
      var p = Store.me();
      p.equipped = (p.equipped === id) ? null : id;
      Store.save();
      return p.equipped;
    },
    equippedItem: function () {
      var p = Store.me();
      if (!p.equipped) return null;
      for (var i = 0; i < SHOP.length; i++) if (SHOP[i].id === p.equipped) return SHOP[i];
      return null;
    }
  };

  /* =============================================================== audio == */
  var audio = {
    ctx: null,
    enabled: true,

    init: function () {
      if (audio.ctx) return audio.ctx;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audio.ctx = new AC();
      } catch (e) { audio.ctx = null; }
      return audio.ctx;
    },
    resume: function () {
      var c = audio.init();
      if (c && c.state === 'suspended') c.resume();
    },

    /* one shaped tone */
    tone: function (freq, dur, opts) {
      if (!audio.enabled) return;
      var c = audio.init(); if (!c) return;
      opts = opts || {};
      var t0 = c.currentTime + (opts.delay || 0);
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = opts.type || 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.to), t0 + dur);
      var vol = opts.vol == null ? 0.22 : opts.vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.04);
    },

    noise: function (dur, vol) {
      if (!audio.enabled) return;
      var c = audio.init(); if (!c) return;
      var len = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource(); src.buffer = buf;
      var g = c.createGain(); g.gain.value = vol == null ? 0.14 : vol;
      var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400;
      src.connect(f); f.connect(g); g.connect(c.destination); src.start();
    },

    correct: function () { [660, 880, 1180].forEach(function (f, i) { audio.tone(f, 0.16, { delay: i * 0.07, vol: 0.2 }); }); },
    wrong: function () { audio.tone(240, 0.3, { type: 'sawtooth', to: 120, vol: 0.16 }); },
    coin: function () { audio.tone(1250, 0.07, { type: 'square', vol: 0.12 }); audio.tone(1750, 0.1, { delay: 0.06, type: 'square', vol: 0.1 }); },
    flip: function () { audio.noise(0.06, 0.09); },
    pop: function () { audio.tone(520, 0.1, { to: 900, vol: 0.16 }); },
    tap: function () { audio.tone(700, 0.05, { type: 'sine', vol: 0.1 }); },
    tick: function () { audio.tone(1500, 0.03, { type: 'square', vol: 0.05 }); },
    hit: function () { audio.tone(180, 0.22, { type: 'square', to: 60, vol: 0.2 }); audio.noise(0.18, 0.16); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { audio.tone(f, 0.3, { delay: i * 0.11, vol: 0.2 }); }); },
    lose: function () { [440, 370, 294].forEach(function (f, i) { audio.tone(f, 0.3, { delay: i * 0.13, type: 'sine', vol: 0.18 }); }); },
    evolve: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { audio.tone(f, 0.42, { delay: i * 0.09, vol: 0.18 }); }); audio.noise(0.5, 0.06); },
    countdown: function (n) { audio.tone(n === 0 ? 900 : 620, n === 0 ? 0.4 : 0.14, { type: 'square', vol: 0.16 }); }
  };

  /* ============================================================== speech == */
  var speech = {
    voices: [],
    zhVoice: null,
    enVoice: null,
    supported: typeof window !== 'undefined' && 'speechSynthesis' in window,

    load: function () {
      if (!speech.supported) return;
      var all = window.speechSynthesis.getVoices() || [];
      if (!all.length) return;
      speech.voices = all;
      var pref = [/zh[-_]TW/i, /zh[-_]HK/i, /zh[-_]Hant/i, /^zh/i];
      speech.zhVoice = null;
      for (var i = 0; i < pref.length && !speech.zhVoice; i++) {
        for (var j = 0; j < all.length; j++) {
          if (pref[i].test(all[j].lang || '') || pref[i].test(all[j].name || '')) { speech.zhVoice = all[j]; break; }
        }
      }
      speech.enVoice = all.filter(function (v) { return /^en[-_]/i.test(v.lang || ''); })[0] || null;
    },

    hasChinese: function () { return !!(speech.supported && speech.zhVoice); },

    say: function (text, opts) {
      if (!speech.supported || !text) return false;
      opts = opts || {};
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(String(text));
        if (opts.lang === 'en') {
          u.lang = 'en-US';
          if (speech.enVoice) u.voice = speech.enVoice;
        } else {
          u.lang = 'zh-TW';
          if (speech.zhVoice) u.voice = speech.zhVoice;
        }
        u.rate = opts.rate == null ? (opts.lang === 'en' ? 0.95 : 0.78) : opts.rate;
        u.pitch = opts.pitch == null ? 1.08 : opts.pitch;
        u.volume = 1;
        if (opts.onStart) u.onstart = opts.onStart;
        if (opts.onEnd) u.onend = opts.onEnd;
        if (opts.onBoundary) u.onboundary = opts.onBoundary;
        if (opts.onError) u.onerror = opts.onError;
        window.speechSynthesis.speak(u);
        return u;
      } catch (e) { return false; }
    },

    sayWord: function (word, times) {
      if (!word) return;
      var n = times || 1;
      var text = word.zh;
      speech.say(text, { rate: 0.7 });
      if (n > 1) {
        setTimeout(function () { speech.say(text, { rate: 0.6 }); }, 1100);
      }
    },

    stop: function () { if (speech.supported) { try { window.speechSynthesis.cancel(); } catch (e) {} } }
  };

  if (speech.supported) {
    speech.load();
    window.speechSynthesis.addEventListener('voiceschanged', function () { speech.load(); });
  }

  /* ================================================================= fx == */
  var fx = {
    canvas: null, ctx: null, parts: [], raf: null,

    initCanvas: function () {
      if (fx.canvas) return;
      fx.canvas = util.el('canvas', 'fx-canvas');
      document.body.appendChild(fx.canvas);
      fx.ctx = (fx.canvas.getContext && fx.canvas.getContext('2d')) || null;
      if (!fx.ctx) { fx.parts = []; return; }   // no canvas support — the game still plays
      fx.resize();
      window.addEventListener('resize', fx.resize);
    },
    resize: function () {
      if (!fx.canvas || !fx.ctx) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      fx.canvas.width = window.innerWidth * dpr;
      fx.canvas.height = window.innerHeight * dpr;
      fx.canvas.style.width = window.innerWidth + 'px';
      fx.canvas.style.height = window.innerHeight + 'px';
      fx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    confetti: function (opts) {
      opts = opts || {};
      fx.initCanvas();
      if (!fx.ctx) return;
      var n = opts.count || 110;
      var colors = opts.colors || ['#ff7a59', '#ffb020', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffd93d'];
      var cx = window.innerWidth / 2, cy = opts.y == null ? window.innerHeight * 0.34 : opts.y;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 11;
        fx.parts.push({
          x: cx + (Math.random() - 0.5) * (opts.spread || 90),
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5,
          g: 0.28 + Math.random() * 0.14,
          s: 5 + Math.random() * 8,
          rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.34,
          c: colors[Math.floor(Math.random() * colors.length)],
          life: 1, decay: 0.006 + Math.random() * 0.006,
          shape: Math.random() < 0.32 ? 'star' : 'rect'
        });
      }
      if (!fx.raf) fx.raf = requestAnimationFrame(fx.step);
    },

    step: function () {
      if (!fx.ctx) { fx.parts = []; fx.raf = null; return; }
      var c = fx.ctx, W = window.innerWidth, H = window.innerHeight;
      c.clearRect(0, 0, W, H);
      for (var i = fx.parts.length - 1; i >= 0; i--) {
        var p = fx.parts[i];
        p.vy += p.g; p.vx *= 0.995;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
        if (p.life <= 0 || p.y > H + 60) { fx.parts.splice(i, 1); continue; }
        c.save();
        c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
        c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c;
        if (p.shape === 'star') {
          c.beginPath();
          for (var k = 0; k < 5; k++) {
            var ang = (k * 4 * Math.PI) / 5 - Math.PI / 2;
            var rr = p.s * 0.8;
            c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
          }
          c.closePath(); c.fill();
        } else {
          c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
        }
        c.restore();
      }
      if (fx.parts.length) fx.raf = requestAnimationFrame(fx.step);
      else { fx.raf = null; c.clearRect(0, 0, W, H); }
    },

    floatText: function (text, x, y, color) {
      var n = util.el('div', 'floatdmg', util.esc(text));
      n.style.left = (x - 20) + 'px';
      n.style.top = y + 'px';
      if (color) n.style.color = color;
      document.body.appendChild(n);
      setTimeout(function () { n.remove(); }, 1000);
    },

    toastEl: null,
    toast: function (msg, ms) {
      if (!fx.toastEl) { fx.toastEl = util.el('div', 'toast'); document.body.appendChild(fx.toastEl); }
      fx.toastEl.innerHTML = msg;
      fx.toastEl.classList.add('show');
      clearTimeout(fx._tt);
      fx._tt = setTimeout(function () { fx.toastEl.classList.remove('show'); }, ms || 1900);
    },

    bump: function (selector) {
      var n = util.$(selector);
      if (!n) return;
      n.classList.remove('bump');
      void n.offsetWidth;
      n.classList.add('bump');
    },

    celebratePet: function () {
      var pet = util.$('#pet');
      if (!pet) return;
      pet.classList.remove('celebrate');
      void pet.offsetWidth;
      pet.classList.add('celebrate');
      setTimeout(function () { pet.classList.remove('celebrate'); }, 1800);
    }
  };

  /* ============================================================ snippets == */
  /* Shared HTML builders so every screen renders characters identically. */
  var ui = {
    pinyinLine: function (w) {
      var s = Store.me().settings;
      var out = [];
      if (s.pinyin) out.push('<span class="wordcard__py">' + util.esc(w.py) + '</span>');
      if (s.zhuyin) out.push('<span class="wordcard__zy">' + util.esc(w.zy) + '</span>');
      return out.join('');
    },
    wordCard: function (w) {
      var st = Store.wordState(w.zh);
      var dots = '';
      for (var i = 0; i < 5; i++) dots += '<i class="dot' + (i < st.box ? ' on' : '') + '"></i>';
      return '<button class="wordcard" data-word="' + util.esc(w.zh) + '">' +
        '<span class="wordcard__em">' + w.em + '</span>' +
        '<span class="wordcard__zh">' + util.esc(w.zh) + '</span>' +
        ui.pinyinLine(w) +
        '<span class="wordcard__en">' + util.esc(w.en) + '</span>' +
        '<span class="wordcard__dots">' + dots + '</span>' +
        '</button>';
    },
    stars: function (n, of) {
      var total = of == null ? 3 : of;
      var s = '';
      for (var i = 0; i < total; i++) s += (i < n ? '⭐' : '☆');
      return s;
    }
  };

  /* ============================================================= exports == */
  return {
    util: util,
    store: Store,
    audio: audio,
    speech: speech,
    fx: fx,
    ui: ui,
    themes: THEMES,
    games: GAMES,
    words: ALL_WORDS,
    byZh: WORD_BY_ZH,
    shop: SHOP,
    badges: BADGES,
    petStages: PET_STAGES,
    strands: STRANDS,
    stories: STORIES,
    charPy: CHAR_PY,
    storyById: STORY_BY_ID,
    levels: LEVELS,
    rank: RANK,
    config: CFG
  };
})();
