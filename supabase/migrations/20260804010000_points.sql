-- Tabela de pontos, loja de trocas e fotos de perfil.

-- ------------------------------------------------------------
-- 1) Pontos — cada linha é um movimento (pode ser negativo, para trocas)
-- ------------------------------------------------------------
create table if not exists points_log (
  id bigint generated always as identity primary key,
  target_user text not null check (target_user in ('maria', 'ivan')),
  awarded_by text check (awarded_by in ('maria', 'ivan')),
  reason text not null,
  points int not null,
  dedup_key text,
  created_at timestamptz not null default now()
);

-- Evita dar o prémio diário/de data especial duas vezes ao mesmo utilizador
-- no mesmo dia, mesmo que ele entre em dois telemóveis quase ao mesmo tempo.
create unique index if not exists points_log_dedup_idx
  on points_log (target_user, dedup_key)
  where dedup_key is not null;

alter table points_log enable row level security;

create policy "points_log: leitura livre" on points_log
  for select using (true);
create policy "points_log: inserir livre" on points_log
  for insert with check (true);

-- ------------------------------------------------------------
-- 2) Loja de trocas — pedir algo, o outro aceita (gasta pontos) ou recusa
-- ------------------------------------------------------------
create table if not exists trades (
  id bigint generated always as identity primary key,
  requested_by text not null check (requested_by in ('maria', 'ivan')),
  description text not null,
  cost int not null check (cost > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table trades enable row level security;

create policy "trades: leitura livre" on trades
  for select using (true);
create policy "trades: inserir livre" on trades
  for insert with check (true);
create policy "trades: atualizar livre" on trades
  for update using (true);

-- ------------------------------------------------------------
-- 3) Perfis — foto de cada um (Maria / Ivan)
-- ------------------------------------------------------------
create table if not exists profiles (
  name text primary key check (name in ('maria', 'ivan')),
  avatar_path text
);

insert into profiles (name) values ('maria'), ('ivan')
on conflict (name) do nothing;

alter table profiles enable row level security;

create policy "profiles: leitura livre" on profiles
  for select using (true);
create policy "profiles: atualizar livre" on profiles
  for update using (true);

-- ------------------------------------------------------------
-- 4) Realtime
-- ------------------------------------------------------------
alter publication supabase_realtime add table points_log;
alter publication supabase_realtime add table trades;
alter publication supabase_realtime add table profiles;
