-- Emoji escolhido à mão para o estado "Personalizado".
alter table profiles add column if not exists mood_custom_emoji text;
