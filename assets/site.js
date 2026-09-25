/* ============================================================
   Local Impact Design飯南 — 全ページ共通スクリプト
   ------------------------------------------------------------
   ビルド工程を持たないため、ES Modules ではなくクラシック
   スクリプトとして書き、グローバル window.LID に公開する。
   ============================================================ */
(function () {
  'use strict';

  /* ─── タグ設定 ───
     タグと事業分野の対応は data/tags.json が唯一の情報源。
     コード側には持たない（編集ツール・一覧ページ・サービスページが
     同じファイルを見るため、増やすときは tags.json だけを直せばよい）。 */
  var tagsPromise = null;

  function loadTags() {
    if (!tagsPromise) {
      tagsPromise = fetchJSON('data/tags.json').then(function (cfg) {
        if (!cfg || !Array.isArray(cfg.tags)) throw new Error('tags.json の形式が不正です');
        return cfg;
      }).catch(function (err) {
        console.error('tags.json を読み込めませんでした', err);
        tagsPromise = null;                       // 次回の呼び出しで再試行できるようにする
        return { areas: [], tags: [] };           // 空設定で返し、ページ全体は壊さない
      });
    }
    return tagsPromise;
  }

  /* 設定に載っているタグ名の配列（記載順） */
  function tagNames(cfg) {
    return (cfg && cfg.tags ? cfg.tags : []).map(function (t) { return t.name; });
  }

  /* 事業分野名 → その分野に属するタグ名の配列 */
  function tagsOfArea(cfg, area) {
    return (cfg && cfg.tags ? cfg.tags : [])
      .filter(function (t) { return t.area === area; })
      .map(function (t) { return t.name; });
  }

  /* 設定に載っていないタグを洗い出す（データ側の書き間違いに気づくため） */
  function unknownTags(cfg, reports) {
    var known = tagNames(cfg);
    var seen = {};
    (reports || []).forEach(function (r) {
      if (r && r.tag && known.indexOf(r.tag) === -1) seen[r.tag] = (seen[r.tag] || 0) + 1;
    });
    return Object.keys(seen).map(function (name) { return { name: name, count: seen[name] }; });
  }

  /* ─── パス解決 ───
     pages/ 配下のページだけがサブディレクトリにあるため、
     各ページの <html data-root="../"> を見て相対パスを組み立てる。 */
  function root() {
    return document.documentElement.getAttribute('data-root') || './';
  }

  /* データ内の「/pages/report.html?id=16」のようなサイト内パスを、実際の配信位置に合わせて読み替える。
     ドメイン直下（lid-iinan.com/）でも、サブディレクトリ（lid-admin.github.io/corporate/）でも
     正しい場所を指すようにするため。
     ・「/」1つで始まるサイト内パス → 先頭の「/」を外し root() を前に付ける
     ・https:// などの外部URL、「//」始まり、空文字 → そのまま返す */
  function siteUrl(path) {
    var p = String(path == null ? '' : path);
    if (p.charAt(0) === '/' && p.charAt(1) !== '/') {
      return root() + p.slice(1);
    }
    return p;
  }

  function fetchJSON(relPath) {
    return fetch(root() + relPath).then(function (res) {
      if (!res.ok) throw new Error('fetch failed: ' + relPath + ' (' + res.status + ')');
      return res.json();
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* style: 'dot' → 2026.09.07 ／ 'ja' → 2026年9月7日（月日はゼロ詰めしない） */
  function formatDate(str, style) {
    if (!str) return '';
    var parts = String(str).split('-');
    if (style === 'ja') {
      return parts[0] + '年' + parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
    }
    return parts.join('.');
  }

  /* reports.json は日付順に並んでいないため、表示側で必ず整列する */
  function sortByDateDesc(list) {
    return list.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  /* ─── レポート本文の変換 ───
     処理順を厳守する。順序を誤ると自動リンクが壊れる。
       ① エスケープ（& を最初に実体参照化）
       ② 空行で段落分割
       ③ 段落内の改行を <br>
       ④ エスケープ済み文字列に自動リンクを適用
     ④の終端条件 [^\s<] の「<」は必須。③で <br> が入るため、
     これが無いと "https://x.com<br>next" の <br> 以降まで
     href に飲み込まれる。削らないこと。 */
  function bodyToHtml(text) {
    var escaped = escapeHtml(String(text == null ? '' : text).trim());
    return escaped.split('\n\n').map(function (para) {
      var withBr = para.replace(/\n/g, '<br>');
      var withLinks = withBr.replace(/(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      return '<p>' + withLinks + '</p>';
    }).join('');
  }

  /* ─── フォーカストラップ ───
     開いた領域の内側でTabを循環させ、Escで閉じ、閉じたら
     開いた要素へフォーカスを戻す。戻り値は解除関数。
     元は問い合わせモーダル内にあった実装を、コンテナを
     引数で受ける形に一般化したもの。 */
  function trapFocus(container, onEscape) {
    var opener = document.activeElement;

    function getFocusable() {
      return Array.prototype.slice.call(container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        if (typeof onEscape === 'function') onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      var items = getFocusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeydown);

    return function release(restoreFocus) {
      document.removeEventListener('keydown', onKeydown);
      if (restoreFocus !== false && opener && typeof opener.focus === 'function') {
        opener.focus();
      }
    };
  }

  /* ─── ヘッダーのナビゲーション ─── */
  function initNav() {
    var header = document.querySelector('.site-header');
    var btn = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!header || !btn || !nav) return;

    var release = null;

    function setOpen(open) {
      header.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');

      if (open) {
        release = trapFocus(nav, function () { setOpen(false); });
      } else if (release) {
        release();
        release = null;
      }
    }

    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // CSS側のナビ切替点（max-width: 1023px）と合わせる
    var mql = window.matchMedia('(min-width: 1024px)');
    mql.addEventListener('change', function (e) {
      if (e.matches && btn.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
  }

  /* ─── 事業分野・執筆者の照合 ─── */
  function areaToTags(cfg, area) {
    return tagsOfArea(cfg, area);
  }

  /* author は「宮本雅也・君塚月奈」と「宮本・和田」の2形式が混在するため、
     members.json の matchKeys（氏名と姓の両方）で部分一致を取る。 */
  function matchAuthor(report, matchKeys) {
    if (!report || !report.author || !matchKeys) return false;
    return matchKeys.some(function (key) {
      return report.author.indexOf(key) !== -1;
    });
  }

  /* ─── レポートカード ─── */
  function buildReportCard(report, variant) {
    var placeholder = root() + 'images/placeholder.svg';
    var src = root() + report.image;
    var cls = 'report-card' + (variant ? ' ' + variant : '');
    var lazy = variant === 'featured' ? '' : ' loading="lazy"';

    return '' +
      '<a class="' + cls + '" href="' + root() + 'pages/report.html?id=' + report.id + '">' +
      '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(report.title) + '"' + lazy +
      ' onerror="this.onerror=null;this.src=\'' + placeholder + '\'">' +
      '<div class="card-body">' +
      '<div class="card-meta">' +
      '<span class="card-date">' + formatDate(report.date, 'dot') + '</span>' +
      '<span class="tag">' + escapeHtml(report.tag) + '</span>' +
      '</div>' +
      '<h3>' + escapeHtml(report.title) + '</h3>' +
      '<p>' + escapeHtml(report.summary) + '</p>' +
      '<span class="card-link">続きを読む →</span>' +
      '</div></a>';
  }

  /* ─── 通知表示 ─── */
  function renderNotice(el, message, isError) {
    if (!el) return;
    el.innerHTML = '<div class="notice' + (isError ? ' is-error' : '') + '">' +
      escapeHtml(message) + '</div>';
  }

  /* ─── レポート一覧（reports.html） ───
     URLパラメータを読み、member → area → tag の優先順で1つだけ適用する。
     絞り込みの結果とラベルを呼び出し側へ渡す。 */
  function initReportList(options) {
    var opts = options || {};
    var listEl = document.getElementById(opts.listId || 'report-list');
    var moreWrap = document.getElementById(opts.moreWrapId || 'report-more');
    var moreBtn = document.getElementById(opts.moreBtnId || 'report-more-btn');
    var step = opts.step || 12;

    if (!listEl) return;

    Promise.all([
      fetchJSON('data/reports.json'),
      fetchJSON('data/members.json').catch(function () { return []; }),
      loadTags()
    ]).then(function (results) {
      var reports = results[0];
      var members = results[1];
      var cfg = results[2];
      if (!Array.isArray(reports)) throw new Error('reports.json が配列ではありません');

      var params = new URLSearchParams(location.search);
      var memberId = params.get('member');
      var area = params.get('area');
      var tag = params.get('tag');

      var filtered = sortByDateDesc(reports.filter(function (r) {
        return r && r.id != null && r.title;
      }));
      var label = null;
      var kind = null;

      // 優先順位: member → area → tag。複数指定されても1つだけ適用する
      if (memberId) {
        kind = 'member';
        var member = members.filter(function (m) { return m.id === memberId; })[0];
        label = member ? member.name : memberId;
        var keys = member ? member.matchKeys : [];
        filtered = filtered.filter(function (r) { return matchAuthor(r, keys); });
      } else if (area) {
        kind = 'area';
        label = area;
        var tags = areaToTags(cfg, area);
        filtered = filtered.filter(function (r) { return tags.indexOf(r.tag) !== -1; });
      } else if (tag) {
        kind = 'tag';
        label = tag;
        filtered = filtered.filter(function (r) { return r.tag === tag; });
      }

      var shown = 0;

      function updateMore() {
        if (!moreWrap || !moreBtn) return;
        var rest = filtered.length - shown;
        if (rest <= 0) {
          moreWrap.hidden = true;
          return;
        }
        moreWrap.hidden = false;
        moreBtn.textContent = 'もっと見る（残り' + rest + '件）';
      }

      function append(count) {
        var slice = filtered.slice(shown, shown + count);
        listEl.insertAdjacentHTML('beforeend',
          slice.map(function (r) { return buildReportCard(r, 'list'); }).join(''));
        shown += slice.length;
        updateMore();
      }

      listEl.innerHTML = '';

      // 0件・未知の値はエラーではなく「該当なし」として扱う
      if (!filtered.length) {
        listEl.classList.add('is-empty');
        if (moreWrap) moreWrap.hidden = true;
        if (typeof opts.onEmpty === 'function') opts.onEmpty(kind, label);
        return;
      }

      listEl.classList.remove('is-empty');
      append(step);

      if (moreBtn) {
        moreBtn.addEventListener('click', function () { append(step); });
      }

      if (typeof opts.onRender === 'function') {
        opts.onRender({
          kind: kind, label: label, count: filtered.length,
          total: reports.length, reports: reports, tagConfig: cfg
        });
      }
    }).catch(function (err) {
      console.error(err);
      renderNotice(listEl, 'レポートを読み込めませんでした。時間をおいて再度お試しください。', true);
      if (moreWrap) moreWrap.hidden = true;
    });
  }

  window.LID = {
    loadTags: loadTags,
    tagNames: tagNames,
    tagsOfArea: tagsOfArea,
    unknownTags: unknownTags,
    root: root,
    siteUrl: siteUrl,
    fetchJSON: fetchJSON,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    sortByDateDesc: sortByDateDesc,
    bodyToHtml: bodyToHtml,
    trapFocus: trapFocus,
    initNav: initNav,
    areaToTags: areaToTags,
    matchAuthor: matchAuthor,
    buildReportCard: buildReportCard,
    renderNotice: renderNotice,
    initReportList: initReportList
  };

  document.addEventListener('DOMContentLoaded', initNav);
})();
