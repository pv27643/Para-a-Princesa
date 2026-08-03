-- ============================================================
-- Schema do site "Amo-te, Maria" para Supabase
-- ------------------------------------------------------------
-- Como usar:
--   1. Cria um projeto em https://supabase.com (grátis)
--   2. Abre o "SQL Editor" no painel do projeto
--   3. ANTES de correr, substitui CHANGE_ME_MARIA / CHANGE_ME_IVAN
--      abaixo pelos PINs reais que quiserem usar
--   4. Cola este ficheiro inteiro e corre (Run)
--   5. Copia o "Project URL" e a "anon public key" (Settings > API)
--      para o ficheiro supabase-config.js
--
-- IMPORTANTE: este repositório é público — nunca faças commit deste
-- ficheiro com PINs reais lá dentro. Define os PINs verdadeiros só
-- diretamente no SQL Editor (ou pelo painel da tabela app_users),
-- sem os guardar aqui.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Utilizadores (Maria / Ivan) com PIN simples
-- ------------------------------------------------------------
-- O PIN nunca é exposto ao browser: só é validado através da
-- função verify_pin() abaixo, que corre no servidor da Supabase.
create table if not exists app_users (
  name text primary key check (name in ('maria', 'ivan')),
  pin text not null
);

-- Define aqui os PINs (podes voltar a correr este bloco para os mudar).
-- Substitui os valores abaixo antes de correr — não deixes PINs reais
-- neste ficheiro se o guardares num repositório público.
insert into app_users (name, pin) values
  ('maria', 'CHANGE_ME_MARIA'),
  ('ivan', 'CHANGE_ME_IVAN')
on conflict (name) do update set pin = excluded.pin;

alter table app_users enable row level security;
-- Sem policies de SELECT/INSERT/UPDATE para "anon" -> ninguém consegue
-- ler ou alterar os PINs diretamente a partir do browser.

create or replace function verify_pin(p_name text, p_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_users where name = p_name and pin = p_pin
  );
$$;

grant execute on function verify_pin(text, text) to anon;

-- ------------------------------------------------------------
-- 2) Quadro (desenho partilhado) — cada traço é uma linha
-- ------------------------------------------------------------
create table if not exists board_strokes (
  id bigint generated always as identity primary key,
  color text not null,
  size int not null,
  erase boolean not null default false,
  points jsonb not null,
  author text,
  created_at timestamptz not null default now()
);

alter table board_strokes enable row level security;

create policy "board_strokes: leitura livre" on board_strokes
  for select using (true);
create policy "board_strokes: inserir livre" on board_strokes
  for insert with check (true);

-- ------------------------------------------------------------
-- 3) Pintainhos — cada toque é uma linha (permite reset apagando tudo)
-- ------------------------------------------------------------
create table if not exists duck_taps (
  id bigint generated always as identity primary key,
  tap_date date not null default (now()::date),
  author text,
  created_at timestamptz not null default now()
);

alter table duck_taps enable row level security;

create policy "duck_taps: leitura livre" on duck_taps
  for select using (true);
create policy "duck_taps: inserir livre" on duck_taps
  for insert with check (true);
create policy "duck_taps: apagar livre" on duck_taps
  for delete using (true);

-- ------------------------------------------------------------
-- 4) Reservar dia — propor / aceitar / recusar
-- ------------------------------------------------------------
create table if not exists date_requests (
  id bigint generated always as identity primary key,
  proposed_by text not null check (proposed_by in ('maria', 'ivan')),
  event_date date not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table date_requests enable row level security;

create policy "date_requests: leitura livre" on date_requests
  for select using (true);
create policy "date_requests: inserir livre" on date_requests
  for insert with check (true);
create policy "date_requests: atualizar livre" on date_requests
  for update using (true);

-- ------------------------------------------------------------
-- 5) Fotos — upload / remover / fixar
-- ------------------------------------------------------------
create table if not exists photos (
  id bigint generated always as identity primary key,
  storage_path text not null,
  caption text,
  uploaded_by text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table photos enable row level security;

create policy "photos: leitura livre" on photos
  for select using (true);
create policy "photos: inserir livre" on photos
  for insert with check (true);
create policy "photos: atualizar livre" on photos
  for update using (true);
create policy "photos: apagar livre" on photos
  for delete using (true);

-- Bucket de armazenamento para os ficheiros das fotos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos bucket: leitura publica" on storage.objects
  for select using (bucket_id = 'photos');
create policy "photos bucket: upload livre" on storage.objects
  for insert with check (bucket_id = 'photos');
create policy "photos bucket: apagar livre" on storage.objects
  for delete using (bucket_id = 'photos');

-- ------------------------------------------------------------
-- 6) Ativar Realtime nas tabelas que precisam de atualizar ao vivo
-- ------------------------------------------------------------
alter publication supabase_realtime add table board_strokes;
alter publication supabase_realtime add table duck_taps;
alter publication supabase_realtime add table date_requests;
alter publication supabase_realtime add table photos;

-- ============================================================
-- NOTA DE SEGURANÇA
-- ------------------------------------------------------------
-- As policies acima ("leitura/inserção livre") permitem que qualquer
-- pessoa com o URL e a chave "anon" do projeto (que é pública, vai no
-- código do site) leia e escreva nestas tabelas — a única proteção
-- real é o ecrã de PIN à entrada do site, que é uma barreira do lado
-- do browser, não do servidor. Para duas pessoas e um site pessoal
-- isto é um compromisso razoável; não guardes aqui nada sensível.
-- ============================================================
