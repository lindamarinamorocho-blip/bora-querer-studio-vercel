"use client";

import { useEffect, useRef, useState } from "react";
import { panelFetch } from "@/lib/supabase";
import { Aperture, ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Clapperboard, ClipboardList, FolderOpen, LayoutGrid, ListVideo, MapPin, Plus, ScanLine, Search, SlidersHorizontal, UsersRound, Video, X } from "lucide-react";
import { blankProject, copySheet, dateFromKey, dateKey, dateLabel, initialStudio, kinds, type Client, type Project, type Snapshot, type Studio } from "./model";
import { ClientEditor, ProjectEditor, SheetFields } from "./editors";

const nav = [
  { key: "overview", name: "Visão geral", icon: LayoutGrid },
  { key: "projects", name: "Trabalhos", icon: Clapperboard },
  { key: "calendar", name: "Calendário", icon: CalendarDays },
  { key: "clients", name: "Clientes", icon: UsersRound },
  { key: "template", name: "Modelo de captação", icon: ClipboardList },
] as const;
type View = typeof nav[number]["key"];
type Filter = "all" | "open" | "approval" | "due" | "delivered";
type Entry = { date: string; time: string; type: "Evento" | "Gravação" | "Entrega"; project: Project };
const entryTone = { Evento: "lilac", Gravação: "rose", Entrega: "sage" } as const;
const stageTone = { Planejado: "neutral", "Em produção": "lilac", "Em edição": "amber", Entregue: "sage" } as const;
const approvalTone = { "A enviar": "neutral", Aguardando: "amber", "Ajustes solicitados": "rose", Aprovado: "sage", Dispensado: "neutral" } as const;
const viewText = {
  overview: ["Visão geral", "Acompanhe o que está em produção e o que vem pela frente."],
  projects: ["Trabalhos", "Organize projetos pontuais e recorrentes, da captação à entrega."],
  calendar: ["Calendário", "Eventos, gravações e prazos de entrega em um só lugar."],
  clients: ["Clientes", "Abra um cliente para ver os trabalhos e os alinhamentos dele."],
  template: ["Modelo de captação", "Prepare uma ficha que você pode usar a cada novo trabalho."],
} as const;

function Avatar({client, size = ""}: {client?: Client; size?: string}) {
  const parts = client?.name.trim().split(/\s+/) ?? [];
  const letters = parts.length > 1 ? parts.slice(0, 2).map(s => s[0]).join("") : parts[0]?.slice(0, 2);
  return <span className={`avatar tone-${client?.color ?? "neutral"} ${size}`} aria-hidden="true">{letters?.toUpperCase() || "·"}</span>;
}
function entriesFor(projects: Project[]) {
  return projects.flatMap(project => {
    const entries: Entry[] = [];
    if (project.event) entries.push({date: project.event, time: project.eventTime, type: "Evento", project});
    if (project.shoot) entries.push({date: project.shoot, time: project.shootTime, type: "Gravação", project});
    if (project.due) entries.push({date: project.due, time: "", type: "Entrega", project});
    return entries;
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "24:00").localeCompare(b.time || "24:00"));
}
function addDays(key: string, days: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
function Badge({children, tone}: {children: string; tone: string}) {
  return <span className={`badge tone-${tone}`}><span/>{children}</span>;
}

function Viewfinder() {
  return <svg className="hero-art" width="460" height="244" viewBox="0 0 460 244" fill="none" aria-hidden="true">
    <defs><linearGradient id="art-fade" x1="22" y1="120" x2="400" y2="120" gradientUnits="userSpaceOnUse"><stop stopColor="#d8aaad" stopOpacity="0"/><stop offset="1" stopColor="#d8aaad" stopOpacity=".34"/></linearGradient><radialGradient id="art-glow"><stop stopColor="#a75e60" stopOpacity=".43"/><stop offset="1" stopColor="#a75e60" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="312" cy="125" rx="150" ry="130" fill="url(#art-glow)"/>
    <path d="M22 35h425M22 70h425M22 105h425M22 140h425M22 175h425M22 210h425M107 0v244M142 0v244M177 0v244M212 0v244M247 0v244M282 0v244M317 0v244M352 0v244M387 0v244M422 0v244" stroke="url(#art-fade)" strokeWidth=".65"/>
    <circle cx="294" cy="122" r="108" stroke="#cf9da3" strokeOpacity=".20"/><circle cx="294" cy="122" r="84" stroke="#cf9da3" strokeOpacity=".30"/><circle cx="294" cy="122" r="59" stroke="#cf9da3" strokeOpacity=".22"/>
    <path d="M212 72V48h24m116 0h24v24m0 100v24h-24m-116 0h-24v-24" stroke="#efb4a0" strokeWidth="1.5"/>
    <circle cx="294" cy="122" r="34" fill="#f1b19e" fillOpacity=".1" stroke="#efb4a0" strokeOpacity=".55"/>
    <path d="M286 109l21 13-21 13z" stroke="#f8c5b1" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M294 26v11m0 170v11m-96-96h10m172 0h10" stroke="#efb4a0" strokeOpacity=".64"/>
    <circle cx="225" cy="61" r="3" fill="#eea78f"/><text x="235" y="64.5" fill="#edb9ab" fontFamily="monospace" fontSize="9" letterSpacing="2">REC</text>
    <text x="317" y="184" fill="#edb9ab" fontFamily="monospace" fontSize="9" letterSpacing="1.5">PALMAS · TO</text>
  </svg>;
}

function ProjectRows({projects, clients, open, filtered}: {projects: Project[]; clients: Client[]; open: (p: Project) => void; filtered?: boolean}) {
  if (!projects.length) return <div className="empty"><FolderOpen size={26}/><strong>{filtered ? "Nenhum trabalho com esses filtros" : "Ainda não há trabalhos aqui"}</strong><span>{filtered ? "Ajuste os filtros para ver mais resultados." : "Use “Novo trabalho” para começar."}</span></div>;
  return <div className="project-table">
    <div className="table-head"><span>Trabalho</span><span>Produção</span><span>Aprovação</span><span>Entrega <ArrowDown size={12}/></span><span/></div>
    {projects.map(project => {
      const client = clients.find(c => c.id === project.client);
      const overdue = project.stage !== "Entregue" && !project.example && project.due && project.due < dateKey();
      return <button className="project-row" type="button" onClick={() => open(project)} key={project.id}>
        <span className="project-name"><Avatar client={client}/><span><strong>{project.title}</strong><small>{client?.name} <span className="dot-separator">·</span> {project.kind}{project.example && <span className="example">Exemplo</span>}</small></span></span>
        <span className="row-stage"><Badge tone={stageTone[project.stage]}>{project.stage}</Badge></span>
        <span className="row-approval"><Badge tone={approvalTone[project.approval]}>{project.approval}</Badge></span>
        <span className={`row-due ${overdue ? "overdue" : ""}`}>{project.due ? dateLabel(project.due).replace(".", "") : "—"}</span>
        <ChevronRight size={17} className="row-chevron"/>
      </button>;
    })}
  </div>;
}

function EntryList({entries, clients, open}: {entries: Entry[]; clients: Client[]; open: (project: Project) => void}) {
  if (!entries.length) return <div className="empty compact"><CalendarDays size={23}/><span>Nenhum compromisso nesta seleção.</span></div>;
  return <div className="agenda-list">{entries.map(entry => <button className="agenda-item" key={entry.project.id + entry.type} onClick={() => open(entry.project)}>
    <span className={`date-tile tone-${entryTone[entry.type]}`}><b>{entry.date.slice(-2)}</b><small>{dateLabel(entry.date, {month: "short"}).replace(".", "")}</small></span>
    <span className="agenda-copy"><small>{entry.type}{entry.time && ` · ${entry.time}`}</small><strong>{entry.project.title}</strong><span>{clients.find(c => c.id === entry.project.client)?.name}{entry.project.example ? " · Exemplo" : ""}</span></span>
    <ChevronRight size={16} className="row-chevron"/>
  </button>)}</div>;
}

function CalendarView({entries, clients, open}: {entries: Entry[]; clients: Client[]; open: (p: Project) => void}) {
  const today = dateKey();
  const [month, setMonth] = useState(today.slice(0, 7) + "-01");
  const [day, setDay] = useState("");
  const shiftMonth = (count: number) => {
    const next = dateFromKey(month);
    next.setUTCMonth(next.getUTCMonth() + count);
    setMonth(next.toISOString().slice(0, 10)); setDay("");
  };
  const leading = (dateFromKey(month).getUTCDay() + 6) % 7;
  const nextMonth = dateFromKey(month);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 0);
  const cellCount = Math.ceil((leading + nextMonth.getUTCDate()) / 7) * 7;
  const monthEntries = entries.filter(entry => entry.date.slice(0, 7) === month.slice(0, 7));
  const byDay = new Map<string, Entry[]>();
  for (const entry of monthEntries) byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry]);
  return <div className="calendar-layout">
    <section className="panel calendar">
      <div className="panel-head calendar-head"><h2>{dateLabel(month, {month:"long", year:"numeric"})}</h2>
        <div className="calendar-controls"><button className="icon-button" aria-label="Mês anterior" onClick={() => shiftMonth(-1)}><ChevronLeft size={18}/></button><button className="button ghost today" onClick={() => { setMonth(today.slice(0, 7) + "-01"); setDay(today); }}>Hoje</button><button className="icon-button" aria-label="Próximo mês" onClick={() => shiftMonth(1)}><ChevronRight size={18}/></button></div>
      </div>
      <div className="calendar-grid">
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(name => <div className="weekday" key={name}>{name}</div>)}
        {Array.from({length: cellCount}, (_, i) => {
          const key = addDays(month, i - leading);
          const inMonth = key.slice(0, 7) === month.slice(0, 7);
          const list = byDay.get(key) ?? [];
          return <button className={`day ${key === today ? "is-today" : ""} ${day === key ? "is-selected" : ""}`} key={key} disabled={!inMonth}
            aria-pressed={day === key} aria-label={`${dateLabel(key, {day:"numeric",month:"long"})}, ${list.length} compromissos`}
            onClick={() => setDay(day === key ? "" : key)}>
            <span className="day-number">{Number(key.slice(-2))}</span>
            <span className="day-events">{list.slice(0, 2).map(entry => <span className={`day-event tone-${entryTone[entry.type]}`} key={entry.project.id + entry.type}><i/><span>{entry.project.title}</span></span>)}{list.length > 2 && <small>+{list.length - 2}</small>}</span>
          </button>;
        })}
      </div>
      <div className="calendar-legend">{Object.entries(entryTone).map(([label, tone]) => <Badge key={label} tone={tone}>{label}</Badge>)}</div>
    </section>
    <section className="panel"><div className="panel-head"><div><h2>{day ? dateLabel(day, {day:"numeric", month:"long"}) : "Agenda do mês"}</h2><p>{day ? "Compromissos do dia" : "Selecione um dia para ver os detalhes."}</p></div>{day && <button className="icon-button" aria-label="Mostrar mês inteiro" onClick={() => setDay("")}><X size={17}/></button>}</div>
      <EntryList entries={day ? byDay.get(day) ?? [] : monthEntries} clients={clients} open={open}/>
    </section>
  </div>;
}

export default function StudioPanel() {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({data: initialStudio(), revision: 0}));
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("overview");
  const [clientFilter, setClientFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Project | null>(null);
  const [clientEditing, setClientEditing] = useState<Client | null>(null);
  const [template, setTemplate] = useState<Studio["template"] | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clearExamples, setClearExamples] = useState(false);
  const {data} = snapshot;
  const today = dateKey();
  const week = addDays(today, 7);

  useEffect(() => {
    const controller = new AbortController();
    panelFetch("/api/painel", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (response.status === 401) throw new Error("Sua sessão expirou. Saia e entre novamente.");
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Não foi possível carregar seus dados."); }
      setSnapshot(await response.json());
      setConnected(true);
    }).catch(e => { if (!controller.signal.aborted) setLoadError(e.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function persist(next: Studio, message: string) {
    if (saving.current) return false;
    if (!connected) { setError(loadError || "Aguarde o carregamento do painel."); return false; }
    saving.current = true;
    setBusy(true); setError("");
    try {
      const response = await panelFetch("/api/painel", {method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({data: next, revision: snapshot.revision})});
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as {error?: string};
        throw new Error(payload.error || "Não foi possível salvar. Tente novamente.");
      }
      setSnapshot(await response.json()); setNotice(message);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); return false; }
    finally { saving.current = false; setBusy(false); }
  }

  const isOpen = (p: Project) => p.stage !== "Entregue";
  const needsApproval = (p: Project) => p.approval === "Aguardando" || p.approval === "Ajustes solicitados";
  const dueSoon = (p: Project) => isOpen(p) && Boolean(p.due) && p.due >= today && p.due <= week;
  const stats = [
    { label:"Trabalhos em aberto", caption:"Da pauta à finalização", value:data.projects.filter(isOpen).length, tone:"lilac", icon:Clapperboard, key:"open" },
    { label:"Aprovação pendente", caption:"Aguardando retorno ou ajustes", value:data.projects.filter(needsApproval).length, tone:"amber", icon:Clock3, key:"approval" },
    { label:"Entregas próximas", caption:"De hoje aos próximos 7 dias", value:data.projects.filter(dueSoon).length, tone:"rose", icon:CalendarDays, key:"due" },
    { label:"Trabalhos entregues", caption:"Produções finalizadas", value:data.projects.filter(p => !isOpen(p)).length, tone:"sage", icon:CircleCheck, key:"delivered" },
  ] as const;
  const matchesStage = (p: Project) => filter === "all" || (filter === "open" && isOpen(p)) ||
    (filter === "approval" && needsApproval(p)) || (filter === "due" && dueSoon(p)) || (filter === "delivered" && !isOpen(p));
  const sorted = [...data.projects].sort((a,b) => Number(!isOpen(a)) - Number(!isOpen(b)) || (a.due || "9999").localeCompare(b.due || "9999"));
  const shown = sorted.filter(p => (!clientFilter || p.client === clientFilter) && (!kindFilter || p.kind === kindFilter) &&
    matchesStage(p) && normalize(p.title + " " + (data.clients.find(c => c.id === p.client)?.name ?? "")).includes(normalize(query.trim())));
  const entries = entriesFor(view === "calendar" ? shown : data.projects);
  const upcoming = entries.filter(e => e.date >= today && (e.type !== "Entrega" || isOpen(e.project))).slice(0, 4);
  const exampleCount = data.projects.filter(p => p.example).length;
  const activeClient = data.clients.find(c => c.id === clientFilter);
  const filtering = Boolean(clientFilter || kindFilter || query || filter !== "all");

  function go(next: View, client = "", status: Filter = "all") {
    setView(next); setClientFilter(client); setKindFilter(""); setQuery(""); setFilter(status); setError(""); setClearExamples(false);
    if (next === "template") setTemplate(copySheet(data.template));
    window.scrollTo({top: 0, behavior: "instant"});
  }
  function edit(project: Project) { setError(""); setEditing(project); }
  function editClient(client?: Client) { setError(""); setClientEditing(client ?? {id:"", name:"", color:"rose", notes:""}); }
  function newProject() {
    if (!data.clients.length) { editClient(); return; }
    edit(blankProject(clientFilter, data.template));
  }
  function close() { if (!saving.current) { setEditing(null); setClientEditing(null); setError(""); } }
  const filters = <div className="filters">
    {view === "projects" && <label className="search-field"><Search size={17}/><input aria-label="Buscar trabalho ou cliente" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar trabalho ou cliente"/></label>}
    <label className="filter-field"><span className="sr-only">Cliente</span><select value={clientFilter} onChange={e => setClientFilter(e.target.value)}><option value="">Todos os clientes</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="filter-field"><SlidersHorizontal size={15}/><span className="sr-only">Tipo de trabalho</span><select value={kindFilter} onChange={e => setKindFilter(e.target.value)}><option value="">Todos os tipos</option>{kinds.map(k => <option key={k}>{k}</option>)}</select></label>
    {view === "projects" && <label className="filter-field"><span className="sr-only">Situação</span><select value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">Todas as situações</option>{stats.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>}
    {filtering && <button className="button ghost reset" onClick={() => { setQuery(""); setClientFilter(""); setKindFilter(""); setFilter("all"); }}>Limpar filtros</button>}
  </div>;

  return <div className="shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => go("overview")} aria-label="Bora Querer Studio, visão geral">
        <span className="brand-mark"><ScanLine size={22}/><span className="brand-play"/></span><span><strong>Bora Querer</strong><small>STUDIO</small></span>
      </button>
      <div className="side-divider"/>
      <p className="side-label">ESPAÇO DE TRABALHO</p>
      <nav aria-label="Navegação principal">{nav.map(({key,name,icon:Icon}) => <button key={key} onClick={() => go(key)} className={view === key ? "current" : ""} aria-current={view === key ? "page" : undefined}><Icon size={18}/><span>{name}</span></button>)}</nav>
      <div className="sidebar-bottom"><span className="side-location"><MapPin size={14}/> Palmas, TO</span><div className="profile"><span>LM</span><div><strong>Linda Marina</strong><small>Videomaker &amp; Social Media</small></div></div></div>
    </aside>
    <main className="main" id="painel">
      <div className="main-inner">
        <div className="topline"><span><Aperture size={15}/> ESTÚDIO CRIATIVO <i/><span className="extra">PRODUÇÃO AUDIOVISUAL</span></span><time dateTime={today}><CalendarDays size={15}/>{dateLabel(today, {weekday:"long", day:"numeric", month:"long"})}</time></div>
        <header className="page-head"><div><h1>{activeClient && view === "projects" ? activeClient.name : viewText[view][0]}</h1><p>{viewText[view][1]}</p></div>
          {view !== "template" && <button className="button primary create" onClick={view === "clients" ? () => editClient() : newProject}><Plus size={19}/>{view === "clients" ? "Novo cliente" : "Novo trabalho"}</button>}
        </header>
        {loadError && <div className="inline-note connection-note" role="status">{loadError}</div>}
        {view === "overview" && <>
          <section className="hero"><Viewfinder/><div className="hero-copy"><p className="eyebrow"><span/> SEU PAINEL DE PRODUÇÃO</p><h2>Olá, Linda! <em>Bora querer?</em></h2><p>Da primeira ideia à última entrega, acompanhe seus trabalhos de onde estiver.</p><button onClick={() => go("calendar")}>Abrir calendário <ArrowRight size={16}/></button></div></section>
          <div className="stats">{stats.map(s => <button key={s.key} className="stat" onClick={() => go("projects", "", s.key)}><span className={`stat-icon tone-${s.tone}`}><s.icon size={19}/></span><ArrowUpRight size={15} className="stat-arrow"/><strong>{String(s.value).padStart(2,"0")}</strong><span className="stat-label">{s.label}</span><small>{s.caption}</small></button>)}</div>
          <div className="overview-grid">
            <section className="panel projects-panel"><div className="panel-head"><div><h2>Trabalhos recentes</h2><p>Em aberto primeiro, por prazo de entrega.</p></div><button className="text-button" onClick={() => go("projects")}>Ver todos <ArrowRight size={15}/></button></div>
              <ProjectRows projects={sorted.slice(0, 5)} clients={data.clients} open={edit}/>
            </section>
            <section className="panel"><div className="panel-head"><div><h2>Próximos na agenda</h2><p>Eventos, gravações e prazos.</p></div><button className="icon-button" aria-label="Abrir calendário" onClick={() => go("calendar")}><CalendarDays size={18}/></button></div>
              <EntryList entries={upcoming} clients={data.clients} open={edit}/>
            </section>
          </div>
        </>}
        {view === "projects" && <>
          {activeClient?.notes && <p className="inline-note client-note">{activeClient.notes}</p>}
          <section className="panel"><div className="panel-head"><div><h2>{activeClient ? "Trabalhos do cliente" : "Todos os trabalhos"}</h2><p>{shown.length} {shown.length === 1 ? "trabalho" : "trabalhos"} na seleção</p></div></div>
            {filters}<ProjectRows projects={shown} clients={data.clients} open={edit} filtered={filtering}/>
          </section>
        </>}
        {view === "calendar" && <>{filters}<CalendarView entries={entries} clients={data.clients} open={edit}/></>}
        {view === "clients" && <div className="client-grid">{data.clients.map(client => {
          const projects = data.projects.filter(p => p.client === client.id);
          return <article className="panel client-card" key={client.id}><Avatar client={client} size="large"/><button className="text-button edit-client" onClick={() => editClient(client)}>Editar</button><h2>{client.name}</h2>
            <p>{projects.length} {projects.length === 1 ? "trabalho" : "trabalhos"} · {projects.filter(isOpen).length} em aberto</p>
            {client.notes && <p className="client-note">{client.notes}</p>}
            <button className="button soft" onClick={() => go("projects", client.id)}>Ver trabalhos <ArrowRight size={16}/></button>
          </article>;
        })}</div>}
        {view === "template" && template && <section className="panel template-panel"><div className="panel-head"><div><h2>Ficha padrão</h2><p>Preencha as orientações que você costuma repetir. Cada novo trabalho recebe uma cópia.</p></div><span className="stat-icon tone-lilac"><ClipboardList size={20}/></span></div>
          <div className="template-body"><SheetFields sheet={template} change={setTemplate} reusable/>{error && <p className="form-error" role="alert">{error}</p>}
            <button className="button primary" disabled={busy} onClick={() => void persist({...data, template: copySheet(template)}, "Modelo salvo.")}><Check size={17}/>{busy ? "Salvando…" : "Salvar modelo"}</button>
          </div>
        </section>}
        {exampleCount > 0 && (view === "overview" || view === "projects") && <div className="example-bar"><span><ListVideo size={16}/> {exampleCount} {exampleCount === 1 ? "trabalho de exemplo para explorar o painel." : "trabalhos de exemplo para explorar o painel."}</span>
          <button className="text-button" disabled={busy} onClick={async () => { if (!clearExamples) { setClearExamples(true); return; }
            if (await persist({...data, projects: data.projects.filter(p => !p.example)}, "Exemplos removidos.")) setClearExamples(false); }}>{clearExamples ? "Confirmar remoção" : "Remover exemplos"}</button></div>}
        {error && !editing && !clientEditing && view !== "template" && <p className="form-error" role="alert">{error}</p>}
        <footer className="main-foot"><span><Video size={14}/> Bora Querer Studio</span><span>Painel de produção · Palmas, TO</span></footer>
      </div>
    </main>
    {notice && <div className="toast" role="status"><CircleCheck size={18}/>{notice}</div>}
    {editing && <ProjectEditor initial={editing} clients={data.clients} template={data.template} busy={busy} error={error} close={close}
      save={async project => {
        const exists = data.projects.some(p => p.id === project.id);
        const projects = exists ? data.projects.map(p => p.id === project.id ? project : p) : [...data.projects, project];
        if (await persist({...data, projects}, "Trabalho salvo.")) setEditing(null);
      }}
      remove={async project => { if (await persist({...data, projects: data.projects.filter(p => p.id !== project.id)}, "Trabalho excluído.")) setEditing(null); }}
    />}
    {clientEditing && <ClientEditor initial={clientEditing} busy={busy} error={error} close={close} save={async client => {
      const exists = data.clients.some(c => c.id === client.id);
      const clients = exists ? data.clients.map(c => c.id === client.id ? client : c) : [...data.clients, client];
      if (await persist({...data, clients}, "Cliente salvo.")) setClientEditing(null);
    }}/>}
  </div>;
}
