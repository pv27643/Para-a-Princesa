-- Estado emocional (mood) por perfil + subscrições de notificações push.

alter table profiles add column if not exists mood_key text;
alter table profiles add column if not exists mood_updated_at timestamptz;

create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  user_name text not null check (user_name in ('maria', 'ivan')),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions: leitura livre" on push_subscriptions
  for select using (true);
create policy "push_subscriptions: inserir livre" on push_subscriptions
  for insert with check (true);
create policy "push_subscriptions: apagar livre" on push_subscriptions
  for delete using (true);
create policy "push_subscriptions: atualizar livre" on push_subscriptions
  for update using (true);
