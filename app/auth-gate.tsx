"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Clapperboard, LogOut } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import StudioPanel from "./studio-panel";

export default function AuthGate() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const client = getSupabase();
      client.auth.getSession().then(({data, error}) => {
        if (!active) return;
        if (error) setError("Não foi possível recuperar sua sessão. Entre novamente.");
        setUser(data.session?.user.id ?? null);
        setLoading(false);
      }).catch(() => { if (active) { setError("Não foi possível iniciar o acesso."); setLoading(false); } });
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (active) { setUser(session?.user.id ?? null); setLoading(false); }
      });
      return () => { active = false; subscription.unsubscribe(); };
    } catch (error) {
      setError(error instanceof Error ? error.message : "Confira a configuração do painel.");
      setLoading(false);
    }
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const {error} = await getSupabase().auth.signInWithPassword({email: email.trim(), password});
      if (error) throw new Error("Não foi possível entrar. Confira seu e-mail e senha e tente novamente.");
      setPassword("");
    } catch (error) { setError(error instanceof Error ? error.message : "Tente novamente."); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError("");
    try {
      const { error } = await getSupabase().auth.signOut({ scope: "local" });
      if (error) throw error;
      setUser(null);
    } catch { setError("Não foi possível sair. Tente novamente."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="login-screen"><p role="status">Abrindo seu estúdio…</p></main>;
  if (user) return <><div className="account-tools"><button className="button ghost" onClick={logout} disabled={busy}><LogOut size={16}/> Sair</button>{error && <span role="alert">{error}</span>}</div><StudioPanel key={user}/></>;
  return <main className="login-screen">
    <section className="login-card">
      <span className="login-icon"><Clapperboard size={28}/></span>
      <p className="eyebrow">BORA QUERER STUDIO</p>
      <h1>Seu trabalho,<br/>no seu ritmo.</h1>
      <p>Entre para organizar clientes, gravações e entregas.</p>
      <form onSubmit={login} className="form-grid">
        <label className="full">E-mail<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}/></label>
        <label className="full">Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}/></label>
        {error && <p className="form-error full" role="alert">{error}</p>}
        <button className="button primary full" disabled={busy}>{busy ? "Entrando…" : "Entrar no painel"}</button>
      </form>
      <small>Palmas, TO · Acesso privado</small>
    </section>
  </main>;
}
