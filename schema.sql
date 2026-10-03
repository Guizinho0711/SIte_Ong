-- Supabase: SQL Editor > New query > cole tudo > Run
create table oficinas (id bigint generated always as identity primary key, nome text not null, dia text, vagas int not null default 20);
create table pessoas (id bigint generated always as identity primary key, nome text not null, telefone text);
create table integrantes (oficina_id bigint references oficinas(id) on delete cascade, pessoa_id bigint references pessoas(id) on delete cascade, primary key (oficina_id, pessoa_id));
create table slides (id bigint generated always as identity primary key, url text not null, caminho text, legenda text, criado timestamptz default now());

alter table oficinas enable row level security;
alter table pessoas enable row level security;
alter table integrantes enable row level security;
alter table slides enable row level security;

-- Público lê só oficinas, slides e contagem de integrantes (sem nomes/telefones)
create policy "ler oficinas" on oficinas for select using (true);
create policy "ler slides" on slides for select using (true);
create policy "ler integrantes" on integrantes for select using (true);
-- Só o administrador logado escreve e vê pessoas
create policy "admin oficinas" on oficinas for all to authenticated using (true) with check (true);
create policy "admin pessoas" on pessoas for all to authenticated using (true) with check (true);
create policy "admin integrantes" on integrantes for all to authenticated using (true) with check (true);
create policy "admin slides" on slides for all to authenticated using (true) with check (true);

-- Bloqueia inscrição acima do limite de vagas
create function checa_vagas() returns trigger language plpgsql as $$
begin
  if (select count(*) from integrantes where oficina_id = new.oficina_id) >= (select vagas from oficinas where id = new.oficina_id) then
    raise exception 'Oficina lotada: aumente as vagas.';
  end if;
  return new;
end $$;
create trigger vagas_ok before insert on integrantes for each row execute function checa_vagas();

-- Fotos dos slides
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true);
create policy "ver fotos" on storage.objects for select using (bucket_id = 'fotos');
create policy "admin fotos" on storage.objects for all to authenticated using (bucket_id = 'fotos') with check (bucket_id = 'fotos');
