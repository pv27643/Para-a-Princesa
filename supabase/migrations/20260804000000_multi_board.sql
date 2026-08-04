-- Quadro deixa de ser um único desenho: passa a haver vários "boards"
-- (um por cada vez que se cria um novo com o botão "+"), todos guardados
-- e editáveis, navegáveis para os lados.

create table if not exists boards (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  created_by text
);

alter table boards enable row level security;

create policy "boards: leitura livre" on boards
  for select using (true);
create policy "boards: inserir livre" on boards
  for insert with check (true);

alter table board_strokes add column if not exists board_id bigint references boards(id);

alter publication supabase_realtime add table boards;
