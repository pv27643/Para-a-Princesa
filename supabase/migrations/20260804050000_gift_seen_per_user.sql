-- A mensagem de revelação passa a ser "vista" por pessoa (não um único
-- booleano partilhado) — assim o Ivan consegue pré-visualizar sem gastar
-- a revelação real da Maria.
alter table gift_state add column if not exists maria_seen_intro boolean not null default false;
alter table gift_state add column if not exists ivan_seen_intro boolean not null default false;

update gift_state set maria_seen_intro = seen_intro, ivan_seen_intro = false where id = 1;

alter table gift_state drop column if exists seen_intro;
