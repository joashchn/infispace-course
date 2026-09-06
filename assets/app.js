
(function(){
  'use strict';
  var root = document.documentElement;

  /* ---- 侧边栏 ---- */
  var sidebar = document.getElementById('sidebar');
  var mask = document.getElementById('sbMask');
  var menuBtn = document.getElementById('menuBtn');
  var sbClose = document.getElementById('sbClose');
  function openSb(){ sidebar.classList.add('on'); mask.classList.add('on'); }
  function closeSb(){ sidebar.classList.remove('on'); mask.classList.remove('on'); }
  /* 桌面端折叠：宽度 >960px 时点击 ☰ 是折叠/展开，移动端才是抽屉 */
  var mqDesktop = window.matchMedia('(min-width: 961px)');
  var collapseBtn = null;
  if (sidebar) {
    var sbHead = sidebar.querySelector('.sb-head');
    if (sbHead) {
      collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.id = 'sbCollapse';
      collapseBtn.className = 'sb-collapse';
      collapseBtn.setAttribute('aria-label', '收起目录');
      collapseBtn.setAttribute('aria-expanded', 'true');
      collapseBtn.title = '收起目录（Ctrl + \\）';
      collapseBtn.textContent = '\u00AB';
      sbHead.appendChild(collapseBtn);
    }
  }
  function setCollapsed(v){
    root.classList.toggle('sb-collapsed', !!v);
    if (collapseBtn) {
      collapseBtn.textContent = v ? '\u00BB' : '\u00AB';
      collapseBtn.setAttribute('aria-label', v ? '展开目录' : '收起目录');
      collapseBtn.setAttribute('aria-expanded', v ? 'false' : 'true');
      collapseBtn.title = (v ? '展开目录' : '收起目录') + '（Ctrl + \\）';
    }
    try { localStorage.setItem('aidoc-sb', v ? '1' : '0'); } catch(err){}
    // 折叠/展开后重算阅读进度与目录高亮
    window.dispatchEvent(new Event('resize'));
  }
  if (collapseBtn) collapseBtn.addEventListener('click', function(){ setCollapsed(true); });
  if (menuBtn) menuBtn.addEventListener('click', function(){
    if (mqDesktop.matches) setCollapsed(!root.classList.contains('sb-collapsed'));
    else openSb();
  });
  if (mask) mask.addEventListener('click', closeSb);
  if (sbClose) sbClose.addEventListener('click', closeSb);

  /* ---- 正文宽度切换：标宽(默认) / 全宽 / 纸张 ---- */
  var topbarEl = document.querySelector('.topbar');
  var prevSbState = null;
  if (topbarEl && !document.getElementById('wSwitch')) {
    var wWrap = document.createElement('div');
    wWrap.id = 'wSwitch';
    wWrap.className = 'w-switch';
    wWrap.setAttribute('role', 'group');
    wWrap.setAttribute('aria-label', '正文宽度');
    [['standard','标宽'],['full','全宽'],['paper','纸张']].forEach(function(m){
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.w = m[0];
      b.textContent = m[1];
      b.title = m[0] === 'full' ? '正文占满全宽（隐藏目录、收起导航），适合大屏展示' :
                m[0] === 'paper' ? '窄版纸张式阅读宽度' : '标准阅读宽度（默认）';
      wWrap.appendChild(b);
    });
    topbarEl.appendChild(wWrap);
  }
  function setWMode(m){
    var cur = root.getAttribute('data-wmode') || 'standard';
    if (m === cur) { syncWMode(); return; }
    if (m === 'full' && cur !== 'full') {
      prevSbState = root.classList.contains('sb-collapsed');
      setCollapsed(true); // 全宽先收起侧边栏，真正占满屏幕
    } else if (cur === 'full' && m !== 'full' && prevSbState === false) {
      setCollapsed(false); // 退出全宽时按进入前的状态恢复
    }
    if (m === 'standard') root.removeAttribute('data-wmode');
    else root.setAttribute('data-wmode', m);
    try { localStorage.setItem('aidoc-w', m); } catch(err){}
    syncWMode();
    window.dispatchEvent(new Event('resize'));
  }
  function syncWMode(){
    var cur = root.getAttribute('data-wmode') || 'standard';
    Array.prototype.forEach.call(document.querySelectorAll('#wSwitch button'), function(b){
      var on = (b.dataset.w === cur);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  var wSwitch = document.getElementById('wSwitch');
  if (wSwitch) {
    wSwitch.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      setWMode(b.dataset.w);
    });
    syncWMode(); // 页面头部的内联脚本已在渲染前恢复过模式，这里同步高亮
  }

  /* 分组展开：默认展开当前模块，记住用户手动切换 */
  var nav = document.querySelector('.sb-nav');
  if (nav) {
    var savedOpen = {};
    try { savedOpen = JSON.parse(localStorage.getItem('aidoc-open') || '{}'); } catch(e){}

    // 恢复用户手动展开/折叠的状态（服务端已为当前模块加过 open）
    Array.prototype.forEach.call(nav.querySelectorAll('.sb-group'), function(g){
      var key = g.dataset.mod;
      if (!key) return;
      if (savedOpen[key] === true) g.classList.add('open');
      if (savedOpen[key] === false) g.classList.remove('open');
    });

    // 只有带 data-toggle 的分组标题才拦截点击做展开/折叠。
    // 没有子项的入口（如「学习导航」/「训练营介绍」）保持普通链接，正常跳转。
    Array.prototype.forEach.call(nav.querySelectorAll('.sb-group-title[data-toggle]'), function(title){
      var g = title.closest ? title.closest('.sb-group') : title.parentNode;
      if (!g) return;
      var key = g.dataset.mod;
      title.addEventListener('click', function(e){
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        g.classList.toggle('open');
        if (key) {
          savedOpen[key] = g.classList.contains('open');
          try { localStorage.setItem('aidoc-open', JSON.stringify(savedOpen)); } catch(err){}
        }
      });
    });

    var cur = nav.querySelector('.sb-item.current');
    if (cur) {
      cur.scrollIntoView({block:'center'});
    }
  }

  /* ---- 代码复制 ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.highlight'), function(box){
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.addEventListener('click', function(){
      var code = box.querySelector('pre');
      var text = code ? code.innerText : '';
      var done = function(){
        btn.textContent = '已复制';
        btn.classList.add('done');
        setTimeout(function(){ btn.textContent = '复制'; btn.classList.remove('done'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function(){});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch(e){}
        document.body.removeChild(ta);
      }
    });
    box.appendChild(btn);
  });

  /* ---- Mermaid ---- */
  var mermaidNodes = document.querySelectorAll('.mermaid');
  var mermaidReady = false;
  function renderMermaid(force){
    if (!mermaidNodes.length) return;
    if (!window.mermaid) return;
    Array.prototype.forEach.call(mermaidNodes, function(el){
      if (force) { el.removeAttribute('data-processed'); el.innerHTML = el.dataset.code || ''; }
      else if (el.dataset.code && !el.innerHTML.trim()) { el.innerHTML = el.dataset.code; }
    });
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'default',
        themeVariables: { background: '#FFFFFF', primaryColor: '#E3F7F8', primaryTextColor: '#0E1B33',
            primaryBorderColor: '#14B8C2', lineColor: '#6B7894', secondaryColor: '#E3F7F8',
            tertiaryColor: '#F7F9FC' }
      });
      window.mermaid.run({ querySelector: '.mermaid' });
      mermaidReady = true;
    } catch(e) {}
  }
  if (mermaidNodes.length) {
    if (!window.mermaid) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
      s.onload = function(){ renderMermaid(false); };
      document.head.appendChild(s);
    } else {
      renderMermaid(false);
    }
  }

  /* ---- 阅读进度 ---- */
  var bar = document.getElementById('progress');
  if (bar) {
    var onScroll = function(){
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = max > 0 ? (h.scrollTop / max * 100) + '%' : '0';
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ---- TOC 高亮 ---- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc-link'));
  if (tocLinks.length) {
    var targets = tocLinks.map(function(a){
      return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    });
    var tick = function(){
      var pos = window.scrollY + 120;
      var idx = 0;
      for (var i = 0; i < targets.length; i++){
        if (targets[i] && targets[i].offsetTop <= pos) idx = i;
      }
      tocLinks.forEach(function(a, i){ a.classList.toggle('active', i === idx); });
    };
    window.addEventListener('scroll', tick, {passive:true});
    tick();
  }

  /* ---- 搜索 ---- */
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var INDEX = null, loading = false, sel = -1, shown = [];

  function loadIndex(cb){
    if (INDEX) { cb(INDEX); return; }
    if (loading) { return; }
    loading = true;
    var base = document.querySelector('script[src*="app.js"]').getAttribute('src').replace(/app\.js\?v=.*$/, '');
    fetch(base + 'search-index.json').then(function(r){ return r.json(); })
      .then(function(d){ INDEX = d; loading = false; cb(d); })
      .catch(function(){ loading = false; cb([]); });
  }

  function snippet(text, q){
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text.slice(0, 92);
    var s = Math.max(0, i - 34);
    return (s > 0 ? '…' : '') + text.slice(s, s + 110) + '…';
  }

  function search(q){
    q = q.trim().toLowerCase();
    if (!q) { results.classList.remove('on'); return; }
    loadIndex(function(docs){
      var hits = [];
      docs.forEach(function(d){
        var t = d.t.toLowerCase(), x = (d.x || '').toLowerCase();
        var score = 0;
        if (t.indexOf(q) === 0) score += 40;
        else if (t.indexOf(q) > -1) score += 22;
        var xi = x.indexOf(q);
        if (xi > -1) score += 6 + Math.max(0, 6 - xi / 400);
        if (score > 0) hits.push({d: d, s: score});
      });
      hits.sort(function(a,b){ return b.s - a.s; });
      shown = hits.slice(0, 18);
      sel = -1;
      if (!shown.length) {
        results.innerHTML = '<div class="sr-empty">没有匹配的内容</div>';
        results.classList.add('on');
        return;
      }
      // 当前页面所在目录层级（相对站点根）：首页在根目录 → 0 个 '../'，其余子目录页 → 1 个
      var dir = location.pathname.replace(/\/[^/]*$/, '');
      var levels = dir.split('/').filter(Boolean).length;
      var prefix = '../'.repeat(Math.max(0, levels - 1));
      results.innerHTML = shown.map(function(h){
        var d = h.d;
        return '<a class="sr-item" href="' + prefix + d.u + '">' +
          '<div class="sr-t"><span>' + d.n + '</span>' + esc(d.t) + '</div>' +
          '<div class="sr-m">' + esc(d.m) + '</div>' +
          '<div class="sr-x">' + esc(snippet(d.x || '', q)) + '</div></a>';
      }).join('');
      results.classList.add('on');
    });
  }

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  if (input) {
    var timer;
    input.addEventListener('input', function(){
      clearTimeout(timer);
      var v = input.value;
      timer = setTimeout(function(){ search(v); }, 130);
    });
    input.addEventListener('keydown', function(e){
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var items = results.querySelectorAll('.sr-item');
        if (!items.length) return;
        sel = e.key === 'ArrowDown' ? Math.min(sel + 1, items.length - 1) : Math.max(sel - 1, 0);
        Array.prototype.forEach.call(items, function(el, i){ el.classList.toggle('sel', i === sel); });
        items[sel].scrollIntoView({block:'nearest'});
      } else if (e.key === 'Enter') {
        var items2 = results.querySelectorAll('.sr-item');
        if (items2.length) { location.href = items2[Math.max(0, sel)].getAttribute('href'); }
      } else if (e.key === 'Escape') {
        input.value = ''; results.classList.remove('on'); input.blur();
      }
    });
    document.addEventListener('click', function(e){
      if (!results.contains(e.target) && e.target !== input) results.classList.remove('on');
    });
  }

  document.addEventListener('keydown', function(e){
    /* Ctrl/Cmd + \ 折叠或展开侧边栏 */
    if ((e.ctrlKey || e.metaKey) && (e.key === '\\' || e.key === '|')) {
      e.preventDefault();
      if (mqDesktop.matches) setCollapsed(!root.classList.contains('sb-collapsed'));
      else if (sidebar.classList.contains('on')) closeSb();
      else openSb();
      return;
    }
    if (e.key === '/' && document.activeElement !== input &&
        !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      if (window.innerWidth <= 960) openSb();
      input.focus();
    }
  });
})();
