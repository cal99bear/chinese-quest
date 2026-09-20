/* =========================================================================
   Chinese Quest — 龍之對戰 Dragon Battle
   Two ways to fight:
     • solo  — race the Dragon King AI (3 tiers)
     • duo   — two children, one device: split screen, left half vs right half
               (keyboard halves A S D F / J K L ;  or tap your own panels)

   Core rule: the FIRST player to answer correctly wins the exchange and
   damages the rival's dragon. A wrong answer freezes you until the next
   question. First dragon to 0 HP loses.
   ========================================================================= */

var Battle = (function () {
  'use strict';

  var U = CQ.util, S = CQ.store, A = CQ.audio, SP = CQ.speech, FX = CQ.fx;

  var TIERS = {
    easy:   { key: 'easy',   zh: '小龍', en: 'Hatchling',   avatar: '🦎', dmg: 14, acc: 0.70, speed: [3600, 5600] },
    normal: { key: 'normal', zh: '火龍', en: 'Fire Dragon', avatar: '🐲', dmg: 18, acc: 0.80, speed: [2600, 4300] },
    hard:   { key: 'hard',   zh: '龍王', en: 'Dragon King', avatar: '🐉', dmg: 24, acc: 0.88, speed: [1800, 3200] }
  };

  var P1_KEYS = ['a', 's', 'd', 'f', 'g', 'h'];
  var P2_KEYS = ['j', 'k', 'l', ';', "'", '\\'];

  var host = null;
  var run = null;

  function setHost(node) { host = node; }

  function mount(html) { host.innerHTML = html; return host; }

  /* ------------------------------------------------------------ helpers -- */
  function hpClass(hp) { return hp <= 30 ? ' low' : (hp <= 60 ? ' mid' : ''); }

  function sideHTML(p, opts, index) {
    return '<div class="side side--' + p.key + '" id="side-' + p.key + '">' +
      '<div class="side__label">' +
        '<span>' + p.avatar + ' ' + U.esc(p.name) + '</span>' +
        '<span class="side__key">' + (p.isAI ? 'AI' : opts.keys) + '</span>' +
      '</div>' +
      '<div class="battle-options" id="opts-' + p.key + '">' +
        opts.list.map(function (w, i) {
          return '<button class="battle-opt" data-p="' + p.key + '" data-i="' + i + '"' +
            (p.isAI ? ' disabled' : '') + '>' + opts.piece(w) + '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function fighterHTML(p) {
    return '<div class="fighter fighter--' + p.key + '" id="fighter-' + p.key + '">' +
      '<div class="fighter__emoji">' + p.avatar + '</div>' +
      '<div class="fighter__name">' + U.esc(p.name) + '</div>' +
      '<div class="fighter__role">' + U.esc(p.role) + '</div>' +
      '<div class="hpbar"><i class="hpbar__fill' + hpClass(p.hp) + '" id="hp-' + p.key + '" style="width:' + p.hp + '%"></i></div>' +
      '<div class="hp__num" id="hpn-' + p.key + '">' + p.hp + ' / 100</div>' +
    '</div>';
  }

  function renderArena(questionHTML, opts) {
    mount(
      '<div class="arena">' +
        '<div class="arena__top">' +
          fighterHTML(run.p1) + '<div class="vs">VS</div>' + fighterHTML(run.p2) +
        '</div>' +
        '<div class="battle-q">' + questionHTML +
          '<div class="battle-q__timer"><i id="btimer"></i></div>' +
        '</div>' +
        '<div class="battle-msg" id="bmsg">' + U.esc(run.message || '') + '</div>' +
        '<div class="arena__sides">' +
          sideHTML(run.p1, opts, 0) + sideHTML(run.p2, opts, 1) +
        '</div>' +
      '</div>'
    );
  }

  function refreshHp() {
    [run.p1, run.p2].forEach(function (p) {
      var bar = U.$('#hp-' + p.key), num = U.$('#hpn-' + p.key), f = U.$('#fighter-' + p.key);
      if (bar) { bar.style.width = Math.max(0, p.hp) + '%'; bar.className = 'hpbar__fill' + hpClass(p.hp); }
      if (num) num.textContent = Math.max(0, p.hp) + ' / 100';
      if (f) f.classList.toggle('ko', p.hp <= 0);
    });
  }

  /* -------------------------------------------------------- participant -- */
  function makeParticipant(key, spec) {
    return {
      key: key,
      name: spec.name,
      avatar: spec.avatar,
      role: spec.role || '',
      profileId: spec.profileId || null,
      isAI: !!spec.isAI,
      aiTier: spec.aiTier || null,
      hp: CQ.config.battleHp,
      combo: 0, bestCombo: 0, correct: 0, wrong: 0,
      locked: false,
      results: []
    };
  }

  function recordFor(p, word, ok) {
    if (p.profileId) S.recordFor(p.profileId, word, ok);
  }

  /* ------------------------------------------------------------- rounds -- */
  function newQuestion() {
    if (run.coin) { run.coin.destroy(); run.coin = null; }   // the toss is over
    var q = run.queue[run.qIndex % run.queue.length];
    run.qIndex++;
    run.answer = q;
    run.resolved = false;
    run.p1.locked = false;
    run.p2.locked = false;

    var fmt = U.pick(run.formats);
    run.fmt = fmt;
    var kind = fmt === 'pinyin' ? 'py' : 'zh';
    var keyOf = U.primaryKey(fmt);
    run.keyOf = keyOf;

    var opts = U.shuffle(U.distractors(run.pool, q, run.nOpts - 1, U.optionKeys(fmt)).concat([q]));
    run.opts = opts;

    var piece = function (w) {
      if (kind === 'py') return '<span class="option__py">' + U.esc(w.py) + '</span>';
      return '<span class="zh">' + U.esc(w.zh) + '</span>';
    };
    var optSpec = { list: opts, piece: piece };

    var qh;
    if (fmt === 'listen') {
      qh = '<div class="battle-q__label">🔊 Listen &amp; race · 聽發音搶答</div>' +
        '<div class="battle-q__body"><span class="emoji">🔊</span></div>';
    } else if (fmt === 'pinyin') {
      qh = '<div class="battle-q__label">Choose the pinyin · 選拼音</div>' +
        '<div class="battle-q__body"><span class="zh">' + U.esc(q.zh) + '</span></div>';
    } else if (fmt === 'meaning') {
      qh = '<div class="battle-q__label">Choose the characters · 選漢字</div>' +
        '<div class="battle-q__body"><span class="emoji">' + q.em + '</span> <span style="font-size:22px">' + U.esc(q.en) + '</span></div>';
    } else {
      qh = '<div class="battle-q__label">Which word is this? · 這是什麼？</div>' +
        '<div class="battle-q__body"><span class="emoji">' + q.em + '</span></div>';
    }

    run.message = '';
    renderArena(qh, optSpec);
    refreshHp();
    if (fmt === 'listen') setTimeout(function () { SP.sayWord(q); }, 200);
    startClock();
    armAI();
  }

  function startClock() {
    clearInterval(run.clock);
    run.timeLeft = run.secPerQ * 1000;
    var bar = U.$('#btimer');
    run.clock = setInterval(function () {
      run.timeLeft -= 100;
      if (bar) bar.style.width = Math.max(0, run.timeLeft / (run.secPerQ * 1000) * 100) + '%';
      if (run.timeLeft <= 8000 && run.timeLeft % 1000 < 100 && !run.counting) {
        run.counting = true;
        setTimeout(function () { run.counting = false; }, 120);
        A.tick();
      }
      if (run.timeLeft <= 0) {
        clearInterval(run.clock);
        if (!run.resolved) timeoutRound();
      }
    }, 100);
  }

  function armAI() {
    clearTimeout(run.aiTimer);
    if (!run.p2.isAI) return;
    var tier = run.p2.aiTier;
    var delay = tier.speed[0] + Math.random() * (tier.speed[1] - tier.speed[0]);
    run.aiTimer = setTimeout(function () {
      if (run.resolved || run.ended) return;
      if (Math.random() < tier.acc) {
        var i = run.opts.indexOf(run.answer);
        answer('p2', i, true);
      } else {
        // pick a plausible wrong option
        var wrongIdx = [];
        run.opts.forEach(function (w, i) { if (run.keyOf(w) !== run.keyOf(run.answer)) wrongIdx.push(i); });
        answer('p2', U.pick(wrongIdx), true);
      }
    }, delay);
  }

  function timeoutRound() {
    run.resolved = true;
    clearTimeout(run.aiTimer);
    run.message = '時間到 — 都沒得分 · Time up, no score!';
    var m = U.$('#bmsg'); if (m) m.textContent = run.message;
    A.lose();
    setTimeout(function () { nextRound(); }, 1500);
  }

  /* One participant answered. `fromAI` only affects nothing but clarity. */
  function answer(key, optIndex, fromAI) {
    if (run.resolved || run.ended) return;
    var p = run['p' + (key === 'p1' ? '1' : '2')];
    if (p.locked) return;
    var w = run.answer;
    var chosen = optIndex >= 0 && run.opts[optIndex] ? run.opts[optIndex] : null;
    var ok = !!chosen && run.keyOf(chosen) === run.keyOf(w);

    var side = U.$('#side-' + key);
    var btns = U.$$('#opts-' + key + ' .battle-opt');

    recordFor(p, w, ok);
    p.results.push({ zh: w.zh, ok: ok, word: w });

    if (ok) {
      p.correct++; p.combo++; p.bestCombo = Math.max(p.bestCombo, p.combo);
      btns.forEach(function (b) {
        if (run.keyOf(run.opts[+b.dataset.i]) === run.keyOf(w)) b.classList.add('correct');
        else b.classList.add('dim');
      });
      if (side) side.classList.add('win');
      A.correct();
      SP.sayWord(w);
      score(key);
    } else {
      p.wrong++; p.combo = 0;
      p.locked = true;
      if (chosen) {
        var wrongBtn = btns.filter(function (b) { return +b.dataset.i === optIndex; })[0];
        if (wrongBtn) wrongBtn.classList.add('wrong');
      }
      btns.forEach(function (b) {
        if (run.keyOf(run.opts[+b.dataset.i]) === run.keyOf(w)) b.classList.add('correct');
        else if (b !== wrongBtn) b.classList.add('dim');
      });
      if (side) { side.classList.add('frozen'); side.classList.add('lose'); }
      A.wrong();
      if (!run.p1.locked || !run.p2.locked) {
        run.message = (key === 'p1' ? run.p1.name : run.p2.name) + ' 答錯了，暫停！ · Wrong — frozen!';
        var m = U.$('#bmsg'); if (m) m.textContent = run.message;
      }
      if (run.p1.locked && run.p2.locked) {
        run.resolved = true;
        clearTimeout(run.aiTimer);
        A.lose();
        setTimeout(nextRound, 1400);
      }
      return;
    }
  }

  function score(winnerKey) {
    run.resolved = true;
    clearTimeout(run.aiTimer);
    clearInterval(run.clock);
    var winner = run[winnerKey];
    var loser = run[winnerKey === 'p1' ? 'p2' : 'p1'];

    var base = winner.isAI ? winner.aiTier.dmg : Math.round((CQ.config.battleDamage[0] + CQ.config.battleDamage[2]) / 2);
    var bonus = Math.min(12, Math.max(0, (winner.combo - 1) * 3));
    var dmg = base + bonus;
    loser.hp = Math.max(0, loser.hp - dmg);

    var f = U.$('#fighter-' + loser.key);
    if (f) {
      f.classList.add('hit');
      var rect = f.getBoundingClientRect();
      FX.floatText('-' + dmg, rect.left + rect.width / 2 - 20, rect.top);
      setTimeout(function () { f.classList.remove('hit'); }, 520);
    }
    A.hit();
    refreshHp();

    run.message = '💥 ' + winner.avatar + ' ' + winner.name + ' 得分！ −' + dmg + ' HP' + (bonus ? '  (連擊 +' + bonus + ')' : '');
    var m = U.$('#bmsg'); if (m) m.textContent = run.message;

    if (loser.hp <= 0) {
      run.ended = true;
      setTimeout(endMatch, 900);
      return;
    }
    setTimeout(nextRound, 1500);
  }

  function nextRound() {
    if (run.ended) return;
    clearInterval(run.clock);
    clearTimeout(run.aiTimer);
    var s1 = U.$('#side-p1'), s2 = U.$('#side-p2');
    [s1, s2].forEach(function (s) { if (s) s.classList.remove('win', 'lose', 'frozen'); });
    run.round++;
    newQuestion();
  }

  /* ------------------------------------------------------------- finish -- */
  function endMatch() {
    clearInterval(run.clock);
    clearTimeout(run.aiTimer);
    run.ended = true;
    SP.stop();
    var winnerKey = run.p1.hp <= 0 ? 'p2' : 'p1';
    App.finishBattle({
      mode: run.mode,
      winnerKey: winnerKey,
      p1: run.p1,
      p2: run.p2,
      rounds: run.round
    });
  }

  /* -------------------------------------------------------------- setup -- */
  /* config: { mode:'ai'|'duo', tier:'easy'|'normal'|'hard', opponentId,
               theme:'all', formats:[] }                                     */
  function start(config) {
    stop();
    var themeId = config.theme || 'all';
    var pool = themeId === 'all' ? CQ.words : CQ.words.filter(function (w) { return w.theme === themeId; });
    var me = S.me();
    var duo = config.mode === 'duo';

    var nOpts = duo ? Math.min(4, Math.max(3, CQ.config.difficulty[me.settings.difficulty].options)) : 4;
    var secPerQ = duo ? 8 : 9;

    var p1 = makeParticipant('p1', {
      name: me.name, avatar: me.avatar, role: duo ? '玩家 1 · Player 1' : '挑戰者 · Challenger',
      profileId: me.id
    });

    var p2;
    if (duo) {
      var other = config.opponentId ? S.data.profiles[config.opponentId] : null;
      p2 = makeParticipant('p2', {
        name: other ? other.name : '訪客 Guest',
        avatar: other ? other.avatar : '🐼',
        role: '玩家 2 · Player 2',
        profileId: other ? other.id : null
      });
    } else {
      var tier = TIERS[config.tier || 'easy'];
      p2 = makeParticipant('p2', {
        name: tier.zh + ' ' + tier.en, avatar: tier.avatar, role: 'AI 對手 · AI Rival',
        isAI: true, aiTier: tier
      });
    }

    run = {
      mode: duo ? 'duo' : 'ai',
      duo: duo,
      p1: p1, p2: p2,
      pool: pool,
      queue: S.pickWords(30, themeId),
      qIndex: 0,
      nOpts: nOpts,
      secPerQ: secPerQ,
      round: 0,
      formats: config.formats || (duo ? ['meaning', 'pinyin', 'listen'] : ['meaning', 'pinyin', 'listen', 'meaning']),
      resolved: true,
      ended: false,
      message: '',
      clock: null, aiTimer: null
    };

    run.coin = null;
    mount('<div class="arena"><div class="coin-wrap">' +
      '<canvas class="coin3d" id="coin3d" width="180" height="180" aria-hidden="true"></canvas>' +
      '<div class="battle-count" id="bcount">3</div></div>' +
      '<p class="center" style="color:#fff;font-weight:900;text-shadow:0 2px 0 rgba(0,0,0,.22)">' +
      (duo ? '兩人都用同一台裝置 · ' + P1_KEYS.slice(0, nOpts).join(' ').toUpperCase() + '  vs  ' + P2_KEYS.slice(0, nOpts).join(' ').toUpperCase()
           : '搶答！先答對的攻擊對手') + '</p></div>');

    try {
      run.coin = CQ3D.mount(U.$('#coin3d'), { shape: 'coin', palette: 'gold', size: 180, spin: 3.4, paused: false });
    } catch (e) { run.coin = null; }
    document.addEventListener('keydown', onKey);
    countdown(3);
  }

  function countdown(n) {
    var node = U.$('#bcount');
    if (!node) return;
    if (n > 0) {
      node.textContent = n;
      node.style.animation = 'none'; void node.offsetWidth; node.style.animation = 'pop .4s ease';
      A.countdown(n);
      setTimeout(function () { countdown(n - 1); }, 800);
    } else {
      node.textContent = 'GO!';
      A.countdown(0);
      setTimeout(function () { nextRound(); }, 550);
    }
  }

  function stop() {
    if (run) {
      clearInterval(run.clock);
      clearTimeout(run.aiTimer);
      if (run.coin) { run.coin.destroy(); run.coin = null; }
    }
    document.removeEventListener('keydown', onKey);
    if (run) run.ended = true;
    run = null;
    SP.stop();
  }

  /* ------------------------------------------------------------- inputs -- */
  function onKey(e) {
    if (!run || run.ended || run.resolved) return;
    var k = (e.key || '').toLowerCase();
    var i;

    i = P1_KEYS.indexOf(k);
    if (i >= 0 && i < run.nOpts && !run.p1.locked) { e.preventDefault(); A.tap(); answer('p1', i); return; }

    i = P2_KEYS.indexOf(k);
    if (i >= 0 && run.duo && i < run.nOpts && !run.p2.locked) { e.preventDefault(); A.tap(); answer('p2', i); return; }
  }

  function onClick(target) {
    var btn = target.closest('[data-p]');
    if (!btn || !run || run.ended) return false;
    var p = btn.dataset.p;
    var i = +btn.dataset.i;
    if (run[p].locked || run[p].isAI || run.resolved) return true;
    A.tap();
    answer(p, i);
    return true;
  }

  return {
    setHost: setHost,
    start: start,
    stop: stop,
    /* read-only view of the duel in progress — used by the smoke tests */
    debug: function () { return run; },
    onClick: onClick,
    tiers: TIERS,
    p1Keys: P1_KEYS,
    p2Keys: P2_KEYS
  };
})();
