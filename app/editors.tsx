"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Check, ClipboardList, Copy, Plus, Trash2, X } from "lucide-react";
import { approvals, colors, copySheet, frequencies, kinds, sections, stages, type Client, type Project, type Sheet } from "./model";

export function Modal({ title, eyebrow, children, close }: {title: string; eyebrow: string; children: ReactNode; close: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby="modal-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className="modal-head"><div><p className="eyebrow">{eyebrow}</p><h2 id="modal-title">{title}</h2></div>
      <button className="icon-button" onClick={close} aria-label="Fechar"><X size={21}/></button>
    </header>{children}
  </dialog>;
}

export function SheetFields({ sheet, change, reusable = false }: {sheet: Sheet; change: (sheet: Sheet) => void; reusable?: boolean}) {
  const [item, setItem] = useState("");
  const add = () => {
    if (!item.trim() || sheet.checklist.length >= 50) return;
    change({...sheet, checklist: [...sheet.checklist, {text: item.trim(), done: false}]});
    setItem("");
  };
  return <>
    <div className="form-grid">
      {sections.map(([key, label, placeholder]) => <label key={key}>{label}<textarea value={sheet[key]} maxLength={12000} placeholder={placeholder} rows={3} onChange={e => change({...sheet, [key]: e.target.value})}/></label>)}
    </div>
    <section className="checklist">
      <div className="checklist-heading"><div><h3><ClipboardList size={17}/> Checklist de captação</h3>
      <p>{reusable ? "Estes itens são copiados para cada ficha nova." : `${sheet.checklist.filter(item => item.done).length} de ${sheet.checklist.length} concluídos`}</p></div></div>
      {sheet.checklist.map((entry, i) => <div className="check-row" key={i}>
        {!reusable && <input type="checkbox" aria-label={entry.text} checked={entry.done} onChange={e => change({...sheet, checklist: sheet.checklist.map((x, n) => n === i ? {...x, done: e.target.checked} : x)})}/>}
        <span className={entry.done && !reusable ? "checked" : ""}>{entry.text}</span>
        <button type="button" className="icon-button mini" aria-label={`Remover ${entry.text}`} onClick={() => change({...sheet, checklist: sheet.checklist.filter((_, n) => n !== i)})}><X size={16}/></button>
      </div>)}
      <div className="add-check"><input aria-label="Novo item do checklist" value={item} maxLength={240} placeholder="Ex.: testar o microfone de lapela"
        onChange={e => setItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}/><button type="button" className="button soft" onClick={add} disabled={!item.trim() || sheet.checklist.length >= 50}><Plus size={16}/> Adicionar</button></div>
    </section>
  </>;
}

type SaveProps = {busy: boolean; error: string; close: () => void};

export function ProjectEditor({ initial, clients, template, save, remove, ...props }: SaveProps & {
  initial: Project; clients: Client[]; template: Sheet;
  save: (project: Project) => Promise<void>; remove: (project: Project) => Promise<void>;
}) {
  const [project, setProject] = useState(initial);
  const [tab, setTab] = useState<"details" | "sheet">("details");
  const [confirm, setConfirm] = useState(false);
  const [localError, setLocalError] = useState("");
  const update = <K extends keyof Project,>(key: K, value: Project[K]) => setProject(p => ({...p, [key]: value}));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!project.title.trim() || !project.client) {
      setTab("details");
      setLocalError("Preencha o nome do trabalho e selecione um cliente.");
      return;
    }
    setLocalError("");
    void save({...project, title: project.title.trim(), id: project.id || crypto.randomUUID(), example: false});
  };
  return <Modal title={project.id ? "Editar trabalho" : "Novo trabalho"} eyebrow="Produção" close={props.close}>
    <div className="modal-tabs">
      <button type="button" className={tab === "details" ? "selected" : ""} onClick={() => setTab("details")}>Detalhes</button>
      <button type="button" className={tab === "sheet" ? "selected" : ""} onClick={() => setTab("sheet")}>Ficha de captação</button>
    </div>
    <form onSubmit={submit}>
      <div className="modal-body">
        {initial.example && <p className="inline-note">Este é um exemplo. Ao salvar, ele passa a fazer parte dos seus trabalhos.</p>}
        {tab === "details" ? <>
          <div className="form-grid">
            <label className="full">Nome do trabalho<input autoFocus required maxLength={150} value={project.title} onChange={e => update("title", e.target.value)} placeholder="Ex.: Reels de bastidores do instituto"/></label>
            <label>Cliente<select required value={project.client} onChange={e => update("client", e.target.value)}><option value="">Selecione</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Tipo de trabalho<select value={project.kind} onChange={e => update("kind", e.target.value as Project["kind"])}>{kinds.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Frequência<select value={project.frequency} onChange={e => update("frequency", e.target.value as Project["frequency"])}>{frequencies.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Etapa de produção<select value={project.stage} onChange={e => update("stage", e.target.value as Project["stage"])}>{stages.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Status de aprovação<select value={project.approval} onChange={e => update("approval", e.target.value as Project["approval"])}>{approvals.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Local<input maxLength={200} value={project.place} onChange={e => update("place", e.target.value)} placeholder="Clínica, endereço ou ponto de encontro"/></label>
          </div>
          <h3 className="field-section">Agenda</h3>
          <div className="form-grid date-fields">
            <label>Data do evento<input type="date" value={project.event} onChange={e => { setProject(p => ({...p, event: e.target.value, eventTime: e.target.value ? p.eventTime : ""})); }}/></label>
            <label>Hora do evento<input type="time" disabled={!project.event} value={project.eventTime} onChange={e => update("eventTime", e.target.value)}/></label>
            <label>Data da gravação<input type="date" value={project.shoot} onChange={e => { setProject(p => ({...p, shoot: e.target.value, shootTime: e.target.value ? p.shootTime : ""})); }}/></label>
            <label>Hora da gravação<input type="time" disabled={!project.shoot} value={project.shootTime} onChange={e => update("shootTime", e.target.value)}/></label>
            <label>Prazo de entrega<input type="date" value={project.due} onChange={e => update("due", e.target.value)}/></label>
          </div>
          <div className="form-grid field-section">
            <label className="full"><span className="label-line">Link do Drive{/^https?:\/\//i.test(project.drive) && <a href={project.drive} target="_blank" rel="noopener noreferrer">Abrir <ArrowUpRight size={14}/></a>}</span><input type="url" maxLength={2000} value={project.drive} onChange={e => update("drive", e.target.value)} placeholder="https://drive.google.com/…"/></label>
            <label className="full">Observações<textarea rows={3} maxLength={12000} value={project.notes} onChange={e => update("notes", e.target.value)} placeholder="Retornos do cliente, ajustes ou lembretes"/></label>
          </div>
        </> : <><div className="sheet-intro"><p>Deixe falas, cenas e textos prontos para consultar no dia da gravação.</p><button type="button" className="button soft" onClick={() => {
          if (window.confirm("Substituir os campos da ficha pelo modelo atual?")) update("sheet", copySheet(template));
        }}><Copy size={16}/> Aplicar modelo</button></div><SheetFields sheet={project.sheet} change={value => update("sheet", value)}/></>}
      </div>
      {(localError || props.error) && <p className="form-error" role="alert">{localError || props.error}</p>}
      <footer className="modal-foot">
        {initial.id && <button type="button" className="button danger" disabled={props.busy} onClick={() => confirm ? void remove(initial) : setConfirm(true)}><Trash2 size={16}/>{confirm ? "Confirmar exclusão" : "Excluir"}</button>}
        <div className="modal-actions"><button type="button" className="button ghost" onClick={props.close}>Cancelar</button><button className="button primary" disabled={props.busy}><Check size={17}/>{props.busy ? "Salvando…" : "Salvar trabalho"}</button></div>
      </footer>
    </form>
  </Modal>;
}

export function ClientEditor({ initial, save, ...props }: SaveProps & {initial: Client; save: (client: Client) => Promise<void>}) {
  const [client, setClient] = useState(initial);
  return <Modal title={client.id ? "Editar cliente" : "Novo cliente"} eyebrow="Carteira de clientes" close={props.close}>
    <form onSubmit={e => { e.preventDefault(); if (client.name.trim()) void save({...client, name: client.name.trim(), id: client.id || crypto.randomUUID()}); }}>
      <div className="modal-body form-grid">
        <label className="full">Nome do cliente<input required autoFocus maxLength={80} value={client.name} onChange={e => setClient({...client, name: e.target.value})} placeholder="Nome da empresa ou pessoa"/></label>
        <fieldset className="full"><legend>Cor de identificação</legend><div className="swatches">
          {colors.map((color, i) => <button key={color} type="button" className={`swatch tone-${color}`} aria-label={["Rosa", "Lilás", "Verde", "Âmbar", "Azul"][i]} aria-pressed={client.color === color} onClick={() => setClient({...client, color})}>{client.color === color && <Check size={18}/>}</button>)}
        </div></fieldset>
        <label className="full">Observações<textarea rows={3} maxLength={12000} value={client.notes} onChange={e => setClient({...client, notes: e.target.value})} placeholder="Preferências de conteúdo, alinhamentos e contatos"/></label>
      </div>
      {props.error && <p className="form-error" role="alert">{props.error}</p>}
      <footer className="modal-foot"><div className="modal-actions"><button type="button" className="button ghost" onClick={props.close}>Cancelar</button><button className="button primary" disabled={props.busy}><Check size={17}/>{props.busy ? "Salvando…" : "Salvar cliente"}</button></div></footer>
    </form>
  </Modal>;
}
