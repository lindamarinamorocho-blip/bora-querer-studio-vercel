import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseConfig } from "@/lib/supabase";
import { initialStudio, studioSchema } from "../../model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payload = z.object({data: studioSchema, revision: z.number().int().nonnegative().max(2147483646)});
const reply = (body: unknown, status = 200) =>
  Response.json(body, {status, headers: {"Cache-Control": "private, no-store"}});

async function authorize(request: Request) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) return {response: reply({error: "Entre para acessar seu painel."}, 401)};
  const {url, key} = supabaseConfig();
  const client = createClient(url, key, {
    global: {headers: {Authorization: bearer}},
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  });
  const {data, error} = await client.auth.getUser(bearer.slice(7));
  if (error || !data.user) return {response: reply({error: "Sua sessão expirou. Entre novamente."}, 401)};
  const owner = await client.from("studio_owners").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (owner.error) return {response: reply({error: "Não foi possível verificar o acesso. Confira a configuração do banco."}, 503)};
  if (!owner.data) return {response: reply({error: "Seu usuário ainda não foi autorizado para este painel."}, 403)};
  return {client, userId: data.user.id};
}

export async function GET(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    const {data, error} = await auth.client.from("studio").select("data, revision").eq("user_id", auth.userId).maybeSingle();
    if (error) return reply({error: "Não foi possível carregar os dados. Tente novamente."}, 503);
    return reply(data ?? {data: initialStudio(), revision: 0});
  } catch {
    return reply({error: "Confira a configuração do Supabase e tente novamente."}, 503);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({error: "Formato inválido."}, 415);
    // Bound the stream before allocating the entire payload.
    const reader = request.body?.getReader();
    if (!reader) return reply({error: "Dados inválidos."}, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1000000) { await reader.cancel(); return reply({error: "O painel atingiu o limite de armazenamento."}, 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return reply({error: "Dados inválidos."}, 400); }
    const parsed = payload.safeParse(body);
    if (!parsed.success) return reply({error: "Confira os campos e o tamanho dos textos."}, 400);
    const {data, revision} = parsed.data;
    const next = {data, revision: revision + 1};
    const result = revision === 0
      ? await auth.client.from("studio").insert({...next, user_id: auth.userId}).select("revision").maybeSingle()
      : await auth.client.from("studio").update(next).eq("user_id", auth.userId).eq("revision", revision).select("revision").maybeSingle();
    if (result.error && result.error.code !== "23505") return reply({error: "Não foi possível salvar. Tente novamente."}, 503);
    if (!result.data) return reply({error: "O painel mudou em outra aba ou aparelho. Copie seus ajustes e recarregue a página antes de salvar novamente."}, 409);
    return reply(next);
  } catch {
    return reply({error: "Não foi possível salvar. Confira a conexão e tente novamente."}, 503);
  }
}
