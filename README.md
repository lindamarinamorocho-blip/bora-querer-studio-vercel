# Bora Querer Studio

Painel em português para Linda Marina organizar o trabalho de videomaker mobile e social media em Palmas–TO.

Esta edição usa **Next.js + Supabase** e está preparada para hospedagem na **Vercel** a partir de um repositório GitHub.

## O que está incluído

- Visão geral com trabalhos em aberto, aprovações pendentes e entregas.
- Cadastro e edição de clientes e trabalhos pontuais ou recorrentes.
- Calendário com eventos, gravações, horários e prazos de entrega.
- Filtros por cliente, situação e tipo de trabalho.
- Etapas de produção e de aprovação independentes.
- Links do Drive e observações.
- Modelo reutilizável com briefing, roteiro, falas, ângulos, legendas, CTAs e checklist.
- Login por e-mail e senha, autorização por usuário e dados no banco.
- Controle de versão dos registros para detectar alterações simultâneas em abas ou aparelhos.

ICMED, GK Consultoria e Exclusiva Pharma aparecem no início, com quatro trabalhos marcados como exemplos. As datas e entregas desses exemplos são ilustrativas. Podem ser removidos pelo botão “Remover exemplos”.

## 1. Preparar o Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra o **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute uma vez.
3. Em **Authentication > Users**, crie seu usuário com e-mail e senha, usando a opção de criar usuário com e-mail confirmado.
4. Copie o UUID do usuário criado.
5. No SQL Editor, execute a instrução abaixo, substituindo o valor pelo UUID real.

```sql
insert into public.studio_owners (user_id)
values ('9045d784-01f0-4688-8226-a4e45efe5887');
```

6. Nas configurações de autenticação, desative novos cadastros públicos. O aplicativo oferece apenas entrada. Apenas usuários autorizados na tabela `studio_owners` podem acessar os registros.
7. Nas configurações do projeto, copie a **Project URL** e a **publishable key**. Em projetos antigos, a chave `anon` também funciona. Use a chave pública, nunca `service_role` ou uma secret key.
8. Para trocar ou recuperar a senha desta versão, use a administração de usuários do Supabase. A interface contém o login e o botão de sair.

As políticas RLS do arquivo SQL limitam cada usuário autorizado à própria linha. Mesmo conhecendo a chave pública, visitantes sem autorização não conseguem ler ou gravar os trabalhos. A API também valida a sessão e a autorização a cada operação.

## 2. Enviar para o GitHub

Extraia o ZIP. Os arquivos abaixo devem ficar na raiz do repositório, incluindo `package.json`.

```text
app/
lib/
public/
supabase/
.env.example
.gitignore
next.config.ts
package.json
package-lock.json
tsconfig.json
README.md
```

Se usar Git pelo terminal, rode dentro da pasta extraída, depois de criar um repositório vazio no GitHub.

```bash
git init
git add .
git commit -m "Adapta painel Bora Querer Studio para Vercel"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

O arquivo `.gitignore` mantém dependências, builds e variáveis locais fora do repositório. O ZIP inclui `.env.example` com valores ilustrativos.

## 3. Publicar na Vercel

1. Acesse https://vercel.com/new e importe o repositório GitHub.
2. Use o preset **Next.js** e a pasta raiz do repositório como **Root Directory**.
3. Use Node.js **22.x**. Os comandos padrão são `npm ci` para instalar e `npm run build` para construir. A saída é gerenciada automaticamente pelo Next.js.
4. Cadastre estas duas variáveis em **Environment Variables**.

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key ou chave anon do projeto |

5. Clique em **Deploy**.
6. Abra o endereço publicado e entre com o usuário criado no Supabase.
7. Crie um trabalho de teste, salve e recarregue a página para confirmar a persistência na sua conta.

Configure as variáveis também em **Preview** se quiser testar branches. Para testes isolados, use outro projeto Supabase. Depois de mudar uma variável `NEXT_PUBLIC_*`, faça um novo deploy porque ela é incluída no build.

Com a integração GitHub da Vercel ativa, os próximos pushes na branch de produção geram novas publicações. Branches de trabalho podem gerar previews conforme a configuração da sua conta.

## 4. Rodar no computador

Pré-requisito de Node.js 22.

```bash
npm ci
cp .env.example .env.local
```

Edite `.env.local` com os dois valores do seu projeto Supabase e rode.

```bash
npm run dev
```

Abra http://localhost:3000.

Para validar a versão de produção.

```bash
npm run typecheck
npm run build
npm start
```

## Uso cotidiano

- Em **Clientes**, adicione uma empresa ou pessoa e suas preferências.
- Em **Novo trabalho**, escolha o cliente, tipo, frequência, datas e status.
- Em **Ficha de captação**, registre falas e cenas e marque os itens do checklist.
- Em **Modelo de captação**, salve as orientações usadas com frequência. Elas são copiadas para cada trabalho novo.
- Use **Salvar trabalho** para gravar as alterações, inclusive marcações do checklist.
- Os links do Drive são cadastrados manualmente. O aplicativo abre esses links conforme as permissões do próprio Drive.
- Ao editar o mesmo painel em duas abas, um conflito de versão gera uma mensagem. Copie seus ajustes antes de recarregar para evitar perder o texto em edição.

O painel precisa de conexão para carregar e salvar registros. A classificação “Recorrente” identifica o contrato, e os trabalhos seguintes são cadastrados manualmente.

## Dados da versão anterior

Este pacote contém o código e os exemplos iniciais. Os registros eventualmente cadastrados na versão hospedada no ChatGPT não estão incluídos no ZIP. Uma transferência desses registros requer uma exportação autenticada e importação no novo banco.

## Referências

- https://nextjs.org/docs/app/getting-started/deploying
- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Verificação desta entrega

A compilação de produção foi executada com Next.js 16.4.6 e Node.js 22.23.5. Também foram verificados os tipos TypeScript, a recusa de chamadas sem sessão, a rejeição de cabeçalhos de identidade da hospedagem anterior e a validação dos exemplos.

O SQL foi executado em PostgreSQL local de teste, com verificações de autorização, isolamento entre usuários, atualizações e conflitos de versão. O login e a persistência em um projeto Supabase real dependem da configuração da sua conta e devem ser confirmados após o deploy.
