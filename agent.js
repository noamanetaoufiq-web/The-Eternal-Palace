// Noamane's Heart: AI agent with chat memory, photo/video input, and tools that control the site.
(() => {
  const HIST_KEY = 'ilhamChatHistory', MEM_KEY = 'palaceMemories';
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  let history = jget(HIST_KEY, []);
  let pending = null;      // media attached to the next message
  let turnMedia = null;    // media of the turn being processed (for save_memory)
  let lastSend = 0;

  const SECTIONS = { home: 'home', gallery: 'gallery', memories: 'gallery', journey: 'timeline', timeline: 'timeline', notes: 'love-notes', games: 'games', dreams: 'bucket-list', extras: 'extras' };
  const TOOL_RULES = `
Nta 3ndk 7ta l'adawat bach tkhdem f site kaml:
- play_music: ila talbat chi ghnia/music (l'ghani li kaynin: Cinnamon Girl, Cinnamon Girl x J Freak, Raindance).
- save_memory: ila 3tatk tswira w golat "7ettha f memories/dhkriyat/gallery", 7ettha m3a caption zwin b darija.
- send_to_noamane: ila golat "sifet l Noamane / goul lih / send miss you" -> sift rissala 9sira w 7nina mn 3and Ilham.
- add_love_note: ila bghat tzid chi note f Love Notes.
- open_section: ila bghat tchouf chi qism mn site.
Ma-tkhdem adat ila ma-talbatch. Mnin tkhdem adat, jawb b jomla 7nina kima ila nta dertha. Ila 3tatk tswira wla video, 3lleq 3liha b 7ob w b tafasil li chftiha.`;

  const S = (d) => ({ type: 'STRING', description: d });
  const TOOLS = [{ functionDeclarations: [
    { name: 'play_music', description: 'Play a song from the site soundtrack', parameters: { type: 'OBJECT', properties: { song: S('song name or part of it') } } },
    { name: 'save_memory', description: 'Save the photo Ilham just attached into the Memories gallery', parameters: { type: 'OBJECT', properties: { caption: S('short caption in Darija') }, required: ['caption'] } },
    { name: 'send_to_noamane', description: 'Send a short message to Noamane on Telegram', parameters: { type: 'OBJECT', properties: { message: S('the message') }, required: ['message'] } },
    { name: 'add_love_note', description: 'Add a note to the Love Notes section', parameters: { type: 'OBJECT', properties: { text: S('note text') }, required: ['text'] } },
    { name: 'open_section', description: 'Scroll the site to a section', parameters: { type: 'OBJECT', properties: { section: S('home, gallery, memories, journey, notes, games, dreams, extras') }, required: ['section'] } }
  ] }];

  // ---------- site actions ----------
  function showPlayer(id, title) {
    let box = document.getElementById('aiPlayer');
    if (!box) {
      box = document.createElement('div'); box.id = 'aiPlayer';
      box.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;background:#1a0a2e;border:1px solid #ff6b9d;border-radius:16px;padding:8px;box-shadow:0 8px 30px #000a';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    const bar = document.createElement('div'); bar.style.cssText = 'display:flex;justify-content:space-between;color:#ffb6c1;font-size:.8rem;margin-bottom:6px';
    const t = document.createElement('span'); t.textContent = '🎵 ' + title;
    const x = document.createElement('button'); x.textContent = '✕'; x.style.cssText = 'background:none;border:0;color:#fff;cursor:pointer'; x.onclick = () => box.remove();
    bar.append(t, x);
    const f = document.createElement('iframe'); f.width = 260; f.height = 150; f.allow = 'autoplay; encrypted-media'; f.style.border = '0';
    f.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    box.append(bar, f);
  }
  function renderMemories() {
    const grid = document.querySelector('#gallery .gallery-grid'); if (!grid) return;
    grid.querySelectorAll('.ai-memory').forEach(n => n.remove());
    jget(MEM_KEY, []).forEach(m => {
      const d = document.createElement('div'); d.className = 'gallery-item ai-memory'; d.style.cssText = 'position:relative;overflow:hidden;min-height:220px;cursor:pointer';
      const img = document.createElement('img'); img.src = m.img; img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
      const cap = document.createElement('p'); cap.textContent = m.caption; cap.style.cssText = 'position:absolute;bottom:0;left:0;right:0;margin:0;padding:8px;background:#000a;color:#fff;font-size:.85rem';
      d.append(img, cap);
      d.onclick = (e) => {
        e.stopPropagation();
        const c = document.getElementById('lightboxContent'); c.innerHTML = '';
        const big = document.createElement('img'); big.src = m.img; big.style.cssText = 'max-width:90vw;max-height:80vh;border-radius:16px';
        const p = document.createElement('p'); p.textContent = m.caption; p.style.cssText = 'color:#fff;text-align:center;margin-top:10px';
        c.append(big, p); document.getElementById('lightbox').classList.add('active');
      };
      grid.appendChild(d);
    });
  }
  const tools = {
    play_music({ song = '' }) {
      const cards = [...document.querySelectorAll('.song-card')];
      const card = cards.find(c => c.textContent.toLowerCase().includes(song.toLowerCase())) || cards[0];
      const id = (card?.href.match(/youtu\.be\/([\w-]+)/) || [])[1];
      if (!id) return { ok: false, error: 'song not found' };
      const title = card.querySelector('h3').textContent; showPlayer(id, title); return { ok: true, playing: title };
    },
    save_memory({ caption }) {
      if (!turnMedia || turnMedia.kind !== 'image') return { ok: false, error: 'no photo attached in this message' };
      const mem = jget(MEM_KEY, []); mem.push({ img: turnMedia.dataUrl, caption, date: Date.now() });
      if (!jset(MEM_KEY, mem)) return { ok: false, error: 'storage full' };
      renderMemories(); return { ok: true };
    },
    async send_to_noamane({ message }) {
      if (Date.now() - lastSend < 30000) return { ok: false, error: 'wait 30 seconds between messages' };
      lastSend = Date.now(); const ok = await sendToTelegram(message);
      if (ok) showHeartsRain(); return { ok };
    },
    add_love_note({ text }) {
      const notes = jget('ilhamNoamaneNotes', []); notes.push(text); jset('ilhamNoamaneNotes', notes);
      const el = document.createElement('div'); el.className = 'note-item'; el.textContent = text;
      document.getElementById('notesDisplay')?.appendChild(el); return { ok: true };
    },
    open_section({ section = '' }) {
      const id = SECTIONS[section.toLowerCase()] || 'home'; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); return { ok: true };
    }
  };

  // ---------- model loop ----------
  async function gem(contents) {
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT + TOOL_RULES }] }, contents, tools: TOOLS,
      generationConfig: { temperature: 0.9, maxOutputTokens: 500, topP: 0.95 }
    };
    for (const endpoint of GEMINI_ENDPOINTS) {
      const label = endpoint.split('/').pop();
      try {
        const r = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) { console.warn(`[AI] ${label} -> HTTP ${r.status}`, (await r.text().catch(() => '')).slice(0, 400)); continue; }
        const data = await r.json(); if (data?.candidates?.[0]?.content) return data.candidates[0].content;
        console.warn(`[AI] ${label} empty`, data?.promptFeedback);
      } catch (e) { console.error(`[AI] ${label} error:`, e); }
    }
    return null;
  }
  async function runAgent(text, media) {
    turnMedia = media;
    const userParts = [{ text: withLoveAngle(text || 'Chof had l-modia w 3lleq 3liha.') }];
    if (media) userParts.push({ inlineData: { mimeType: media.mime, data: media.data } });
    const contents = [...history, { role: 'user', parts: userParts }];
    for (let i = 0; i < 4; i++) {
      const content = await gem(contents); if (!content) return null;
      const calls = content.parts.filter(p => p.functionCall);
      if (!calls.length) return content.parts.map(p => p.text || '').join('').trim() || null;
      contents.push(content);
      const results = [];
      for (const { functionCall: fc } of calls) {
        let res; try { res = await (tools[fc.name]?.(fc.args || {}) ?? { ok: false, error: 'unknown tool' }); } catch (e) { res = { ok: false, error: String(e) }; }
        results.push({ functionResponse: { name: fc.name, response: { result: res } } });
      }
      contents.push({ role: 'user', parts: results });
    }
    return null;
  }

  // ---------- media + UI ----------
  function readMedia(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader(); fr.onerror = reject;
      if (file.type.startsWith('image/')) {
        fr.onload = () => { const im = new Image(); im.onload = () => {
          const k = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          const dataUrl = c.toDataURL('image/jpeg', 0.8); resolve({ kind: 'image', mime: 'image/jpeg', data: dataUrl.split(',')[1], dataUrl });
        }; im.onerror = reject; im.src = fr.result; };
      } else if (file.type.startsWith('video/') && file.size <= 10 * 1024 * 1024) {
        fr.onload = () => resolve({ kind: 'video', mime: file.type, data: fr.result.split(',')[1] });
      } else return reject(new Error('Video khass ykoun < 10MB'));
      fr.readAsDataURL(file);
    });
  }
  function setupUI() {
    const row = document.querySelector('.chat-input-container'); if (!row || row.querySelector('#aiAttach')) return;
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,video/*'; input.hidden = true;
    const btn = document.createElement('button'); btn.id = 'aiAttach'; btn.type = 'button'; btn.textContent = '📎';
    btn.style.cssText = 'background:none;border:1px solid #ff6b9d88;border-radius:50%;width:46px;height:46px;font-size:1.2rem;cursor:pointer;color:#fff';
    btn.onclick = () => input.click();
    input.onchange = async () => {
      const f = input.files[0]; if (!f) return;
      try { pending = await readMedia(f); btn.textContent = pending.kind === 'image' ? '🖼️' : '🎞️'; btn.style.background = '#ff6b9d55'; }
      catch (e) { addMessage(e.message || 'Ma-9dertch nqra had l-fichier'); }
      input.value = '';
    };
    row.insertBefore(btn, row.lastElementChild); row.appendChild(input);
    history.forEach(m => addMessage(m.parts[0].text, m.role === 'user'));
    renderMemories();
  }

  window.askNoamane = async function () {
    const input = document.getElementById('userQuestion'), text = input.value.trim(), media = pending;
    if (!text && !media) return;
    addMessage((media ? (media.kind === 'image' ? '🖼️ ' : '🎞️ ') : '') + (text || ''), true);
    input.value = ''; pending = null;
    const b = document.getElementById('aiAttach'); if (b) { b.textContent = '📎'; b.style.background = 'none'; }
    addTypingIndicator();
    const reply = await runAgent(text, media);
    removeTypingIndicator();
    const out = reply || (media ? 'Ma-9dertch nchof had l-modia daba, 3awdi 7awli mn ba3d 💕' : smartFallback(text));
    addMessage(out);
    if (reply) {
      history.push({ role: 'user', parts: [{ text: (media ? `[${media.kind}] ` : '') + text }] }, { role: 'model', parts: [{ text: reply }] });
      history = history.slice(-24); jset(HIST_KEY, history);
    }
  };
  window.__agent = { runAgent, tools };
  if (document.readyState !== 'loading') setupUI(); else document.addEventListener('DOMContentLoaded', setupUI);
})();
