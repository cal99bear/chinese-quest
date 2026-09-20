/* =========================================================================
   Chinese Quest — 四技 Four-Skill activities + the daily check
   One engine behind: listening, speaking, reading and writing practice, the
   story reader, and the once-a-day four-skill check.

   Montessori notes
   • Every activity gives the child the material and the control of error —
     they compare their own work with the model, and nothing is timed.
   • Listening uses the second period of a lesson ("show me…"), speaking is
     the first/third ("this is… / what is this?"), reading only ever uses
     words the child has met, and writing starts with tracing the sandpaper
     letter before building words with the moveable alphabet.
   ========================================================================= */

var Skills = (function () {
  'use strict';

  var U = CQ.util, S = CQ.store, A = CQ.audio, SP = CQ.speech, FX = CQ.fx;
  var host = null;            // the container currently in use
  var live = null;
  var current = null;         // the active read-along player, if any

  /* ================================================================ pure == */
  /* Tracing score: how much of the character did the child cover, and how
     much of their ink landed on the character. Scribbling is rejected. */
  function traceScore(glyph, ink) {
    if (!glyph || !ink || glyph.length !== ink.length) return 0;
    var cells = glyph.length, gTotal = 0, inkTotal = 0, onGlyph = 0;
    for (var i = 0; i < cells; i++) {
      if (glyph[i]) gTotal++;
      if (ink[i]) {
        inkTotal++;
        if (glyph[i]) onGlyph++;
      }
    }
    if (!gTotal || !inkTotal) return 0;
    var precision = onGlyph / inkTotal;
    var recall = onGlyph / gTotal;
    var score = 100 * (0.55 * precision + 0.45 * recall);
    if (inkTotal / cells > 0.55) score *= 0.5;          // too much ink to be a character
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /* Did the child say the word? Used when speech recognition is available. */
  function matchesSpeech(heard, target) {
    var norm = function (s) { return String(s == null ? '' : s).replace(/[\s。，、！？；：,.!?·]/g, ''); };
    var h = norm(heard), t = norm(target);
    if (!h || !t) return false;
    return h === t || h.indexOf(t) >= 0 || t.indexOf(h) >= 0;
  }

  /* =============================================================== voice == */
  var SR = (typeof window !== 'undefined') &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  function canRecord() {
    return typeof window !== 'undefined' && window.navigator && window.navigator.mediaDevices &&
      window.navigator.mediaDevices.getUserMedia && typeof window.MediaRecorder === 'function';
  }

  /* ================================================================ items == */
  function piece(w, kind) {
    if (kind === 'py') return '<span class="option__py">' + U.esc(w.py) + '</span>';
    if (kind === 'pic') return '<span class="emoji">' + w.em + '</span>';
    return '<span class="zh">' + U.esc(w.zh) + '</span>';
  }

  function optionList(answer, pool, n, fmt) {
    var keyOf = U.primaryKey(fmt);
    var opts = U.shuffle(U.distractors(pool, answer, n - 1, U.optionKeys(fmt)).concat([answer]));
    return { opts: opts, keyOf: keyOf };
  }

  function infoStrip(word) {
    var s = S.me().settings, bits = [];
    bits.push('<b class="zh" style="font-size:20px">' + U.esc(word.zh) + '</b>');
    if (s.pinyin) bits.push('<span style="color:#3b82f6;font-weight:900">' + U.esc(word.py) + '</span>');
    if (s.zhuyin) bits.push('<span style="color:#8b5cf6;font-weight:900">' + U.esc(word.zy) + '</span>');
    bits.push('<span style="color:#5b7089;font-weight:800">' + U.esc(word.en) + '</span>');
    return '<div class="hintstrip">' + bits.map(function (b) { return '<span class="pill">' + b + '</span>'; }).join('') +
      '<button class="pill" data-hear="' + U.esc(word.zh) + '">🔊 ' + U.esc(word.zh) + '</button></div>';
  }

  /* ---- 聽: the second period of the lesson — "show me …" ----------------- */
  function listenItem(word, pool) {
    return {
      strand: 'listen', word: word,
      mount: function (box, api) {
        var o = optionList(word, pool, Math.max(3, Math.min(4, pool.length - 1)), 'listen');
        box.innerHTML =
          '<div class="prompt pop"><button class="prompt__speak" data-act="hear">🔊</button>' +
            '<div class="prompt__emoji">👂</div>' +
            '<div class="prompt__text">Listen…</div>' +
            '<div class="prompt__sub">聽一聽，選出正確的字 · tap the character you hear</div></div>' +
          '<div class="options options--' + o.opts.length + '">' +
            o.opts.map(function (w, i) { return '<button class="option" data-opt="' + i + '">' + piece(w, 'zh') + '</button>'; }).join('') +
          '</div><div class="sBody"></div>';

        var answered = false;
        var play = function () { SP.sayWord(word); };
        setTimeout(play, 220);
        box.addEventListener('click', function (e) {
          if (e.target.closest('[data-act="hear"]')) { A.tap(); play(); return; }
          var b = e.target.closest('[data-opt]');
          if (!b || answered) return;
          answered = true;
          var chosen = o.opts[+b.dataset.opt];
          var ok = o.keyOf(chosen) === o.keyOf(word);
          U.$$('.option', box).forEach(function (btn) {
            var cand = o.opts[+btn.dataset.opt];
            if (o.keyOf(cand) === o.keyOf(word)) btn.classList.add('option--correct');
            else if (cand === chosen) btn.classList.add('option--wrong');
            else btn.classList.add('option--dim');
            btn.disabled = true;
          });
          S.record(word, ok);
          var body = box.querySelector('.sBody');
          if (body) body.innerHTML = infoStrip(word);
          if (ok) { A.correct(); FX.confetti({ count: 12, y: window.innerHeight * 0.3, spread: 50 }); }
          else A.wrong();
          SP.sayWord(word);
          setTimeout(function () { api.done(ok); }, ok ? 900 : 1700);
        });
      }
    };
  }

  /* ---- 說: say it out loud ---------------------------------------------- */
  function speakItem(word, opts) {
    var selfOnly = !!(opts && opts.selfOnly);
    return {
      strand: 'speak', word: word,
      mount: function (box, api) {
        var answered = false;
        var mode = (SR && !selfOnly) ? 'recognise' : (canRecord() ? 'record' : 'self');
        box.innerHTML =
          '<div class="prompt pop">' +
            '<div class="prompt__zh">' + U.esc(word.zh) + '</div>' +
            (S.me().settings.pinyin ? '<div class="prompt__sub" style="font-size:20px;color:#3b82f6">' + U.esc(word.py) + '</div>' : '') +
            '<div class="prompt__emoji">' + word.em + '</div>' +
            '<div class="prompt__sub">' + U.esc(word.en) + '</div></div>' +
          '<div class="btnrow">' +
            '<button class="btn btn--blue btn--big" data-act="hear">🔊 聽一次</button>' +
            (mode === 'recognise' ? '<button class="btn btn--gold btn--big" data-act="mic">🎤 換我說</button>' : '') +
            (mode === 'record' ? '<button class="btn btn--gold btn--big" data-act="rec">⏺️ 錄音</button>' +
              '<button class="btn btn--ghost btn--big hidden" data-act="play">▶️ 聽我的</button>' : '') +
          '</div>' +
          '<div class="sayzone"></div>';

        var zone = box.querySelector('.sayzone');
        var audio = null, chunks = [], recorder = null;

        function selfCheck(heard) {
          zone.innerHTML =
            (heard ? '<p class="center" style="font-weight:900;color:#15803d">我聽到：' + U.esc(heard) + '</p>' : '') +
            '<p class="center muted" style="font-weight:800;font-size:14px">' +
              '大聲說出來，再聽一次比較 · say it out loud, then compare</p>' +
            '<div class="btnrow"><button class="btn btn--gold btn--big" data-act="yes">✓ 我說對了</button>' +
            '<button class="btn btn--ghost" data-act="again">🔁 再試一次</button></div>';
        }

        function finish(ok) {
          if (answered) return;
          answered = true;
          if (ok) { A.correct(); FX.confetti({ count: 16, y: window.innerHeight * 0.3 }); }
          S.addSkill('speak');
          setTimeout(function () { api.done(ok); }, ok ? 800 : 1000);
        }

        box.addEventListener('click', function (e) {
          var t = e.target.closest('[data-act]');
          if (!t) return;
          var act = t.dataset.act;
          if (act === 'hear') { A.tap(); SP.sayWord(word, 2); return; }
          if (act === 'again') { zone.innerHTML = ''; SP.sayWord(word, 2); return; }
          if (act === 'yes') { finish(true); return; }
          if (act === 'no') { finish(false); return; }
          if (act === 'mic') {
            A.tap();
            try {
              var rec = new SR();
              rec.lang = 'zh-TW';
              rec.maxAlternatives = 3;
              rec.interimResults = false;
              zone.innerHTML = '<p class="center" style="font-weight:900;color:#e0447c">🎤 正在聽…請說「' + U.esc(word.zh) + '」</p>';
              rec.onresult = function (ev) {
                var heard = '';
                var res = ev.results && ev.results[0];
                if (res) for (var i = 0; i < res.length; i++) heard += res[i].transcript;
                var ok = matchesSpeech(heard, word.zh);
                zone.innerHTML = '<p class="center" style="font-weight:900;color:' + (ok ? '#15803d' : '#c2410c') + '">' +
                  (ok ? '✅ 說得很好！' : '🔁 再聽一次，慢慢說') + '</p>' +
                  '<p class="center muted" style="font-weight:800;font-size:14px">我聽到：' + U.esc(heard || '—') + '</p>' +
                  '<div class="btnrow"><button class="btn btn--gold" data-act="yes">繼續</button>' +
                  '<button class="btn btn--ghost" data-act="again">🔁 再試一次</button></div>';
                if (ok) finish(true);
              };
              rec.onerror = function () { selfCheck(''); };
              rec.onend = function () { if (!zone.textContent.trim()) selfCheck(''); };
              rec.start();
              setTimeout(function () { try { rec.stop(); } catch (err) {} }, 4200);
            } catch (err) { selfCheck(''); }
            return;
          }
          if (act === 'rec') {
            A.tap();
            if (!window.navigator.mediaDevices || !window.navigator.mediaDevices.getUserMedia) { selfCheck(''); return; }
            window.navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
              chunks = [];
              recorder = new window.MediaRecorder(stream);
              recorder.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
              recorder.onstop = function () {
                try { audio = new window.Audio(URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }))); } catch (err) { audio = null; }
                stream.getTracks().forEach(function (tr) { tr.stop(); });
                selfCheck('');
                var pb = U.$('[data-act="play"]', box);
                if (pb) pb.classList.remove('hidden');
              };
              recorder.start();
              zone.innerHTML = '<p class="center" style="font-weight:900;color:#e0447c">⏺️ 錄音中…請說「' + U.esc(word.zh) + '」</p>';
              setTimeout(function () { try { recorder.stop(); } catch (err) { selfCheck(''); } }, 2600);
            }).catch(function () { selfCheck(''); });
            return;
          }
          if (act === 'play') { A.tap(); if (audio) { try { audio.play(); } catch (err) {} } return; }
        });

        setTimeout(function () { SP.sayWord(word); }, 250);
        if (mode === 'self') setTimeout(function () { selfCheck(''); }, 500);
      }
    };
  }

  /* ---- 讀: read a word, or read a sentence ------------------------------ */
  function readWordItem(word, pool) {
    return {
      strand: 'read', word: word,
      mount: function (box, api) {
        var o = optionList(word, pool, 4, 'meaning');
        var s = S.me().settings;
        box.innerHTML =
          '<div class="prompt pop"><button class="prompt__speak" data-act="hear">🔊</button>' +
            '<div class="prompt__zh">' + U.esc(word.zh) + '</div>' +
            (s.pinyin ? '<div class="prompt__sub" style="font-size:19px;color:#3b82f6">' + U.esc(word.py) + '</div>' : '') +
            '<div class="prompt__sub">讀一讀，選出意思 · read it, then choose the meaning</div></div>' +
          '<div class="options options--' + o.opts.length + '">' +
            o.opts.map(function (w, i) {
              return '<button class="option" data-opt="' + i + '"><span class="emoji">' + w.em + '</span>' +
                '<span class="option__py" style="font-family:var(--font)">' + U.esc(w.en) + '</span></button>';
            }).join('') + '</div><div class="sBody"></div>';

        var answered = false;
        box.addEventListener('click', function (e) {
          if (e.target.closest('[data-act="hear"]')) { A.tap(); SP.sayWord(word); return; }
          var b = e.target.closest('[data-opt]');
          if (!b || answered) return;
          answered = true;
          var chosen = o.opts[+b.dataset.opt];
          var ok = o.keyOf(chosen) === o.keyOf(word);
          U.$$('.option', box).forEach(function (btn) {
            var cand = o.opts[+btn.dataset.opt];
            if (o.keyOf(cand) === o.keyOf(word)) btn.classList.add('option--correct');
            else if (cand === chosen) btn.classList.add('option--wrong');
            else btn.classList.add('option--dim');
            btn.disabled = true;
          });
          S.record(word, ok);
          var body = box.querySelector('.sBody');
          if (body) body.innerHTML = infoStrip(word);
          if (ok) { A.correct(); FX.confetti({ count: 12, y: window.innerHeight * 0.3, spread: 50 }); } else A.wrong();
          SP.sayWord(word);
          setTimeout(function () { api.done(ok); }, ok ? 900 : 1700);
        });
        setTimeout(function () { SP.sayWord(word); }, 250);
      }
    };
  }

  /* a comprehension question about a story the child has just read */
  function readSentenceItem(story, qIndex) {
    var q = story.questions[qIndex % story.questions.length];
    return {
      strand: 'read', word: { zh: story.title, py: '', en: story.titleEn, em: story.emoji },
      mount: function (box, api) {
        var opts = q.options.map(function (text, i) { return { text: text, ok: i === q.answer }; });
        var answer = q.options[q.answer];
        var context = story.lines.filter(function (l) { return l[0].indexOf(answer) >= 0; })[0];
        box.innerHTML =
          '<div class="prompt pop">' +
            (context ? '<div class="prompt__text zh" style="font-size:26px">' + U.esc(context[0]) + '</div>' +
              '<div class="prompt__sub">' + U.esc(context[1]) + '</div>' : '') +
            '<div class="prompt__sub" style="font-size:22px;font-weight:900;margin-top:8px">' + U.esc(q.q) + '</div>' +
            '<div class="prompt__sub">' + U.esc(q.en) + '</div></div>' +
          '<div class="options options--' + opts.length + '">' +
            opts.map(function (o, i) {
              return '<button class="option" data-opt="' + i + '"><span class="zh" style="font-size:26px">' +
                U.esc(o.text) + '</span></button>';
            }).join('') + '</div><div class="sBody"></div>';

        var answered = false;
        box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-opt]');
          if (!b || answered) return;
          answered = true;
          var chosen = opts[+b.dataset.opt];
          U.$$('.option', box).forEach(function (btn) {
            var cand = opts[+btn.dataset.opt];
            if (cand.ok) btn.classList.add('option--correct');
            else if (cand === chosen) btn.classList.add('option--wrong');
            else btn.classList.add('option--dim');
            btn.disabled = true;
          });
          var ok = !!chosen.ok;
          if (ok) { A.correct(); FX.confetti({ count: 12, y: window.innerHeight * 0.3, spread: 50 }); } else A.wrong();
          var body = box.querySelector('.sBody');
          if (body) body.innerHTML = '<div class="hintstrip"><span class="pill">✅ ' + U.esc(answer) + '</span></div>';
          setTimeout(function () { api.done(ok); }, ok ? 1000 : 1800);
        });
      }
    };
  }

  /* ---- 寫: the moveable alphabet — build the word ----------------------- */
  function buildItem(word) {
    var chars = word.zh.split('');
    return {
      strand: 'write', word: word,
      mount: function (box, api) {
        var bank = U.shuffle(chars.map(function (c) { return { c: c, used: false }; }));
        var picked = [];
        var done = false;
        box.innerHTML =
          '<div class="prompt pop"><div class="prompt__emoji">' + word.em + '</div>' +
            '<div class="prompt__text">' + U.esc(word.en) + '</div>' +
            '<div class="prompt__sub">用字卡排出詞語 · build the word</div></div>' +
          '<div class="slots"></div><div class="bank"></div><div class="sBody"></div>';

        function draw() {
          box.querySelector('.slots').innerHTML = chars.map(function (c, i) {
            return '<button class="slot' + (picked[i] ? ' filled' : '') + '" data-slot="' + i + '">' +
              (picked[i] ? U.esc(picked[i].c) : '') + '</button>';
          }).join('');
          box.querySelector('.bank').innerHTML = bank.map(function (b, i) {
            return '<button class="bankchip' + (b.used ? ' used' : '') + '" data-bank="' + i + '">' + U.esc(b.c) + '</button>';
          }).join('');
        }
        draw();

        box.addEventListener('click', function (e) {
          if (done) return;
          var b = e.target.closest('[data-bank]');
          if (b) {
            var chip = bank[+b.dataset.bank];
            if (!chip || chip.used || picked.length >= chars.length) return;
            chip.used = true;
            picked.push(chip);
            A.pop();
            draw();
            if (picked.length === chars.length) {
              done = true;
              var ok = picked.map(function (p) { return p.c; }).join('') === word.zh;
              S.record(word, ok);
              if (ok) {
                A.correct();
                U.$$('#slots .slot', box).forEach(function (s, i) { setTimeout(function () { s.classList.add('ok'); A.tick(); }, i * 90); });
                S.addSkill('write');
                FX.confetti({ count: 18, y: window.innerHeight * 0.32 });
              } else {
                A.wrong();
                U.$$('#slots .slot', box).forEach(function (s) { s.classList.add('bad'); });
              }
              var body = box.querySelector('.sBody');
              if (body) body.innerHTML = infoStrip(word);
              SP.sayWord(word);
              setTimeout(function () { api.done(ok); }, ok ? 1000 : 1800);
            }
            return;
          }
          var s = e.target.closest('[data-slot]');
          if (s) {
            var i = +s.dataset.slot;
            var it = picked[i];
            if (!it) return;
            it.used = false;
            picked.splice(i, 1);
            A.tap();
            draw();
          }
        });
      }
    };
  }

  /* ---- 寫: sandpaper letters — trace the character ---------------------- */
  function traceItem(word) {
    return {
      strand: 'write', word: word,
      mount: function (box, api) {
        var cells = CQ.config.traceCells || 24;
        var size = 260;
        var cv = document.createElement('canvas');
        var c2 = null;
        try { c2 = cv.getContext && cv.getContext('2d'); } catch (e) { c2 = null; }

        box.innerHTML =
          '<div class="prompt" style="padding:14px 14px 10px"><div class="prompt__text">✍️ ' + U.esc(word.zh) + '</div>' +
            '<div class="prompt__sub">' + U.esc(word.py) + ' · ' + U.esc(word.en) + '</div>' +
            '<div class="prompt__sub">沿著字描一次 · trace the character</div></div>' +
          '<div class="tracewrap"></div><div class="sBody"></div>';

        /* no canvas (or no glyph): Montessori fallback — trace on paper and
           compare with the model, then self-check. */
        if (!c2) {
          var wrap0 = box.querySelector('.tracewrap');
          wrap0.innerHTML = '<div class="tracefallback"><span class="zh">' + U.esc(word.zh) + '</span></div>' +
            '<p class="center muted" style="font-weight:800;font-size:14px">用手指在桌上寫一次，或在紙上寫，再跟上面的字比較。</p>' +
            '<div class="btnrow"><button class="btn btn--gold btn--big" data-act="yes">✓ 我寫好了</button>' +
            '<button class="btn btn--ghost" data-act="hear">🔊 聽一次</button></div>';
          wrap0.addEventListener('click', function (e) {
            var t = e.target.closest('[data-act]');
            if (!t) return;
            if (t.dataset.act === 'hear') { SP.sayWord(word); return; }
            S.addSkill('write');
            A.correct();
            api.done(true);
          });
          setTimeout(function () { SP.sayWord(word); }, 250);
          return;
        }

        /* render the character once: it becomes both the faint guide and the
           mask used to score the child's tracing */
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = size * dpr; cv.height = size * dpr;
        cv.style.width = size + 'px'; cv.style.height = size + 'px';
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);

        var off = document.createElement('canvas');
        off.width = size; off.height = size;
        var oc = off.getContext('2d');
        var font = '700 ' + Math.round(size * 0.78) + 'px ' + '"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif';
        oc.fillStyle = '#12314f';
        oc.textAlign = 'center';
        oc.textBaseline = 'middle';
        oc.font = font;
        oc.fillText(word.zh, size / 2, size / 2 + size * 0.03);

        /* build the cell mask */
        var glyph = new Array(cells * cells).fill(0);
        try {
          var data = oc.getImageData(0, 0, size, size).data;
          var step = size / cells;
          for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
              if (data[(y * size + x) * 4 + 3] > 40) {
                var cx = Math.min(cells - 1, Math.floor(x / step));
                var cy = Math.min(cells - 1, Math.floor(y / step));
                glyph[cy * cells + cx] = 1;
              }
            }
          }
        } catch (e) { /* tainted canvas — fall through with an empty mask */ }

        var ink = new Array(cells * cells).fill(0);
        var drawing = false, last = null, finished = false;

        function paint() {
          c2.clearRect(0, 0, size, size);
          c2.drawImage(off, 0, 0);
          c2.globalAlpha = 0.16;
          c2.drawImage(off, 0, 0);
          c2.globalAlpha = 1;
        }
        paint();

        if (!glyph.some(function (v) { return v; })) {
          /* the browser refused pixel access — self-check instead */
          box.querySelector('.tracewrap').innerHTML = '<div class="tracefallback"><span class="zh">' + U.esc(word.zh) + '</span></div>' +
            '<div class="btnrow"><button class="btn btn--gold btn--big" data-act="yes">✓ 我寫好了</button></div>';
          box.querySelector('.tracewrap').addEventListener('click', function () { S.addSkill('write'); A.correct(); api.done(true); });
          return;
        }

        var wrap = box.querySelector('.tracewrap');
        wrap.appendChild(cv);

        function toCell(ev) {
          var r = cv.getBoundingClientRect();
          var x = (ev.clientX - r.left) / (r.width || size);
          var y = (ev.clientY - r.top) / (r.height || size);
          return [x * cells, y * cells, x * size, y * size];
        }
        function markCell(px, py) {
          for (var oy = -1; oy <= 1; oy++) {
            for (var ox = -1; ox <= 1; ox++) {
              var gx = Math.floor(px) + ox, gy = Math.floor(py) + oy;
              if (gx >= 0 && gx < cells && gy >= 0 && gy < cells) ink[gy * cells + gx] = 1;
            }
          }
        }
        function move(ev) {
          if (!drawing || finished) return;
          var c = toCell(ev);
          markCell(c[0], c[1]);
          c2.strokeStyle = '#e0447c';
          c2.lineWidth = size / cells * 0.75;
          c2.lineCap = 'round';
          c2.lineJoin = 'round';
          c2.beginPath();
          if (last) { c2.moveTo(last[0], last[1]); c2.lineTo(c[2], c[3]); c2.stroke(); }
          else { c2.lineTo(c[2] + 0.1, c[3]); c2.stroke(); }
          last = [c[2], c[3]];
        }
        wrap.addEventListener('pointerdown', function (ev) {
          drawing = true; last = null;
          if (ev.preventDefault) ev.preventDefault();
          move(ev);
        });
        wrap.addEventListener('pointermove', move);
        wrap.addEventListener('pointerup', function () { drawing = false; last = null; });
        wrap.addEventListener('pointerleave', function () { drawing = false; last = null; });
        wrap.addEventListener('touchstart', function (ev) { if (ev.preventDefault) ev.preventDefault(); }, { passive: false });

        var footer = document.createElement('div');
        footer.className = 'btnrow';
        footer.style.marginTop = '10px';
        footer.innerHTML =
          '<button class="btn btn--gold btn--big" data-act="ok">✓ 寫好了</button>' +
          '<button class="btn btn--ghost" data-act="clear">🧽 擦掉重寫</button>';
        wrap.parentNode.insertBefore(footer, box.querySelector('.sBody'));

        footer.addEventListener('click', function (e) {
          var t = e.target.closest('[data-act]');
          if (!t) return;
          if (t.dataset.act === 'clear') {
            ink = new Array(cells * cells).fill(0);
            paint();
            A.tap();
            return;
          }
          if (finished) return;
          finished = true;
          var score = traceScore(glyph, ink);
          var pass = score >= (CQ.config.tracePass || 55);
          S.addSkill('write');
          var sec = document.createElement('div');
          sec.className = 'traceresult';
          sec.innerHTML = '<div class="traceresult__score' + (pass ? ' is-pass' : '') + '">' + score + '</div>' +
            '<p class="center" style="font-weight:900">' + (pass ? '✅ 寫得很棒！' : '🔁 再試一次，跟著字形慢慢描') + '</p>';
          box.appendChild(sec);
          if (pass) { A.correct(); FX.confetti({ count: 20, y: window.innerHeight * 0.34 }); } else A.wrong();
          SP.sayWord(word);
          setTimeout(function () { api.done(pass); }, pass ? 1100 : 1600);
        });
        setTimeout(function () { SP.sayWord(word); }, 250);
      }
    };
  }

  function writeItem(word) {
    return word.zh.length >= 2 ? buildItem(word) : traceItem(word);
  }

  /* =============================================================== runner == */
  function strandOf(id) {
    return CQ.strands.filter(function (s) { return s.id === id; })[0] || CQ.strands[0];
  }

  function run(items, opts) {
    opts = opts || {};
    var idx = 0, results = [], startedAt = Date.now();
    var hostEl = U.$(opts.host || '#skillHost');
    if (!hostEl) return;
    stop();
    /* clear the other host so no stale markup (or duplicate id) lingers */
    ['#skillHost', '#examHost'].forEach(function (sel) {
      var other = U.$(sel);
      if (other && other !== hostEl) other.innerHTML = '';
    });
    live = { items: items, done: false, destroy: function () { live = null; } };

    function head() {
      var it = items[Math.min(idx, items.length - 1)];
      var st = strandOf(it.strand);
      return '<div class="hud">' +
        '<div class="hud__q">' + st.emoji + ' ' + st.zh + ' ' + U.esc(st.en) +
          '<small>' + U.esc(it.word ? it.word.en : '') + '</small></div>' +
        '<div class="spacer"></div>' +
        '<span class="pill">' + Math.min(idx + 1, items.length) + ' / ' + items.length + '</span>' +
        (results.length ? '<span class="pill pill--good">✅ ' + results.filter(function (r) { return r.ok; }).length + '</span>' : '') +
      '</div>' +
      '<div class="progressbar"><i class="progressbar__fill" style="width:' +
        (idx / items.length * 100).toFixed(1) + '%"></i></div>';
    }

    function show() {
      if (idx >= items.length) return finish();
      hostEl.innerHTML = head();
      var body = document.createElement('div');
      body.className = 'skillbody';
      hostEl.appendChild(body);
      items[idx].mount(body, {
        done: function (ok) {
          results.push({ strand: items[idx].strand, ok: ok, word: items[idx].word });
          idx++;
          setTimeout(show, 120);
        }
      });
    }

    function finish() {
      var byStrand = {};
      results.forEach(function (r) {
        byStrand[r.strand] = byStrand[r.strand] || { ok: 0, n: 0 };
        byStrand[r.strand].n++;
        if (r.ok) byStrand[r.strand].ok++;
      });
      var correct = results.filter(function (r) { return r.ok; }).length;
      var res = {
        items: results.length, correct: correct, byStrand: byStrand,
        seconds: Math.round((Date.now() - startedAt) / 1000), strand: opts.strand || null
      };
      if (opts.onDone) opts.onDone(res);
    }

    show();
  }

  /* ========================================================== practice ==== */
  function practice(strandId, themeId) {
    var pool = themeId && themeId !== 'all' ? CQ.words.filter(function (w) { return w.theme === themeId; }) : CQ.words;
    var words = S.pickWords(6, themeId || 'all');
    var items;
    if (strandId === 'listen') {
      items = words.slice(0, 5).map(function (w) { return listenItem(w, pool); });
    } else if (strandId === 'speak') {
      items = words.slice(0, 5).map(function (w) { return speakItem(w); });
    } else if (strandId === 'read') {
      items = words.slice(0, 4).map(function (w) { return readWordItem(w, pool); });
      items.push(readSentenceItem(pickStory(), 0));
    } else {
      items = words.slice(0, 2).map(function (w) { return writeItem(w); })
        .concat(words.slice(2, 4).map(function (w) { return buildItem(w); }));
    }
    run(items, {
      strand: strandId, host: '#skillHost',
      onDone: function (res) { App.finishSkills(res, strandOf(strandId)); }
    });
  }

  /* ============================================================== exam ===== */
  function pickStory() {
    var read = S.storiesRead();
    var pool = CQ.stories.filter(function (s) { return s.level <= (read >= 3 ? 3 : read >= 1 ? 2 : 1); });
    return U.pick(pool.length ? pool : CQ.stories);
  }

  /* =================================================== read-along player == */
  /* Reads the story aloud and highlights each character as it is spoken.
     Speech engines rarely report Chinese word boundaries, so the highlight
     runs on a per-character timeline calibrated to the speaking rate, and
     snaps to real boundary events whenever the engine does provide them. */
  function charMs(ch, rate) {
    var base = 250 * (0.7 / (rate || 0.7));
    if (ch === '，' || ch === '、') return base * 1.5;
    if (ch === '。' || ch === '！' || ch === '？') return base * 2.2;
    return base;
  }

  function storyPlayer(opts) {
    var lines = opts.lines || [];
    var rate = opts.rate || 0.7;
    var timers = [], stopped = false, line = -1;

    function clear() { timers.forEach(clearTimeout); timers = []; }
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function emit(i, j) { if (!stopped && opts.onChar) opts.onChar(i, j); }

    function playLine(i) {
      if (stopped) return;
      if (i >= lines.length) { if (opts.onDone) opts.onDone(); return; }
      line = i;
      var chars = lines[i][0].split('');
      if (opts.onLine) opts.onLine(i);
      var acc = 0, k;
      for (k = 0; k < chars.length; k++) {
        (function (idx) { at(acc, function () { emit(i, idx); }); })(k);
        acc += charMs(chars[k], rate);
      }
      at(acc + 300, function () { if (!stopped) { emit(i, -1); playLine(i + 1); } });
      emit(i, 0);
      SP.say(lines[i][0], {
        rate: rate,
        onBoundary: function (e) {
          if (stopped || !e || typeof e.charIndex !== 'number') return;
          var j = e.charIndex;
          if (j <= 0 || j >= chars.length) return;
          clear();                                   // resync to the real voice
          var t = 0;
          for (var m = j; m < chars.length; m++) {
            (function (idx) { at(t, function () { emit(i, idx); }); })(m);
            t += charMs(chars[m], rate);
          }
          at(t + 300, function () { if (!stopped) { emit(i, -1); playLine(i + 1); } });
        }
      });
    }

    return {
      start: function (from) { stopped = false; playLine(from || 0); },
      stop: function () { stopped = true; clear(); SP.stop(); },
      line: function () { return line; }
    };
  }

  /* ==================================================== today's story ==== */
  function dayOfYear(d) {
    var now = d || new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  /* Everyone reads the same story on the same day, and it rotates daily. */
  function todayStory() {
    var list = CQ.stories;
    return list[dayOfYear() % list.length];
  }

  function wordsIn(story) {
    return CQ.words.filter(function (w) { return story.text.indexOf(w.zh) >= 0; })
      .sort(function (a, b) { return b.zh.length - a.zh.length; });
  }

  /* ---- hear a sentence, pick the one you heard -------------------------- */
  function sentenceListenItem(story) {
    var usable = story.lines.filter(function (l) {
      return l[0].replace(/[。，、！？；：]/g, '').length >= 6;
    });
    if (usable.length < 3) usable = story.lines.slice();
    var answer = U.pick(usable);
    var others = U.shuffle(usable.filter(function (l) { return l !== answer; })).slice(0, 2);
    var opts = U.shuffle(others.concat([answer]));
    return {
      strand: 'listen', word: { zh: answer[0], py: '', en: answer[1], em: '👂' },
      mount: function (box, api) {
        box.innerHTML =
          '<div class="prompt pop"><button class="prompt__speak" data-act="hear">🔊</button>' +
            '<div class="prompt__emoji">👂</div>' +
            '<div class="prompt__text">Listen to the sentence</div>' +
            '<div class="prompt__sub">聽一句故事，選出你聽到的那一句 · which sentence did you hear?</div></div>' +
          '<div class="options options--' + opts.length + '">' + opts.map(function (l, i) {
            return '<button class="option" data-opt="' + i + '"><span class="zh" style="font-size:20px">' +
              U.esc(l[0]) + '</span></button>';
          }).join('') + '</div><div class="sBody"></div>';
        var answered = false;
        function play() { SP.say(answer[0], { rate: 0.66 }); }
        setTimeout(play, 240);
        box.addEventListener('click', function (e) {
          if (e.target.closest('[data-act="hear"]')) { A.tap(); play(); return; }
          var b = e.target.closest('[data-opt]');
          if (!b || answered) return;
          answered = true;
          var chosen = opts[+b.dataset.opt];
          var ok = chosen === answer;
          U.$$('.option', box).forEach(function (btn) {
            var cand = opts[+btn.dataset.opt];
            if (cand === answer) btn.classList.add('option--correct');
            else if (cand === chosen) btn.classList.add('option--wrong');
            else btn.classList.add('option--dim');
            btn.disabled = true;
          });
          var body = box.querySelector('.sBody');
          if (body) body.innerHTML = '<div class="hintstrip"><span class="pill">💡 ' + U.esc(answer[1]) + '</span></div>';
          if (ok) { A.correct(); FX.confetti({ count: 12, y: window.innerHeight * 0.3, spread: 50 }); } else A.wrong();
          setTimeout(function () { api.done(ok); }, ok ? 1100 : 1900);
        });
      }
    };
  }

  /* ---- the moveable alphabet inside a sentence: fill the blank ---------- */
  function clozeItem(story) {
    var usable = story.lines.filter(function (l) {
      return l[0].replace(/[。，、！？；：]/g, '').length >= 6;
    });
    var line = U.pick(usable.length ? usable : story.lines);
    var chars = line[0].split('');
    var at = chars.length - 2;
    while (at > 0 && /[。，、！？；：]/.test(chars[at])) at--;
    var answer = chars[at];
    var info = CQ.charPy[answer] || ['', ''];
    var pool = Object.keys(CQ.charPy).filter(function (c) { return c !== answer; });
    var opts = U.shuffle([answer].concat(U.sample(pool, 3)));
    return {
      strand: 'write', word: { zh: answer, py: info[0], en: info[1], em: '🧩' },
      mount: function (box, api) {
        box.innerHTML =
          '<div class="prompt pop"><div class="prompt__text">🧩 填上缺少的字</div>' +
            '<div class="cloze">' + chars.map(function (c, i) {
              return i === at ? '<span class="cloze__blank">?</span>' : '<span class="zh">' + U.esc(c) + '</span>';
            }).join('') + '</div>' +
            '<div class="prompt__sub">聽一聽，選出空格裡的字 · the missing character reads ' +
              '<b style="color:#3b82f6">' + U.esc(info[0]) + '</b></div></div>' +
          '<div class="options options--' + opts.length + '">' + opts.map(function (c, i) {
            return '<button class="option" data-opt="' + i + '"><span class="zh">' + U.esc(c) + '</span></button>';
          }).join('') + '</div><div class="sBody"></div>';
        SP.say(line[0], { rate: 0.6 });
        var answered = false;
        box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-opt]');
          if (!b || answered) return;
          answered = true;
          var chosen = opts[+b.dataset.opt];
          var good = chosen === answer;
          U.$$('.option', box).forEach(function (btn) {
            var cand = opts[+btn.dataset.opt];
            if (cand === answer) btn.classList.add('option--correct');
            else if (cand === chosen) btn.classList.add('option--wrong');
            else btn.classList.add('option--dim');
            btn.disabled = true;
          });
          S.record({ zh: answer, py: info[0] }, good);
          var body = box.querySelector('.sBody');
          if (body) body.innerHTML = infoStrip({ zh: answer, py: info[0], zy: '', en: info[1] });
          if (good) { A.correct(); FX.confetti({ count: 12, y: window.innerHeight * 0.3 }); } else A.wrong();
          SP.say(line[0], { rate: 0.6 });
          setTimeout(function () { api.done(good); }, good ? 1000 : 1900);
        });
      }
    };
  }

  /* ====================================================== the daily lesson = */
  var LESSON_STAGES = [
    { id: 'story',  zh: '聽故事', en: 'Story',     emoji: '📖' },
    { id: 'listen', zh: '聽力',   en: 'Listening', emoji: '👂' },
    { id: 'speak',  zh: '口說',   en: 'Speaking',  emoji: '🗣️' },
    { id: 'read',   zh: '閱讀',   en: 'Reading',   emoji: '📖' },
    { id: 'write',  zh: '寫字',   en: 'Writing',   emoji: '✍️' }
  ];

  /* the three tasks for one stage, all drawn from today's story */
  function lessonItems(id, story) {
    var w = wordsIn(story);
    var singles = w.filter(function (x) { return x.zh.length === 1; });
    var multis = w.filter(function (x) { return x.zh.length >= 2; });
    var spare = S.pickWords(8, 'all');
    function pick(arr, i) {
      if (!arr.length) return spare[i % spare.length];
      return arr[i % arr.length];
    }
    if (id === 'listen') {
      return [sentenceListenItem(story), listenItem(pick(w, 1), CQ.words), listenItem(pick(w, 3), CQ.words)];
    }
    if (id === 'speak') {
      return [
        speakItem(pick(w, 0)),
        speakItem(pick(w, 2)),
        speakItem({ zh: story.lines[0][0], py: '', en: story.lines[0][1], em: '🗣️' }, { selfOnly: true })
      ];
    }
    if (id === 'read') {
      return [readSentenceItem(story, 0), readWordItem(pick(w, 1), CQ.words), readWordItem(pick(w, 4), CQ.words)];
    }
    var multi = multis[0] || spare.filter(function (x) { return x.zh.length >= 2; })[0] || spare[0];
    return [traceItem(pick(singles, 0)), buildItem(multi), clozeItem(story)];
  }

  function lesson() {
    var story = todayStory();
    var hostEl = U.$('#examHost');
    var tracker = U.$('#lessonTracker');
    if (!hostEl) return;
    stop();
    var results = {}, at = 0;

    function drawTracker() {
      if (!tracker) return;
      tracker.innerHTML = LESSON_STAGES.map(function (s, i) {
        var r = results[s.id];
        var state = i < at ? ' tracker__step--done' : (i === at ? ' tracker__step--now' : '');
        var mark = r ? (r.ok === r.n && r.n ? '✅' : r.ok + '/' + r.n) : s.emoji;
        return (i ? '<span class="tracker__link"></span>' : '') +
          '<div class="tracker__step' + state + '"><span class="tracker__em">' + mark + '</span>' +
          '<span class="tracker__zh zh">' + s.zh + '</span></div>';
      }).join('');
    }

    function go(i) {
      at = i;
      drawTracker();
      if (i >= LESSON_STAGES.length) return finish();
      var id = LESSON_STAGES[i].id;
      if (id === 'story') return stageStory();
      run(lessonItems(id, story), {
        host: '#examHost',
        onDone: function (res) {
          results[id] = { ok: res.correct, n: res.items };
          go(at + 1);
        }
      });
    }

    function stageStory() {
      var showPy = !!S.me().settings.pinyin;
      var rate = SP.hasChinese() ? 0.68 : 0.45;
      var lastEl = null;

      function paint() {
        hostEl.innerHTML =
          '<div class="hud"><div class="hud__q">' + story.emoji + ' ' + U.esc(story.title) +
            '<small>' + U.esc(story.titleEn) + ' · ' + story.chars + ' 個字</small></div>' +
            '<div class="spacer"></div><span class="pill">' +
              (SP.hasChinese() ? '🔊 跟著讀' : '👀 跟著高亮讀') + '</span></div>' +
          '<div class="btnrow" style="margin-bottom:10px">' +
            '<button class="btn btn--primary" data-act="play">▶️ 聽故事</button>' +
            '<button class="btn btn--ghost" data-act="slow">🐢 慢慢讀</button>' +
            '<button class="btn' + (showPy ? ' btn--gold' : '') + '" data-act="py">🔤 拼音</button>' +
          '</div>' +
          '<div class="story">' + story.lines.map(function (l, i) {
            return '<p class="story__line" data-line="' + i + '">' + rubyLine(l[0], showPy, i + '-') + '</p>';
          }).join('') + '</div>' +
          '<div class="btnrow" style="margin:16px 0 24px">' +
            '<button class="btn btn--gold btn--big" data-act="next">我準備好了 → 聽力測驗</button>' +
          '</div>';
      }

      function highlight(lineIdx, charIdx) {
        if (lastEl) lastEl.classList.remove('is-speaking');
        U.$$('.story__line', hostEl).forEach(function (p) { p.classList.remove('is-reading'); });
        var lineEl = U.$('.story__line[data-line="' + lineIdx + '"]', hostEl);
        if (!lineEl) return;
        lineEl.classList.add('is-reading');
        if (charIdx < 0) return;
        var el = U.$('[data-ci="' + lineIdx + '-' + charIdx + '"]', hostEl);
        if (!el) return;
        el.classList.add('is-speaking');
        lastEl = el;
        if (charIdx === 0 && el.scrollIntoView) {
          try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        }
      }

      function startPlay(slow) {
        if (current) current.stop();
        paint();
        current = storyPlayer({
          lines: story.lines,
          rate: slow ? 0.5 : rate,
          onChar: highlight,
          onDone: function () {
            if (lastEl) lastEl.classList.remove('is-speaking');
            U.$$('.story__line', hostEl).forEach(function (p) { p.classList.remove('is-reading'); });
          }
        });
        current.start(0);
      }

      paint();
      hostEl.addEventListener('click', function (e) {
        var t = e.target.closest('[data-act]');
        if (t) {
          var act = t.dataset.act;
          if (act === 'play') { A.tap(); startPlay(false); return; }
          if (act === 'slow') { A.tap(); startPlay(true); return; }
          if (act === 'py') { A.tap(); showPy = !showPy; if (current) current.stop(); paint(); return; }
          if (act === 'next') {
            A.tap();
            if (current) current.stop();
            results.story = { ok: 1, n: 1 };
            go(1);
            return;
          }
        }
        var ch = e.target.closest('.storychar');
        if (ch) {
          var c = ch.dataset.c;
          var info = CQ.charPy[c];
          A.tap();
          SP.say(c, { rate: 0.6 });
          if (info) FX.toast('<span class="zh" style="font-size:20px">' + U.esc(c) + '</span> ' +
            U.esc(info[0]) + ' · ' + U.esc(info[1]), 1600);
          return;
        }
        var line = e.target.closest('.story__line');
        if (line && e.target === line) {
          A.tap();
          SP.say(story.lines[+line.dataset.line][0], { rate: 0.7 });
        }
      });
    }

    function finish() {
      if (current) current.stop();
      var out = {};
      var ok = 0, n = 0;
      ['listen', 'speak', 'read', 'write'].forEach(function (k) {
        out[k] = results[k] || { ok: 0, n: 0 };
        ok += out[k].ok;
        n += out[k].n;
      });
      App.finishLesson({
        story: story.id, storyTitle: story.title,
        byStrand: {
          listen: out.listen, speak: out.speak, read: out.read, write: out.write
        },
        total: ok, items: n
      });
    }

    go(0);
  }

  /* ====================================================== story reader ==== */
  function rubyLine(zh, showPy, keyPrefix) {
    return zh.split('').map(function (c, i) {
      var info = CQ.charPy[c];
      var key = keyPrefix ? ' data-ci="' + keyPrefix + i + '"' : '';
      if (/[。，、！？；：]/.test(c)) return '<span class="storypunct"' + key + '>' + c + '</span>';
      if (showPy && info) {
        return '<ruby class="storychar" data-c="' + U.esc(c) + '"' + key + '>' +
          U.esc(c) + '<rt>' + U.esc(info[0]) + '</rt></ruby>';
      }
      return '<button class="storychar" data-c="' + U.esc(c) + '"' + key + '>' + U.esc(c) + '</button>';
    }).join('');
  }

  function openStory(id) {
    var story = CQ.storyById[id];
    var hostEl = U.$('#storyHost');
    if (!story || !hostEl) return;
    stop();
    var s = S.me().settings;
    var showPy = !!s.pinyin;
    var showEn = false;
    var state = S.storyState(id);

    function draw() {
      hostEl.innerHTML =
        '<div class="hud">' +
          '<div class="hud__q">' + story.emoji + ' ' + U.esc(story.title) +
            '<small>' + U.esc(story.titleEn) + ' · ' + story.chars + ' 個字</small></div>' +
          '<div class="spacer"></div>' +
          (state && state.done ? '<span class="pill pill--good">✅ 讀過 ' + state.score + '/' + state.total + '</span>' : '') +
        '</div>' +
        '<div class="btnrow" style="margin-bottom:12px">' +
          '<button class="btn btn--blue" data-story="play">🔊 聽故事</button>' +
          '<button class="btn' + (showPy ? ' btn--gold' : '') + '" data-story="py">' + (showPy ? '🔤 拼音 ON' : '🔤 拼音 OFF') + '</button>' +
          '<button class="btn' + (showEn ? ' btn--gold' : '') + '" data-story="en">🇬🇧 English</button>' +
        '</div>' +
        '<div class="story">' + story.lines.map(function (l, i) {
          return '<p class="story__line" data-line="' + i + '">' + rubyLine(l[0], showPy) +
            (showEn ? '<span class="story__en">' + U.esc(l[1]) + '</span>' : '') + '</p>';
        }).join('') + '</div>' +
        '<div class="btnrow" style="margin:16px 0 24px">' +
          '<button class="btn btn--primary btn--big" data-story="quiz">📝 讀完回答問題</button>' +
        '</div>' +
        '<p class="center muted" style="font-size:12px;font-weight:800;margin-bottom:20px">' +
          '點任何一個字都可以聽發音 · tap any character to hear it</p>';
    }
    draw();

    hostEl.addEventListener('click', function (e) {
      var t = e.target.closest('[data-story]');
      if (t) {
        var act = t.dataset.story;
        if (act === 'py') { showPy = !showPy; A.tap(); draw(); return; }
        if (act === 'en') { showEn = !showEn; A.tap(); draw(); return; }
        if (act === 'play') {
          A.tap();
          story.lines.forEach(function (l, i) { setTimeout(function () { SP.say(l[0], { rate: 0.7 }); }, i * 2600); });
          return;
        }
        if (act === 'quiz') { quiz(); return; }
      }
      var ch = e.target.closest('.storychar');
      if (ch) {
        var c = ch.dataset.c;
        var info = CQ.charPy[c];
        A.tap();
        SP.say(c, { rate: 0.6 });
        if (info) FX.toast('<span class="zh" style="font-size:20px">' + U.esc(c) + '</span> ' + U.esc(info[0]) + ' · ' + U.esc(info[1]), 1600);
        return;
      }
      var line = e.target.closest('.story__line');
      if (line && e.target === line) {
        var l = story.lines[+line.dataset.line];
        A.tap();
        SP.say(l[0], { rate: 0.7 });
      }
    });

    /* comprehension, one question at a time, in a card */
    function quiz() {
      var qi = 0, right = 0;
      function ask() {
        if (qi >= story.questions.length) return done();
        var q = story.questions[qi];
        var opts = q.options.map(function (o) { return { t: o, ok: false }; });
        opts[q.answer].ok = true;
        var card = App.showCard(
          '<div class="modal__title">📝 ' + U.esc(story.title) + ' — ' + (qi + 1) + ' / ' + story.questions.length + '</div>' +
          '<div class="prompt" style="box-shadow:none;margin:10px 0"><div class="prompt__text zh" style="font-size:24px">' + U.esc(q.q) + '</div>' +
            '<div class="prompt__sub">' + U.esc(q.en) + '</div></div>' +
          '<div class="options options--' + opts.length + '">' + opts.map(function (o, i) {
            return '<button class="option" data-q="' + i + '"><span class="zh" style="font-size:26px">' + U.esc(o.t) + '</span></button>';
          }).join('') + '</div>',
          { dismissible: false }
        );
        var answered = false;
        card.addEventListener('click', function (e) {
          var b = e.target.closest('[data-q]');
          if (!b || answered) return;
          answered = true;
          var chosen = opts[+b.dataset.q];
          U.$$('.option', card).forEach(function (btn) {
            var cand = opts[+btn.dataset.q];
            if (cand.ok) btn.classList.add('option--correct');
            else if (cand === chosen) btn.classList.add('option--wrong');
            else btn.classList.add('option--dim');
            btn.disabled = true;
          });
          if (chosen.ok) { right++; A.correct(); } else A.wrong();
          setTimeout(function () {
            App.closeModal();
            qi++;
            setTimeout(ask, 220);
          }, chosen.ok ? 900 : 1700);
        });
      }
      function done() {
        var res = S.finishStory(story.id, right, story.questions.length);
        S.addSkill('read', story.questions.length);
        state = S.storyState(story.id);
        var xp = 20 + right * 10;
        S.addXp(xp);
        S.addCoins(6 + right * 3);
        if (res.first) S.addCoins(10);
        var badges = S.evaluateBadges();
        App.showCard(
          '<div class="resultstars">' + [0, 1, 2].map(function (i) {
            return '<span>' + (i < Math.ceil(right / story.questions.length * 3) ? '⭐' : '☆') + '</span>';
          }).join('') + '</div>' +
          '<div class="modal__title">' + (right === story.questions.length ? '讀得真好！' : '讀完了！') + '</div>' +
          '<p class="center" style="font-weight:900;color:#5b7089">' + U.esc(story.title) + ' · ' + right + ' / ' + story.questions.length + '</p>' +
          '<div class="modal__body"><div class="resultrow"><span>⭐ XP</span><b>+' + xp + '</b></div>' +
          '<div class="resultrow"><span>📖 讀過的故事 Stories read</span><b>' + S.storiesRead() + ' / ' + CQ.stories.length + '</b></div></div>' +
          (res.first ? '<p class="center" style="font-weight:900;color:#b8860b">🎉 第一次讀完這個故事 · 🪙+10</p>' : '') +
          (badges.length ? '<div class="btnrow">' + badges.map(function (b) {
            return '<span class="pill pill--gold">' + b.emoji + ' 新徽章 ' + U.esc(b.zh) + '</span>';
          }).join('') + '</div>' : '') +
          '<div class="btnrow" style="margin-top:14px">' +
            '<button class="btn btn--primary" data-close="1">繼續讀 Continue</button>' +
            '<button class="btn btn--ghost" data-nav="learn">📚 回故事書櫃</button>' +
          '</div>',
          { dismissible: false }
        );
        var card = U.$('.modal');
        card.addEventListener('click', function (e) {
          if (e.target.closest('[data-close]')) { App.closeModal(); draw(); }
        });
      }
      ask();
    }
  }

  /* the bookshelf, rendered into the reading screen */
  function storyShelfHTML() {
    return '<div class="shelf">' + CQ.stories.map(function (s) {
      var st = S.storyState(s.id);
      var lvl = ['', '🌱 入門', '🌿 進階', '🌳 挑戰'][s.level] || '';
      return '<button class="storycard' + (st && st.done ? ' storycard--done' : '') + '" data-story-id="' + s.id + '">' +
        '<span class="storycard__em">' + s.emoji + '</span>' +
        '<span class="storycard__body">' +
          '<span class="storycard__title zh">' + U.esc(s.title) + '</span>' +
          '<span class="storycard__en">' + U.esc(s.titleEn) + '</span>' +
          '<span class="storycard__meta">' + lvl + ' · ' + s.chars + ' 個字 · ' + s.questions.length + ' 題' +
            (st && st.done ? ' · ✅ ' + st.score + '/' + st.total : '') + '</span>' +
        '</span>' +
        '<span class="storycard__go">讀 ▶</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  function stop() {
    SP.stop();
    if (current) { current.stop(); current = null; }
    live = null;
  }

  return {
    practice: practice,
    lesson: lesson,
    todayStory: todayStory,
    openStory: openStory,
    storyShelfHTML: storyShelfHTML,
    stop: stop,
    /* pure helpers, exported for the test suite */
    traceScore: traceScore,
    matchesSpeech: matchesSpeech,
    listenItem: listenItem,
    speakItem: speakItem,
    readWordItem: readWordItem,
    writeItem: writeItem,
    buildItem: buildItem,
    sentenceListenItem: sentenceListenItem,
    clozeItem: clozeItem,
    storyPlayer: storyPlayer,
    lessonItems: lessonItems,
    charMs: charMs
  };
})();
