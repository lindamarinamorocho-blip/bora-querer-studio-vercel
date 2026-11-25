import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configure as duas variáveis do Supabase para abrir o painel.");
  return { url, key };
}

export function getSupabase() {
  if (!browserClient) {
    const { url, key } = supabaseConfig();
    browserClient = createClient(url, key);
  }
  return browserClient;
}

export async function panelFetch(input: string, init: RequestInit = {}) {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new Error("Sua sessão expirou. Entre novamente.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}
