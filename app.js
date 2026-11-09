// Cabe no Dia — agenda pensada para TDAH, com contas Google e agenda compartilhada.
import { firebaseConfig } from "./firebase-config.js";

/* =====================================================================
   Cores e categorias
   ===================================================================== */
const COLORS = ["teal", "amber", "pink", "blue", "violet", "indigo", "green", "red", "orange", "brown"];
const colorVar = key => `var(--k-${COLORS.includes(key) ? key : "slate"})`;
const GERAL = { id: "geral", nome: "Geral", cor: "slate", palavras: "" };

const DEFAULT_CATS = [
  { id: "medicina", nome: "Medicina", cor: "teal",
    palavras: "prova, plantão, ambulatório, internato, estágio, aula, residência, paciente, hospital, estudar, estudo, revisar, revisão, simulado, pediatria, cirurgia, clínica, gineco, obstetrícia, preceptor, artigo, tcc, enfermaria, evolução, anatomia, fármaco, questões, caso clínico, ubs, rodízio, seminário, monitoria, osce" },
  { id: "biblia", nome: "Bíblia", cor: "amber",
    palavras: "bíblia, versículo, devocional, culto, igreja, oração, orar, salmo, evangelho, célula, louvor, jejum, provérbios, gênesis, pregação, estudo bíblico, ministério" },
  { id: "conteudo", nome: "Conteúdo", cor: "pink",
    palavras: "tiktok, vlog, reel, insta, youtube, postar, post, gravar, grava, editar, edição, vídeo, story, stories, roteiro, conteúdo, legenda, live, thumb, publi, collab, trend, feed" },
  { id: "viagem", nome: "Viagem", cor: "blue",
    palavras: "viagem, viajar, passagem, voo, hotel, airbnb, mala, passaporte, aeroporto, hospedagem, check-in, checkin, visto, seguro viagem, rodoviária" },
  { id: "lazer", nome: "Lazer", cor: "violet",
    palavras: "cinema, filme, série, praia, festa, show, jantar, barzinho, passeio, aniversário, rolê, encontro, massagem, descansar, museu, trilha, piquenique, happy hour, ler livro" },
  { id: "mensagens", nome: "Mensagens", cor: "indigo",
    palavras: "responder, resposta, mensagem, msg, ligar, whatsapp, zap, email, e-mail, retornar, mandar, avisar, dm, direct, agradecer, perguntar, cobrar" },
];

/* =====================================================================
   Datas
   ===================================================================== */
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayIso = () => iso(startToday());
const tomorrowIso = () => iso(addDays(startToday(), 1));
const WD = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const WD_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WD_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const dayDiff = dIso => Math.round((fromIso(dIso) - startToday()) / 86400000);
function whenLabel(t) {
  if (!t.date) return t.time || "";
  const diff = dayDiff(t.date);
  const d = fromIso(t.date);
  const dm = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  let s;
  if (diff === 0) s = "Hoje";
  else if (diff === 1) s = "Amanhã";
  else if (diff === -1) s = "Ontem";
  else if (diff > 1 && diff < 7) s = `${WD_SHORT[d.getDay()]} ${dm}`;
  else s = dm;
  return t.time ? `${s} · ${t.time}` : s;
}

/* =====================================================================
   Leitura do texto ("postar vlog hoje 18h")
   ===================================================================== */
// Tira acentos mantendo o mesmo tamanho, para poder recortar do texto original.
const FOLD = { "á":"a","à":"a","â":"a","ã":"a","ä":"a","é":"e","ê":"e","è":"e","ë":"e","í":"i","ì":"i","î":"i","ï":"i",
  "ó":"o","ò":"o","ô":"o","õ":"o","ö":"o","ú":"u","ù":"u","û":"u","ü":"u","ç":"c","ñ":"n" };
const fold = s => String(s).toLowerCase().replace(/[^\u0000-\u007f]/g, c => FOLD[c] || c);
const reEscape = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parse(raw, cats) {
  const original = raw.replace(/\s+/g, " ").trim();
  let f = fold(original);
  const cut = [];
  let date = null, time = null, area = null;
  const today = startToday();
  const all = [...cats, GERAL];

  const take = (re, fn) => {
    const m = re.exec(f);
    if (!m) return false;
    const lead = m[1] ? m[1].length : 0;
    if (fn(m) === false) return false;
    cut.push([m.index + lead, m.index + m[0].length]);
    f = f.slice(0, m.index + lead) + " ".repeat(m[0].length - lead) + f.slice(m.index + m[0].length);
    return true;
  };

  // #categoria explícita
  take(/(^|\s)#([a-z0-9-]+)/, m => {
    const k = m[2];
    const hit = all.find(c => fold(c.nome).replace(/\s+/g, "").startsWith(k) || c.id.startsWith(k));
    if (!hit) return false;
    area = hit.id;
  });

  // horário: 14h, 14h30, 14:30, às 9h (mas não "2h de estudo")
  take(/(^|\s)(?:as\s+|a\s+partir\s+das\s+)?(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?:min)?(?=\s|$|[,.!])(?!\s+de\s)/, m => {
    const h = +m[2], mi = +(m[3] || m[4] || 0);
    if (h > 23 || mi > 59) return false;
    time = `${pad(h)}:${pad(mi)}`;
  });

  // dd/mm(/aaaa)
  if (!date) take(/(^|\s)(?:no\s+dia\s+|dia\s+|em\s+|para\s+|pra\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$|[,.!])/, m => {
    const d = +m[2], mo = +m[3];
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return false;
    let y = m[4] ? +m[4] : today.getFullYear();
    if (y < 100) y += 2000;
    let dt = new Date(y, mo - 1, d);
    if (!m[4] && dt < today) dt = new Date(y + 1, mo - 1, d);
    date = iso(dt);
  });

  if (!date) take(/(^|\s)(?:para\s+|pra\s+)?depois\s+de\s+amanha(?=\s|$|[,.!])/, () => { date = iso(addDays(today, 2)); });
  if (!date) take(/(^|\s)(?:para\s+|pra\s+|de\s+)?amanha(?=\s|$|[,.!])/, () => { date = iso(addDays(today, 1)); });
  if (!date) take(/(^|\s)(?:para\s+|pra\s+|ainda\s+)?(?:hoje|hj)(?=\s|$|[,.!])/, () => { date = iso(today); });
  if (!date) take(/(^|\s)(?:no\s+|neste\s+|nesse\s+|esse\s+|este\s+)?(?:fim\s+de\s+semana|fds)(?=\s|$|[,.!])/, () => {
    date = iso(addDays(today, (6 - today.getDay() + 7) % 7));
  });
  if (!date) take(/(^|\s)(?:na\s+)?(?:semana\s+que\s+vem|proxima\s+semana)(?=\s|$|[,.!])/, () => {
    date = iso(addDays(today, ((1 - today.getDay() + 7) % 7) || 7));
  });
  if (!date) take(/(^|\s)(?:na\s+|no\s+|nesta\s+|neste\s+|nessa\s+|nesse\s+|essa\s+|esse\s+|esta\s+|este\s+|(proxima|proximo)\s+|ate\s+(?:a\s+|o\s+)?)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[-\s]feira)?(?=\s|$|[,.!])/, m => {
    let add = (WD.indexOf(m[3]) - today.getDay() + 7) % 7;
    if (m[2] && add === 0) add = 7;
    date = iso(addDays(today, add));
  });
  if (!date) take(/(^|\s)(?:no\s+)?dia\s+(\d{1,2})(?=\s|$|[,.!])/, m => {
    const d = +m[2];
    if (d < 1 || d > 31) return false;
    let dt = new Date(today.getFullYear(), today.getMonth(), d);
    if (dt < today) dt = new Date(today.getFullYear(), today.getMonth() + 1, d);
    date = iso(dt);
  });

  let title = original;
  cut.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { title = title.slice(0, a) + " " + title.slice(b); });
  title = title.replace(/\s+/g, " ").trim()
    .replace(/[\s,.;-]+$/g, "")
    .replace(/\s+(na|no|para|pra|as|às|dia|de|em|até|ate)$/i, "")
    .trim() || original;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // categoria pelas palavras de cada uma (e pelo próprio nome)
  let sure = true;
  if (!area) {
    const ft = " " + fold(title) + " ";
    const scores = [];
    for (const c of cats) {
      const words = [c.nome, ...String(c.palavras || "").split(",")].map(w => fold(w).trim()).filter(w => w.length > 1);
      let n = 0;
      for (const w of new Set(words)) if (new RegExp("[^a-z0-9]" + reEscape(w)).test(ft)) n++;
      if (n) scores.push([c.id, n]);
    }
    scores.sort((a, b) => b[1] - a[1]);
    if (scores.length && (scores.length === 1 || scores[0][1] > scores[1][1])) area = scores[0][0];
    else { area = "geral"; sure = false; }
  }
  return { title, area, date, time, sure };
}

/* =====================================================================
   Armazenamento: só neste aparelho (LocalStore) ou na conta (CloudStore)
   ===================================================================== */
const LOCAL_KEY = "cabe-no-dia.v1";
const PREFS_KEY = "cabe-no-dia.prefs";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clean = obj => { const o = {}; for (const [k, v] of Object.entries(obj)) if (v !== undefined && k !== "id") o[k] = v; return o; };

function readJSON(key, fallback) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch (e) { return fallback; } }
function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
const prefs = Object.assign({ tab: "hoje" }, readJSON(PREFS_KEY, {}));
const savePrefs = () => writeJSON(PREFS_KEY, prefs);

class LocalStore {
  constructor() {
    this.kind = "local";
    const data = readJSON(LOCAL_KEY, null);
    this.fresh = !data;
    this.tasks = data && Array.isArray(data.tasks) ? data.tasks : [];
    this.cats = data && Array.isArray(data.cats) ? data.cats : structuredClone(DEFAULT_CATS);
    if (this.fresh) this.tasks = exampleTasks();
    this.ok = this.persist();
  }
  persist() { this.ok = writeJSON(LOCAL_KEY, { v: 2, tasks: this.tasks, cats: this.cats }); return this.ok; }
  subscribe(cb) { this.cb = cb; this.emit(); return () => { this.cb = null; }; }
  emit() { this.persist(); this.cb && this.cb({ tasks: this.tasks.slice(), cats: this.cats.slice(), agenda: null, synced: true }); }
  async add(t) { this.tasks.push({ ...t }); this.emit(); }
  async update(id, patch) { const t = this.tasks.find(x => x.id === id); if (t) Object.assign(t, patch); this.emit(); }
  async remove(id) { this.tasks = this.tasks.filter(x => x.id !== id); this.emit(); }
  async bulkAdd(list) { const ids = new Set(this.tasks.map(t => t.id)); list.forEach(t => { if (!ids.has(t.id)) this.tasks.push({ ...t }); }); this.emit(); }
  async bulkUpdate(pairs) { pairs.forEach(([id, p]) => { const t = this.tasks.find(x => x.id === id); if (t) Object.assign(t, p); }); this.emit(); }
  async bulkRemove(ids) { const s = new Set(ids); this.tasks = this.tasks.filter(t => !s.has(t.id)); this.emit(); }
  async setCats(cats) { this.cats = cats; this.emit(); }
  stop() { this.cb = null; }
}

function exampleTasks() {
  const t = startToday(), d = n => iso(addDays(t, n));
  const ex = (title, area, date, time, done) => ({
    id: uid(), title, area, date, time: time || null, done: !!done, doneOn: done ? iso(t) : null,
    doneAt: done ? Date.now() : null, created: Date.now(), example: true,
  });
  return [
    ex("Leitura de Salmos 23", "biblia", d(0), "07:00", true),
    ex("Revisar casos de pediatria", "medicina", d(0)),
    ex("Responder o grupo do internato", "mensagens", d(0)),
    ex("Postar vlog no TikTok", "conteudo", d(0), "18:00"),
    ex("Reagendar reunião", "geral", d(-1)),
    ex("Prova de clínica médica", "medicina", d(3), "08:00"),
    ex("Cinema com as amigas", "lazer", d(5), "20:00"),
    ex("Comprar passagem da viagem", "viagem", null),
    ex("Agendar exame de rotina", "geral", null),
  ];
}

// Conta na nuvem (Firebase). Só carrega se o firebase-config.js estiver preenchido.
const FB_VERSION = "10.12.2";
const cloudConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
let fb = null; // { A, F, auth, db }

class CloudStore {
  constructor(agendaId) {
    this.kind = "cloud";
    this.id = agendaId;
    this.ok = true;
    const { F, db } = fb;
    this.F = F;
    this.agendaRef = F.doc(db, "agendas", agendaId);
    this.tasksRef = F.collection(db, "agendas", agendaId, "tasks");
  }
  subscribe(cb) {
    const F = this.F;
    let agenda = null, tasks = null, tSynced = false, aSynced = false;
    const emit = () => {
      if (!agenda || !tasks) return;
      cb({ tasks, cats: Array.isArray(agenda.cats) ? agenda.cats : [], agenda: { id: this.id, ...agenda }, synced: aSynced && tSynced });
    };
    const onErr = e => { console.warn(e); this.ok = false; cb({ error: e }); };
    this.u1 = F.onSnapshot(this.agendaRef, { includeMetadataChanges: true }, s => {
      if (!s.exists()) { onErr({ code: "not-found" }); return; }
      agenda = s.data(); aSynced = !s.metadata.fromCache; emit();
    }, onErr);
    this.u2 = F.onSnapshot(this.tasksRef, { includeMetadataChanges: true }, qs => {
      tasks = qs.docs.map(d => ({ ...d.data(), id: d.id })); tSynced = !qs.metadata.fromCache; emit();
    }, onErr);
    return () => this.stop();
  }
  stop() { this.u1 && this.u1(); this.u2 && this.u2(); this.u1 = this.u2 = null; }
  w(p) { return p.catch(e => { console.warn(e); toast(e && e.code === "permission-denied" ? "Sem permissão para mudar esta agenda" : "Não consegui salvar. Tento de novo quando a internet voltar."); }); }
  add(t) { return this.w(this.F.setDoc(this.F.doc(this.tasksRef, t.id), clean({ ...t, createdBy: t.createdBy || me()?.uid || null }))); }
  update(id, patch) { return this.w(this.F.updateDoc(this.F.doc(this.tasksRef, id), clean(patch))); }
  remove(id) { return this.w(this.F.deleteDoc(this.F.doc(this.tasksRef, id))); }
  async batched(list, fn) {
    for (let i = 0; i < list.length; i += 400) {
      const b = this.F.writeBatch(fb.db);
      list.slice(i, i + 400).forEach(item => fn(b, item));
      await this.w(b.commit());
    }
  }
  bulkAdd(list) { return this.batched(list, (b, t) => b.set(this.F.doc(this.tasksRef, t.id), clean({ ...t, createdBy: t.createdBy || me()?.uid || null }))); }
  bulkUpdate(pairs) { return this.batched(pairs, (b, [id, p]) => b.update(this.F.doc(this.tasksRef, id), clean(p))); }
  bulkRemove(ids) { return this.batched(ids, (b, id) => b.delete(this.F.doc(this.tasksRef, id))); }
  setCats(cats) { return this.w(this.F.updateDoc(this.agendaRef, { cats })); }
}

/* =====================================================================
   Estado
   ===================================================================== */
const state = {
  tasks: [], cats: structuredClone(DEFAULT_CATS), agenda: null, synced: true,
  user: null, agendas: [], invites: [], activeAgendaId: null, cloudError: null,
};
let store = null, unsub = null;
let lastUndo = null;
let holdUntil = 0;

const me = () => state.user;
const catsAll = () => [...state.cats, GERAL];
const catById = id => catsAll().find(c => c.id === id) || GERAL;
const catColor = id => colorVar(catById(id).cor);

function useStore(next) {
  if (unsub) unsub();
  if (store && store.stop) store.stop();
  store = next;
  unsub = store.subscribe(onData);
}
function onData(d) {
  if (d.error) {
    if (d.error.code === "not-found" || d.error.code === "permission-denied") {
      // Saiu ou foi removido da agenda: volta para a pessoal.
      const personal = state.userDoc?.personalAgendaId;
      if (personal && state.activeAgendaId !== personal) { switchAgenda(personal); toast("Você não tem mais acesso àquela agenda"); return; }
    }
    state.cloudError = d.error; render(); return;
  }
  state.tasks = d.tasks; state.cats = d.cats; state.agenda = d.agenda; state.synced = d.synced;
  if (prefs.tab !== "hoje" && prefs.tab !== "algumdia" && !state.cats.some(c => c.id === prefs.tab)) prefs.tab = "hoje";
  render();
}

/* =====================================================================
   Seleções
   ===================================================================== */
const isLate = t => !t.done && t.date && t.date < todayIso();
const byTime = (a, b) => (a.time || "99").localeCompare(b.time || "99") || (a.created || 0) - (b.created || 0);
const byDate = (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || byTime(a, b);
const doneRecent = list => list.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
const areaOf = t => state.cats.some(c => c.id === t.area) ? t.area : "geral";

function dayTasks() {
  const td = todayIso();
  return state.tasks.filter(t => (!t.done && t.date && t.date <= td) || (t.done && t.doneOn === td));
}
function countFor(tab) {
  const td = todayIso();
  if (tab === "hoje") return { n: state.tasks.filter(t => !t.done && t.date && t.date <= td).length, late: state.tasks.some(isLate) };
  if (tab === "algumdia") return { n: state.tasks.filter(t => !t.done && (!t.date || areaOf(t) === "geral")).length, late: false };
  const list = state.tasks.filter(t => areaOf(t) === tab && !t.done);
  return { n: list.length, late: list.some(isLate) };
}

/* =====================================================================
   Render
   ===================================================================== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const firstName = n => String(n || "").trim().split(/\s+/)[0] || "";
const initials = n => (String(n || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("") || "?").toUpperCase();
function faceHtml(p, cls = "face") {
  if (p && p.photo) return `<img class="${cls}" src="${esc(p.photo)}" alt="" referrerpolicy="no-referrer">`;
  return `<span class="${cls}">${esc(initials(p && (p.name || p.email)))}</span>`;
}
const memberList = () => {
  const a = state.agenda; if (!a) return [];
  return (a.members || []).map(id => ({ uid: id, ...(a.memberInfo?.[id] || {}) }));
};
const isShared = () => memberList().length > 1;

function renderHeader() {
  const now = new Date(), h = now.getHours();
  $("#greet").textContent = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  if (me()) $("#greet").textContent += `, ${firstName(me().name)}`;
  $("#today-title").textContent = `${WD_LONG[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`;

  const btn = $("#open-settings");
  if (me()) {
    btn.classList.add("has-avatar");
    btn.innerHTML = faceHtml(me(), "avatar");
  } else if (btn.classList.contains("has-avatar")) {
    btn.classList.remove("has-avatar");
    btn.innerHTML = GEAR;
  }

  const pill = $("#agenda-pill");
  if (store?.kind === "cloud" && state.agenda) {
    const members = memberList();
    const own = state.agenda.ownerUid === me()?.uid;
    const label = isShared()
      ? `${esc(state.agenda.name)} · ${members.length} pessoas`
      : (state.agendas.length > 1 ? esc(state.agenda.name) : (own ? "Compartilhar agenda" : esc(state.agenda.name)));
    pill.innerHTML = `<span class="faces">${members.slice(0, 3).map(m => faceHtml(m)).join("")}</span><span class="label">${label}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>`;
    pill.hidden = false;
  } else pill.hidden = true;

  const list = dayTasks();
  const done = list.filter(t => t.done).length;
  const pct = list.length ? Math.round(done / list.length * 100) : 0;
  $("#pfill").style.width = pct + "%";
  $("#pbar").setAttribute("aria-valuenow", pct);
  $("#ppct").textContent = pct + "%";
  $("#ptext").textContent = !list.length ? "Nada para hoje ainda"
    : done === list.length ? `Tudo feito! ${done} de ${list.length}`
    : `${done} de ${list.length} feitas hoje`;
}

function tabsList() { return [{ id: "hoje", nome: "Hoje" }, ...state.cats, { id: "algumdia", nome: "Algum dia" }]; }
function renderTabs() {
  $("#tabs").innerHTML = tabsList().map(t => {
    const c = countFor(t.id);
    const dot = t.id === "hoje" ? "" : `<span class="dot" style="--c:${t.id === "algumdia" ? colorVar("slate") : colorVar(t.cor)}"></span>`;
    return `<button class="tab" role="tab" data-tab="${esc(t.id)}" aria-selected="${prefs.tab === t.id}">${dot}${esc(t.nome)}${c.n ? `<span class="count${c.late ? " late" : ""}">${c.n}</span>` : ""}</button>`;
  }).join("") + `<button class="tab add-tab" data-act="edit-cats" aria-label="Editar categorias"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Categoria</button>`;
  const sel = document.querySelector(`.tab[aria-selected="true"]`);
  if (sel) sel.scrollIntoView({ block: "nearest", inline: "nearest" });
}

const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const ICON_NEXT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>`;
const GEAR = document.querySelector("#open-settings").innerHTML;

function taskHtml(t, opts = {}) {
  const late = isLate(t);
  const area = areaOf(t);
  const meta = [];
  if (opts.showArea !== false) meta.push(`<span class="tag"><span class="dot" style="--c:${catColor(area)}"></span>${esc(catById(area).nome)}</span>`);
  const shown = opts.hideToday && t.date === todayIso() ? (t.time || "") : whenLabel(t);
  if (shown) meta.push(`<span class="when${late ? " late" : ""}">${late ? "Atrasada · " : ""}${esc(shown)}</span>`);
  if (isShared() && t.createdBy && t.createdBy !== me()?.uid) {
    const who = state.agenda.memberInfo?.[t.createdBy];
    if (who) meta.push(`<span>por ${esc(firstName(who.name) || who.email)}</span>`);
  }
  let move = "";
  if (!t.done) move = t.date
    ? `<button class="move" data-act="tomorrow" aria-label="Passar para amanhã">${ICON_NEXT}<span>Amanhã</span></button>`
    : `<button class="move" data-act="today" aria-label="Fazer hoje">Hoje</button>`;
  return `<div class="task${late ? " late" : ""}${t.done ? " is-done" : ""}" data-id="${esc(t.id)}" style="--c:${catColor(area)}">
    <button class="check" data-act="toggle" aria-label="${t.done ? "Desmarcar" : "Marcar como feita"}: ${esc(t.title)}"><span>${ICON_CHECK}</span></button>
    <button class="t-body" data-act="edit"><span class="t-title">${esc(t.title)}</span>${meta.length ? `<span class="t-meta">${meta.join("")}</span>` : ""}</button>
    ${move}
  </div>`;
}
function section(title, list, opts = {}) {
  if (!list.length) return "";
  return `<section class="section"><div class="section-title${opts.late ? " late" : ""}"><span>${title}</span>${opts.hint ? `<span class="hint">${opts.hint}</span>` : ""}</div>${list.map(t => taskHtml(t, opts)).join("")}</section>`;
}
const empty = (title, text) => `<div class="empty"><strong>${title}</strong>${text}</div>`;

function bannersHtml() {
  let h = "";
  for (const inv of state.invites) {
    const owner = inv.memberInfo?.[inv.ownerUid];
    h += `<div class="banner invite"><span><strong>${esc(owner?.name || "Alguém")}</strong> compartilhou a agenda “${esc(inv.name)}” com você.</span>
      <span class="banner-actions"><button class="btn small primary" data-act="accept" data-agenda="${esc(inv.id)}">Aceitar</button><button class="btn small" data-act="decline" data-agenda="${esc(inv.id)}">Recusar</button></span></div>`;
  }
  if (store?.kind === "local" && !store.ok) h += `<div class="banner warn">Este navegador não está deixando salvar. Abra pelo app instalado ou baixe um backup nos ajustes.</div>`;
  if (state.cloudError && store?.kind === "cloud") h += `<div class="banner warn">Não consegui abrir esta agenda agora. Verifique a internet; se continuar, confira as regras do Firebase (veja o LEIAME).</div>`;
  if (store?.kind === "cloud" && pendingMigration()) {
    const n = localTasksToMigrate().length;
    h += `<div class="banner"><span>Você tem ${n} tarefa${n === 1 ? "" : "s"} salva${n === 1 ? "" : "s"} só neste celular.</span>
      <span class="banner-actions"><button class="btn small primary" data-act="migrate">Trazer para a conta</button><button class="btn small" data-act="skip-migrate">Agora não</button></span></div>`;
  }
  if (store?.kind === "local" && cloudConfigured && !prefs.hideLoginTip) {
    h += `<div class="banner"><span>Entre com sua conta Google para guardar na nuvem e compartilhar a agenda.</span>
      <span class="banner-actions"><button class="btn small primary" data-act="login">Entrar</button><button class="btn small" data-act="hide-login">Depois</button></span></div>`;
  }
  if (state.tasks.some(t => t.example)) h += `<div class="banner"><span>Estas tarefas são exemplos para você ver como funciona.</span><button class="link-btn" data-act="clear-examples">Apagar exemplos</button></div>`;
  return h;
}

function renderList() {
  const wait = holdUntil - Date.now();
  if (wait > 0) { clearTimeout(renderList.t); renderList.t = setTimeout(renderList, wait); return; }
  const td = todayIso();
  const all = state.tasks;
  let html = bannersHtml();

  if (prefs.tab === "hoje") {
    const late = all.filter(isLate).sort(byDate);
    const today = all.filter(t => !t.done && t.date === td).sort(byTime);
    const done = all.filter(t => t.done && t.doneOn === td).sort((a, b) => (a.doneAt || 0) - (b.doneAt || 0));
    html += section("Ficou pra trás", late, { late: true, hint: "sem culpa, só reorganizar" });
    html += section("Hoje", today, { hideToday: true });
    if (!late.length && !today.length) html += done.length
      ? empty("Dia concluído.", "Você fez tudo o que estava aqui. Pode descansar ou puxar algo de “Algum dia”.")
      : empty("Nada para hoje.", "Anote algo no campo acima, tipo “estudar cardio hoje”.");
    html += section("Feitas hoje", done, { hideToday: true });
  } else if (prefs.tab === "algumdia") {
    const someday = all.filter(t => !t.done && !t.date).sort((a, b) => (a.created || 0) - (b.created || 0));
    const geral = all.filter(t => !t.done && t.date && areaOf(t) === "geral").sort(byDate);
    html += section("Algum dia", someday, { hint: "sem data, mas sem esquecer" });
    html += section("Geral com data", geral, { showArea: false });
    if (!someday.length && !geral.length) html += empty("Nada solto por aqui.", "Coisas sem data, como “agendar exame”, ficam guardadas nesta aba.");
    html += section("Feitas", doneRecent(all.filter(t => !t.date || areaOf(t) === "geral")));
  } else {
    const mine = all.filter(t => areaOf(t) === prefs.tab);
    const o = { showArea: false };
    const late = mine.filter(isLate).sort(byDate);
    const today = mine.filter(t => !t.done && t.date === td).sort(byTime);
    const next = mine.filter(t => !t.done && t.date && t.date > td).sort(byDate);
    const none = mine.filter(t => !t.done && !t.date).sort((a, b) => (a.created || 0) - (b.created || 0));
    html += section("Atrasadas", late, { ...o, late: true });
    html += section("Hoje", today, { ...o, hideToday: true });
    html += section("Próximos dias", next, o);
    html += section("Sem data", none, o);
    if (!late.length && !today.length && !next.length && !none.length) {
      const nome = catById(prefs.tab).nome;
      html += empty(`Nada em ${esc(nome)}.`, `Escreva algo com #${esc(fold(nome).replace(/\s+/g, ""))} no fim para cair direto aqui.`);
    }
    html += section("Feitas", doneRecent(mine), o);
  }
  $("#list").innerHTML = html;
}

function render() { renderHeader(); renderTabs(); renderList(); }

function renderPreview() {
  const v = $("#add-input").value.trim();
  const el = $("#preview");
  if (!v) { el.innerHTML = `<span>Escreva do seu jeito. Eu descubro a categoria e o dia.</span>`; return; }
  const p = parse(v, state.cats);
  const when = p.date ? whenLabel(p) : (p.time || "Algum dia");
  el.innerHTML = `<span>Vai para</span><span class="chip"><span class="dot" style="--c:${catColor(p.area)}"></span>${esc(catById(p.area).nome)}</span><span class="chip">${esc(when)}</span>${p.sure ? "" : `<span>· dá pra mudar depois</span>`}`;
}

/* =====================================================================
   Ações nas tarefas
   ===================================================================== */
const find = id => state.tasks.find(t => t.id === id);
const PRAISE = ["Boa! Mais uma.", "Feito. Respira e segue.", "Uma a menos na cabeça.", "Isso aí!", "Andando bem.", "Ticou, brilhou.", "Pequeno passo, conta muito."];
const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
const pick = (t, keys) => Object.fromEntries(keys.map(k => [k, t[k] ?? null]));

function addFromInput() {
  const input = $("#add-input");
  const v = input.value.trim();
  if (!v) { input.focus(); return; }
  const p = parse(v, state.cats);
  const t = { id: uid(), title: p.title, area: p.area, date: p.date, time: p.time, done: false, doneOn: null, doneAt: null, created: Date.now(), createdBy: me()?.uid || null };
  store.add(t);
  lastUndo = () => store.remove(t.id);
  input.value = "";
  renderPreview();
  toast(`Anotado em ${catById(p.area).nome} · ${p.date ? whenLabel(p) : "Algum dia"}`, true);
}

function toggle(id, el) {
  const t = find(id); if (!t) return;
  const prev = pick(t, ["done", "doneOn", "doneAt"]);
  const nowDone = !t.done;
  lastUndo = () => store.update(id, prev);
  if (nowDone) {
    holdUntil = Date.now() + 650;
    const box = el.querySelector(".check span").getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2, catColor(areaOf(t)));
    try { navigator.vibrate && navigator.vibrate(18); } catch (e) {}
    el.classList.add("is-done");
    setTimeout(() => el.classList.add("leaving"), 380);
  }
  store.update(id, { done: nowDone, doneOn: nowDone ? todayIso() : null, doneAt: nowDone ? Date.now() : null });
  if (nowDone) {
    const fill = $("#pfill"); fill.classList.remove("shine"); void fill.offsetWidth; fill.classList.add("shine");
    const day = dayTasks();
    if (day.length && day.every(x => x.done)) { setTimeout(bigBurst, 300); toast("Dia completo! Você conseguiu.", true); }
    else toast(praise(), true);
  }
}

function move(id, where) {
  const t = find(id); if (!t) return;
  const prev = pick(t, ["date"]);
  lastUndo = () => store.update(id, prev);
  store.update(id, { date: where === "today" ? todayIso() : tomorrowIso() });
  toast(where === "today" ? "Puxada para hoje" : "Passada para amanhã", true);
}

function clearExamples() {
  const list = state.tasks.filter(t => t.example);
  lastUndo = () => store.bulkAdd(list);
  store.bulkRemove(list.map(t => t.id));
  toast("Exemplos apagados. Agora é com você!", true);
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(text, canUndo) {
  $("#toast-text").textContent = text;
  $("#toast-btn").hidden = !canUndo || !lastUndo;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
}
$("#toast-btn").addEventListener("click", () => {
  $("#toast").classList.remove("show");
  if (lastUndo) { const u = lastUndo; lastUndo = null; holdUntil = 0; u(); toast("Desfeito"); }
});

/* =====================================================================
   Folha: editar tarefa
   ===================================================================== */
const dlg = $("#edit-dlg");
let editing = null, eArea = "geral", delArmed = false;

function paintAreas() {
  $("#e-areas").innerHTML = catsAll().map(c => `<button type="button" data-area="${esc(c.id)}" style="--c:${colorVar(c.cor)}" aria-pressed="${c.id === eArea}"><span class="dot"></span>${esc(c.nome)}</button>`).join("");
}
function paintQuick() {
  const v = $("#e-date").value;
  document.querySelectorAll("#e-quick button").forEach(b => {
    const on = (b.dataset.q === "today" && v === todayIso()) || (b.dataset.q === "tomorrow" && v === tomorrowIso()) || (b.dataset.q === "none" && !v);
    b.setAttribute("aria-pressed", on);
  });
}
function openEdit(id) {
  const t = find(id); if (!t) return;
  editing = id; eArea = areaOf(t); delArmed = false;
  $("#e-title").value = t.title;
  $("#e-date").value = t.date || "";
  $("#e-time").value = t.time || "";
  $("#e-delete").textContent = "Apagar"; $("#e-delete").classList.remove("armed");
  paintAreas(); paintQuick();
  dlg.showModal();
}
$("#e-areas").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; eArea = b.dataset.area; paintAreas(); });
$("#e-quick").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  $("#e-date").value = b.dataset.q === "today" ? todayIso() : b.dataset.q === "tomorrow" ? tomorrowIso() : "";
  paintQuick();
});
$("#e-date").addEventListener("input", paintQuick);
$("#e-cancel").addEventListener("click", () => dlg.close());
$("#e-delete").addEventListener("click", () => {
  if (!delArmed) { delArmed = true; $("#e-delete").textContent = "Toque de novo para apagar"; $("#e-delete").classList.add("armed"); return; }
  const t = find(editing);
  if (t) { const copy = { ...t }; lastUndo = () => store.add(copy); store.remove(editing); }
  dlg.close(); toast("Tarefa apagada", true);
});
$("#edit-form").addEventListener("submit", e => {
  e.preventDefault();
  const t = find(editing); if (!t) { dlg.close(); return; }
  const title = $("#e-title").value.trim();
  if (!title) { $("#e-title").focus(); return; }
  const prev = pick(t, ["title", "area", "date", "time", "example"]);
  lastUndo = () => store.update(editing, prev);
  store.update(editing, { title, area: eArea, date: $("#e-date").value || null, time: $("#e-time").value || null, example: null });
  dlg.close(); toast("Salvo", true);
});
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

/* =====================================================================
   Folha: categorias
   ===================================================================== */
const cdlg = $("#cat-dlg");
let draft = [], openPalette = -1, armedDel = -1;

function openCats() {
  draft = state.cats.map(c => ({ ...c }));
  openPalette = -1; armedDel = -1;
  paintCats();
  cdlg.showModal();
}
function paintCats() {
  $("#cat-list").innerHTML = draft.map((c, i) => `
    <div class="cat-row" data-i="${i}">
      <div class="cat-top">
        <button type="button" class="swatch" data-cat="color" style="--c:${colorVar(c.cor)}" aria-label="Trocar cor de ${esc(c.nome || "nova categoria")}"></button>
        <input class="text-in cat-name" data-cat="name" value="${esc(c.nome)}" placeholder="Nome da categoria" aria-label="Nome">
        <span class="cat-tools">
          <button type="button" data-cat="up" aria-label="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-cat="down" aria-label="Descer" ${i === draft.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" data-cat="del" class="${armedDel === i ? "armed" : ""}" aria-label="Apagar">${armedDel === i ? "Apagar?" : "✕"}</button>
        </span>
      </div>
      ${openPalette === i ? `<div class="palette">${COLORS.map(k => `<button type="button" data-cat="pick" data-color="${k}" style="--c:${colorVar(k)}" aria-label="${k}" aria-pressed="${k === c.cor}"></button>`).join("")}</div>` : ""}
      <input class="text-in cat-words" data-cat="words" value="${esc(c.palavras || "")}" placeholder="Palavras, separadas por vírgula" aria-label="Palavras que levam para esta categoria">
      ${armedDel === i ? `<p class="note">As tarefas desta categoria vão para Geral.</p>` : ""}
    </div>`).join("");
}
$("#cat-list").addEventListener("input", e => {
  const row = e.target.closest(".cat-row"); if (!row) return;
  const c = draft[+row.dataset.i];
  if (e.target.dataset.cat === "name") c.nome = e.target.value;
  if (e.target.dataset.cat === "words") c.palavras = e.target.value;
});
$("#cat-list").addEventListener("click", e => {
  const b = e.target.closest("button[data-cat]"); if (!b) return;
  const i = +b.closest(".cat-row").dataset.i;
  const act = b.dataset.cat;
  if (act === "color") { openPalette = openPalette === i ? -1 : i; armedDel = -1; }
  else if (act === "pick") { draft[i].cor = b.dataset.color; openPalette = -1; }
  else if (act === "up" && i > 0) { [draft[i - 1], draft[i]] = [draft[i], draft[i - 1]]; openPalette = armedDel = -1; }
  else if (act === "down" && i < draft.length - 1) { [draft[i + 1], draft[i]] = [draft[i], draft[i + 1]]; openPalette = armedDel = -1; }
  else if (act === "del") {
    if (armedDel === i) { draft.splice(i, 1); armedDel = -1; }
    else armedDel = i;
    openPalette = -1;
  }
  paintCats();
});
$("#cat-add").addEventListener("click", () => {
  const used = new Set(draft.map(c => c.cor));
  const cor = COLORS.find(k => !used.has(k)) || COLORS[draft.length % COLORS.length];
  draft.push({ id: "c_" + uid(), nome: "", cor, palavras: "" });
  openPalette = armedDel = -1;
  paintCats();
  const inputs = document.querySelectorAll("#cat-list .cat-name");
  inputs[inputs.length - 1]?.focus();
});
$("#cat-cancel").addEventListener("click", () => cdlg.close());
$("#cat-save").addEventListener("click", async () => {
  const seen = new Set();
  const next = draft
    .map(c => ({ id: c.id, nome: c.nome.trim().replace(/\s+/g, " ").slice(0, 30), cor: c.cor, palavras: (c.palavras || "").trim() }))
    .filter(c => c.nome && c.id !== "geral" && fold(c.nome) !== "geral" && !seen.has(fold(c.nome)) && seen.add(fold(c.nome)));
  const keep = new Set(next.map(c => c.id));
  const orphans = state.tasks.filter(t => t.area && t.area !== "geral" && !keep.has(t.area));
  const prevCats = state.cats.map(c => ({ ...c }));
  const prevAreas = orphans.map(t => [t.id, { area: t.area }]);
  cdlg.close();
  await store.setCats(next);
  if (orphans.length) await store.bulkUpdate(orphans.map(t => [t.id, { area: "geral" }]));
  lastUndo = async () => { await store.setCats(prevCats); if (prevAreas.length) store.bulkUpdate(prevAreas); };
  toast(orphans.length ? `Categorias salvas · ${orphans.length === 1 ? "1 tarefa foi" : orphans.length + " tarefas foram"} para Geral` : "Categorias salvas", true);
});
cdlg.addEventListener("click", e => { if (e.target === cdlg) cdlg.close(); });

/* =====================================================================
   Folha: conta e ajustes
   ===================================================================== */
const sdlg = $("#set-dlg");
const GOOGLE_G = `<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>`;

function paintAccount() {
  const box = $("#s-account");
  if (!cloudConfigured) {
    box.innerHTML = `<p class="note">As contas ainda não foram ativadas neste app. Por enquanto tudo fica salvo só neste aparelho. (Para ativar, siga o passo a passo do LEIAME no GitHub.)</p>`;
  } else if (!me()) {
    box.innerHTML = `<button class="btn primary google-btn" data-act="login">${GOOGLE_G}Entrar com Google</button>
      <p class="note">Com a conta, sua agenda fica guardada na nuvem, aparece em qualquer celular e pode ser compartilhada.</p>`;
  } else {
    box.innerHTML = `<div class="account">${faceHtml(me())}<div class="who"><strong>${esc(me().name || "Você")}</strong><span>${esc(me().email)}</span></div><button class="x-btn" data-act="logout">Sair</button></div>`;
  }
  $("#s-agendas").hidden = !(store?.kind === "cloud");
  $("#s-clear-ex").hidden = !state.tasks.some(t => t.example);
  $("#s-storage-note").textContent = store?.kind === "cloud"
    ? "Sua agenda está salva na sua conta e funciona sem internet: o que mudar offline sincroniza quando a conexão voltar."
    : "Suas tarefas ficam guardadas neste aparelho. Baixe um backup de vez em quando para não perder nada.";
}
$("#open-settings").addEventListener("click", () => { paintAccount(); sdlg.showModal(); });
$("#s-close").addEventListener("click", () => sdlg.close());
sdlg.addEventListener("click", e => {
  if (e.target === sdlg) return sdlg.close();
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "login") login();
  if (b.dataset.act === "logout") { sdlg.close(); logout(); }
});
$("#s-cats").addEventListener("click", () => { sdlg.close(); openCats(); });
$("#s-agendas").addEventListener("click", () => { sdlg.close(); openAgendas(); });

$("#s-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "cabe-no-dia", v: 2, exportedAt: new Date().toISOString(), cats: state.cats, tasks: state.tasks }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `cabe-no-dia-backup-${todayIso()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Backup baixado");
});
$("#s-import").addEventListener("click", () => $("#s-file").click());
$("#s-file").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const data = JSON.parse(r.result);
      const list = Array.isArray(data) ? data : data.tasks;
      if (!Array.isArray(list)) throw new Error("formato");
      // Categorias do backup que não existem aqui são acrescentadas.
      if (Array.isArray(data.cats)) {
        const have = new Set(state.cats.map(c => c.id));
        const extra = data.cats.filter(c => c && c.id && c.nome && !have.has(c.id));
        if (extra.length) await store.setCats([...state.cats, ...extra]);
      }
      const ids = new Set(state.tasks.map(t => t.id));
      const add = list.filter(t => t && t.id && t.title && !ids.has(t.id)).map(t => ({ ...t, createdBy: t.createdBy || me()?.uid || null }));
      await store.bulkAdd(add);
      lastUndo = () => store.bulkRemove(add.map(t => t.id));
      sdlg.close();
      toast(`${add.length} tarefa${add.length === 1 ? "" : "s"} restaurada${add.length === 1 ? "" : "s"}`, true);
    } catch (err) { toast("Esse arquivo não é um backup do Cabe no Dia"); }
    e.target.value = "";
  };
  r.readAsText(file);
});
$("#s-clear-done").addEventListener("click", () => {
  const list = state.tasks.filter(t => t.done);
  lastUndo = () => store.bulkAdd(list);
  store.bulkRemove(list.map(t => t.id));
  sdlg.close();
  toast(`${list.length} feita${list.length === 1 ? "" : "s"} removida${list.length === 1 ? "" : "s"}`, true);
});
$("#s-clear-ex").addEventListener("click", () => { sdlg.close(); clearExamples(); });

let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#s-install").hidden = false; });
$("#s-install").addEventListener("click", async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice.catch(() => {});
  installEvt = null; $("#s-install").hidden = true;
});
const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) $("#s-ios").hidden = false;

/* =====================================================================
   Folha: agendas e compartilhamento
   ===================================================================== */
const adlg = $("#ag-dlg");
let armedPerson = null;

function openAgendas() { armedPerson = null; paintAgendas(); adlg.showModal(); }
function paintAgendas() {
  const a = state.agenda; if (!a) return;
  const own = a.ownerUid === me()?.uid;
  const members = memberList();
  const options = state.agendas.map(ag => {
    const owner = ag.memberInfo?.[ag.ownerUid];
    const sub = ag.ownerUid === me()?.uid ? "Sua agenda" : `De ${esc(owner?.name || owner?.email || "outra pessoa")}`;
    const n = (ag.members || []).length;
    return `<button class="agenda-opt" data-act="switch" data-agenda="${esc(ag.id)}" aria-pressed="${ag.id === a.id}"><span class="radio"></span><span class="grow"><strong>${esc(ag.name)}</strong><small>${sub} · ${n} pessoa${n === 1 ? "" : "s"}</small></span></button>`;
  }).join("");

  const people = members.map(m => {
    const isOwner = m.uid === a.ownerUid, isMe = m.uid === me()?.uid;
    const canRemove = own && !isOwner;
    const armed = armedPerson === "m:" + m.uid;
    return `<div class="person">${faceHtml(m)}<span class="grow">${esc(m.name || m.email || "Pessoa")}${isMe ? " (você)" : ""}<small>${isOwner ? "Dona da agenda" : "Pode ver e editar"}${m.email ? " · " + esc(m.email) : ""}</small></span>${canRemove ? `<button class="x-btn${armed ? " armed" : ""}" data-act="rm-member" data-uid="${esc(m.uid)}">${armed ? "Remover?" : "Remover"}</button>` : ""}</div>`;
  }).join("");
  const pending = (a.invited || []).map(em => `<div class="person"><span class="face">${esc(em[0].toUpperCase())}</span><span class="grow">${esc(em)}<small>Convite pendente</small></span>${own ? `<button class="x-btn" data-act="rm-invite" data-email="${esc(em)}">Cancelar</button>` : ""}</div>`).join("");

  $("#ag-body").innerHTML = `
    <div class="grab"></div>
    <h2>Agendas</h2>
    ${state.agendas.length > 1 ? `<div class="group"><span class="group-title">Ver a agenda</span>${options}</div>` : ""}
    <div class="group">
      <span class="group-title">Compartilhar “${esc(a.name)}”</span>
      ${own ? `<form class="inline-form" id="ag-rename"><input class="text-in" id="ag-name" value="${esc(a.name)}" aria-label="Nome da agenda" maxlength="40"><button class="btn small" type="submit">Renomear</button></form>` : ""}
      ${own ? `<form class="inline-form" id="ag-invite"><input class="text-in" id="ag-email" type="email" inputmode="email" placeholder="Gmail da pessoa" aria-label="E-mail para convidar" required><button class="btn small primary" type="submit">Convidar</button></form>
      <p class="note">Quem você convidar vê e edita todas as tarefas e categorias desta agenda. Depois de convidar, avise a pessoa: é só abrir o app e entrar com esse Gmail que o convite aparece.</p>` : `<p class="note">Esta agenda é de outra pessoa. Você pode ver e editar tudo nela.</p>`}
      <div>${people}${pending}</div>
      ${own ? `<button class="btn" data-act="copy-link" type="button">Copiar link do app</button>` : `<button class="btn danger${armedPerson === "leave" ? " armed" : ""}" data-act="leave" type="button">${armedPerson === "leave" ? "Toque de novo para sair" : "Sair desta agenda"}</button>`}
    </div>
    <div class="actions"><button class="btn primary" data-act="close-ag" type="button">Fechar</button></div>`;
}
adlg.addEventListener("click", async e => {
  if (e.target === adlg) return adlg.close();
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (act === "close-ag") adlg.close();
  else if (act === "switch") { adlg.close(); switchAgenda(b.dataset.agenda); }
  else if (act === "rm-member") {
    if (armedPerson !== "m:" + b.dataset.uid) { armedPerson = "m:" + b.dataset.uid; paintAgendas(); return; }
    await removeMember(b.dataset.uid); armedPerson = null;
  }
  else if (act === "rm-invite") await cancelInvite(b.dataset.email);
  else if (act === "leave") {
    if (armedPerson !== "leave") { armedPerson = "leave"; paintAgendas(); return; }
    adlg.close(); leaveAgenda();
  }
  else if (act === "copy-link") {
    const link = location.origin + location.pathname;
    try { await navigator.clipboard.writeText(link); toast("Link copiado. Mande para a pessoa!"); }
    catch (err) { toast(link); }
  }
});
adlg.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "ag-invite") {
    const email = $("#ag-email").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Esse e-mail não parece certo"); return; }
    if (email === me()?.email) { toast("Esse é o seu próprio e-mail"); return; }
    if (memberList().some(m => m.email === email)) { toast("Essa pessoa já está na agenda"); return; }
    await invite(email);
    toast(`Convite enviado para ${email}`);
  }
  if (e.target.id === "ag-rename") {
    const name = $("#ag-name").value.trim();
    if (name) { await renameAgenda(name); toast("Nome da agenda atualizado"); }
  }
});

/* =====================================================================
   Contas (Firebase)
   ===================================================================== */
async function loadFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
  const [appMod, A, F] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch (e) { db = F.getFirestore(app); }
  fb = { A, F, auth, db };
  A.getRedirectResult(auth).catch(err => console.warn(err));
  A.onAuthStateChanged(auth, onUser);
}

async function login() {
  if (!fb) { toast("Sem conexão com o servidor de contas agora. Tente com internet."); return; }
  const { A, auth } = fb;
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try { await A.signInWithPopup(auth, provider); }
  catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      try { await A.signInWithRedirect(auth, provider); } catch (e2) { toast("Não consegui abrir o login do Google"); }
    } else if (e.code === "auth/unauthorized-domain") toast("Este endereço não está liberado no Firebase (veja o LEIAME)");
    else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") toast("Não consegui entrar. Tente de novo.");
  }
}
async function logout() { if (fb) await fb.A.signOut(fb.auth); toast("Você saiu da conta"); }

let agUnsubs = [];
async function onUser(u) {
  agUnsubs.forEach(f => f()); agUnsubs = [];
  prefs.wasLoggedIn = !!u; savePrefs();
  if (!u) {
    state.user = null; state.agendas = []; state.invites = []; state.agenda = null; state.userDoc = null; state.cloudError = null;
    useStore(new LocalStore());
    return;
  }
  const { F, db } = fb;
  state.user = { uid: u.uid, name: u.displayName || "", email: (u.email || "").toLowerCase(), photo: u.photoURL || "" };
  const userRef = F.doc(db, "users", u.uid);
  let userDoc = null;
  try { const s = await F.getDoc(userRef); userDoc = s.exists() ? s.data() : null; } catch (e) { console.warn(e); }

  if (!userDoc || !userDoc.personalAgendaId) {
    // Primeira vez: cria a agenda pessoal.
    const ref = F.doc(F.collection(db, "agendas"));
    const info = { name: state.user.name, email: state.user.email, photo: state.user.photo };
    const local = readJSON(LOCAL_KEY, null);
    const cats = local && Array.isArray(local.cats) ? local.cats : DEFAULT_CATS;
    try {
      await F.setDoc(ref, { name: `Agenda de ${firstName(state.user.name) || "você"}`, ownerUid: u.uid, members: [u.uid], invited: [], memberInfo: { [u.uid]: info }, cats, createdAt: Date.now() });
      userDoc = { personalAgendaId: ref.id, activeAgendaId: ref.id, ...info };
      await F.setDoc(userRef, userDoc, { merge: true });
    } catch (e) {
      console.warn(e);
      toast("Não consegui criar sua agenda na nuvem. Confira as regras do Firebase (LEIAME).");
      state.user = null; useStore(new LocalStore()); return;
    }
  } else {
    // Mantém nome e foto atualizados.
    F.setDoc(userRef, { name: state.user.name, email: state.user.email, photo: state.user.photo }, { merge: true }).catch(() => {});
  }
  state.userDoc = userDoc;

  agUnsubs.push(F.onSnapshot(F.query(F.collection(db, "agendas"), F.where("members", "array-contains", u.uid)), qs => {
    state.agendas = qs.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.ownerUid === u.uid ? -1 : 0) - (b.ownerUid === u.uid ? -1 : 0) || String(a.name).localeCompare(String(b.name)));
    renderHeader();
    if (adlg.open) paintAgendas();
  }, e => console.warn(e)));
  agUnsubs.push(F.onSnapshot(F.query(F.collection(db, "agendas"), F.where("invited", "array-contains", state.user.email)), qs => {
    state.invites = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList();
  }, e => console.warn(e)));

  switchAgenda(userDoc.activeAgendaId || userDoc.personalAgendaId);
}

function switchAgenda(id) {
  if (!fb || !me()) return;
  state.activeAgendaId = id; state.cloudError = null;
  state.userDoc = { ...(state.userDoc || {}), activeAgendaId: id };
  fb.F.setDoc(fb.F.doc(fb.db, "users", me().uid), { activeAgendaId: id }, { merge: true }).catch(() => {});
  useStore(new CloudStore(id));
}

const agendaRef = id => fb.F.doc(fb.db, "agendas", id || state.activeAgendaId);
const safe = (p, msg) => p.catch(e => { console.warn(e); toast(msg || "Não deu certo. Tente de novo."); });

function invite(email) { return safe(fb.F.updateDoc(agendaRef(), { invited: fb.F.arrayUnion(email) })); }
function cancelInvite(email) { return safe(fb.F.updateDoc(agendaRef(), { invited: fb.F.arrayRemove(email) })); }
function renameAgenda(name) { return safe(fb.F.updateDoc(agendaRef(), { name })); }
function removeMember(id) {
  return safe(fb.F.updateDoc(agendaRef(), { members: fb.F.arrayRemove(id), [`memberInfo.${id}`]: fb.F.deleteField() }));
}
async function leaveAgenda() {
  const id = state.activeAgendaId;
  switchAgenda(state.userDoc.personalAgendaId);
  await safe(fb.F.updateDoc(agendaRef(id), { members: fb.F.arrayRemove(me().uid), [`memberInfo.${me().uid}`]: fb.F.deleteField() }));
  toast("Você saiu da agenda");
}
async function acceptInvite(id) {
  const info = { name: me().name, email: me().email, photo: me().photo };
  await safe(fb.F.updateDoc(agendaRef(id), { members: fb.F.arrayUnion(me().uid), invited: fb.F.arrayRemove(me().email), [`memberInfo.${me().uid}`]: info }), "Não consegui aceitar o convite");
  switchAgenda(id);
  toast("Pronto! Agora você está nessa agenda.");
}
function declineInvite(id) { return safe(fb.F.updateDoc(agendaRef(id), { invited: fb.F.arrayRemove(me().email) })); }

// Tarefas que estavam só no celular antes de entrar na conta.
function localTasksToMigrate() {
  const local = readJSON(LOCAL_KEY, null);
  return local && Array.isArray(local.tasks) ? local.tasks.filter(t => !t.example) : [];
}
const pendingMigration = () => me() && state.agenda && state.agenda.ownerUid === me().uid && !prefs.migrated && localTasksToMigrate().length > 0;
async function migrate() {
  const list = localTasksToMigrate();
  const local = readJSON(LOCAL_KEY, null);
  const known = new Set(state.cats.map(c => c.id));
  const extraCats = (local?.cats || []).filter(c => c && c.id && !known.has(c.id));
  if (extraCats.length) await store.setCats([...state.cats, ...extraCats]);
  await store.bulkAdd(list.map(t => ({ ...t, createdBy: me().uid })));
  prefs.migrated = true; savePrefs();
  render();
  toast(`${list.length} tarefa${list.length === 1 ? "" : "s"} trazida${list.length === 1 ? "" : "s"} para a sua agenda`);
}

/* =====================================================================
   Eventos gerais
   ===================================================================== */
$("#add-form").addEventListener("submit", e => { e.preventDefault(); addFromInput(); });
$("#add-input").addEventListener("input", renderPreview);
$("#agenda-pill").addEventListener("click", openAgendas);
$("#tabs").addEventListener("click", e => {
  const b = e.target.closest(".tab"); if (!b) return;
  if (b.dataset.act === "edit-cats") return openCats();
  prefs.tab = b.dataset.tab; savePrefs(); renderTabs(); holdUntil = 0; renderList();
  window.scrollTo({ top: Math.min(window.scrollY, $(".sticky").offsetTop), behavior: "smooth" });
});
$("#list").addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (act === "clear-examples") return clearExamples();
  if (act === "login") return login();
  if (act === "hide-login") { prefs.hideLoginTip = true; savePrefs(); return renderList(); }
  if (act === "accept") return acceptInvite(b.dataset.agenda);
  if (act === "decline") return declineInvite(b.dataset.agenda).then(() => toast("Convite recusado"));
  if (act === "migrate") return migrate();
  if (act === "skip-migrate") { prefs.migrated = true; savePrefs(); return renderList(); }
  const el = b.closest(".task"); if (!el) return;
  const id = el.dataset.id;
  if (act === "toggle") toggle(id, el);
  else if (act === "edit") openEdit(id);
  else if (act === "tomorrow") move(id, "tomorrow");
  else if (act === "today") move(id, "today");
});

/* =====================================================================
   Brilhinho
   ===================================================================== */
const cv = $("#fx"), cx = cv.getContext("2d");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
let parts = [], raf = 0;
function sizeCanvas() { const r = window.devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
sizeCanvas(); addEventListener("resize", sizeCanvas);
function resolveColor(c) {
  const m = String(c || "").match(/var\((--[^)]+)\)/);
  return (m && getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim()) || "#1E9E5E";
}
function burst(x, y, areaColor, n = 22, power = 1) {
  if (reduce.matches) return;
  const cols = [resolveColor("var(--done)"), resolveColor(areaColor), "#FFD43B", "#FFFFFF"];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 4.5) * power;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.2 * power, life: 1, size: 3 + Math.random() * 4, c: cols[i % cols.length], star: Math.random() < .45, rot: Math.random() * 6 });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
function bigBurst() {
  for (let i = 0; i < 5; i++) setTimeout(() => burst(innerWidth * (.15 + .7 * Math.random()), innerHeight * (.2 + .3 * Math.random()), "var(--brand)", 30, 1.3), i * 160);
}
function star(x, y, r, rot) {
  cx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .42 : r; const a = rot + i * Math.PI / 4; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  cx.closePath(); cx.fill();
}
function tick() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += .18; p.vx *= .98; p.life -= .022; p.rot += .15;
    cx.globalAlpha = Math.max(0, p.life);
    cx.fillStyle = p.c;
    if (p.star) star(p.x, p.y, p.size * 1.4, p.rot);
    else { cx.beginPath(); cx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); cx.fill(); }
  }
  cx.globalAlpha = 1;
  if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; cx.clearRect(0, 0, innerWidth, innerHeight); }
}

/* =====================================================================
   Início
   ===================================================================== */
// Quem já entrou antes não vê a agenda local piscar enquanto a conta carrega.
if (cloudConfigured && prefs.wasLoggedIn) {
  $("#list").innerHTML = empty("Abrindo sua agenda…", "Só um instante.");
  setTimeout(() => { if (!store) useStore(new LocalStore()); }, 8000);
} else useStore(new LocalStore());
if (cloudConfigured) loadFirebase().catch(e => { console.warn(e); if (!store) useStore(new LocalStore()); });

let lastDay = todayIso();
const refreshDay = () => { if (todayIso() !== lastDay) { lastDay = todayIso(); render(); } else renderHeader(); };
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDay(); });
setInterval(refreshDay, 60000);

try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

window.__cabe = { parse: raw => parse(raw, state.cats), state };
