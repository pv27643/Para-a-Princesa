-- Texto livre para o estado "Personalizado" em O Nosso Estado.
alter table profiles add column if not exists mood_custom_text text;
