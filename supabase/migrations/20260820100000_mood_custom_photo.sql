-- Foto opcional para o estado "Personalizado".
alter table profiles add column if not exists mood_custom_photo_path text;

-- Bucket de armazenamento para as fotos do estado personalizado
insert into storage.buckets (id, name, public)
values ('mood-photos', 'mood-photos', true)
on conflict (id) do nothing;

create policy "mood-photos bucket: leitura publica" on storage.objects
  for select using (bucket_id = 'mood-photos');
create policy "mood-photos bucket: upload livre" on storage.objects
  for insert with check (bucket_id = 'mood-photos');
create policy "mood-photos bucket: apagar livre" on storage.objects
  for delete using (bucket_id = 'mood-photos');
