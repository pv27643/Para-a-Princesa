-- Datas especiais editáveis ("Datas que faço questão de lembrar").
-- month_day fica no formato 'MM-DD' (sem ano — são datas que se repetem
-- todos os anos, tal como o resto do site já assume em points.js).
create table if not exists special_dates (
  id bigint generated always as identity primary key,
  month_day text not null check (month_day ~ '^\d{2}-\d{2}$'),
  description text not null,
  created_by text check (created_by in ('maria', 'ivan')),
  created_at timestamptz not null default now()
);

alter table special_dates enable row level security;

create policy "special_dates: leitura livre" on special_dates
  for select using (true);
create policy "special_dates: inserir livre" on special_dates
  for insert with check (true);
create policy "special_dates: apagar livre" on special_dates
  for delete using (true);

alter publication supabase_realtime add table special_dates;

-- Semear as 5 datas que já estavam fixas no HTML, para não se perderem.
insert into special_dates (month_day, description, created_by)
values
  ('06-29', 'Dia que nos conhecemos', null),
  ('07-02', 'Primeiro beijo — 14:55', null),
  ('09-15', 'Aniversário do Ivan', null),
  ('10-18', 'Aniversário da Princesa', null),
  ('12-26', 'Dia do pedido de namoro', null);
