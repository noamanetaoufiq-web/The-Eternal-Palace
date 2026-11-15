// Private chat + notifications + moods (needs Firebase Auth login from the gate)
(() => {
  const NAMES = { ilhamati: 'Ilham', noamane: 'Noamane' };
  const MOODS = {
    happy:   { e: '😊', c: '#facc15', ex: '😊✨🌞', t: 'fr7an(a) / happy' },
    loved:   { e: '🥰', c: '#ff6b9d', ex: '🥰💖💕', t: 'kat7ess b l7ob / feeling loved' },
    missing: { e: '🥺', c: '#f472b6', ex: '🥺💭💌', t: 'wahchak / misses you' },
    sad:     { e: '😢', c: '#60a5fa', ex: '😢💔🌧️', t: 'm7zoun(a) / sad' },
    angry:   { e: '😡', c: '#ef4444', ex: '😡💢🔥👿', t: 'm3sbba / angry' },
    sleepy:  { e: '😴', c: '#a78bfa', ex: '😴🌙💤', t: 'n3san(a) / sleepy' }
  };
  const EMOJIS = ['❤️','😘','🥰','😍','😂','🥺','😢','😡','🤗','😴','🔥','💋','🌹','✨','🙏','💔','🫶','😭','🤍','🧸'];
  let me = null, other = null, uid = null, panelOpen = false, unread = 0, loaded = false;
  const db = () => firebase.database();
  const $ = (id) => document.getElementById(id);
  const mk = (tag, css, txt) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (txt) e.textContent = txt; return e; };

  const style = document.createElement('style');
  style.textContent = `
  #pcBtn{position:fixed;left:14px;bottom:14px;z-index:9998;width:58px;height:58px;border-radius:50%;border:0;background:linear-gradient(135deg,#ff6b9d,#e8b4a0);font-size:26px;cursor:pointer;box-shadow:0 8px 24px #0008;animation:pcPulse 2.4s infinite}
  @keyframes pcPulse{0%{box-shadow:0 0 0 0 #ff6b9d99,0 8px 24px #0008}70%{box-shadow:0 0 0 18px #ff6b9d00,0 8px 24px #0008}100%{box-shadow:0 0 0 0 #ff6b9d00,0 8px 24px #0008}}
  #pcBadge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;font-size:.7rem;padding:2px 6px;display:none}
  #pcPanel{position:fixed;inset:0;z-index:9999;height:100vh;height:100dvh;display:flex;flex-direction:column;background:radial-gradient(circle at 15% 0%,#5a2d63 0%,#1a0a2e 62%);color:#fff;font-family:inherit;visibility:hidden;clip-path:circle(0px at var(--ox,40px) var(--oy,90vh));transition:clip-path .7s cubic-bezier(.7,0,.3,1),visibility 0s .7s}
  #pcPanel.open{visibility:visible;clip-path:circle(160% at var(--ox,40px) var(--oy,90vh));transition:clip-path .9s cubic-bezier(.2,.8,.2,1),visibility 0s}
  body.pc-open{overflow:hidden}
  #pcHead{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(26,10,46,.85);border-bottom:1px solid #e8b4a055}
  #pcBack{background:none;border:0;color:#fff;font-size:1.6rem;cursor:pointer}
  #pcAv{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:linear-gradient(135deg,#ff6b9d,#e8b4a0);transition:transform .3s}
  #pcName{font-size:1.05rem}#pcSub{display:block;opacity:.75;font-size:.78rem}
  #pcMood{display:flex;justify-content:space-around;padding:6px;border-bottom:1px solid #ff6b9d33;background:rgba(255,255,255,.03)}
  #pcMood button{background:none;border:0;font-size:1.35rem;cursor:pointer;padding:3px 6px;border-radius:10px}
  #pcMood button.sel{background:#ff6b9d44}
  #pcMsgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:8px}
  .pcm{max-width:78%;padding:9px 13px;border-radius:16px;font-size:.95rem;word-break:break-word;animation:pcIn .35s ease both}
  @keyframes pcIn{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
  .pcm.me{align-self:flex-end;background:linear-gradient(135deg,#ff6b9d,#ffb6c1);color:#2a0a1e;border-bottom-right-radius:4px}
  .pcm.them{align-self:flex-start;background:#4a3558;border-bottom-left-radius:4px}
  .pcm small{display:block;opacity:.6;font-size:.65rem;margin-top:3px;text-align:right}
  #pcBar{display:flex;gap:2px;padding:4px 8px;overflow-x:auto;border-top:1px solid #ff6b9d33}
  #pcBar button{background:none;border:0;font-size:1.3rem;cursor:pointer;padding:2px 5px;flex:none}
  #pcRow{display:flex;gap:8px;padding:8px 12px calc(12px + env(safe-area-inset-bottom,0px))}
  #pcIn{flex:1;border-radius:22px;border:1px solid #ff6b9d88;background:#2a1540;color:#fff;padding:10px 14px;font-size:1rem}
  #pcSend{border:0;border-radius:22px;background:linear-gradient(135deg,#ff6b9d,#e8b4a0);color:#2a0a1e;font-weight:600;padding:0 18px;cursor:pointer}
  #pcBanner{position:fixed;top:0;left:0;right:0;z-index:9997;text-align:center;padding:6px 10px;font-size:.9rem;color:#fff;display:none;letter-spacing:.05em}
  #pcGlow{position:fixed;inset:0;z-index:9996;pointer-events:none;transition:box-shadow .6s}
  .pcFly{position:fixed;z-index:10001;pointer-events:none;transform:translate(-50%,-50%);animation:pcFly 1.2s ease-out forwards}
  @keyframes pcFly{to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(40deg) scale(.4);opacity:0}}
  #pcSplash{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center;animation:pcSplash 1.5s ease both}
  #pcSplash b{font-size:clamp(2.2rem,9vw,4rem);background:linear-gradient(135deg,#ff6b9d,#ffe0c8);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px #ff6b9d)}
  #pcSplash span{margin-top:8px;color:#ffd9e4;font-size:1rem}
  @keyframes pcSplash{0%{opacity:0;transform:scale(.6)}25%{opacity:1;transform:scale(1.08)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.25)}}`;
  document.head.appendChild(style);

  function burst(x, y) {
    const set = ['💗', '💖', '💕', '✨', '💘', '🌹'];
    for (let i = 0; i < 26; i++) {
      const s = mk('span', '', set[i % set.length]), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 240;
      s.className = 'pcFly';
      s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 70}px;font-size:${16 + Math.random() * 20}px;animation-delay:${Math.random() * .15}s`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 1500);
    }
  }
  function splash() {
    const d = mk('div'); d.id = 'pcSplash';
    d.append(mk('b', '', 'Binatna 💞'), mk('span', '', 'ghorfa dyalna, ghir jouj 🔒'));
    document.body.appendChild(d); setTimeout(() => d.remove(), 1600);
  }
  const closeRoom = () => { panelOpen = false; $('pcPanel')?.classList.remove('open'); document.body.classList.remove('pc-open'); };

  function build() {
    const btn = mk('button'); btn.id = 'pcBtn'; btn.textContent = '💬'; btn.setAttribute('aria-label', 'Binatna');
    const badge = mk('span'); badge.id = 'pcBadge'; btn.appendChild(badge);
    const panel = mk('div'); panel.id = 'pcPanel';
    const head = mk('div'); head.id = 'pcHead';
    const back = mk('button', '', '←'); back.id = 'pcBack'; back.setAttribute('aria-label', 'Rje3'); back.onclick = closeRoom;
    const av = mk('div', '', '💖'); av.id = 'pcAv';
    const meta = mk('div'); const nm = mk('b'); nm.id = 'pcName'; const sub = mk('small'); sub.id = 'pcSub'; meta.append(nm, sub);
    head.append(back, av, meta);
    const mood = mk('div'); mood.id = 'pcMood';
    Object.entries(MOODS).forEach(([k, m]) => { const b = mk('button', '', m.e); b.title = m.t; b.dataset.k = k; b.onclick = () => setMood(k); mood.appendChild(b); });
    const msgs = mk('div'); msgs.id = 'pcMsgs';
    const bar = mk('div'); bar.id = 'pcBar';
    const row = mk('div'); row.id = 'pcRow';
    const inp = mk('input'); inp.id = 'pcIn'; inp.placeholder = 'Ktb hna / Write here'; inp.maxLength = 900; inp.autocomplete = 'off';
    const send = mk('button'); send.id = 'pcSend'; send.textContent = 'Send 💌';
    EMOJIS.forEach(e => { const b = mk('button', '', e); b.onclick = () => { inp.value += e; inp.focus(); }; bar.appendChild(b); });
    const go = () => { const t = inp.value.trim(); if (t) { api.send(t); inp.value = ''; } };
    send.onclick = go; inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    row.append(inp, send); panel.append(head, mood, msgs, bar, row);
    const banner = mk('div'); banner.id = 'pcBanner'; const glow = mk('div'); glow.id = 'pcGlow';
    document.body.append(btn, panel, banner, glow);
    btn.onclick = () => {
      const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      panel.style.setProperty('--ox', x + 'px'); panel.style.setProperty('--oy', y + 'px');
      burst(x, y); splash();
      panelOpen = true; panel.classList.add('open'); document.body.classList.add('pc-open');
      unread = 0; badge.style.display = 'none'; localStorage.setItem('pcRead', Date.now()); askNotif();
      setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 400);
    };
  }

  function askNotif() { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }
  async function notify(from, text) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const o = { body: text, icon: 'icon.png', tag: 'palace-chat', vibrate: [120, 60, 120] };
    try { const r = await navigator.serviceWorker?.ready; if (r) return r.showNotification('💌 ' + (NAMES[from] || from), o); } catch {}
    try { new Notification('💌 ' + (NAMES[from] || from), o); } catch {}
  }

  function addMsg(m) {
    const box = $('pcMsgs'); if (!box) return;
    const mine = m.uid === uid;
    const d = mk('div', '', ''); d.className = 'pcm ' + (mine ? 'me' : 'them'); d.textContent = m.text;
    const s = mk('small', '', new Date(m.t || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })); d.appendChild(s);
    box.appendChild(d); box.scrollTop = box.scrollHeight;
    if (!mine && loaded) {
      if (!panelOpen) { unread++; const b = $('pcBadge'); b.textContent = unread; b.style.display = 'block'; }
      if (!panelOpen || document.hidden) notify(m.from, m.text);
    }
  }

  function showMood(m, who) {          // m = partner's mood
    const ban = $('pcBanner'), glow = $('pcGlow'); if (!ban) return;
    const d = MOODS[m && m.k];
    if (!d) { ban.style.display = 'none'; glow.style.boxShadow = 'none'; return; }
    if ($('pcAv')) { $('pcAv').textContent = d.e; $('pcSub').textContent = d.t; }
    ban.style.display = 'block'; ban.style.background = d.c + 'dd';
    ban.textContent = `${d.ex} ${NAMES[who]}: ${d.t} ${d.ex}`;
    glow.style.boxShadow = m.k === 'angry' || m.k === 'sad' ? `inset 0 0 90px ${d.c}aa` : `inset 0 0 50px ${d.c}55`;
    document.body.style.paddingTop = '30px';
  }
  function setMood(k) {
    db().ref('mood/' + me).set({ k, t: firebase.database.ServerValue.TIMESTAMP });
    document.querySelectorAll('#pcMood button').forEach(b => b.classList.toggle('sel', b.dataset.k === k));
  }

  const api = {
    ready: false,
    async send(text) {
      if (!me) return { ok: false, error: 'not logged in' };
      try { await db().ref('chats/main').push({ from: me, uid, text: String(text).slice(0, 900), t: firebase.database.ServerValue.TIMESTAMP }); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    }
  };
  window.palaceChat = api;

  function start(u) {
    uid = u.uid; me = u.email.split('@')[0]; document.body.classList.add('u-' + me); other = me === 'noamane' ? 'ilhamati' : 'noamane';
    if (!$('pcBtn')) build();
    $('pcName').textContent = NAMES[other]; $('pcSub').textContent = '🔒 Binatna ghir';
    const ref = db().ref('chats/main').orderByChild('t').limitToLast(100);
    ref.once('value').then((s) => {
      s.forEach(c => addMsg(c.val()));
      const readAt = +localStorage.getItem('pcRead') || 0, fresh = [];
      s.forEach(c => { const v = c.val(); if (v.uid !== uid && v.t > readAt) fresh.push(v); });
      if (fresh.length) { unread = fresh.length; const b = $('pcBadge'); b.textContent = unread; b.style.display = 'block'; notify(other, fresh.length === 1 ? fresh[0].text : `${fresh.length} messages jdad 💌`); }
      loaded = true; api.ready = true;
      let last = 0; s.forEach(c => { last = Math.max(last, c.val().t || 0); });
      ref.on('child_added', (c) => { const v = c.val(); if ((v.t || Infinity) > last) addMsg(v); }, (e) => console.warn('chat:', e.message));
    }, (e) => console.warn('chat read denied:', e.message));
    db().ref('mood/' + other).on('value', (s) => showMood(s.val(), other));
    db().ref('mood/' + me).once('value').then((s) => { const k = s.val()?.k; document.querySelectorAll('#pcMood button').forEach(b => b.classList.toggle('sel', b.dataset.k === k)); });
  }
  firebase.auth().onAuthStateChanged((u) => { if (u && /@palace\.app$/.test(u.email || '')) start(u); });
})();

// ---- Heart chat: fullscreen toggle + quick chips ----
window.toggleHeartChat = (open) => {
  const c = document.getElementById('askContainer'); if (!c) return;
  c.classList.toggle('full', open); document.body.classList.toggle('heart-open', open);
  if (open) { const b = document.getElementById('chatBox'); b.scrollTop = b.scrollHeight; document.getElementById('userQuestion')?.focus(); }
};
window.heartAsk = (t) => { const i = document.getElementById('userQuestion'); if (!i) return; i.value = t; window.askNoamane?.(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { window.toggleHeartChat(false); document.getElementById('pcBack')?.click(); } });

// ---- Suggestions: follow what she types (or the last message), appear one after another ----
(() => {
  const DEFAULT = ['Chhal katbghini? 💖', 'Goul liya chi 7aja zwina ✨', 'Chno ndir lyoum?', 'Ana m7zouna chwiya 🥺'];
  const SUG = [
    { k: /khobz|7obz|pain|bread|msemen|baghrir|tbikh|tabkh|3cha|ghda|ftour|wasfa|recette|gateau|cake|couscous|tajine/i,
      q: ['3tini wasfa sahla l 3cha', 'Chno nbddel ila ma-kaynch khmira?', 'Kifach nsyb msemen mrqq?', 'Chhal kaykhsr l-khobz f l-forn?'] },
    { k: /7zin|7zouna|m7zoun|bki|tr7|zl3an|mt3ba|tired|sad|ma-fr7anach|msbb|stress/i,
      q: ['Kifach nfrrj 3la rassi?', 'Goul liya chi 7aja t-mchi 3la 9albi', 'Chno ndir bach nnsa had l-7zn?'] },
    { k: /n3as|nu3as|nnam|nom|sleep|sahar|ma-kaynamch/i,
      q: ['Kifach nnam mzyan lbarra7?', 'Chno nchrb 9bl ma nnam?', 'Goul liya 7kaya 9sira bach nnam'] },
    { k: /protein|sr |sdr|djaj|regime|diet|riyada|sport|maigrir|wzn|poids|calorie|vitamine/i,
      q: ['Chno l-ghda l-s7i7 f nhar?', 'Chhal mn lma khssni nchrb?', 'Chi tmarin sahlin f dar?'] },
    { k: /code|html|css|python|javascript|bug|site|app|program/i,
      q: ['Chrh liya had l-code', 'Kifach nsl7 had l-bug?', 'Chno ahssan tari9a nt3lm programmation?'] },
    { k: /dars|exam|ecole|etude|fac|devoir|study|bac|concours/i,
      q: ['Kifach nrajia3 b tari9a mzyana?', 'Chno ndir bach nrkz?', 'Nasa2i7 l l-imti7an'] },
    { k: /safar|voyage|trip|vacances|plage|mdina|marrakech|ta7it|hotel/i,
      q: ['Fin nmchiw f had l-3otla?', 'Chno nakhd m3aya f valise?', 'Chi blasat romantikiya f l-maghrib'] },
    { k: /mousi9a|musique|ghnia|chanson|song|khdm|play|ajouter/i,
      q: ['Khdm liya ghnia romantikiya', 'Khdm liya ghnia 7zina', 'Khdm liya ahssan ghnia dyal lyoum'] },
    { k: /tswira|photo|memory|souvenir|galerie/i,
      q: ['7ett had tswira f Memories', 'Kifach n7ett tswira f l-gallery?', 'Sift l Noamane message'] },
    { k: /7ob|love|katbghini|wa7chtk|twa7chtk|3ichq|noamane|hbibi|kayhbni/i,
      q: ['Chhal katbghini?', 'Chno ahssan 7aja fiya?', 'Imta bghiti nchofou?', 'Sift l Noamane i love u'] }
  ];
  const box = () => document.getElementById('heartChips');
  const lastText = (cls) => { const m = document.querySelectorAll('#chatBox .chat-message.' + cls); return m.length ? m[m.length - 1].textContent : ''; };
  let key = '';
  function render() {
    const el = box(), inp = document.getElementById('userQuestion'); if (!el || !inp) return;
    const typed = inp.value.trim(), ctx = typed || (lastText('user') + ' ' + lastText('bot'));
    let list = [];
    SUG.forEach(g => { if (g.k.test(ctx)) list.push(...g.q); });
    if (!list.length) list = DEFAULT;
    list = [...new Set(list)].filter(q => q.toLowerCase() !== typed.toLowerCase()).slice(0, 4);
    const nk = list.join('|'); if (nk === key) return; key = nk;
    el.textContent = '';
    list.forEach((q, i) => {
      const b = document.createElement('button'); b.textContent = q; b.style.animationDelay = (i * 0.18) + 's';
      b.onclick = () => window.heartAsk(q); el.appendChild(b);
    });
  }
  let t; const soon = () => { clearTimeout(t); t = setTimeout(render, 250); };
  const init = () => {
    const inp = document.getElementById('userQuestion'), cb = document.getElementById('chatBox'); if (!inp || !cb) return;
    inp.addEventListener('input', soon); new MutationObserver(soon).observe(cb, { childList: true }); render();
  };
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
