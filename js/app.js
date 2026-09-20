/* =========================================================================
   Chinese Quest — app shell
   Onboarding, home, learn, collection, settings, battle lobby, results.
   Exposes the global `App` used by the game engines.
   ========================================================================= */

var App = (function () {
  'use strict';

  var U = CQ.util, S = CQ.store, A = CQ.audio, SP = CQ.speech, FX = CQ.fx;

  var el = {};
  var currentTheme = 'all';
  var learnFilter = 'all';
  var detailIndex = -1;
  var onboardingMode = 'new';
  var pendingEvolution = false;
  var rankScope = 'all';            // 'all' | 'week'
  var learnTab = 'cards';           // 'cards' | 'stories'
  var FONT_ZH = '"PingFang TC","Microsoft JhengHei","Noto Sans TC",system-ui,sans-serif';
  var FONT_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  /* ============================================================== modal == */
  function modal(html, opts) {
    opts = opts || {};
    closeModal();
    var wrap = U.el('div', 'modal');
    wrap.innerHTML = '<div class="modal__card">' + html + '</div>';
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap && opts.dismissible !== false) closeModal();
    });
    document.body.appendChild(wrap);
    el.modal = wrap;
    return wrap;
  }
  function closeModal() {
    if (el.modal) { el.modal.remove(); el.modal = null; }
  }

  /* ============================================================= screens == */
  var NAV = ['home', 'levels', 'learn', 'rank', 'collection', 'settings'];

  /* The evolution celebration is queued, never popped over another card. */
  function flushEvolution() {
    if (!pendingEvolution || el.modal) return;
    pendingEvolution = false;
    evolutionModal();
  }

  function show(name) {
    U.$$('.screen').forEach(function (s) { s.classList.remove('is-active'); });
    var node = U.$('#screen-' + name);
    if (node) node.classList.add('is-active');
    U.$$('.navbtn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.nav === name); });
    U.$('#bottomnav').classList.toggle('hidden', NAV.indexOf(name) < 0);
    el.current = name;
    window.scrollTo(0, 0);
    if (name === 'home') { renderHome(); setTimeout(flushEvolution, 350); }
    if (name === 'levels') renderLevels();
    else el.mapScrolled = false;
    if (name === 'learn') renderLearn();
    if (name === 'collection') renderCollection();
    if (name === 'rank') renderRank();
    if (name === 'settings') renderSettings();
    if (name === 'battlesetup') renderBattleSetup();
    if (el.orb && name !== 'home') el.orb.pause();          // no wasted frames
    if (el.trophy && name !== 'rank') el.trophy.pause();
  }

  /* ============================================================== sky ==== */
  function buildSky() {
    var sky = U.$('#sky');
    var items = ['☁️', '⛅', '🌸', '☁️', '🦋', '☁️', '🌤️', '🍃', '☁️', '🐦'];
    sky.innerHTML = items.map(function (e, i) {
      return '<span style="top:' + (4 + (i * 9) % 82) + '%;animation-duration:' + (46 + i * 7) + 's;animation-delay:-' + (i * 6) + 's;font-size:' + (30 + (i % 3) * 16) + 'px">' + e + '</span>';
    }).join('');
  }

  /* ============================================================= topbar == */
  function topbarHTML() {
    var p = S.me();
    return '<div class="topbar">' +
      '<button class="playerchip" data-nav="settings">' +
        '<span class="playerchip__av">' + p.avatar + '</span>' +
        '<span class="playerchip__name">' + U.esc(p.name) + '</span>' +
      '</button>' +
      '<div class="stats">' +
        '<span class="stat" id="statCoins"><span class="stat__icon">🪙</span>' + p.coins + '</span>' +
        '<span class="stat" id="statStreak"><span class="stat__icon">🔥</span>' + (p.streak.count || 0) + '</span>' +
        '<span class="stat" id="statXp"><span class="stat__icon">⭐</span>' + p.xp + '</span>' +
      '</div>' +
    '</div>';
  }

  /* =============================================================== home == */
  function ringSVG(pct) {
    var r = 32, c = 2 * Math.PI * r;
    var off = c * (1 - U.clamp(pct, 0, 1));
    return '<svg width="78" height="78" viewBox="0 0 78 78">' +
      '<circle class="ring__track" cx="39" cy="39" r="' + r + '" fill="none" stroke-width="10"/>' +
      '<circle class="ring__fill" cx="39" cy="39" r="' + r + '" fill="none" stroke-width="10" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
  }

  function themeChipsHTML(active, attr) {
    var html = '<button class="chip' + (active === 'all' ? ' is-active' : '') + '" data-' + attr + '="all">' +
      '<span class="chip__em">✨</span>全部 All</button>';
    return html + CQ.themes.map(function (t) {
      return '<button class="chip' + (active === t.id ? ' is-active' : '') + '" data-' + attr + '="' + t.id + '">' +
        '<span class="chip__em">' + t.emoji + '</span>' + U.esc(t.zh) + '</button>';
    }).join('');
  }

  function renderHome() {
    var p = S.me();
    var stage = S.stageOf(p.xp);
    var cur = PET_STAGES[stage];
    var next = PET_STAGES[stage + 1];
    var pct = next ? (p.xp - cur.xp) / (next.xp - cur.xp) : 1;
    var item = S.equippedItem();
    var dailyPct = U.clamp(p.daily.xp / CQ.config.dailyGoalXp, 0, 1);
    var mastered = S.mastery('all');

    var html = topbarHTML() +
      '<section class="section"><div class="hero">' +
        '<div class="hero__top">' +
          '<div class="hero3d">' +
            '<canvas class="orb3d" id="orb3d" width="190" height="190" aria-hidden="true"></canvas>' +
            '<div class="pet" id="pet">' +
              '<span class="pet__emoji">' + cur.emoji + '</span>' +
              (item ? '<span class="pet__accessory">' + item.emoji + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="hero__info">' +
            '<div class="hero__stage">' + U.esc(cur.en) + ' · ' + U.esc(cur.name) + '</div>' +
            '<div class="hero__name">' + U.esc(p.name) + ' 的龍</div>' +
            '<div class="xpbar"><i class="xpbar__fill" style="width:' + (pct * 100).toFixed(1) + '%"></i></div>' +
            '<div class="hero__xp">' + (next
              ? p.xp + ' / ' + next.xp + ' XP → ' + next.emoji + ' ' + next.name
              : p.xp + ' XP · 已經是龍王了！ Max stage!') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="daily">' +
          '<div class="ring">' + ringSVG(dailyPct) + '<span class="ring__label">' +
            Math.min(p.daily.xp, CQ.config.dailyGoalXp) + '<small>/' + CQ.config.dailyGoalXp + '</small></span></div>' +
          '<div class="daily__text">' +
            '<div class="daily__title">' + (p.daily.done ? '✅ 今日任務完成！' : '🎯 今日任務 Daily Quest') + '</div>' +
            '<div class="daily__sub">' + (p.daily.done
              ? '已獲得 +15 🪙 獎勵 · Come back tomorrow!'
              : '再得 ' + Math.max(0, CQ.config.dailyGoalXp - p.daily.xp) + ' XP 領取 +15 🪙') + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:16px;position:relative;z-index:1">' +
          '<button class="btn btn--gold btn--wide btn--big" data-nav="levels">' +
            '🗺️ 第 ' + S.currentLevel() + ' / ' + CQ.levels.length + ' 關 · 開始冒險' +
            '<small style="display:block;font-size:13px;font-weight:800">Adventure Map · ⭐ ' + S.totalStars() + '</small>' +
          '</button>' +
        '</div>' +
        '<div class="btnrow" style="margin-top:10px;position:relative;z-index:1">' +
          '<button class="btn btn--primary" data-action="quickplay">▶️ 快速複習 Quick Play</button>' +
          '<button class="btn btn--blue" data-nav="rank">🏆 排行榜 Ranking</button>' +
        '</div>' +
        '<p class="center" style="margin-top:9px;font-size:12px;font-weight:800;color:#8a5a20;position:relative;z-index:1">' +
          quotaText() + '</p>' +
        '<p class="center muted" style="margin-top:8px;font-size:13px;font-weight:800">' +
          '已練習 ' + S.studiedCount() + ' 個字詞 · ' + mastered.known + ' 個熟練 · ' + CQ.words.length + ' 個字詞等你學</p>' +
      '</div></section>' +

      skillSectionHTML() +
      '<section class="section">' +
        '<div class="section__head"><span class="section__title">🎮 選一個遊戲 Pick a game</span>' +
          '<span class="section__sub">先選主題再開始</span></div>' +
        '<div class="chips" id="homeThemes">' + themeChipsHTML(currentTheme, 'theme') + '</div>' +
        '<div class="gamegrid" id="gamegrid">' + gameCardsHTML() + '</div>' +
      '</section>';

    U.$('#screen-home').innerHTML = html;
    var pet = U.$('#pet');
    if (pet) pet.addEventListener('click', petPet);
    mountOrb(stage);
  }

  function quotaText() {
    var lim = S.levelLimit();
    if (lim === 0) return '🌙 今天不限關卡 · no daily limit';
    var left = S.levelQuotaLeft();
    return left > 0
      ? '🌙 今天還可以闖 ' + left + ' 關（每天 ' + lim + ' 關）· 已通過的關卡可以一直重玩'
      : '🌙 今天的 ' + lim + ' 關都闖完了，明天再來！先做四項檢查或讀故事吧';
  }

  /* the four language strands + the daily check */
  function skillSectionHTML() {
    var ex = S.examToday();
    var done = !!ex;
    var strands = CQ.strands.map(function (st) {
      return '<button class="skillcard" data-skill="' + st.id + '" style="--sc:' + st.color + '">' +
        '<span class="skillcard__em">' + st.emoji + '</span>' +
        '<span class="skillcard__zh zh">' + st.zh + '</span>' +
        '<span class="skillcard__en">' + U.esc(st.en) + '</span>' +
        '<span class="skillcard__n">練過 ' + S.skillCount(st.id) + ' 次</span>' +
      '</button>';
    }).join('');

    function part(id) {
      var b = (ex && ex.byStrand && ex.byStrand[id]) || { ok: 0, n: 0 };
      return b.ok + '/' + (b.n || 0);
    }

    return '<section class="section">' +
      '<div class="section__head"><span class="section__title">🧭 四技練習 Four Skills</span>' +
        '<span class="section__sub">聽 · 說 · 讀 · 寫</span></div>' +
      '<button class="examcard' + (done ? ' examcard--done' : '') + '" data-action="exam">' +
        '<span class="examcard__em">' + (done ? '✅' : '🎯') + '</span>' +
        '<span class="examcard__body">' +
          '<b>' + (done ? '今天的檢查完成了 · Done for today' : '今天的四項檢查 Daily Check') + '</b>' +
          '<small>' + (done
            ? '聽 ' + part('listen') + ' · 說 ' + part('speak') + ' · 讀 ' + part('read') + ' · 寫 ' + part('write')
            : '聽力 · 口說 · 閱讀 · 書寫 — 共 ' + (CQ.config.examPerStrand * 4) + ' 題，沒有計時') + '</small>' +
        '</span>' +
        '<span class="examcard__go">' + (done ? '報告 ▶' : '開始 ▶') + '</span>' +
      '</button>' +
      '<div class="skillgrid">' + strands + '</div>' +
      '<p class="center muted" style="font-size:12px;font-weight:800;margin-top:8px">' +
        '四技可以隨時自由練習 · free practice any time</p>' +
      '</section>';
  }

  function gameCardsHTML() {
    var p = S.me();
    return CQ.games.map(function (g) {
      var best = p.best[g.id] || 0;
      var isBattle = g.id === 'battle';
      if (isBattle) {
        return '<button class="gamecard gamecard--battle" data-game="battle" style="--gc:' + g.color + '">' +
          '<span class="gamecard__emoji">' + g.emoji + '</span>' +
          '<span class="gamecard__body">' +
            '<span class="gamecard__zh">' + U.esc(g.zh) + '</span> ' +
            '<span class="gamecard__en">' + U.esc(g.en) + '</span>' +
            '<div class="gamecard__en" style="margin-top:2px">' + U.esc(g.how) + '</div>' +
          '</span>' +
          '<span class="gamecard__go">對戰 ▶</span>' +
        '</button>';
      }
      return '<button class="gamecard" data-game="' + g.id + '" style="--gc:' + g.color + '">' +
        '<span class="gamecard__emoji">' + g.emoji + '</span>' +
        '<span class="gamecard__zh">' + U.esc(g.zh) + '</span>' +
        '<span class="gamecard__en">' + U.esc(g.en) + '</span>' +
        '<span class="gamecard__meta"><span class="gamecard__stars">' + CQ.ui.stars(best) + '</span></span>' +
      '</button>';
    }).join('');
  }

  var petLines = ['喵～', '吼吼！', '你最棒了！', '再玩一局！', '我們一起學！', '哇！好厲害'];
  function petPet() {
    A.pop();
    if (el.orb && el.orb.burst) el.orb.burst(1000);
    FX.celebratePet();
    FX.confetti({ count: 16, y: window.innerHeight * 0.26, spread: 70 });
    SP.say(U.pick(petLines), { rate: 0.9 });
  }

  /* ============================================================== learn == */
  function learnWords() {
    return learnFilter === 'all'
      ? CQ.words.slice()
      : CQ.words.filter(function (w) { return w.theme === learnFilter; });
  }

  function renderLearn() {
    var words = learnWords();
    var m = S.mastery(learnFilter);
    var tabs =
      '<div class="segmented" style="margin-bottom:12px">' +
        '<button data-ltab="cards" class="' + (learnTab === 'cards' ? 'is-active' : '') + '">🔤 字卡 Flashcards</button>' +
        '<button data-ltab="stories" class="' + (learnTab === 'stories' ? 'is-active' : '') + '">📖 故事 Stories (' +
          S.storiesRead() + '/' + CQ.stories.length + ')</button>' +
      '</div>';

    if (learnTab === 'stories') {
      U.$('#screen-learn').innerHTML =
        '<div class="screenhead"><div style="flex:1">' +
          '<div class="screenhead__title">📖 讀本 Reader</div>' +
          '<div class="screenhead__sub">每個故事都少於 100 個字 · every story is under 100 characters</div>' +
        '</div></div>' + tabs +
        Skills.storyShelfHTML() +
        '<p class="center muted" style="font-size:12px;font-weight:800;margin:14px 0 22px">' +
          '故事只用你學過的字寫成 · the stories only use characters you have met</p>';
      return;
    }

    U.$('#screen-learn').innerHTML =
      '<div class="screenhead"><div style="flex:1">' +
        '<div class="screenhead__title">📖 讀本 Reader</div>' +
        '<div class="screenhead__sub">點卡片聽發音 · ' + m.known + ' 熟練 / ' + m.total + ' 字詞</div></div>' +
      '</div>' + tabs +
      '<div class="chips" id="learnThemes">' + themeChipsHTML(learnFilter, 'ltheme') + '</div>' +
      '<div class="wordlist">' + words.map(function (w) { return CQ.ui.wordCard(w); }).join('') + '</div>' +
      '<div class="empty">🎈 每天學 5 個，一週就有 35 個字！</div>';
  }

  function openWord(zh) {
    var words = learnWords();
    detailIndex = words.map(function (w) { return w.zh; }).indexOf(zh);
    if (detailIndex < 0) detailIndex = 0;
    renderWordDetail();
  }

  function renderWordDetail() {
    var words = learnWords();
    var w = words[detailIndex];
    if (!w) return;
    var st = S.wordState(w.zh);
    var s = S.me().settings;
    SP.sayWord(w);
    modal(
      '<div class="prompt" style="box-shadow:none;margin:0 0 10px;padding:10px">' +
        '<div class="prompt__emoji">' + w.em + '</div>' +
        '<div class="prompt__zh">' + U.esc(w.zh) + '</div>' +
        '<div style="margin-top:6px">' +
          (s.pinyin ? '<span class="pill">🔤 ' + U.esc(w.py) + '</span> ' : '') +
          (s.zhuyin ? '<span class="pill">ㄅ ' + U.esc(w.zy) + '</span> ' : '') +
          '<span class="pill">🇬🇧 ' + U.esc(w.en) + '</span>' +
        '</div>' +
      '</div>' +
      (w.mn ? '<p class="center" style="font-weight:800;color:#5b7089;margin:10px 4px">💡 ' + U.esc(w.mn) + '</p>' : '') +
      '<div class="row" style="justify-content:center;gap:8px;margin:12px 0">' +
        '<button class="btn btn--sm" data-detail="speak">🔊 再聽一次</button>' +
        '<button class="btn btn--sm" data-detail="slow">🐢 慢慢說</button>' +
      '</div>' +
      '<div class="resultrow"><span>熟練度 Mastery</span><b>' + CQ.ui.stars(st.box, 5) + '</b></div>' +
      '<div class="resultrow"><span>答對 / 答錯 Correct / Wrong</span><b>' + st.ok + ' / ' + st.bad + '</b></div>' +
      '<div class="resultrow"><span>主題 Theme</span><b>' + U.esc(w.themeEm) + ' ' + U.esc(w.themeZh) + '</b></div>' +
      '<div class="btnrow" style="margin-top:14px">' +
        '<button class="btn btn--sm" data-detail="prev">◀ 上一個</button>' +
        '<button class="btn btn--sm btn--blue" data-detail="practice">🎯 練這一個</button>' +
        '<button class="btn btn--sm" data-detail="next">下一個 ▶</button>' +
      '</div>' +
      '<div class="btnrow" style="margin-top:8px"><button class="btn btn--sm btn--ghost" data-detail="close">關閉 Close</button></div>'
    );
  }

  function stepWord(d) {
    var words = learnWords();
    detailIndex = (detailIndex + d + words.length) % words.length;
    renderWordDetail();
  }

  function practiceOne() {
    var words = learnWords();
    var w = words[detailIndex];
    closeModal();
    if (!w) return;
    A.tap();
    startCustomRound([w]);
  }

  /* Practise a specific set of words with the mixed quiz engine. */
  function startCustomRound(words) {
    el.activeLevel = null;
    Games.setHost(U.$('#gameHost'));
    Games.start('review', { customWords: words, theme: 'all' });
    show('game');
  }

  /* ========================================================= collection == */
  function renderCollection() {
    var p = S.me();
    var stage = S.stageOf(p.xp);
    var studied = S.studiedCount();

    var pets = PET_STAGES.map(function (st, i) {
      var locked = i > stage;
      return '<div class="petline__item' + (locked ? ' locked' : '') + '">' +
        '<div class="petline__em">' + (locked ? '❓' : st.emoji) + '</div>' +
        '<div style="font-weight:900;font-size:13px">' + U.esc(st.name) + '</div>' +
        '<div class="muted" style="font-size:11px;font-weight:800">' + (locked ? st.xp + ' XP' : st.en) + '</div>' +
      '</div>';
    }).join('');

    var shop = SHOP.map(function (it) {
      var owned = p.owned.indexOf(it.id) >= 0;
      var equipped = p.equipped === it.id;
      return '<button class="shopitem' + (owned ? ' is-owned' : '') + (equipped ? ' is-equipped' : '') + '" data-shop="' + it.id + '">' +
        '<div class="shopitem__em">' + it.emoji + '</div>' +
        '<div class="shopitem__zh">' + U.esc(it.zh) + '</div>' +
        '<div class="shopitem__price">' + (owned ? (equipped ? '✅ 使用中' : '點擊穿上') : '🪙 ' + it.price) + '</div>' +
      '</button>';
    }).join('');

    var badges = BADGES.map(function (b) {
      var got = p.badges.indexOf(b.id) >= 0;
      return '<div class="badge' + (got ? '' : ' badge--locked') + '">' +
        '<div class="badge__em">' + b.emoji + '</div>' +
        '<div class="badge__zh">' + U.esc(b.zh) + '</div>' +
        '<div class="badge__en">' + U.esc(got ? b.en : b.hint) + '</div>' +
      '</div>';
    }).join('');

    U.$('#screen-collection').innerHTML =
      '<div class="screenhead"><div style="flex:1">' +
        '<div class="screenhead__title">🏆 我的收藏 My Collection</div>' +
        '<div class="screenhead__sub">' + p.badges.length + ' / ' + BADGES.length + ' 徽章 · ' +
          studied + ' 字詞練習過 · 🪙 ' + p.coins + '</div>' +
      '</div></div>' +
      '<section class="section"><div class="section__head"><span class="section__title">🐉 龍的成長 My Dragon</span></div>' +
        '<div class="petline">' + pets + '</div></section>' +
      '<section class="section"><div class="section__head"><span class="section__title">🛍️ 裝扮商店 Shop</span>' +
        '<span class="section__sub">用金幣買配件</span></div>' +
        '<div class="shopgrid">' + shop + '</div></section>' +
      '<section class="section"><div class="section__head"><span class="section__title">🎖️ 徽章 Badges</span></div>' +
        '<div class="badgegrid">' + badges + '</div></section>';
  }

  function buyOrEquip(id) {
    var it = SHOP.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    var p = S.me();
    if (p.owned.indexOf(id) >= 0) {
      S.equip(id);
      A.pop();
      FX.toast(S.me().equipped === id ? '✨ ' + it.zh + ' 穿上了！' : '收起來了');
    } else if (S.buy(it)) {
      A.coin();
      FX.confetti({ count: 30, y: window.innerHeight * 0.4 });
      FX.toast('🎉 買到了 ' + it.emoji + ' ' + it.zh + '！');
      S.equip(id);
    } else {
      A.wrong();
      FX.toast('🪙 金幣不夠，再玩幾局吧！ Need ' + it.price + ' coins');
    }
    renderCollection();
  }

  /* =========================================================== settings == */
  function toggleRow(id, on, title, sub) {
    return '<div class="toggle"><div class="toggle__text">' +
      '<div class="toggle__title">' + title + '</div><div class="toggle__sub">' + sub + '</div></div>' +
      '<button class="switch' + (on ? ' is-on' : '') + '" data-toggle="' + id + '" aria-label="toggle"></button></div>';
  }

  function renderSettings() {
    var p = S.me(), s = p.settings;
    var players = S.profiles().map(function (pr) {
      return '<button class="chip' + (pr.id === p.id ? ' is-active' : '') + '" data-player="' + pr.id + '">' +
        '<span class="chip__em">' + pr.avatar + '</span>' + U.esc(pr.name) + '</button>';
    }).join('');

    var diffSeg = Object.keys(CQ.config.difficulty).map(function (k) {
      var d = CQ.config.difficulty[k];
      return '<button data-diff="' + k + '" class="' + (s.difficulty === k ? 'is-active' : '') + '">' +
        U.esc(d.zh) + '<br><small>' + U.esc(d.en) + '</small></button>';
    }).join('');

    U.$('#screen-settings').innerHTML =
      '<div class="screenhead"><div style="flex:1">' +
        '<div class="screenhead__title">⚙️ 設定 Settings</div>' +
        '<div class="screenhead__sub">家長與老師可用 · Parent &amp; teacher options</div>' +
      '</div></div>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:8px">👥 玩家 Players</div>' +
        '<div class="chips" style="flex-wrap:wrap">' + players + '</div>' +
        '<div class="btnrow" style="margin-top:10px">' +
          '<button class="btn btn--sm btn--blue" data-action="addplayer">➕ 新增玩家 Add player</button>' +
          (S.profiles().length > 1 ? '<button class="btn btn--sm btn--danger" data-action="delplayer">🗑️ 刪除這個玩家</button>' : '') +
        '</div>' +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:6px">✏️ 名字與角色 Name &amp; avatar</div>' +
        '<div class="row"><input class="field" id="nameField" maxlength="14" value="' + U.esc(p.name) + '">' +
        '<button class="btn btn--sm btn--blue" data-action="savename">儲存</button></div>' +
        '<div class="avataropts" id="avatarOpts">' + CQ.config.accentAvatars.map(function (a) {
          return '<button class="avataropt' + (a === p.avatar ? ' is-active' : '') + '" data-avatar="' + a + '">' + a + '</button>';
        }).join('') + '</div>' +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:6px">🔤 閱讀輔助 Reading aid</div>' +
        toggleRow('pinyin', s.pinyin, '拼音 Pinyin', '顯示漢語拼音 · show pinyin under characters') +
        toggleRow('zhuyin', s.zhuyin, '注音 Zhuyin', '顯示ㄅㄆㄇ注音符號 · Taiwan phonetic symbols') +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:6px">🔊 聲音 Sound</div>' +
        toggleRow('sound', s.sound, '音效 Sound effects', '答對答錯的提示音') +
        toggleRow('speech', s.speech, '語音朗讀 Read aloud', SP.hasChinese()
          ? '使用裝置的中文語音 · device Chinese voice found'
          : '⚠️ 此裝置沒有中文語音，將顯示拼音代替 · no Chinese voice on this device') +
        toggleRow('graphics3d', s.graphics3d !== false, '🧊 3D 圖形 3D graphics',
          '會轉動的 3D 龍珠與獎盃 · animated 3D orb, medal and trophy') +
        '<div class="btnrow" style="margin-top:12px">' +
          '<button class="btn btn--sm" data-action="testvoice">🔊 測試中文語音 Test voice</button>' +
        '</div>' +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:8px">🎚️ 難度 Difficulty</div>' +
        '<div class="segmented" id="diffSeg">' + diffSeg + '</div>' +
        '<p class="muted" style="font-size:12px;font-weight:800;margin-top:8px">簡單 3 選項無計時 · 普通 4 選項 12 秒 · 困難 6 選項 8 秒</p>' +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:8px">🌙 每天最多闖幾關 Levels per day</div>' +
        '<div class="segmented" id="limitSeg">' +
          CQ.config.levelLimitOptions.map(function (n) {
            return '<button data-limit="' + n + '" class="' + (S.levelLimit() === n ? 'is-active' : '') + '">' +
              (n === 0 ? '不限<br><small>No limit</small>' : n + ' 關<br><small>' + n + ' levels</small>') + '</button>';
          }).join('') +
        '</div>' +
        '<p class="muted" style="font-size:12px;font-weight:800;margin-top:8px">' +
          '今天已闖 ' + S.levelsClearedToday() + ' 關。已經通過的關卡永遠可以重玩。' +
          'Daily rest is part of the method — replays are always allowed.</p>' +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:6px">📊 學習報告 Progress report</div>' +
        reportHTML() +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="toggle__title" style="margin-bottom:6px">🧹 重新開始 Reset</div>' +
        '<p class="muted" style="font-size:13px;font-weight:800;margin-bottom:10px">' +
          '會清除這個玩家的 XP、金幣、徽章與學習紀錄。This clears this player’s progress only.</p>' +
        '<button class="btn btn--danger btn--wide" data-action="reset">🗑️ 清除進度 Reset progress</button>' +
      '</div></section>' +

      '<p class="center muted" style="font-size:12px;font-weight:800;margin:20px 0 6px">' +
        '龍之華語 Chinese Quest · 繁體中文 · 離線可用 offline-friendly</p>';
  }

  function reportHTML() {
    var p = S.me();
    var m = S.mastery('all');
    var totalAnswers = p.stats.correct + p.stats.wrong;
    var acc = totalAnswers ? Math.round(p.stats.correct / totalAnswers * 100) : 0;
    return '<div class="resultrow"><span>遊戲場次 Games played</span><b>' + p.stats.games + '</b></div>' +
      '<div class="resultrow"><span>總答題 Answers</span><b>' + totalAnswers + '</b></div>' +
      '<div class="resultrow"><span>正確率 Accuracy</span><b>' + acc + '%</b></div>' +
      '<div class="resultrow"><span>連續正確最佳 Best combo</span><b>' + p.stats.bestCombo + '</b></div>' +
      '<div class="resultrow"><span>練習過的字詞 Words practised</span><b>' + S.studiedCount() + ' / ' + CQ.words.length + '</b></div>' +
      '<div class="resultrow"><span>熟練字詞 Mastered</span><b>' + m.known + '</b></div>' +
      '<div class="resultrow"><span>連續學習 Streak</span><b>🔥 ' + (p.streak.count || 0) + ' 天 (最佳 ' + (p.streak.best || 0) + ')</b></div>' +
      '<div class="resultrow"><span>對戰戰績 Duels W/L</span><b>' + p.stats.duelWins + ' / ' + p.stats.duelLosses + '</b></div>';
  }

  /* ======================================================= battle lobby == */
  function renderBattleSetup() {
    var me = S.me();
    var others = S.profiles().filter(function (p) { return p.id !== me.id; });
    var p2opts = others.map(function (p, i) {
      return '<button class="chip' + (i === 0 ? ' is-active' : '') + '" data-p2="' + p.id + '"><span class="chip__em">' + p.avatar + '</span>' + U.esc(p.name) + '</button>';
    }).join('') + '<button class="chip' + (others.length ? '' : ' is-active') + '" data-p2="guest"><span class="chip__em">🐼</span>訪客 Guest</button>';

    var tiers = Object.keys(Battle.tiers).map(function (k) {
      var t = Battle.tiers[k];
      return '<button class="gamecard" data-tier="' + k + '" style="--gc:' + (k === 'easy' ? '#12b886' : k === 'normal' ? '#f59f00' : '#e63946') + '">' +
        '<span class="gamecard__emoji">' + t.avatar + '</span>' +
        '<span class="gamecard__zh">' + U.esc(t.zh) + '</span>' +
        '<span class="gamecard__en">' + U.esc(t.en) + '</span>' +
        '<span class="gamecard__meta">💥 ' + t.dmg + ' · 🧠 ' + Math.round(t.acc * 100) + '%</span>' +
      '</button>';
    }).join('');

    U.$('#screen-battlesetup').innerHTML =
      '<div class="screenhead">' +
        '<button class="screenhead__back" data-nav="home">←</button>' +
        '<div style="flex:1"><div class="screenhead__title">⚔️ 龍之對戰 Dragon Battle</div>' +
        '<div class="screenhead__sub">先答對的人就攻擊對手 · first correct answer attacks</div></div>' +
      '</div>' +

      '<section class="section"><div class="section__head"><span class="section__title">🎯 選擇主題 Theme</span></div>' +
        '<div class="chips" id="battleThemes">' + themeChipsHTML(currentTheme, 'btheme') + '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="section__title">👥 兩人對戰 2-Player Duel</div>' +
        '<p class="muted" style="font-size:13px;font-weight:800;margin:6px 0 10px">' +
          '兩個小朋友用同一台裝置：左邊玩家按 <b>A S D F</b>，右邊玩家按 <b>J K L ;</b>，也可以直接點自己那一邊的按鈕。</p>' +
        '<div class="toggle__title" style="font-size:14px;margin-bottom:6px">玩家 2 是誰？ Who is Player 2?</div>' +
        '<div class="chips" id="p2opts" style="flex-wrap:wrap">' + p2opts + '</div>' +
        '<div class="btnrow" style="margin-top:14px">' +
          '<button class="btn btn--primary btn--wide btn--big" data-action="duel">⚔️ 開始對戰 Start duel</button>' +
        '</div>' +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="section__title">🤖 單人挑戰龍王 Battle the Dragon</div>' +
        '<p class="muted" style="font-size:13px;font-weight:800;margin:6px 0 10px">' +
          '一個人也可以對戰！先答對就攻擊龍王，答錯會被凍結一次。</p>' +
        '<div class="gamegrid">' + tiers + '</div>' +
      '</div></section>' +

      '<section class="section"><div class="card">' +
        '<div class="section__title">📜 對戰規則 Rules</div>' +
        '<ul style="font-size:14px;font-weight:800;color:#5b7089;line-height:1.9;margin-top:6px">' +
          '<li>⚡ 先答對的人 → 對手龍 −14~28 HP（連擊更痛）</li>' +
          '<li>❌ 答錯 → 這一題被凍結，不能搶答</li>' +
          '<li>🧊 兩人都凍結或時間到 → 這一題沒人得分</li>' +
          '<li>🏆 先把對手 HP 打到 0 就贏了！</li>' +
        '</ul>' +
      '</div></section>';
  }

  /* ============================================ four-skill results ======= */
  function finishSkills(res, strand) {
    el.lastStrand = strand.id;
    var xp = res.correct * 8 + 10;
    var coins = res.correct * 2 + 2;
    S.addXp(xp);
    S.addCoins(coins);
    S.me().stats.games++;
    S.markPlayed();
    var badges = S.evaluateBadges();
    var stars = U.stars(res.correct, res.items);

    modal(
      '<div class="resultstars">' + [0, 1, 2].map(function (i) {
        return '<span>' + (i < stars ? '⭐' : '☆') + '</span>';
      }).join('') + '</div>' +
      '<div class="modal__title">' + strand.emoji + ' ' + U.esc(strand.zh) + ' ' + U.esc(strand.en) + '</div>' +
      '<p class="center muted" style="font-weight:800;margin-top:4px">' + U.esc(strand.how) + '</p>' +
      '<div class="modal__body">' +
        '<div class="resultrow"><span>✅ 答對 Correct</span><b>' + res.correct + ' / ' + res.items + '</b></div>' +
        '<div class="resultrow"><span>⭐ XP</span><b>+' + xp + '</b></div>' +
        '<div class="resultrow"><span>🪙 金幣</span><b>+' + coins + '</b></div>' +
        '<div class="resultrow"><span>🔁 這一項練過 Practised</span><b>' + S.skillCount(strand.id) + ' 次</b></div>' +
      '</div>' +
      (badges.length ? '<div class="btnrow">' + badges.map(function (b) {
        return '<span class="pill pill--gold">' + b.emoji + ' 新徽章 ' + U.esc(b.zh) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn btn--primary" data-result="skill-again">🔁 再練一次</button>' +
        '<button class="btn btn--blue" data-action="exam">🎯 四項檢查</button>' +
        '<button class="btn btn--ghost" data-result="home">🏠 回首頁</button>' +
      '</div>');
    if (stars >= 2) { A.win(); FX.confetti({ count: 80, y: window.innerHeight * 0.3 }); } else A.pop();
  }

  function reportRow(st) {
    var ex = S.examToday();
    var b = (ex && ex.byStrand && ex.byStrand[st.id]) || { ok: 0, n: 0 };
    var n = b.n || 0;
    var pct = n ? (b.ok / n) * 100 : 0;
    return '<div class="reportrow">' +
      '<span class="reportrow__em">' + st.emoji + '</span>' +
      '<span class="reportrow__zh zh">' + st.zh + '</span>' +
      '<span class="reportrow__bar"><i style="width:' + pct + '%;background:' + st.color + '"></i></span>' +
      '<span class="reportrow__n">' + b.ok + ' / ' + n + '</span>' +
    '</div>';
  }

  function showExamReport() {
    var ex = S.examToday();
    if (!ex) return;
    modal(
      '<div class="modal__title">🎯 今日四項檢查報告</div>' +
      '<p class="center muted" style="font-weight:800">' + U.esc(S.me().name) + ' · ' + ex.day + '</p>' +
      '<div class="reportcard">' + CQ.strands.map(reportRow).join('') + '</div>' +
      '<div class="modal__body">' +
        '<div class="resultrow"><span>⭐ 總分 Score</span><b>' + ex.total + ' / ' + ex.items + '</b></div>' +
        '<div class="resultrow"><span>🏅 評等 Grade</span><b>' + CQ.ui.stars(ex.stars) + '</b></div>' +
        '<div class="resultrow"><span>📅 明天可以再測</span><b>一天一次</b></div>' +
      '</div>' +
      (ex.perfect ? '<p class="center" style="font-weight:900;color:#b8860b">🌟 四項全部答對！</p>' : '') +
      '<p class="center muted" style="font-size:12px;font-weight:800;margin-top:10px">' +
        '口說與書寫由自己或家長一起評分 · speaking and writing are self- or grown-up assessed</p>' +
      '<div class="btnrow" style="margin-top:14px">' +
        '<button class="btn btn--primary" data-result="exam-again">🔁 再練一次</button>' +
        '<button class="btn btn--ghost" data-result="home">🏠 回首頁</button>' +
      '</div>', { dismissible: true });
  }

  function finishExam(res) {
    var byStrand = res.byStrand || {};
    var perfect = CQ.strands.every(function (st) {
      var b = byStrand[st.id] || { ok: 0, n: 0 };
      return b.n > 0 && b.ok === b.n;
    });
    var stars = U.stars(res.correct, res.items);
    S.saveExam({
      byStrand: byStrand, total: res.correct, items: res.items,
      perfect: perfect, stars: stars, seconds: res.seconds
    });
    var xp = res.correct * 10 + 30 + (perfect ? 50 : 0);
    var coins = res.correct * 2 + 20;
    S.addXp(xp);
    S.addCoins(coins);
    S.me().stats.games++;
    S.markPlayed();
    var badges = S.evaluateBadges();
    FX.confetti({ count: 120, y: window.innerHeight * 0.28 });
    if (stars >= 2) A.win(); else A.pop();
    modal(
      '<div class="resultstars">' + [0, 1, 2].map(function (i) {
        return '<span>' + (i < stars ? '⭐' : '☆') + '</span>';
      }).join('') + '</div>' +
      '<div class="modal__title">' + (perfect ? '四項滿分！' : '今天的檢查完成了') + '</div>' +
      '<p class="center muted" style="font-weight:800">' + U.esc(S.me().name) + ' · ' + U.dayKey() + '</p>' +
      '<div class="reportcard">' + CQ.strands.map(reportRow).join('') + '</div>' +
      '<div class="modal__body">' +
        '<div class="resultrow"><span>⭐ 總分 Score</span><b>' + res.correct + ' / ' + res.items + '</b></div>' +
        '<div class="resultrow"><span>⭐ XP</span><b>+' + xp + '</b></div>' +
        '<div class="resultrow"><span>🪙 金幣</span><b>+' + coins + '</b></div>' +
        '<div class="resultrow"><span>🌙 下次檢查</span><b>明天 Tomorrow</b></div>' +
      '</div>' +
      (badges.length ? '<div class="btnrow">' + badges.map(function (b) {
        return '<span class="pill pill--gold">' + b.emoji + ' 新徽章 ' + U.esc(b.zh) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn btn--ghost" data-result="home">🏠 回首頁</button>' +
      '</div>', { dismissible: false });
  }

  /* ====================================================== adventure map == */
  function mountOrb(stage) {
    if (el.orb) { el.orb.destroy(); el.orb = null; }
    var cv = U.$('#orb3d');
    if (!cv) return;
    if (S.me().settings.graphics3d === false) { cv.classList.add('hidden'); return; }
    cv.classList.remove('hidden');
    el.orb = CQ3D.mount(cv, { size: 190, stage: stage, spin: 0.6, paused: false });
  }

  function levelMode(id) {
    return CQ.games.filter(function (g) { return g.id === id; })[0] || { emoji: '🎯' };
  }

  /* One level node on the map: a round badge on the road. */
  function mapNodeHTML(n, currentN) {
    var l = n.lvl;
    var stars = S.levelStars(l.n);
    var unlocked = S.isLevelUnlocked(l.n);
    var cur = unlocked && stars < 1 && l.n === currentN;
    var rest = unlocked && stars < 1 && !S.canPlayLevel(l.n);   // today's levels are used up
    var starHTML = '';
    for (var i = 0; i < 3; i++) starHTML += '<i class="cstar' + (i < stars ? ' cstar--on' : '') + '">★</i>';
    return '<button class="cmnode' + (l.boss ? ' cmnode--boss' : '') +
      (unlocked ? '' : ' cmnode--locked') + (cur ? ' cmnode--current' : '') +
      (stars >= 1 ? ' cmnode--done' : '') + (rest ? ' cmnode--rest' : '') + '" data-level="' + l.n + '"' +
      ' style="left:' + n.x + 'px;top:' + n.y + 'px"' +
      ' aria-label="第 ' + l.n + ' 關 · ' + U.esc(l.themeZh) + (l.boss ? ' BOSS' : '') +
      ' · ' + (unlocked ? stars + ' 顆星' : '未解鎖') + '">' +
      (cur ? '<span class="cmnode__me">' + S.me().avatar + '</span>' +
             '<span class="cmnode__flag">▼</span>' : '') +
      '<span class="cmnode__n">' + (unlocked ? l.n : '🔒') + '</span>' +
      '<span class="cmnode__badge">' + (rest ? '🌙' : (l.boss ? '👑' : levelMode(l.kind).emoji)) + '</span>' +
      '<span class="cmnode__stars">' + starHTML + '</span>' +
    '</button>';
  }

  /* A Candy-Crush style winding road down the screen: the travelled part of
     the road is lit up, the rest is dimmed, and the child's dragon sits on the
     level they are up to. Positions are computed in pixels from the container
     width so the road and the nodes always line up. */
  function renderLevels() {
    var prog = S.levelProgress();
    var host = U.$('#screen-levels');
    if (!host) return;

    var GAP = 114;          // vertical distance between two levels
    var WORLD = 168;        // extra space for a world signpost
    var TOP = 84;
    var XS = [50, 76, 50, 24];
    var DECO = ['🌳', '🌸', '⛰️', '🍄', '🌷', '🪨', '🌴', '🌈'];
    var nodes = [], signs = [], decos = [];
    var y = TOP, themeIndex = -1, lastTheme = null;

    CQ.levels.forEach(function (l, i) {
      if (l.theme !== lastTheme) {
        lastTheme = l.theme;
        themeIndex++;
        y += WORLD;
        var left = themeIndex % 2 === 0;
        signs.push({ x: left ? 26 : 74, y: y - 78, lvl: l });
        decos.push({ x: left ? 84 : 16, y: y - 52, e: DECO[themeIndex % DECO.length] });
        decos.push({ x: left ? 14 : 86, y: y + 26, e: DECO[(themeIndex + 3) % DECO.length] });
      }
      nodes.push({ x: l.boss ? 50 : XS[i % 4], y: y, lvl: l });
      y += GAP;
    });
    var totalH = y + 56;

    var W = host.clientWidth || 420;
    var px = function (pct) { return Math.round((pct / 100) * W); };
    nodes.forEach(function (n) { n.x = px(n.x); });

    var roads = '';
    for (var k = 0; k < nodes.length - 1; k++) {
      var a = nodes[k], b = nodes[k + 1];
      var my = Math.round((a.y + b.y) / 2);
      var d = 'M' + a.x + ' ' + a.y + 'C' + a.x + ' ' + my + ',' + b.x + ' ' + my + ',' + b.x + ' ' + b.y;
      var lit = S.levelStars(a.lvl.n) >= 1 ? ' road--done' : '';
      roads += '<path class="road' + lit + '" d="' + d + '"/>' +
               '<path class="roadline' + lit + '" d="' + d + '"/>';
    }

    host.innerHTML =
      '<div class="cmhead">' +
        '<div class="cmhead__top">' +
          '<button class="screenhead__back" data-nav="home" aria-label="back">←</button>' +
          '<div style="flex:1">' +
            '<div class="screenhead__title">🗺️ 冒險地圖</div>' +
            '<div class="screenhead__sub">通過 ' + prog.passed + ' / ' + prog.total +
              ' 關 · 下一關第 ' + prog.current + ' 關</div>' +
          '</div>' +
          '<button class="btn btn--sm btn--gold" data-level="' + prog.current + '">▶ 第 ' + prog.current + ' 關</button>' +
        '</div>' +
        '<div class="progressbar" style="margin:9px 0 0">' +
          '<i class="progressbar__fill" style="width:' + (prog.passed / prog.total * 100).toFixed(1) + '%"></i>' +
        '</div>' +
        '<div class="cmhead__stars"><span class="pill pill--gold">⭐ ' + prog.stars + ' / ' + (prog.total * 3) + '</span>' +
          '<span class="pill">🏁 ' + prog.passed + ' / ' + prog.total + '</span>' +
          '<span class="pill' + (S.levelLimit() && S.levelQuotaLeft() <= 0 ? ' pill--warn' : '') + '">' +
            (S.levelLimit() === 0 ? '🌙 不限關' : '🌙 今日剩 ' + S.levelQuotaLeft() + ' 關') + '</span>' +
          '<button class="pill" data-nav="rank">🏆 排行榜</button></div>' +
      '</div>' +
      '<div class="lvlmap" id="lvlmap" style="height:' + totalH + 'px">' +
        '<svg class="lvlsvg" width="' + W + '" height="' + totalH + '" viewBox="0 0 ' + W + ' ' + totalH + '" aria-hidden="true">' +
          roads +
        '</svg>' +
        signs.map(function (s) {
          return '<div class="cmsign" style="left:' + px(s.x) + 'px;top:' + s.y + 'px">' +
            '<span class="cmsign__em">' + s.lvl.emoji + '</span>' +
            '<b>' + U.esc(s.lvl.themeZh) + '</b><small>' + U.esc(s.lvl.themeEn) + '</small></div>';
        }).join('') +
        decos.map(function (d) {
          return '<span class="cmdeco" style="left:' + px(d.x) + 'px;top:' + d.y + 'px">' + d.e + '</span>';
        }).join('') +
        nodes.map(function (n) { return mapNodeHTML(n, prog.current); }).join('') +
      '</div>' +
      '<p class="center muted" style="font-size:13px;font-weight:800;margin:10px 0 22px">' +
        '每關至少一顆星 ⭐ 就解鎖下一關 · one star unlocks the next level</p>';

    if (!el.mapScrolled) {
      el.mapScrolled = true;
      var cur = U.$('#lvlmap .cmnode--current');
      if (cur && typeof cur.scrollIntoView === 'function') {
        try { cur.scrollIntoView({ block: 'center' }); } catch (e) { /* optional */ }
      }
    }
  }

  function launchLevel(n) {
    var lvl = CQ.levels[n - 1];
    if (!lvl) return;
    if (!S.isLevelUnlocked(n)) {
      A.wrong();
      FX.toast('🔒 先通過第 ' + (n - 1) + ' 關 · finish the level before');
      return;
    }
    if (!S.canPlayLevel(n)) {
      A.wrong();
      FX.toast('🌙 今天已經闖了 ' + S.levelLimit() + ' 關！<br>明天再來，先做四項檢查或讀故事吧 · come back tomorrow', 3200);
      return;
    }
    A.resume();
    el.activeLevel = n;
    if (lvl.kind === 'battle') { launchBattle({ mode: 'ai', tier: lvl.tier, theme: lvl.theme }); return; }
    Games.setHost(U.$('#gameHost'));
    show('game');
    Games.start(lvl.kind, { theme: lvl.theme, count: lvl.count });
  }

  /* Stars for a level, the coin bonus, and the unlock celebration. */
  function recordLevelResult(n, stars) {
    var lvl = CQ.levels[n - 1];
    if (!lvl) return null;
    var res = S.setLevelStars(n, stars);
    if (res.stars >= 1) S.markLevelCleared(n);          // spends one of today's levels
    var label = '🗺️ 第 ' + n + ' 關 · ' + U.esc(lvl.themeZh) + (lvl.boss ? ' · BOSS' : '') +
      '  ' + CQ.ui.stars(res.stars) + (res.bonus ? '  🪙+' + res.bonus : '');
    if (res.unlockedNext) {
      setTimeout(function () {
        A.win();
        FX.confetti({ count: 90, y: window.innerHeight * 0.3 });
        FX.toast('🔓 解鎖新關卡：第 ' + (n + 1) + ' 關！');
      }, 650);
    }
    return { label: label, stars: res.stars, nextUnlocked: res.unlockedNext, n: n };
  }

  /* ========================================================== ranking ==== */
  function renderRank() {
    var rows = S.leaderboard(rankScope);
    var medals = CQ.rank.medals;
    var myRank = 0;
    rows.forEach(function (r, i) { if (r.me) myRank = i + 1; });
    var metric = function (r) { return rankScope === 'week' ? r.weekXp : r.xp; };

    var podium = [1, 0, 2].map(function (i) {
      var r = rows[i];
      var h = i === 1 ? 96 : (i === 0 ? 66 : 46);
      if (!r) {
        return '<div class="podium__col podium__col--empty">' +
          '<div class="podium__av">➕</div><div class="podium__name">等你加入</div>' +
          '<div class="podium__block" style="height:' + h + 'px">' + (i + 1) + '</div></div>';
      }
      return '<div class="podium__col' + (r.me ? ' podium__col--me' : '') + '">' +
        '<div class="podium__medal">' + medals[i] + '</div>' +
        '<div class="podium__av">' + r.avatar + '</div>' +
        '<div class="podium__name">' + U.esc(r.name) + (r.me ? ' ↑' : '') + '</div>' +
        '<div class="podium__xp">' + metric(r) + ' XP</div>' +
        '<div class="podium__block" style="height:' + h + 'px">' + (i + 1) + '</div></div>';
    }).join('');

    var list = rows.map(function (r, i) {
      return '<div class="rankrow' + (r.me ? ' rankrow--me' : '') + '">' +
        '<span class="rankrow__pos">' + (i < 3 ? medals[i] : '#' + (i + 1)) + '</span>' +
        '<span class="rankrow__av">' + r.avatar + '</span>' +
        '<span class="rankrow__name">' + U.esc(r.name) +
          '<small>' + r.pet.emoji + ' ' + U.esc(r.pet.name) + '</small></span>' +
        '<span class="rankrow__meta">⭐' + r.stars + ' · 📚' + r.mastered + ' · 🔥' + r.streak + '</span>' +
        '<span class="rankrow__xp">' + metric(r) + '</span>' +
      '</div>';
    }).join('');

    U.$('#screen-rank').innerHTML =
      '<div class="screenhead"><div style="flex:1">' +
        '<div class="screenhead__title">🏆 龍之排行 Dragon Ranking</div>' +
        '<div class="screenhead__sub">' + U.esc(S.me().name) + ' 目前第 ' + myRank + ' 名 / 共 ' + rows.length +
          ' 位玩家 · 每週一重置週榜</div>' +
      '</div></div>' +
      '<div class="segmented" style="margin-bottom:12px">' +
        '<button data-rank="all" class="' + (rankScope === 'all' ? 'is-active' : '') + '">🏅 總排行 All time</button>' +
        '<button data-rank="week" class="' + (rankScope === 'week' ? 'is-active' : '') + '">📅 本週榜 This week</button>' +
      '</div>' +
      '<section class="section"><div class="rankstage">' +
        '<canvas class="trophy3d" id="trophy3d" width="170" height="170" aria-hidden="true"></canvas>' +
        '<div class="podium">' + podium + '</div>' +
      '</div></section>' +
      '<section class="section"><div class="ranklist">' + list + '</div></section>' +
      '<div class="btnrow" style="margin-bottom:22px">' +
        '<button class="btn btn--gold btn--big" data-poster="make">🖼️ 產生排行榜海報 Make poster</button>' +
      '</div>' +
      '<p class="center muted" style="font-size:12px;font-weight:800;margin-bottom:20px">' +
        '排行榜包含這台裝置上的所有玩家 · every player saved on this device</p>';

    if (el.trophy) { el.trophy.destroy(); el.trophy = null; }
    var tc = U.$('#trophy3d');
    if (tc && S.me().settings.graphics3d !== false) {
      el.trophy = CQ3D.mount(tc, { shape: 'trophy', palette: 'gold', size: 170, spin: 0.7, paused: false });
    }
  }

  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  /* Renders the shareable / printable ranking poster. */
  function drawPoster() {
    var W = CQ.rank.posterW, H = CQ.rank.posterH;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = null;
    try { c = cv.getContext && cv.getContext('2d'); } catch (e) { c = null; }
    if (!c) return null;

    var rows = S.leaderboard(rankScope);
    var medals = CQ.rank.medals;
    var metric = function (r) { return rankScope === 'week' ? r.weekXp : r.xp; };
    var bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#8ed7ff');
    bg.addColorStop(0.42, '#d6ecff');
    bg.addColorStop(1, '#ffe6bb');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    /* 3D decoration */
    [['gem', 'royal', 132, 336, 118], ['star', 'gold', 948, 300, 122],
      ['orb', 'jade', 118, 1180, 104], ['coin', 'gold', 962, 1140, 96]].forEach(function (d) {
      try {
        CQ3D.render(c, CQ3D.shape(d[0], d[1]), { cx: d[2], cy: d[3], scale: d[4], rotX: -0.28, rotY: 0.85 });
      } catch (e) { /* decoration only */ }
    });

    c.textAlign = 'center';
    c.fillStyle = '#12314f';
    c.font = '700 84px ' + FONT_ZH;
    c.fillText('龍之王者榜', W / 2, 148);
    c.font = '800 34px Nunito,system-ui,sans-serif';
    c.fillStyle = '#3f6a92';
    c.fillText('DRAGON RANKING · ' + (rankScope === 'week' ? 'THIS WEEK 本週' : 'ALL TIME 全部'), W / 2, 208);
    c.font = '700 26px ' + FONT_ZH;
    c.fillStyle = '#6d8cab';
    c.fillText(new Date().toLocaleDateString('zh-TW'), W / 2, 252);

    try {
      CQ3D.render(c, CQ3D.shape('trophy', 'gold'), { cx: W / 2, cy: 430, scale: 128, rotX: -0.18, rotY: 0.5 });
    } catch (e) {}

    /* podium */
    var base = 1010, cols = [
      { r: rows[1], x: 250, w: 240, h: 150, i: 1 },
      { r: rows[0], x: 420, w: 240, h: 240, i: 0 },
      { r: rows[2], x: 590, w: 240, h: 110, i: 2 }
    ];
    c.fillStyle = 'rgba(255,255,255,.55)';
    rrect(c, 150, base, 780, 34, 17);
    c.fill();

    cols.forEach(function (col) {
      var top = base - col.h;
      var grad = c.createLinearGradient(col.x, top, col.x, base);
      grad.addColorStop(0, col.i === 0 ? '#ffd977' : (col.i === 1 ? '#e6eef7' : '#f0c9a0'));
      grad.addColorStop(1, col.i === 0 ? '#e8a800' : (col.i === 1 ? '#b9c8d8' : '#cd9a68'));
      c.fillStyle = grad;
      rrect(c, col.x, top, col.w, col.h, 16);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)';
      rrect(c, col.x + 10, top + 8, col.w - 20, 18, 9);
      c.fill();

      c.textAlign = 'center';
      c.fillStyle = '#12314f';
      c.font = '800 46px Nunito,system-ui,sans-serif';
      c.fillText(String(col.i + 1), col.x + col.w / 2, top + col.h - 16);

      if (col.r) {
        c.font = '54px ' + FONT_EMOJI;
        c.fillText(col.r.avatar, col.x + col.w / 2, top - 66);
        c.font = '800 30px ' + FONT_ZH;
        c.fillStyle = '#12314f';
        c.fillText(col.r.name.slice(0, 8), col.x + col.w / 2, top - 24);
        c.font = '800 26px Nunito,system-ui,sans-serif';
        c.fillStyle = '#b8860b';
        c.fillText(metric(col.r) + ' XP', col.x + col.w / 2, top - 0);
        c.font = '34px ' + FONT_EMOJI;
        c.fillText(medals[col.i], col.x + col.w / 2, top + 58);
      } else {
        c.font = '800 26px ' + FONT_ZH;
        c.fillStyle = '#7b93aa';
        c.fillText('等你來挑戰', col.x + col.w / 2, top - 24);
      }
    });

    /* remaining ranks */
    c.textAlign = 'left';
    var y = 1120;
    rows.slice(3, 9).forEach(function (r, i) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.6)';
      rrect(c, 150, y - 34, 780, 54, 14);
      c.fill();
      c.fillStyle = '#12314f';
      c.font = '800 30px Nunito,system-ui,sans-serif';
      c.fillText('#' + (i + 4), 178, y + 4);
      c.font = '34px ' + FONT_EMOJI;
      c.fillText(r.avatar, 262, y + 6);
      c.font = '800 30px ' + FONT_ZH;
      c.fillText(r.name.slice(0, 10), 312, y + 4);
      c.textAlign = 'right';
      c.fillStyle = '#b8860b';
      c.fillText(metric(r) + ' XP', 900, y + 4);
      c.textAlign = 'left';
      y += 64;
    });

    c.textAlign = 'center';
    c.fillStyle = '#12314f';
    c.font = '800 32px ' + FONT_ZH;
    c.fillText('🐉 龍之華語 Chinese Quest', W / 2, H - 96);
    c.font = '700 24px Nunito,system-ui,sans-serif';
    c.fillStyle = '#4a6b8a';
    c.fillText('Traditional Chinese learning game · 繁體中文學習遊戲', W / 2, H - 56);

    return cv;
  }

  function posterAction(kind) {
    if (kind === 'close') { closeModal(); return; }
    var cv = el.posterCanvas || null;
    if (!cv) {
      cv = drawPoster();
      if (!cv) { A.wrong(); FX.toast('此裝置不支援海報 · poster not supported here'); return; }
      el.posterCanvas = cv;
    }
    if (kind === 'download') {
      var url = '';
      try { url = cv.toDataURL('image/png') || ''; } catch (e) { url = ''; }
      if (!url) { FX.toast('無法下載，請長按圖片儲存 · long-press the image instead'); return; }
      var a = document.createElement('a');
      a.href = url;
      a.download = 'chinese-quest-ranking.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      A.coin();
      FX.toast('⬇️ 海報已下載 Download started');
      return;
    }
    if (kind === 'print') { printPoster(cv); return; }

    var img = '';
    try { img = cv.toDataURL('image/png') || ''; } catch (e) { img = ''; }
    modal('<div class="modal__title">🖼️ 排行榜海報 Ranking poster</div>' +
      (img ? '<img class="poster" src="' + img + '" alt="ranking poster">'
           : '<p class="center muted" style="font-weight:800">此裝置無法預覽，但仍可列印</p>') +
      '<div class="btnrow" style="margin-top:14px">' +
        '<button class="btn btn--gold" data-poster="download">⬇️ 下載圖片 PNG</button>' +
        '<button class="btn btn--blue" data-poster="print">🖨️ 列印海報 Print</button>' +
        '<button class="btn btn--ghost" data-result="close">關閉</button>' +
      '</div>' +
      '<p class="center muted" style="font-size:12px;font-weight:800;margin-top:10px">' +
        '貼在教室牆上，讓大家來挑戰！· put it on the classroom wall!</p>');
  }

  function printPoster(cv) {
    var url = '';
    try { url = cv.toDataURL('image/png') || ''; } catch (e) { url = ''; }
    if (!url) { FX.toast('無法列印 Print unavailable'); return; }
    var area = U.$('#printArea');
    if (!area) { area = U.el('div'); area.id = 'printArea'; document.body.appendChild(area); }
    area.innerHTML = '<img src="' + url + '" alt="ranking poster">';
    setTimeout(function () { try { window.print(); } catch (e) {} }, 150);
  }

  /* ============================================================ results == */
  function applyRoundProgress(summary) {
    var p = S.me();
    p.stats.games++;
    p.stats.bestCombo = Math.max(p.stats.bestCombo, summary.bestCombo || 0);
    var total = summary.total || 0;
    if (total && summary.correct === total && !summary.wrong) p.stats.perfect++;
    if (summary.flag) p[summary.flag] = true;
    var prevBest = p.best[summary.gameId] || 0;
    p.best[summary.gameId] = Math.max(prevBest, summary.stars || 0);
    return S.markPlayed();
  }

  function finishRound(summary) {
    var lvl = el.activeLevel ? CQ.levels[el.activeLevel - 1] : null;
    var levelResult = lvl ? recordLevelResult(lvl.n, summary.stars || 0) : null;
    var streak = applyRoundProgress(summary);
    var xpRes = S.addXp(summary.xp || 0);
    S.addCoins(summary.coins || 0);
    var newBadges = S.evaluateBadges();

    var words = [];
    var seen = {};
    (summary.results || []).forEach(function (r) {
      if (!seen[r.zh]) { seen[r.zh] = 1; words.push(r); }
    });

    var html =
      '<div class="resultstars">' + [0, 1, 2].map(function (i) {
        return '<span>' + (i < summary.stars ? '⭐' : '☆') + '</span>';
      }).join('') + '</div>' +
      '<div class="modal__title">' + (summary.win === false ? '再接再厲！' : summary.stars >= 2 ? '太棒了！' : '完成了！') + '</div>' +
      (levelResult ? '<p class="center" style="font-weight:900;color:#7048e8">' + levelResult.label + '</p>' : '') +
      (xpRes.stageUp ? '<p class="center" style="font-weight:900;color:#b8860b">✨ 你的龍要進化了！Evolution!</p>' : '') +
      '<p class="center muted" style="font-weight:800;margin-top:4px">' +
        U.esc((CQ.games.filter(function (g) { return g.id === summary.gameId; })[0] || { zh: '' }).zh) +
        (summary.note ? ' · ' + U.esc(summary.note) : '') + '</p>' +
      '<div class="modal__body">' +
        '<div class="resultrow"><span>✅ 答對 Correct</span><b>' + summary.correct + ' / ' + summary.total + '</b></div>' +
        '<div class="resultrow"><span>🔥 最佳連擊 Best combo</span><b>x' + (summary.bestCombo || 0) + '</b></div>' +
        '<div class="resultrow"><span>⭐ 經驗 XP</span><b>+' + (summary.xp || 0) + '</b></div>' +
        '<div class="resultrow"><span>🪙 金幣 Coins</span><b>+' + (summary.coins || 0) + '</b></div>' +
        '<div class="resultrow"><span>📅 連續學習 Streak</span><b>🔥 ' + streak + ' 天</b></div>' +
      '</div>' +
      (words.length ? '<div class="toggle__title" style="font-size:14px">本局字詞 Words in this round</div>' +
        '<div class="reviewlist">' + words.map(function (r) {
          return '<span class="reviewchip' + (r.ok ? '' : ' bad') + '">' + (r.ok ? '✅' : '🔁') + ' ' + U.esc(r.zh) +
            '<small>' + U.esc(r.word.py) + '</small></span>';
        }).join('') + '</div>' : '') +
      (newBadges.length ? '<div class="btnrow" style="margin-top:14px">' + newBadges.map(function (b) {
        return '<span class="pill pill--gold">' + b.emoji + ' 新徽章 ' + U.esc(b.zh) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="btnrow" style="margin-top:18px">' +
        (levelResult && levelResult.nextUnlocked
          ? '<button class="btn btn--gold" data-result="nextlevel">▶️ 下一關 Next level</button>' : '') +
        '<button class="btn btn--primary" data-result="again">🔁 再玩一次</button>' +
        '<button class="btn btn--blue" data-result="' + (levelResult ? 'levels' : 'next') + '">' +
          (levelResult ? '🗺️ 關卡地圖' : '🎮 換遊戲') + '</button>' +
        '<button class="btn btn--ghost" data-result="home">🏠 回首頁</button>' +
      '</div>';

    modal(html, { dismissible: false });
    el.lastRound = summary;

    if (summary.stars >= 2) { A.win(); FX.confetti({ count: 90, y: window.innerHeight * 0.28 }); }
    else A.pop();
    if (newBadges.length) setTimeout(function () { A.coin(); FX.toast('🎖️ 新徽章 ' + newBadges[0].emoji + ' ' + newBadges[0].zh); }, 500);
    if (xpRes.stageUp) pendingEvolution = true;
    if (xpRes.dailyDone) setTimeout(function () { FX.toast('🎯 今日任務完成！+15 🪙'); }, 1200);
  }

  function evolutionModal() {
    var p = S.me();
    var st = PET_STAGES[S.stageOf(p.xp)];
    A.evolve();
    FX.confetti({ count: 140, y: window.innerHeight * 0.3 });
    modal(
      '<div class="resultstars"><span>✨</span></div>' +
      '<div class="modal__title">進化成功！Evolution!</div>' +
      '<div class="prompt" style="box-shadow:none;margin:10px 0">' +
        '<div class="prompt__emoji" style="font-size:96px">' + st.emoji + '</div>' +
        '<div class="prompt__text">' + U.esc(st.name) + '</div>' +
        '<div class="prompt__sub">' + U.esc(st.en) + '</div>' +
      '</div>' +
      '<p class="center" style="font-weight:900">你的龍長大了！繼續練習就會變成 🐉 龍王！</p>' +
      '<div class="btnrow" style="margin-top:16px"><button class="btn btn--primary" data-result="close">太棒了！</button></div>'
    );
  }

  /* -------------------------------------------------------- battle end -- */
  function finishBattle(res) {
    var me = S.me();
    var winner = res[res.winnerKey];
    var loser = res[res.winnerKey === 'p1' ? 'p2' : 'p1'];
    var iWon = winner.profileId === me.id;
    var rewards = [];

    [res.p1, res.p2].forEach(function (part) {
      if (!part.profileId) return;
      var prof = S.data.profiles[part.profileId];
      if (!prof) return;
      var won = part === winner;
      var xp = part.correct * CQ.config.xpPerCorrect + (won ? 40 : 10);
      var coins = part.correct * CQ.config.coinsPerCorrect + (won ? 20 : 0);
      prof.stats.games++;
      prof.stats.bestCombo = Math.max(prof.stats.bestCombo, part.bestCombo);
      if (won) prof.stats.duelWins++; else prof.stats.duelLosses++;
      S.addXpFor(part.profileId, xp);
      S.addCoinsFor(part.profileId, coins);
      S.markPlayedFor(part.profileId);
      rewards.push({ part: part, xp: xp, coins: coins, won: won, prof: prof });
    });

    var newBadges = S.evaluateBadges();
    var stageBefore = S.stageOf(me.xp - (rewards.filter(function (r) { return r.part.profileId === me.id; })[0] || { xp: 0 }).xp);

    function statBlock(part, isWinner, reward) {
      return '<div class="card" style="box-shadow:none;background:' + (isWinner ? '#eefbf3' : '#f7f9fc') + ';padding:12px;margin-bottom:8px">' +
        '<div class="row"><span style="font-size:30px">' + part.avatar + '</span>' +
          '<b style="font-size:17px">' + U.esc(part.name) + '</b>' +
          '<span class="spacer"></span>' + (isWinner ? '<span class="pill pill--good">🏆 勝利 Winner</span>' : '<span class="pill">💪 再加油</span>') + '</div>' +
        '<div class="resultrow"><span>✅ 答對 Correct</span><b>' + part.correct + '</b></div>' +
        '<div class="resultrow"><span>❌ 答錯 Wrong</span><b>' + part.wrong + '</b></div>' +
        '<div class="resultrow"><span>🔥 最佳連擊 Best combo</span><b>x' + part.bestCombo + '</b></div>' +
        '<div class="resultrow"><span>❤️ 剩餘 HP</span><b>' + Math.max(0, part.hp) + ' / 100</b></div>' +
        (reward ? '<div class="resultrow"><span>⭐ XP / 🪙 Coins</span><b>+' + reward.xp + ' / +' + reward.coins + '</b></div>' : '') +
      '</div>';
    }

    var lvlB = el.activeLevel ? CQ.levels[el.activeLevel - 1] : null;
    var levelResultB = lvlB
      ? recordLevelResult(lvlB.n, res.winnerKey === 'p1' ? 3 : (Math.max(0, res.p2.hp) <= 30 ? 1 : 0))
      : null;
    modal(
      '<div class="resultstars"><span>' + (iWon ? '🏆' : '⚔️') + '</span></div>' +
      '<div class="modal__title">' + (iWon ? '你贏了！You win!' : winner.name + ' 贏了！') + '</div>' +
      (levelResultB ? '<p class="center" style="font-weight:900;color:#7048e8">' + levelResultB.label + '</p>' : '') +
      '<p class="center muted" style="font-weight:800;margin-top:4px">' +
        '共 ' + res.rounds + ' 回合 · ' + res.rounds + ' rounds' +
        (res.mode === 'duo' ? ' · 兩人對戰 2-player duel' : ' · 挑戰龍王 vs AI') + '</p>' +
      '<div class="modal__body">' +
        statBlock(res.p1, res.winnerKey === 'p1', rewards.filter(function (r) { return r.part === res.p1; })[0]) +
        statBlock(res.p2, res.winnerKey === 'p2', rewards.filter(function (r) { return r.part === res.p2; })[0]) +
      '</div>' +
      (newBadges.length ? '<div class="btnrow">' + newBadges.map(function (b) {
        return '<span class="pill pill--gold">' + b.emoji + ' 新徽章 ' + U.esc(b.zh) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="btnrow" style="margin-top:16px">' +
        (levelResultB && levelResultB.nextUnlocked
          ? '<button class="btn btn--gold" data-result="nextlevel">▶️ 下一關</button>' : '') +
        '<button class="btn btn--primary" data-result="rematch">🔁 再戰一場</button>' +
        '<button class="btn btn--ghost" data-result="home">🏠 回首頁</button>' +
      '</div>',
      { dismissible: false }
    );

    if (iWon) { A.win(); FX.confetti({ count: 130, y: window.innerHeight * 0.3 }); }
    else A.lose();

    if (S.stageOf(me.xp) > stageBefore) pendingEvolution = true;
  }

  /* ============================================================= routing = */
  function setGameChrome(g, themeId) {
    el.currentGameId = g.id;
    var lv = el.activeLevel ? CQ.levels[el.activeLevel - 1] : null;
    U.$('#gameTitle').textContent = (lv ? '第 ' + lv.n + ' 關 · ' : '') + g.emoji + ' ' + g.zh;
    var t = themeId && themeId !== 'all' ? CQ.themes.filter(function (x) { return x.id === themeId; })[0] : null;
    U.$('#gameSub').textContent = g.en + (t ? ' · ' + t.emoji + ' ' + t.zh : ' · ✨ 全部 All');
  }

  function launchGame(gameId) {
    el.activeLevel = null;                       // free play, not a level
    if (gameId === 'battle') { show('battlesetup'); return; }
    A.resume();
    Games.setHost(U.$('#gameHost'));
    show('game');
    Games.start(gameId, { theme: currentTheme });
  }

  function launchBattle(cfg) {
    A.resume();
    Battle.setHost(U.$('#battleHost'));
    show('battle');
    U.$('#gameTitle2').textContent = (el.activeLevel ? '第 ' + el.activeLevel + ' 關 · ' : '') +
      (cfg.mode === 'duo' ? '⚔️ 兩人對戰 2-Player' : '⚔️ 挑戰龍王 vs AI');
    Battle.start(cfg);
  }

  function startDuel(p2) {
    el.activeLevel = null;
    launchBattle({ mode: 'duo', opponentId: p2 === 'guest' ? null : p2, theme: currentTheme });
  }

  /* ============================================================ onboarding */
  function renderOnboarding(isAdd) {
    onboardingMode = isAdd ? 'add' : 'new';
    var avatars = CQ.config.accentAvatars.slice(0, 8);
    U.$('#screen-onboard').innerHTML =
      '<div class="onboard">' +
        '<div class="prompt__emoji" style="font-size:86px;text-align:center">🐣</div>' +
        '<h1 class="onboard__title">龍之華語<br><span style="font-size:22px;color:#5b7089">Chinese Quest</span></h1>' +
        '<p class="onboard__sub">' + (isAdd ? '新增一位玩家 Add another player' : '一起來學繁體中文！Learn Traditional Chinese by playing!') + '</p>' +
        '<div class="card" style="margin-top:16px">' +
          '<div class="toggle__title" style="margin-bottom:8px">✏️ 你的名字 Your name</div>' +
          '<input class="field" id="obName" maxlength="14" placeholder="例如 Amy / 小明">' +
          '<div class="toggle__title" style="margin:16px 0 6px">🐲 選一個龍寶寶 Pick your dragon</div>' +
          '<div class="avataropts" id="obAvatars">' + avatars.map(function (a, i) {
            return '<button class="avataropt' + (i === 0 ? ' is-active' : '') + '" data-obavatar="' + a + '">' + a + '</button>';
          }).join('') + '</div>' +
          '<div class="toggle__title" style="margin:8px 0 6px">🎚️ 難度 Difficulty</div>' +
          '<div class="segmented" id="obDiff">' +
            '<button data-obdiff="easy" class="is-active">簡單<br><small>Easy</small></button>' +
            '<button data-obdiff="normal">普通<br><small>Normal</small></button>' +
            '<button data-obdiff="hard">困難<br><small>Hard</small></button>' +
          '</div>' +
          '<div class="toggle__title" style="margin:16px 0 6px">🔤 閱讀輔助 Reading aid</div>' +
          '<div class="segmented" id="obAid">' +
            '<button data-owaid="pinyin" class="is-active">拼音<br><small>Pinyin</small></button>' +
            '<button data-owaid="zhuyin">注音<br><small>Zhuyin</small></button>' +
            '<button data-owaid="both">兩者<br><small>Both</small></button>' +
          '</div>' +
          '<div class="btnrow" style="margin-top:20px">' +
            '<button class="btn btn--primary btn--wide btn--big" data-action="obstart">🚀 開始冒險 Start!</button>' +
          '</div>' +
        '</div>' +
        (isAdd ? '<div class="btnrow" style="margin-top:12px"><button class="btn btn--ghost" data-action="obcancel">取消 Cancel</button></div>' : '') +
        '<p class="center muted" style="font-size:12px;font-weight:800;margin-top:14px">' +
          '進度會存在這台裝置的瀏覽器裡 · progress is saved in this browser</p>' +
      '</div>';
    el.obAvatar = avatars[0];
    el.obDiff = 'easy';
    el.obAid = 'pinyin';
  }

  function commitOnboarding() {
    var name = (U.$('#obName').value || '').trim() || '小冒險家';
    if (onboardingMode === 'add') {
      S.addProfile(name, el.obAvatar);
    } else {
      var p = S.me();
      p.name = name;
      p.avatar = el.obAvatar;
    }
    var prof = S.me();
    prof.settings.difficulty = el.obDiff;
    prof.settings.pinyin = (el.obAid === 'pinyin' || el.obAid === 'both');
    prof.settings.zhuyin = (el.obAid === 'zhuyin' || el.obAid === 'both');
    S.data.freshInstall = false;
    S.saveNow();
    A.resume();
    A.win();
    FX.confetti({ count: 80, y: window.innerHeight * 0.3 });
    show('home');
  }

  /* ============================================================== events = */
  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var nav = t.closest('[data-nav]');
    if (nav) {
      A.tap();
      if (el.current === 'game') Games.stop();
      if (el.current === 'battle') Battle.stop();
      if (el.current === 'skill' || el.current === 'exam' || el.current === 'story') Skills.stop();
      closeModal();
      show(nav.dataset.nav);
      return;
    }

    var act = t.closest('[data-action]');
    if (act) { handleAction(act.dataset.action, act); return; }

    var res = t.closest('[data-result]');
    if (res) { handleResult(res.dataset.result); return; }

    // the game and battle screens are owned by their engines
    if (el.current === 'game' || el.current === 'battle') return;

    var lv = t.closest('[data-level]');
    if (lv) { A.tap(); launchLevel(+lv.dataset.level); return; }

    var sk = t.closest('[data-skill]');
    if (sk) {
      A.tap();
      el.activeLevel = null;
      U.$('#skillTitle').textContent = CQ.strands.filter(function (x) { return x.id === sk.dataset.skill; })[0].zh + ' 練習';
      show('skill');
      Skills.practice(sk.dataset.skill, currentTheme);
      return;
    }

    var lid = t.closest('[data-limit]');
    if (lid) { A.tap(); S.me().settings.levelLimit = +lid.dataset.limit; S.saveNow(); renderSettings(); return; }

    var sc = t.closest('[data-story-id]');
    if (sc) { A.tap(); show('story'); Skills.openStory(sc.dataset.storyId); return; }

    var ltb = t.closest('[data-ltab]');
    if (ltb) { A.tap(); learnTab = ltb.dataset.ltab; renderLearn(); return; }

    var rk = t.closest('[data-rank]');
    if (rk) { A.tap(); rankScope = rk.dataset.rank; el.posterCanvas = null; renderRank(); return; }

    var po = t.closest('[data-poster]');
    if (po) { posterAction(po.dataset.poster); return; }

    var g = t.closest('[data-game]');
    if (g) { A.tap(); launchGame(g.dataset.game); return; }

    var th = t.closest('[data-theme]');
    if (th) { A.tap(); currentTheme = th.dataset.theme; renderHome(); return; }

    var lt = t.closest('[data-ltheme]');
    if (lt) { A.tap(); learnFilter = lt.dataset.ltheme; renderLearn(); return; }

    var bt = t.closest('[data-btheme]');
    if (bt) { A.tap(); currentTheme = bt.dataset.btheme; renderBattleSetup(); return; }

    var wc = t.closest('[data-word]');
    if (wc) { A.tap(); openWord(wc.dataset.word); return; }

    var det = t.closest('[data-detail]');
    if (det) { handleDetail(det.dataset.detail); return; }

    var shop = t.closest('[data-shop]');
    if (shop) { buyOrEquip(shop.dataset.shop); return; }

    var p2 = t.closest('[data-p2]');
    if (p2) {
      A.tap();
      U.$$('#p2opts .chip').forEach(function (n) { n.classList.toggle('is-active', n === p2); });
      return;
    }

    var tier = t.closest('[data-tier]');
    if (tier) { A.tap(); el.activeLevel = null; launchBattle({ mode: 'ai', tier: tier.dataset.tier, theme: currentTheme }); return; }

    var dff = t.closest('[data-diff]');
    if (dff) { A.tap(); S.me().settings.difficulty = dff.dataset.diff; S.saveNow(); renderSettings(); return; }

    var tg = t.closest('[data-toggle]');
    if (tg) {
      var key = tg.dataset.toggle;
      var s = S.me().settings;
      s[key] = !s[key];
      if (key === 'sound') A.enabled = s.sound;
      if (key === 'graphics3d') CQ3D.setEnabled(s.graphics3d);
      S.saveNow();
      A.tap();
      if (key === 'speech' && s.speech) SP.say('你好');
      renderSettings();
      return;
    }

    var av = t.closest('[data-avatar]');
    if (av) { S.me().avatar = av.dataset.avatar; S.saveNow(); A.pop(); renderSettings(); return; }

    var oba = t.closest('[data-obavatar]');
    if (oba) {
      el.obAvatar = oba.dataset.obavatar;
      U.$$('#obAvatars .avataropt').forEach(function (n) { n.classList.toggle('is-active', n === oba); });
      A.pop();
      return;
    }
    var obd = t.closest('[data-obdiff]');
    if (obd) {
      el.obDiff = obd.dataset.obdiff;
      U.$$('#obDiff button').forEach(function (n) { n.classList.toggle('is-active', n === obd); });
      A.tap(); return;
    }
    var oba2 = t.closest('[data-owaid]');
    if (oba2) {
      el.obAid = oba2.dataset.owaid;
      U.$$('#obAid button').forEach(function (n) { n.classList.toggle('is-active', n === oba2); });
      A.tap(); return;
    }

    var pl = t.closest('[data-player]');
    if (pl) { A.tap(); S.setActive(pl.dataset.player); show('home'); return; }
  }

  function handleAction(action, node) {
    var me = S.me();
    switch (action) {
      case 'quickplay': A.tap(); startCustomRound(S.pickWords(12, currentTheme)); break;
      case 'exam':
        if (S.examToday()) { showExamReport(); break; }
        A.tap();
        el.activeLevel = null;
        show('exam');
        Skills.exam();
        break;
      case 'testvoice':
        if (SP.hasChinese()) { SP.say('你好，我是你的中文小老師'); FX.toast('🔊 播放中…'); }
        else { FX.toast('⚠️ 這個裝置沒有中文語音，已用拼音代替'); SP.say('Ni hao!', { lang: 'en' }); }
        break;
      case 'savename': {
        var v = (U.$('#nameField').value || '').trim();
        if (v) { me.name = v; S.saveNow(); A.pop(); FX.toast('✅ 名字已更新'); renderSettings(); }
        break;
      }
      case 'addplayer': renderOnboarding(true); show('onboard'); break;
      case 'obcancel': show('settings'); break;
      case 'obstart': commitOnboarding(); break;
      case 'delplayer':
        modal('<div class="modal__title">刪除玩家？Delete player?</div>' +
          '<p class="center muted" style="font-weight:800;margin:10px 0">' + U.esc(me.name) + ' 的所有進度都會消失。</p>' +
          '<div class="btnrow"><button class="btn btn--danger" data-confirm="del">刪除 Delete</button>' +
          '<button class="btn btn--ghost" data-result="close">取消</button></div>');
        break;
      case 'reset':
        modal('<div class="modal__title">清除進度？Reset progress?</div>' +
          '<p class="center muted" style="font-weight:800;margin:10px 0">會清除 ' + U.esc(me.name) + ' 的 XP、金幣、徽章與學習紀錄。</p>' +
          '<div class="btnrow"><button class="btn btn--danger" data-confirm="reset">清除 Reset</button>' +
          '<button class="btn btn--ghost" data-result="close">取消 Cancel</button></div>');
        break;
      case 'duel': {
        var sel = U.$('#p2opts .chip.is-active');
        startDuel(sel ? sel.dataset.p2 : 'guest');
        break;
      }
      case 'howto': {
        var game = CQ.games.filter(function (x) { return x.id === el.currentGameId; })[0];
        if (!game) break;
        A.pop();
        FX.toast('🔊 ' + game.howZh + '<br><small>' + game.how + '</small>', 3600);
        SP.say(game.how, { lang: 'en' });
        setTimeout(function () { SP.say(game.howZh, { rate: 0.82 }); }, 3000);
        break;
      }
      case 'backhome': show('home'); break;
    }
  }

  function handleDetail(d) {
    switch (d) {
      case 'close': closeModal(); break;
      case 'prev': stepWord(-1); break;
      case 'next': stepWord(1); break;
      case 'practice': practiceOne(); break;
      case 'speak': { var w = learnWords()[detailIndex]; if (w) { SP.sayWord(w, 2); A.pop(); } break; }
      case 'slow': { var w2 = learnWords()[detailIndex]; if (w2) SP.say(w2.zh, { rate: 0.45 }); break; }
    }
  }

  function handleResult(r) {
    var last = el.lastRound;
    closeModal();
    if (r === 'again' && last) {
      if (el.activeLevel) launchLevel(el.activeLevel);            // replay this level
      else Games.start(last.gameId, { theme: currentTheme });
    } else if (r === 'nextlevel') {
      var nx = (el.activeLevel || 0) + 1;
      Games.stop(); Battle.stop();
      launchLevel(nx);
    } else if (r === 'levels') { Games.stop(); Battle.stop(); show('levels'); }
    else if (r === 'skill-again') { show('skill'); Skills.practice(el.lastStrand || 'listen', currentTheme); }
    else if (r === 'exam-again') { show('exam'); Skills.exam(); }
    else if (r === 'next') { Games.stop(); show('home'); }
    else if (r === 'home') { Games.stop(); Battle.stop(); el.activeLevel = null; show('home'); }
    else if (r === 'rematch') { Battle.stop(); show('battlesetup'); }
    setTimeout(flushEvolution, 320);
  }

  function onKey(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (el.current === 'game' && Games.live) {
      var k = e.key;
      if (k === ' ' || /^[0-9]$/.test(k) || k === 'Backspace') e.preventDefault();
      Games.handleKey(k);
    }
  }

  function onConfirm(e) {
    var c = e.target.closest('[data-confirm]');
    if (!c) return;
    if (c.dataset.confirm === 'reset') {
      S.resetProfile(S.me().id);
      closeModal(); A.pop(); FX.toast('🧹 已清除，重新開始！'); show('home');
    }
    if (c.dataset.confirm === 'del') {
      S.removeProfile(S.me().id);
      closeModal(); A.pop(); FX.toast('已刪除玩家'); show('home');
    }
  }

  /* ================================================================ init = */
  function init() {
    if (App._booted) return;
    App._booted = true;
    buildSky();
    S.load();
    A.enabled = S.me().settings.sound;
    CQ3D.setEnabled(S.me().settings.graphics3d !== false);
    currentTheme = S.me().settings.theme || 'all';
    learnFilter = 'all';
    Games.setHost(U.$('#gameHost'));
    Battle.setHost(U.$('#battleHost'));

    document.addEventListener('click', function (e) {
      onConfirm(e);
      if (e.target.closest('[data-confirm]')) return;
      // the battle arena and the live game engine get first refusal
      if (el.current === 'battle' && Battle.onClick(e.target)) return;
      if (el.current === 'game' && Games.live && Games.handleClick(e.target)) return;
      onClick(e);
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', function () {
      if (el.current !== 'levels') return;
      clearTimeout(el.mapT);
      el.mapT = setTimeout(function () { el.mapScrolled = true; renderLevels(); }, 180);
    });
    document.addEventListener('touchstart', function () { A.resume(); }, { once: true, passive: true });
    document.addEventListener('pointerdown', function () { A.resume(); }, { once: true });

    if (S.data.freshInstall) { renderOnboarding(false); show('onboard'); }
    else show('home');

  }

  /* ============================================================= exports = */
  return {
    init: init,
    show: show,
    finishRound: finishRound,
    finishBattle: finishBattle,
    setGameChrome: setGameChrome,
    launchGame: launchGame,
    renderHome: renderHome,
    renderSettings: renderSettings,
    renderBattleSetup: renderBattleSetup,
    renderLevels: renderLevels,
    renderRank: renderRank,
    showCard: modal,
    finishSkills: finishSkills,
    finishExam: finishExam,
    showExamReport: showExamReport,
    launchLevel: launchLevel,
    drawPoster: drawPoster,
    closeModal: closeModal,
    get theme() { return currentTheme; }
  };
})();

document.addEventListener('DOMContentLoaded', function () { App.init(); });
