-- Discos de vinil (um por mês) + estado da revelação especial (mensagem
-- única + escolha de desbloquear tudo ou um por dia).

create table if not exists vinyls (
  id bigint generated always as identity primary key,
  month text not null,
  photo_path text not null,
  audio_path text,
  message text not null,
  created_by text check (created_by in ('maria', 'ivan')),
  created_at timestamptz not null default now()
);

alter table vinyls enable row level security;

create policy "vinyls: leitura livre" on vinyls
  for select using (true);
create policy "vinyls: inserir livre" on vinyls
  for insert with check (true);
create policy "vinyls: apagar livre" on vinyls
  for delete using (true);

-- Uma única linha para o estado da revelação especial (partilhado pelos dois)
create table if not exists gift_state (
  id int primary key default 1,
  seen_intro boolean not null default false,
  reveal_mode text check (reveal_mode in ('all', 'daily')),
  reveal_started_at timestamptz,
  constraint gift_state_single_row check (id = 1)
);

insert into gift_state (id) values (1)
on conflict (id) do nothing;

alter table gift_state enable row level security;

create policy "gift_state: leitura livre" on gift_state
  for select using (true);
create policy "gift_state: atualizar livre" on gift_state
  for update using (true);

alter publication supabase_realtime add table vinyls;
alter publication supabase_realtime add table gift_state;
