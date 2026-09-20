/* =========================================================================
   Chinese Quest — solo mini-games
   Memory Match, Listen Up, Pinyin Pop, Picture Pick, Word Builder, Boss Rush.
   Every round ends by calling App.finishRound(summary).
   ========================================================================= */

var Games = (function () {
  'use strict';

  var U = CQ.util, S = CQ.store, A = CQ.audio, SP = CQ.speech, FX = CQ.fx;
  var host = null;
  var live = null;               // active round controller (for teardown)

  function setHost(node) { host = node; }
  function mount(html) { host.innerHTML = html; return host; }

  function stop() {
    if (live && live.destroy) { try { live.destroy(); } catch (e) {} }
    live = null;
    api.live = null;
    SP.stop();
  }

  /* -------------------------------------------------------------- shared -- */
  function diff() { return CQ.config.difficulty[S.me().settings.difficulty]; }

  function headHTML(g, right) {
    return '<div class="hud">' +
      '<div class="hud__q">' + g.emoji + ' ' + U.esc(g.zh) + '<small>' + U.esc(g.en) + '</small></div>' +
      '<div class="spacer"></div>' + (right || '') +
      '</div>';
  }

  function speakButton(word) {
    return '<button class="prompt__speak" data-speak="' + U.esc(word.zh) + '" aria-label="play sound">🔊</button>';
  }

  /* Renders the content of an answer option / prompt for a given "kind". */
  function piece(w, kind, big) {
    switch (kind) {
      case 'zh':  return '<span class="zh"' + (big ? '' : '') + '>' + U.esc(w.zh) + '</span>';
      case 'py':  return '<span class="option__py">' + U.esc(w.py) + '</span>';
      case 'pic': return '<span class="emoji">' + w.em + '</span>';
      case 'en':  return '<span class="prompt__text">' + U.esc(w.en) + '</span>';
      default:    return U.esc(w.zh);
    }
  }

  function infoStrip(w) {
    var s = S.me().settings, bits = [];
    bits.push('<b class="zh" style="font-size:20px">' + U.esc(w.zh) + '</b>');
    if (s.pinyin) bits.push('<span style="color:#3b82f6;font-weight:900">' + U.esc(w.py) + '</span>');
    if (s.zhuyin) bits.push('<span style="color:#8b5cf6;font-weight:900">' + U.esc(w.zy) + '</span>');
    bits.push('<span style="color:#5b7089;font-weight:800">' + U.esc(w.en) + '</span>');
    return '<div class="hintstrip">' + bits.map(function (b) { return '<span class="pill">' + b + '</span>'; }).join('') +
      '<button class="pill" data-speak="' + U.esc(w.zh) + '">🔊 ' + U.esc(w.zh) + '</button></div>';
  }

  /* ================================================================ QUIZ == */
  /* Generic multiple-choice round: listen / pinyin / meaning / mixed.        */
  function Quiz(cfg) {
    var g = cfg.game;
    var pool = cfg.pool;
    var words = cfg.words;
    var total = words.length;
    var d = diff();
    var nOpts = cfg.options || d.options;
    var idx = 0, correct = 0, wrong = 0, combo = 0, bestCombo = 0;
    var results = [];
    var answered = false;
    var qTimer = null, tickTimer = null;
    var timeLeft = 0;

    var r = {
      gameId: g.id,
      words: words,
      destroy: function () { clearInterval(qTimer); clearInterval(tickTimer); }
    };

    function format() {
      if (cfg.formats) return U.pick(cfg.formats);
      return cfg.format;
    }

    function questionHTML(w, fmt) {
      if (fmt === 'listen') {
        return '<div class="prompt pop">' + speakButton(w) +
          '<div class="prompt__emoji">🔊</div>' +
          '<div class="prompt__text">Listen…</div>' +
          '<div class="prompt__sub">' + (SP.hasChinese() ? '聽一聽，選出正確的字詞' : 'Listen and choose · ' + U.esc(w.py)) + '</div>' +
          '</div>';
      }
      if (fmt === 'pinyin') {
        return '<div class="prompt pop">' + speakButton(w) +
          '<div class="prompt__emoji">' + w.em + '</div>' +
          '<div class="prompt__zh">' + U.esc(w.zh) + '</div>' +
          '<div class="prompt__sub">Choose the correct pinyin · 選拼音</div>' +
          '</div>';
      }
      return '<div class="prompt pop">' + speakButton(w) +
        '<div class="prompt__emoji">' + w.em + '</div>' +
        '<div class="prompt__text">' + U.esc(w.en) + '</div>' +
        '<div class="prompt__sub">Choose the matching characters · 選漢字</div>' +
        '</div>';
    }

    function optionsHTML(answer, fmt) {
      var kind = fmt === 'pinyin' ? 'py' : 'zh';
      var keyOf = U.primaryKey(fmt);
      var distract = U.distractors(pool, answer, nOpts - 1, U.optionKeys(fmt));
      var opts = U.shuffle(distract.concat([answer]));
      r.currentOptions = opts;
      r.kind = kind;
      r.keyOf = keyOf;
      return '<div class="options options--' + opts.length + '">' + opts.map(function (w, i) {
        return '<button class="option" data-opt="' + i + '">' + piece(w, kind) + '</button>';
      }).join('') + '</div>';
    }

    function show() {
      answered = false;
      var w = words[idx];
      r.answer = w;
      var fmt = format();
      var right = '<span class="pill">' + (idx + 1) + ' / ' + total + '</span>';
      if (combo >= 2) right += '<span class="combo" id="combo">🔥 x' + combo + '</span>';
      mount(
        headHTML(g, right) +
        '<div class="progressbar"><i class="progressbar__fill" style="width:' + (idx / total * 100) + '%"></i></div>' +
        (cfg.secPerQ ? '<div class="timer"><i class="timer__fill" id="qTimer"></i></div>' : '') +
        '<div id="qBody">' + questionHTML(w, fmt) + optionsHTML(w, fmt) + '</div>'
      );
      if (fmt === 'listen') setTimeout(function () { SP.sayWord(w); }, 240);
      startTimer();
    }

    function startTimer() {
      clearInterval(qTimer); clearInterval(tickTimer);
      if (!cfg.secPerQ) return;
      timeLeft = cfg.secPerQ * 1000;
      var bar = U.$('#qTimer');
      tickTimer = setInterval(function () {
        timeLeft -= 100;
        if (bar) {
          bar.style.width = Math.max(0, timeLeft / (cfg.secPerQ * 1000) * 100) + '%';
          bar.classList.toggle('warn', timeLeft < cfg.secPerQ * 400);
        }
        if (timeLeft <= 0) { clearInterval(tickTimer); if (!answered) answer(-1); }
      }, 100);
    }

    function answer(optIndex) {
      if (answered) return;
      answered = true;
      clearInterval(tickTimer);
      var w = words[idx];
      var chosen = optIndex >= 0 ? r.currentOptions[optIndex] : null;
      var keyOf = r.keyOf || function (x) { return x.zh; };
      var ok = !!chosen && keyOf(chosen) === keyOf(w);

      U.$$('.option').forEach(function (btn) {
        var cand = r.currentOptions[+btn.dataset.opt];
        if (keyOf(cand) === keyOf(w)) btn.classList.add('option--correct');
        else if (cand === chosen) btn.classList.add('option--wrong');
        else btn.classList.add('option--dim');
        btn.disabled = true;
      });

      var body = U.$('#qBody');
      if (ok) {
        correct++; combo++; bestCombo = Math.max(bestCombo, combo);
        A.correct(); FX.confetti({ count: 14, y: window.innerHeight * 0.3, spread: 60 });
        if (combo > 0 && combo % 3 === 0) { A.coin(); CQ.store.addCoins(1); }
      } else {
        wrong++; combo = 0;
        A.wrong();
        var p = U.$('.prompt'); if (p) { p.classList.add('shake'); }
      }
      S.record(w, ok);
      results.push({ zh: w.zh, ok: ok, word: w });
      if (body) body.insertAdjacentHTML('beforeend', infoStrip(w));
      if (ok) SP.sayWord(w);

      setTimeout(next, ok ? 1000 : 1900);
    }

    function next() {
      idx++;
      if (idx >= total) return finish();
      show();
    }

    function finish() {
      clearInterval(qTimer); clearInterval(tickTimer);
      var stars = U.stars(correct, total);
      var xp = correct * CQ.config.xpPerCorrect + Math.floor(bestCombo / 3) * 5;
      var coins = correct * CQ.config.coinsPerCorrect;
      App.finishRound({
        gameId: g.id, correct: correct, total: total, wrong: wrong,
        bestCombo: bestCombo, stars: stars, xp: xp, coins: coins, results: results
      });
    }

    r.click = function (target) {
      if (target.closest('[data-speak]')) {
        var zh = target.closest('[data-speak]').dataset.speak;
        SP.sayWord(CQ.byZh[zh] || { zh: zh });
        return true;
      }
      var opt = target.closest('[data-opt]');
      if (opt) { A.tap(); answer(+opt.dataset.opt); return true; }
      return false;
    };
    r.key = function (k) {
      var n = parseInt(k, 10);
      if (!isNaN(n) && n >= 1 && n <= 6) { A.tap(); answer(n - 1); return true; }
      if (k === ' ') { var w = words[idx]; if (w) SP.sayWord(w); return true; }
      return false;
    };
    r.begin = show;
    return r;
  }

  /* ======================================================= MEMORY MATCH == */
  function Match(cfg) {
    var g = cfg.game;
    var pairs = cfg.pairs;
    var words = cfg.words.slice(0, pairs);
    var cards = [];
    words.forEach(function (w, i) {
      cards.push({ w: w, kind: 'zh', pair: i });
      cards.push({ w: w, kind: 'pic', pair: i });
    });
    cards = U.shuffle(cards);

    var flipped = [], matched = 0, moves = 0, lock = false;
    var r = { gameId: g.id, words: words, destroy: function () {} };

    function faceHTML(c) {
      if (c.kind === 'pic') return '<span class="emoji">' + c.w.em + '</span>';
      var n = c.w.zh.length;
      var size = n <= 1 ? 40 : (n === 2 ? 32 : 22);
      return '<span class="zh" style="font-size:' + size + 'px">' + U.esc(c.w.zh) + '</span>';
    }

    function render() {
      mount(
        headHTML(g, '<span class="pill">✅ ' + matched + ' / ' + pairs + '</span><span class="pill">🔄 ' + moves + '</span>') +
        '<div class="board board--' + pairs + '">' + cards.map(function (c, i) {
          return '<button class="tile" data-tile="' + i + '">' +
            '<span class="tile__inner">' +
            '<span class="tile__face tile__back">?</span>' +
            '<span class="tile__face tile__front">' + faceHTML(c) + '</span>' +
            '</span></button>';
        }).join('') + '</div>' +
        '<p class="center muted" style="margin-top:14px;font-weight:800;font-size:14px">' +
        'Find each character’s picture · 找出漢字和圖片的配對</p>'
      );
    }

    function flip(i) {
      if (lock) return;
      var node = U.$('[data-tile="' + i + '"]');
      if (!node || node.classList.contains('flipped') || node.classList.contains('matched')) return;
      A.flip();
      node.classList.add('flipped');
      flipped.push(i);
      var c = cards[i];
      if (c.kind === 'zh') SP.sayWord(c.w);
      if (flipped.length < 2) return;

      moves++;
      var a = cards[flipped[0]], b = cards[flipped[1]];
      if (a.pair === b.pair) {
        matched++;
        var word = a.w;
        S.record(word, true);
        r.results = r.results || [];
        r.results.push({ zh: word.zh, ok: true, word: word });
        A.correct();
        flipped.forEach(function (i2) { U.$('[data-tile="' + i2 + '"]').classList.add('matched'); });
        FX.confetti({ count: 12, y: window.innerHeight * 0.34, spread: 50 });
        if (a.kind === 'pic' || b.kind === 'pic') SP.sayWord(word);
        flipped = [];
        var counter = U.$('.hud .pill');
        if (counter) counter.textContent = '✅ ' + matched + ' / ' + pairs;
        var mv = U.$$('.hud .pill')[1]; if (mv) mv.textContent = '🔄 ' + moves;
        if (matched === pairs) setTimeout(finish, 620);
      } else {
        lock = true;
        flipped.forEach(function (i2) { U.$('[data-tile="' + i2 + '"]').classList.add('shake'); });
        setTimeout(function () {
          flipped.forEach(function (i2) {
            var n2 = U.$('[data-tile="' + i2 + '"]');
            if (n2) { n2.classList.remove('flipped', 'shake'); }
          });
          flipped = []; lock = false;
        }, 780);
      }
    }

    function finish() {
      var perfectMoves = pairs;
      var stars = moves <= perfectMoves + 3 ? 3 : (moves <= perfectMoves * 2 ? 2 : 1);
      var xp = pairs * CQ.config.xpPerCorrect + (stars === 3 ? 15 : 0);
      App.finishRound({
        gameId: g.id, correct: pairs, total: pairs, wrong: 0,
        bestCombo: pairs, stars: stars, xp: xp, coins: pairs * CQ.config.coinsPerCorrect,
        results: r.results || [], note: '完成配對用了 ' + moves + ' 次翻牌 · ' + moves + ' flips'
      });
    }

    r.click = function (target) {
      var t = target.closest('[data-tile]');
      if (t) { flip(+t.dataset.tile); return true; }
      return false;
    };
    r.key = function (k) {
      var n = parseInt(k, 10);
      if (!isNaN(n)) { var el = U.$$('.tile')[n - 1]; if (el) flip(+el.dataset.tile); return true; }
      return false;
    };
    r.begin = render;
    return r;
  }

  /* ======================================================= WORD BUILDER == */
  function Build(cfg) {
    var g = cfg.game;
    var words = cfg.words;
    var idx = 0, correct = 0, wrong = 0, combo = 0, bestCombo = 0, results = [];
    var picked = [], slotIdx = 0, solved = false;
    var r = { gameId: g.id, words: words, destroy: function () {} };

    function setup() {
      var w = words[idx];
      picked = [];
      slotIdx = 0;
      solved = false;
      var chars = w.zh.split('');
      var bank = U.shuffle(chars.map(function (c, i) { return { c: c, i: i, used: false }; }));
      r.bank = bank;
      render(w, bank);
      setTimeout(function () { SP.sayWord(w); }, 220);
    }

    function render(w, bank) {
      mount(
        headHTML(g, '<span class="pill">' + (idx + 1) + ' / ' + words.length + '</span>' +
          (combo >= 2 ? '<span class="combo">🔥 x' + combo + '</span>' : '')) +
        '<div class="progressbar"><i class="progressbar__fill" style="width:' + (idx / words.length * 100) + '%"></i></div>' +
        '<div class="prompt pop">' + speakButton(w) +
        '<div class="prompt__emoji">' + w.em + '</div>' +
        '<div class="prompt__text">' + U.esc(w.en) + '</div>' +
        '<div class="prompt__sub">Tap the characters in order · 按順序排出字詞</div>' +
        '</div>' +
        '<div class="slots" id="slots"></div>' +
        '<div class="bank" id="bank"></div>'
      );
      drawSlots(w);
      drawBank(w);
    }

    function drawSlots(w) {
      var el = U.$('#slots');
      el.innerHTML = w.zh.split('').map(function (c, i) {
        var filled = picked[i];
        var cls = 'slot' + (filled ? ' filled' : '');
        return '<button class="' + cls + '" data-slot="' + i + '">' + (filled ? U.esc(filled.c) : '') + '</button>';
      }).join('');
    }

    function drawBank(w) {
      var el = U.$('#bank');
      el.innerHTML = r.bank.map(function (b, i) {
        return '<button class="bankchip' + (b.used ? ' used' : '') + '" data-bank="' + i + '">' + U.esc(b.c) + '</button>';
      }).join('');
    }

    function tapBank(i) {
      if (solved) return;
      var w = words[idx];
      var b = r.bank[i];
      if (!b || b.used) return;
      if (picked.length >= w.zh.length) return;
      b.used = true;
      picked.push(b);
      A.pop();
      drawSlots(w); drawBank(w);
      if (picked.length === w.zh.length) check(w);
    }

    function pullSlot(i) {
      if (solved) return;
      var w = words[idx];
      var it = picked[i];
      if (!it) return;
      it.used = false;
      picked.splice(i, 1);
      A.tap();
      drawSlots(w); drawBank(w);
    }

    function check(w) {
      var attempt = picked.map(function (p) { return p.c; }).join('');
      if (attempt === w.zh) {
        solved = true;
        correct++; combo++; bestCombo = Math.max(bestCombo, combo);
        S.record(w, true);
        results.push({ zh: w.zh, ok: true, word: w });
        A.correct();
        FX.confetti({ count: 22, y: window.innerHeight * 0.32 });
        U.$$('#slots .slot').forEach(function (s, i) { setTimeout(function () { s.classList.add('ok'); A.tick(); }, i * 90); });
        SP.sayWord(w);
        setTimeout(next, 1200);
      } else {
        wrong++; combo = 0;
        S.record(w, false);
        results.push({ zh: w.zh, ok: false, word: w });
        A.wrong();
        U.$$('#slots .slot').forEach(function (s) { s.classList.add('bad'); });
        setTimeout(function () { revealAndNext(w); }, 900);
      }
    }

    function revealAndNext(w) {
      solved = true;
      var el = U.$('#slots');
      if (el) el.innerHTML = w.zh.split('').map(function (c) { return '<span class="slot ok">' + U.esc(c) + '</span>'; }).join('');
      var bank = U.$('#bank'); if (bank) bank.innerHTML = '';
      if (el) el.insertAdjacentHTML('afterend', infoStrip(w));
      SP.sayWord(w);
      setTimeout(next, 1500);
    }

    function next() {
      idx++;
      if (idx >= words.length) return finish();
      setup();
    }

    function finish() {
      var total = words.length;
      var stars = U.stars(correct, total);
      App.finishRound({
        gameId: g.id, correct: correct, total: total, wrong: wrong,
        bestCombo: bestCombo, stars: stars,
        xp: correct * CQ.config.xpPerCorrect + Math.floor(bestCombo / 3) * 5,
        coins: correct * CQ.config.coinsPerCorrect,
        results: results
      });
    }

    r.click = function (target) {
      if (target.closest('[data-speak]')) { SP.sayWord(words[idx]); return true; }
      var b = target.closest('[data-bank]');
      if (b) { tapBank(+b.dataset.bank); return true; }
      var s = target.closest('[data-slot]');
      if (s) { pullSlot(+s.dataset.slot); return true; }
      return false;
    };
    r.key = function (k) {
      var n = parseInt(k, 10);
      if (!isNaN(n)) { tapBank(n - 1); return true; }
      if (k === 'Backspace') { pullSlot(picked.length - 1); return true; }
      if (k === ' ') { SP.sayWord(words[idx]); return true; }
      return false;
    };
    r.begin = setup;
    return r;
  }

  /* ============================================================ BOSS RUSH == */
  function Boss(cfg) {
    var g = cfg.game;
    var pool = cfg.pool;
    var queue = cfg.words;
    var d = diff();
    var nOpts = Math.max(3, d.options - 1);
    var idx = 0, correct = 0, wrong = 0, combo = 0, bestCombo = 0, lives = CQ.config.bossLives;
    var results = [];
    var timeLeft = CQ.config.bossSeconds * 1000;
    var tick = null, answered = false;

    var r = { gameId: g.id, words: queue, destroy: function () { clearInterval(tick); } };

    function renderQuestion() {
      answered = false;
      var w = queue[idx % queue.length];
      var fmt = U.pick(['meaning', 'pinyin', 'listen', 'meaning']);
      r.fmt = fmt;
      var kind = fmt === 'pinyin' ? 'py' : 'zh';
      var keyOf = U.primaryKey(fmt);
      var opts = U.shuffle(U.distractors(pool, w, nOpts - 1, U.optionKeys(fmt)).concat([w]));
      r.opts = opts;
      r.answer = w;

      var promptInner;
      if (fmt === 'listen') {
        promptInner = speakButton(w) + '<div class="prompt__emoji">🔊</div><div class="prompt__text">Listen!</div>';
      } else if (fmt === 'pinyin') {
        promptInner = speakButton(w) + '<div class="prompt__emoji">' + w.em + '</div><div class="prompt__zh">' + U.esc(w.zh) + '</div>';
      } else {
        promptInner = speakButton(w) + '<div class="prompt__emoji">' + w.em + '</div><div class="prompt__text">' + U.esc(w.en) + '</div>';
      }

      mount(
        headHTML(g,
          '<span class="hearts" id="hearts">' + hearts() + '</span>' +
          '<span class="pill">🔥 x' + combo + '</span>' +
          '<span class="pill">✅ ' + correct + '</span>') +
        '<div class="timer"><i class="timer__fill ok" id="clock"></i></div>' +
        '<div class="prompt pop">' + promptInner + '</div>' +
        '<div class="options options--' + opts.length + '">' + opts.map(function (o, i) {
          return '<button class="option" data-opt="' + i + '">' + piece(o, kind) + '</button>';
        }).join('') + '</div>'
      );
      if (fmt === 'listen') setTimeout(function () { SP.sayWord(w); }, 200);
      updateClock();
    }

    function hearts() {
      var s = '';
      for (var i = 0; i < CQ.config.bossLives; i++) s += '<span class="heart' + (i < lives ? '' : ' lost') + '">❤️</span>';
      return s;
    }

    function updateClock() {
      var bar = U.$('#clock');
      if (bar) {
        bar.style.width = Math.max(0, timeLeft / (CQ.config.bossSeconds * 1000) * 100) + '%';
        bar.classList.toggle('warn', timeLeft < 15000);
      }
    }

    function loop() {
      clearInterval(tick);
      tick = setInterval(function () {
        timeLeft -= 100;
        updateClock();
        if (timeLeft <= 0) { clearInterval(tick); finish('time'); }
      }, 100);
    }

    function answer(i) {
      if (answered) return;
      answered = true;
      var w = r.answer;
      var keyOf = U.primaryKey(r.fmt);
      var chosen = i >= 0 ? r.opts[i] : null;
      var ok = !!chosen && keyOf(chosen) === keyOf(w);

      U.$$('.option').forEach(function (btn) {
        var cand = r.opts[+btn.dataset.opt];
        if (keyOf(cand) === keyOf(w)) btn.classList.add('option--correct');
        else if (cand === chosen) btn.classList.add('option--wrong');
        else btn.classList.add('option--dim');
        btn.disabled = true;
      });

      S.record(w, ok);
      results.push({ zh: w.zh, ok: ok, word: w });

      if (ok) {
        correct++; combo++; bestCombo = Math.max(bestCombo, combo);
        timeLeft += 1500;
        A.correct();
        FX.confetti({ count: 12, y: window.innerHeight * 0.3, spread: 50 });
        var body = U.$('.prompt');
        if (body) body.insertAdjacentHTML('afterend', '<p class="center" style="font-weight:900;color:#15803d">✅ +1.5s</p>');
      } else {
        wrong++; combo = 0; lives--;
        A.wrong();
        FX.floatText('-1 ❤️', window.innerWidth / 2, window.innerHeight * 0.3, '#ef4444');
      }
      var h = U.$('#hearts'); if (h) h.innerHTML = hearts();

      if (lives <= 0) { setTimeout(function () { finish('ko'); }, 900); return; }
      idx++;
      if (idx >= queue.length) { setTimeout(function () { finish('clear'); }, 900); return; }
      setTimeout(renderQuestion, ok ? 650 : 1000);
    }

    function finish(reason) {
      clearInterval(tick);
      var total = correct + wrong;
      var stars = U.stars(correct, Math.max(total, 1));
      if (reason === 'clear' && wrong === 0) stars = 3;
      var xp = correct * (CQ.config.xpPerCorrect + 2) + Math.floor(bestCombo / 3) * 5;
      var note = reason === 'time' ? '時間到！ Time up!' : reason === 'ko' ? '愛心用完了 · Out of hearts' : '全部答完！ Cleared!';
      App.finishRound({
        gameId: g.id, correct: correct, total: total, wrong: wrong, bestCombo: bestCombo,
        stars: stars, xp: xp, coins: correct * CQ.config.coinsPerCorrect, results: results,
        win: reason === 'clear', note: note, flag: reason === 'clear' ? 'bossCleared' : null
      });
    }

    r.click = function (t) {
      if (t.closest('[data-speak]')) { SP.sayWord(r.answer); return true; }
      var o = t.closest('[data-opt]');
      if (o) { A.tap(); answer(+o.dataset.opt); return true; }
      return false;
    };
    r.key = function (k) {
      var n = parseInt(k, 10);
      if (!isNaN(n) && n >= 1 && n <= 6) { A.tap(); answer(n - 1); return true; }
      if (k === ' ') { SP.sayWord(r.answer); return true; }
      return false;
    };
    r.begin = function () { renderQuestion(); loop(); };
    return r;
  }

  /* ================================================================ start == */
  function wordsFor(gameId, themeId, count) {
    if (gameId === 'build') {
      var multi = CQ.words.filter(function (w) {
        return U.syllables(w) >= 2 && (themeId === 'all' || w.theme === themeId);
      });
      var picked = S.pickWords(count, themeId).filter(function (w) { return U.syllables(w) >= 2; });
      // top up with random multi-syllable words if SRS did not supply enough
      var have = {}; picked.forEach(function (w) { have[w.zh] = 1; });
      U.shuffle(multi).forEach(function (w) { if (picked.length < count && !have[w.zh]) { picked.push(w); have[w.zh] = 1; } });
      return picked.slice(0, count);
    }
    return S.pickWords(count, themeId);
  }

  function start(gameId, opts) {
    opts = opts || {};
    stop();
    var g = CQ.games.filter(function (x) { return x.id === gameId; })[0];
    if (!g) return;
    var themeId = opts.theme || 'all';
    var d = diff();
    var n = opts.count || CQ.config.questionsPerRound;
    var words, ctrl;

    if (gameId === 'match') {
      var pairs = d.matchPairs;
      words = S.pickWords(pairs, themeId);
      ctrl = Match({ game: g, words: words, pairs: words.length });
    } else if (gameId === 'build') {
      words = wordsFor('build', themeId, Math.min(6, n));
      ctrl = Build({ game: g, words: words });
    } else if (gameId === 'boss') {
      words = S.pickWords(24, themeId);
      ctrl = Boss({ game: g, words: words, pool: themeId === 'all' ? CQ.words : CQ.words.filter(function (w) { return w.theme === themeId; }) });
    } else if (gameId === 'review') {
      words = opts.customWords || S.pickWords(Math.max(n, 12), themeId);
      ctrl = Quiz({
        game: g, words: words,
        pool: themeId === 'all' ? CQ.words : CQ.words.filter(function (w) { return w.theme === themeId; }),
        formats: ['meaning', 'pinyin', 'listen'],
        options: d.options, secPerQ: 0
      });
    } else {
      words = S.pickWords(n, themeId);
      ctrl = Quiz({
        game: g, words: words,
        pool: themeId === 'all' ? CQ.words : CQ.words.filter(function (w) { return w.theme === themeId; }),
        format: gameId === 'listen' ? 'listen' : gameId === 'pinyin' ? 'pinyin' : 'meaning',
        options: d.options, secPerQ: d.secPerQ
      });
    }
    live = ctrl;
    api.live = ctrl;
    App.setGameChrome(g, themeId);
    ctrl.begin();
  }

  var api = {
    setHost: setHost,
    start: start,
    stop: stop,
    live: null,
    /* read-only view of the round in progress — used by the smoke tests */
    debug: function () { return live; },
    handleClick: function (target) { return live && live.click ? !!live.click(target) : false; },
    handleKey: function (k) { return live && live.key ? !!live.key(k) : false; }
  };
  return api;
})();
