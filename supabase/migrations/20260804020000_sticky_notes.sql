-- Mural de post-its: frases curtas afixadas um para o outro.

create table if not exists sticky_notes (
  id bigint generated always as identity primary key,
  author text not null check (author in ('maria', 'ivan')),
  text text not null,
  color text not null default '#fff6a3',
  rotation numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table sticky_notes enable row level security;

create policy "sticky_notes: leitura livre" on sticky_notes
  for select using (true);
create policy "sticky_notes: inserir livre" on sticky_notes
  for insert with check (true);
create policy "sticky_notes: apagar livre" on sticky_notes
  for delete using (true);

alter publication supabase_realtime add table sticky_notes;
