import { z } from "zod";

export const kinds = ["Cobertura em tempo real", "Reels", "Stories", "Vídeos institucionais", "Planejamento de conteúdo"] as const;
export const stages = ["Planejado", "Em produção", "Em edição", "Entregue"] as const;
export const approvals = ["A enviar", "Aguardando", "Ajustes solicitados", "Aprovado", "Dispensado"] as const;
export const frequencies = ["Pontual", "Recorrente"] as const;
export const colors = ["rose", "lilac", "sage", "amber", "blue"] as const;
export const sections = [
  ["briefing", "Briefing", "Objetivo, público, entregáveis e referências"],
  ["script", "Roteiro", "Gancho, sequência de cenas e encerramento"],
  ["speakers", "Falas dos palestrantes", "Nome, horário e trecho que merece destaque"],
  ["angles", "Ângulos e planos", "Enquadramentos, movimentos e imagens de apoio"],
  ["captions", "Legendas", "Textos para stories, reels ou publicação"],
  ["cta", "CTAs", "A ação que você quer convidar o público a fazer"],
] as const;
const long = z.string().max(12000);
const date = z.union([z.literal(""), z.string().date()]);
const id = z.string().min(1).max(80);
export const sheetSchema = z.object({
  briefing: long, script: long, speakers: long, angles: long, captions: long, cta: long,
  checklist: z.array(z.object({ text: z.string().trim().min(1).max(240), done: z.boolean() })).max(50),
});
const clientSchema = z.object({
  id, name: z.string().trim().min(1).max(80), color: z.enum(colors), notes: long,
});
const projectSchema = z.object({
  id, client: id, title: z.string().trim().min(1).max(150),
  kind: z.enum(kinds), stage: z.enum(stages), approval: z.enum(approvals),
  frequency: z.enum(frequencies), event: date, shoot: date, due: date,
  eventTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/),
  shootTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/),
  place: z.string().max(200), drive: z.string().max(2000).refine((url) => !url || /^https?:\/\//i.test(url) && URL.canParse(url)),
  notes: long, sheet: sheetSchema, example: z.boolean(),
});
export const studioSchema = z.object({
  clients: z.array(clientSchema).max(200),
  projects: z.array(projectSchema).max(1000),
  template: sheetSchema,
}).refine((data) => {
  const clientIds = new Set(data.clients.map((client) => client.id));
  return clientIds.size === data.clients.length &&
    new Set(data.projects.map((project) => project.id)).size === data.projects.length &&
    data.projects.every((project) => clientIds.has(project.client));
});

export type Studio = z.infer<typeof studioSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Client = z.infer<typeof clientSchema>;
export type Sheet = z.infer<typeof sheetSchema>;
export type Snapshot = { data: Studio; revision: number };

export const blankSheet = (): Sheet => ({briefing: "", script: "", speakers: "", angles: "", captions: "", cta: "", checklist: []});

export function blankProject(client: string, sheet = blankSheet()): Project {
  return { id: "", client, title: "", kind: kinds[0], stage: stages[0], approval: approvals[0], frequency: frequencies[0],
    event: "", shoot: "", due: "", eventTime: "", shootTime: "", place: "", drive: "", notes: "", sheet: copySheet(sheet), example: false };
}

export function copySheet(sheet: Sheet): Sheet {
  return { ...sheet, checklist: sheet.checklist.map((item) => ({ text: item.text, done: false })) };
}

export function initialStudio(): Studio {
  const template = blankSheet();
  template.checklist = ["Confirmar agenda, local e falas prioritárias", "Testar áudio, luz e armazenamento", "Gravar planos abertos, detalhes e reações", "Conferir arquivos e fazer backup"].map(text => ({text, done: false}));
  const example = (id: string, client: string, title: string, fields: Partial<Project>): Project =>
    ({ ...blankProject(client, template), id, title, ...fields, example: true });
  return {
    clients: [
      { id: "icmed", name: "ICMED", color: "lilac", notes: "" },
      { id: "gk", name: "GK Consultoria", color: "rose", notes: "" },
      { id: "exclusiva", name: "Exclusiva Pharma", color: "sage", notes: "" },
    ],
    projects: [
      example("ex-gk", "gk", "Encontro de Secretárias e Administrativos", { stage: "Em edição", event: "2026-11-07", due: "2026-11-10",
        sheet: {...copySheet(template), briefing: "Cobertura em tempo real com foco nos palestrantes e nas interações da equipe.", speakers: "Adriéri · percepção de valor, agradabilidade e reconhecimento da equipe.", angles: "Plano médio da fala, plano aberto da plateia e detalhes das interações."} }),
      example("ex-icmed", "icmed", "Reels de bastidores do instituto", { kind: "Reels", stage: "Em produção", frequency: "Recorrente", shoot: "2026-11-11", shootTime: "09:00", due: "2026-11-16" }),
      example("ex-exclusiva", "exclusiva", "Stories de produtos manipulados", { kind: "Stories", stage: "Em edição", approval: "Aguardando", due: "2026-11-12" }),
      example("ex-plano", "icmed", "Planejamento de conteúdo do mês", { kind: "Planejamento de conteúdo", stage: "Entregue", approval: "Aprovado", frequency: "Recorrente", due: "2026-11-06" }),
    ],
    template,
  };
}

export function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Araguaina", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function dateFromKey(key: string) {
  return new Date(key + "T12:00:00Z");
}

export function dateLabel(key: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(dateFromKey(key));
}
