-- Despesas da Viagem Lisboa — tabela isolada, sem dados sensíveis, com
-- RLS aberta de propósito: esta página fica fora do login (link direto)
-- para dar para adicionar despesas no telemóvel durante a viagem.
create table if not exists trip_expenses (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric not null,
  categoria text,
  quem text,
  created_at timestamptz not null default now()
);

alter table trip_expenses enable row level security;

create policy "trip_expenses: leitura livre" on trip_expenses
  for select using (true);
create policy "trip_expenses: inserir livre" on trip_expenses
  for insert with check (true);
create policy "trip_expenses: apagar livre" on trip_expenses
  for delete using (true);

alter publication supabase_realtime add table trip_expenses;
