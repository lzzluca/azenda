const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const todayIso = () => iso(new Date());
const dayDiff = s => Math.round((fromIso(s) - fromIso(todayIso())) / 864e5);
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const WEEKDAYS = ['domenica','lunedi','martedi','mercoledi','giovedi','venerdi','sabato'];
const COLORS = ['#2F6B4F','#3A6FD8','#DD8209','#B0487F','#7A5BD0','#1F8A8A','#C2402F','#6B7A2F'];
const fmtLong = new Intl.DateTimeFormat('it-IT', {weekday:'long', day:'numeric', month:'long'});
const fmtShort = new Intl.DateTimeFormat('it-IT', {day:'numeric', month:'short'});
const fmtWeekday = new Intl.DateTimeFormat('it-IT', {weekday:'long'});

const I = {
  inbox:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 10.5 4.3 3.8A1 1 0 0 1 5.3 3h7.4a1 1 0 0 1 1 .8l1.8 6.7v3.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z"/><path d="M2.5 10.5h4l1 1.5h3l1-1.5h4"/></svg>',
  today:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="3.5" width="13" height="12" rx="2"/><path d="M2.5 7h13M6 2v3M12 2v3"/><text x="9" y="13.6" font-size="6" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">DAY</text></svg>',
  upcoming:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="3.5" width="13" height="12" rx="2"/><path d="M2.5 7h13M6 2v3M12 2v3M5.5 10h2M10.5 10h2M5.5 12.8h2"/></svg>',
  done:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="6.5"/><path d="m6 9.2 2 2 4-4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  label:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 3.5v4l6 6 5-5-6-6h-4a1 1 0 0 0-1 1z"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/></svg>',
  cal:'<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12"/></svg>',
  check:'<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="m2.5 6.2 2.3 2.3 4.7-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const S = { tasks:{}, projects:{}, view:'today', db:null, loading:false };
try { S.view = localStorage.getItem('azenda-view') || 'today'; } catch {}

/* ---------- storage ---------- */
function loadLocal(){
  try {
    const raw = localStorage.getItem('azenda-v1');
    if (raw) { const d = JSON.parse(raw); S.tasks = d.tasks || {}; S.projects = d.projects || {}; return; }
  } catch {}
  seedWelcome();
}
function persist(){ try { localStorage.setItem('azenda-v1', JSON.stringify({tasks:S.tasks, projects:S.projects})); } catch {} }
function seedWelcome(){
  const pid = 'benvenuto', now = Date.now(), t = todayIso(), tm = iso(addDays(new Date(), 1));
  S.projects[pid] = {id:pid, name:'Benvenuto', color:COLORS[0], order:0};
  [
    ['Scrivi un task nella barra in alto e premi Invio', t, 4, []],
    ['Prova il linguaggio naturale: «Chiamare il dentista domani p2 #Personale»', t, 3, []],
    ['Clicca su un task per aggiungere note, scadenza ed etichette', t, 4, ['prova']],
    ['Completa un task toccando il cerchio a sinistra', tm, 1, ['prova']],
  ].forEach(([title, due, priority, labels], i) => {
    const id = 'benvenuto-' + i;
    S.tasks[id] = {id, title, desc:'', due, priority, labels, project:pid, done:false, doneAt:null, created:now + i};
  });
}
function subscribe(){
  let gotT = false, gotP = false;
  const ready = () => { if (gotT && gotP && S.loading) { S.loading = false; } render(); };
  const onErr = e => toast(errMsg(e));
  S.db.collection('tasks').onSnapshot(snap => {
    const m = {}; snap.docs.forEach(d => m[d.id] = {...d.data(), id:d.id}); S.tasks = m; gotT = true; ready();
  }, onErr);
  S.db.collection('projects').onSnapshot(snap => {
    const m = {}; snap.docs.forEach(d => m[d.id] = {...d.data(), id:d.id}); S.projects = m; gotP = true; ready();
  }, onErr);
}
function errMsg(e){
  const c = e && e.code;
  if (c === 'invalid_argument') return 'Non hai i permessi per modificare questa lista.';
  if (c === 'quota_exceeded') return 'Spazio esaurito: elimina qualche task completato.';
  if (c === 'revoked') return 'Accesso ai dati non più disponibile.';
  return 'Salvataggio non riuscito. Riprova tra poco.';
}
async function guard(p){ try { await p; } catch (e) { toast(errMsg(e)); } }
function changed(){ if (!S.db) persist(); render(); }

const api = {
  saveTask(t){ S.tasks[t.id] = t; changed(); if (S.db) return guard(S.db.doc('tasks/' + t.id).set(t)); },
  patchTask(id, p){ if (!S.tasks[id]) return; Object.assign(S.tasks[id], p); changed(); if (S.db) return guard(S.db.doc('tasks/' + id).update(p)); },
  deleteTask(id){ delete S.tasks[id]; changed(); if (S.db) return guard(S.db.doc('tasks/' + id).delete()); },
  saveProject(p){ S.projects[p.id] = p; changed(); if (S.db) return guard(S.db.doc('projects/' + p.id).set(p)); },
  async deleteProject(id){
    const moved = Object.values(S.tasks).filter(t => t.project === id);
    delete S.projects[id];
    for (const t of moved) await api.patchTask(t.id, {project:null});
    changed();
    if (S.db) await guard(S.db.doc('projects/' + id).delete());
  },
};

/* ---------- parsing ---------- */
function parseQuick(text){
  const r = {title:'', due:null, priority:4, project:null, labels:[]}, keep = [];
  for (const w of text.trim().split(/\s+/)) {
    if (!w) continue;
    const n = norm(w); let m;
    if (/^p[1-4]$/.test(n)) r.priority = +n[1];
    else if (w.length > 1 && w[0] === '#') r.project = w.slice(1);
    else if (w.length > 1 && w[0] === '@') { const l = w.slice(1).toLowerCase(); if (!r.labels.includes(l)) r.labels.push(l); }
    else if (n === 'oggi') r.due = todayIso();
    else if (n === 'domani') r.due = iso(addDays(new Date(), 1));
    else if (n === 'dopodomani') r.due = iso(addDays(new Date(), 2));
    else if (WEEKDAYS.includes(n)) { const d = (WEEKDAYS.indexOf(n) - new Date().getDay() + 7) % 7 || 7; r.due = iso(addDays(new Date(), d)); }
    else if ((m = n.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/))) {
      const day = +m[1], mon = +m[2]; let y = m[3] ? +m[3] : new Date().getFullYear(); if (y < 100) y += 2000;
      let d = new Date(y, mon-1, day);
      if (d.getMonth() !== mon-1 || d.getDate() !== day) { keep.push(w); continue; }
      if (!m[3] && iso(d) < todayIso()) d = new Date(y+1, mon-1, day);
      r.due = iso(d);
    }
    else keep.push(w);
  }
  r.title = keep.join(' ');
  return r;
}
const projKey = s => norm(s).replace(/\s+/g, '');
const findProject = name => Object.values(S.projects).find(p => projKey(p.name) === projKey(name));

/* ---------- formatting ---------- */
function dueInfo(s){
  const n = dayDiff(s), d = fromIso(s);
  let label, cls = '';
  if (n === 0) { label = 'Oggi'; cls = 'today'; }
  else if (n === 1) { label = 'Domani'; cls = 'tomorrow'; }
  else if (n === -1) label = 'Ieri';
  else if (n > 1 && n < 7) { label = cap(fmtWeekday.format(d)); cls = 'week'; }
  else label = fmtShort.format(d) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  if (n < 0) cls = 'overdue';
  return {label, cls};
}
const cmp = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.priority - b.priority || (a.created || 0) - (b.created || 0);
const openTasks = () => Object.values(S.tasks).filter(t => !t.done);
const inInbox = t => !t.project || !S.projects[t.project];
const sortedProjects = () => Object.values(S.projects).sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));

/* ---------- views ---------- */
function viewData(){
  const v = S.view, open = openTasks(), td = todayIso();
  const overdue = open.filter(t => t.due && t.due < td).sort(cmp);
  if (v === 'inbox') return {title:'Inbox', groups:[{items:open.filter(inInbox).sort(cmp)}], empty:['Inbox vuota', 'Scrivi qui sopra per aggiungere il primo task.']};
  if (v === 'today') {
    const today = open.filter(t => t.due === td).sort(cmp);
    const groups = overdue.length ? [{label:'In ritardo', cls:'overdue', items:overdue}, {label:'Oggi', items:today, none:'Niente in programma per oggi.'}] : [{items:today}];
    return {title:'Oggi', sub:cap(fmtLong.format(new Date())), groups, empty:['Giornata libera', 'Nessun task per oggi. Goditi la calma.']};
  }
  if (v === 'upcoming') {
    const groups = overdue.length ? [{label:'In ritardo', cls:'overdue', items:overdue}] : [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(new Date(), i), s = iso(d);
      const pre = i === 0 ? 'Oggi · ' : i === 1 ? 'Domani · ' : '';
      groups.push({label:pre + cap(fmtLong.format(d)), items:open.filter(t => t.due === s).sort(cmp), none:'—', date:s});
    }
    const last = iso(addDays(new Date(), 6));
    const later = open.filter(t => t.due && t.due > last).sort(cmp);
    if (later.length) groups.push({label:'Più avanti', items:later});
    return {title:'Prossimi 7 giorni', groups, keepEmpty:true};
  }
  if (v === 'done') {
    const done = Object.values(S.tasks).filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 200);
    return {title:'Completate', groups:[{items:done}], noAdd:true, empty:['Ancora niente', 'I task completati compariranno qui.']};
  }
  if (v.startsWith('p:')) {
    const p = S.projects[v.slice(2)];
    if (!p) { S.view = 'inbox'; return viewData(); }
    return {title:p.name, project:p, groups:[{items:open.filter(t => t.project === p.id).sort(cmp)}], empty:['Progetto vuoto', 'Aggiungi il primo task qui sopra.']};
  }
  if (v.startsWith('l:')) {
    const l = v.slice(2);
    return {title:'@' + l, groups:[{items:open.filter(t => (t.labels || []).includes(l)).sort(cmp)}], empty:['Nessun task', 'Nessun task aperto con questa etichetta.']};
  }
  S.view = 'today'; return viewData();
}

function taskHtml(t, showProject){
  const p = t.project && S.projects[t.project];
  const due = t.due ? dueInfo(t.due) : null;
  const meta = [
    due ? `<span class="due ${t.done ? '' : due.cls}">${I.cal}${esc(due.label)}</span>` : '',
    ...(t.labels || []).map(l => `<span class="lab">@${esc(l)}</span>`),
    showProject ? `<span class="proj">${p ? `<i style="background:${esc(p.color)}"></i>${esc(p.name)}` : 'Inbox'}</span>` : '',
  ].join('');
  return `<div class="task${t.done ? ' done' : ''}" data-id="${esc(t.id)}">
    <button class="check p${t.priority || 4}" data-act="toggle" aria-label="${t.done ? 'Segna come da fare' : 'Completa'}: ${esc(t.title)}">${I.check}</button>
    <button class="tbody" data-act="open">
      <span class="ttitle">${esc(t.title)}</span>
      ${t.desc ? `<span class="tdesc">${esc(t.desc.split('\n')[0])}</span>` : ''}
      ${meta ? `<span class="meta">${meta}</span>` : ''}
    </button>
  </div>`;
}

function render(){
  // sidebar
  const open = openTasks(), td = todayIso();
  const navItem = (key, icon, name, count) => `<button class="nav-item${S.view === key ? ' active' : ''}" data-view="${esc(key)}">${icon}<span class="name">${esc(name)}</span>${count ? `<span class="count">${count}</span>` : ''}</button>`;
  $('#nav-main').innerHTML =
    navItem('inbox', I.inbox, 'Inbox', open.filter(inInbox).length) +
    navItem('today', I.today, 'Oggi', open.filter(t => t.due && t.due <= td).length) +
    navItem('upcoming', I.upcoming, 'Prossimi 7 giorni', 0) +
    navItem('done', I.done, 'Completate', 0);
  const projs = sortedProjects();
  $('#nav-proj').innerHTML = projs.length
    ? projs.map(p => navItem('p:' + p.id, `<span class="dot" style="background:${esc(p.color)}"></span>`, p.name, open.filter(t => t.project === p.id).length)).join('')
    : '<div class="side-empty">Nessun progetto</div>';
  const labels = [...new Set(open.flatMap(t => t.labels || []))].sort();
  $('#nav-labels').innerHTML = labels.length
    ? labels.map(l => navItem('l:' + l, I.label, l, open.filter(t => (t.labels || []).includes(l)).length)).join('')
    : '<div class="side-empty">Usa @etichetta nel testo</div>';
  const st = $('#status');
  st.classList.toggle('sync', !!S.db);
  st.querySelector('span').textContent = S.db ? 'Sincronizzato · condiviso con chi apre la pagina' : 'Salvato solo su questo browser';

  if (S.loading) { $('#list').innerHTML = '<div class="loading">Caricamento dei task…</div>'; return; }

  const v = viewData();
  $('#title').textContent = v.title;
  $('#subtitle').textContent = v.sub || '';
  $('#subtitle').hidden = !v.sub;
  $('#del-proj').hidden = !v.project;
  $('#quick-form').hidden = !!v.noAdd;
  document.querySelector('.hint').hidden = !!v.noAdd;

  const showProject = !v.project;
  const total = v.groups.reduce((n, g) => n + g.items.length, 0);
  if (!total && !v.keepEmpty) {
    $('#list').innerHTML = `<div class="empty"><b>${esc(v.empty[0])}</b>${esc(v.empty[1])}</div>`;
    return;
  }
  $('#list').innerHTML = `<div class="groups">${v.groups.map(g => `
    <section class="group">
      ${g.label ? `<h3 class="${g.cls || ''}">${esc(g.label)}${g.items.length ? `<small>${g.items.length}</small>` : ''}</h3>` : ''}
      ${g.items.length ? g.items.map(t => taskHtml(t, showProject)).join('') : (g.none ? `<div class="none">${esc(g.none)}</div>` : '')}
    </section>`).join('')}</div>`;
}

/* ---------- interactions ---------- */
function setView(v){
  S.view = v;
  try { localStorage.setItem('azenda-view', v); } catch {}
  document.body.classList.remove('nav-open'); $('#nav-scrim').hidden = true;
  $('#del-proj').classList.remove('armed'); $('#del-proj').textContent = 'Elimina progetto';
  render();
  document.querySelector('main').scrollTop = 0;
}

let toastTimer;
function toast(msg, actLabel, act){
  $('#toast-msg').textContent = msg;
  const b = $('#toast-act');
  b.hidden = !actLabel; b.textContent = actLabel || ''; b.onclick = () => { $('#toast').hidden = true; act && act(); };
  $('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 5000);
}

function updateChips(){
  const val = $('#quick').value, r = parseQuick(val);
  $('#quick-btn').disabled = !r.title;
  const chips = [];
  if (r.due) chips.push(`${I.cal} ${esc(dueInfo(r.due).label)}`);
  if (r.priority < 4) chips.push(`P${r.priority}`);
  if (r.project) chips.push('#' + esc(findProject(r.project)?.name || r.project + ' (nuovo)'));
  r.labels.forEach(l => chips.push('@' + esc(l)));
  $('#chips').innerHTML = chips.map(c => `<span class="chip">${c}</span>`).join('');
  $('#chips').hidden = !chips.length;
}

async function quickAdd(e){
  e.preventDefault();
  const r = parseQuick($('#quick').value);
  if (!r.title) return;
  let project = S.view.startsWith('p:') ? S.view.slice(2) : null;
  if (r.project) {
    let p = findProject(r.project);
    if (!p) { p = {id:uid(), name:r.project, color:COLORS[Object.keys(S.projects).length % COLORS.length], order:Date.now()}; await api.saveProject(p); }
    project = p.id;
  }
  const label = S.view.startsWith('l:') ? S.view.slice(2) : null;
  if (label && !r.labels.includes(label)) r.labels.push(label);
  const due = r.due || (S.view === 'today' ? todayIso() : null);
  const t = {id:uid(), title:r.title, desc:'', due, priority:r.priority, labels:r.labels, project, done:false, doneAt:null, created:Date.now()};
  $('#quick').value = ''; updateChips();
  await api.saveTask(t);
  const where = project ? S.projects[project]?.name : 'Inbox';
  const visible = viewData().groups.some(g => g.items.some(x => x.id === t.id));
  if (!visible) toast(`Aggiunto in ${where}${due ? ' · ' + dueInfo(due).label : ''}`, 'Apri', () => openEditor(t.id));
}

function toggleTask(id, row){
  const t = S.tasks[id]; if (!t) return;
  if (t.done) { api.patchTask(id, {done:false, doneAt:null}); return; }
  row.classList.add('leaving');
  setTimeout(() => {
    api.patchTask(id, {done:true, doneAt:Date.now()});
    toast('Task completato', 'Annulla', () => api.patchTask(id, {done:false, doneAt:null}));
  }, 260);
}

/* editor */
let editing = null;
function openEditor(id){
  const t = S.tasks[id]; if (!t) return;
  editing = id;
  $('#ed-title').value = t.title;
  $('#ed-desc').value = t.desc || '';
  $('#ed-due').value = t.due || '';
  $('#ed-prio').value = String(t.priority || 4);
  $('#ed-proj').innerHTML = '<option value="">Inbox</option>' + sortedProjects().map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  $('#ed-proj').value = t.project && S.projects[t.project] ? t.project : '';
  $('#ed-labels').value = (t.labels || []).join(', ');
  const del = $('#ed-delete'); del.classList.remove('armed'); del.textContent = 'Elimina';
  $('#editor').hidden = false; $('#ed-scrim').hidden = false;
  $('#ed-title').focus();
}
function closeEditor(){ editing = null; $('#editor').hidden = true; $('#ed-scrim').hidden = true; }
function saveEditor(e){
  e.preventDefault();
  const t = S.tasks[editing]; if (!t) return closeEditor();
  const title = $('#ed-title').value.trim(); if (!title) return;
  api.saveTask({...t,
    title, desc:$('#ed-desc').value.trim(), due:$('#ed-due').value || null,
    priority:+$('#ed-prio').value, project:$('#ed-proj').value || null,
    labels:[...new Set($('#ed-labels').value.split(',').map(s => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))],
  });
  closeEditor();
}

function bind(){
  $('#quick').addEventListener('input', updateChips);
  $('#quick-form').addEventListener('submit', quickAdd);
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-view]'); if (nav) return setView(nav.dataset.view);
  });
  $('#list').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const row = b.closest('.task'), id = row.dataset.id;
    if (b.dataset.act === 'toggle') toggleTask(id, row); else openEditor(id);
  });
  $('#add-proj-btn').addEventListener('click', () => { const f = $('#proj-form'); f.hidden = !f.hidden; if (!f.hidden) $('#proj-name').focus(); });
  $('#proj-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#proj-name').value.trim(); if (!name) return;
    const existing = findProject(name);
    const p = existing || {id:uid(), name, color:COLORS[Object.keys(S.projects).length % COLORS.length], order:Date.now()};
    if (!existing) await api.saveProject(p);
    $('#proj-name').value = ''; $('#proj-form').hidden = true;
    setView('p:' + p.id);
  });
  $('#proj-name').addEventListener('keydown', e => { if (e.key === 'Escape') $('#proj-form').hidden = true; });
  $('#del-proj').addEventListener('click', async () => {
    const b = $('#del-proj');
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Conferma: i task vanno in Inbox'; return; }
    const id = S.view.slice(2), name = S.projects[id]?.name;
    setView('inbox');
    await api.deleteProject(id);
    toast(`Progetto «${name}» eliminato`);
  });
  $('#editor').addEventListener('submit', saveEditor);
  $('#ed-cancel').addEventListener('click', closeEditor);
  $('#ed-scrim').addEventListener('click', closeEditor);
  $('#ed-delete').addEventListener('click', () => {
    const b = $('#ed-delete');
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Conferma eliminazione'; return; }
    const id = editing; closeEditor(); api.deleteTask(id); toast('Task eliminato');
  });
  $('#menu-btn').addEventListener('click', () => { document.body.classList.add('nav-open'); $('#nav-scrim').hidden = false; });
  $('#nav-scrim').addEventListener('click', () => { document.body.classList.remove('nav-open'); $('#nav-scrim').hidden = true; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && editing) return closeEditor();
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === 'q' || e.key === 'Q') && !['input','textarea','select'].includes(tag) && !editing && !e.metaKey && !e.ctrlKey) {
      e.preventDefault(); if (!$('#quick-form').hidden) $('#quick').focus();
    }
  });
  // refresh date-based groups when the day changes
  let lastDay = todayIso();
  setInterval(() => { if (todayIso() !== lastDay) { lastDay = todayIso(); render(); } }, 60000);
}

async function init(){
  bind();
  const c = window.claude;
  if (c && typeof c.use === 'function') {
    S.loading = true; render();
    let db = null;
    try { db = await c.use('db'); } catch {}
    if (db) { S.db = db; subscribe(); return; }
  }
  loadLocal(); S.loading = false; render();
}
init();
