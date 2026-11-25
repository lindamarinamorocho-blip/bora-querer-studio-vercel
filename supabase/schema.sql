-- Execute este arquivo uma vez no SQL Editor do seu projeto Supabase.
begin;

create table public.studio_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.studio (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  constraint studio_size check (octet_length(data::text) <= 1200000)
);

alter table public.studio_owners enable row level security;
alter table public.studio enable row level security;

revoke all on public.studio_owners from anon, authenticated;
revoke all on public.studio from anon, authenticated;
grant select on public.studio_owners to authenticated;
grant select, insert, update on public.studio to authenticated;

create policy owner_reads_own_membership on public.studio_owners
  for select to authenticated using (user_id = (select auth.uid()));

create policy owner_reads_studio on public.studio
  for select to authenticated using (
    user_id = (select auth.uid())
    and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid()))
  );

create policy owner_creates_studio on public.studio
  for insert to authenticated with check (
    user_id = (select auth.uid()) and revision = 1
    and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid()))
  );

create policy owner_updates_studio on public.studio
  for update to authenticated using (
    user_id = (select auth.uid())
    and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid()))
  ) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid()))
  );

-- Also protects revision handling for direct Data API clients.
create function public.check_studio_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.revision <> old.revision + 1 then
    raise exception 'Invalid studio revision' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger studio_revision_guard before update on public.studio
for each row execute function public.check_studio_revision();

commit;

-- Depois de criar seu usuário em Authentication > Users, execute separadamente:
-- insert into public.studio_owners (user_id) values ('UUID-DO-SEU-USUARIO');
