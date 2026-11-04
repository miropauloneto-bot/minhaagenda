-- =====================================================================
--  MINHA AGENDA — banco de dados (Supabase / Postgres)
--  Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.
--  Pode rodar de novo sem perder dados (o script é idempotente).
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Um negócio por conta (dono). O slug vira o link: /agendar/?n=slug
create table if not exists public.negocios (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  nome             text not null check (length(nome) between 2 and 80),
  nicho            text not null default 'salao',
  whatsapp         text not null default '',
  instagram        text not null default '',
  endereco         text not null default '',
  cidade           text not null default '',
  maps_url         text not null default '',
  horario_texto    text not null default '',
  hero_selo        text,
  hero_titulo      text,
  hero_subtitulo   text,
  cor_principal    text check (cor_principal is null or cor_principal ~ '^#[0-9a-fA-F]{6}$'),
  fuso             text not null default 'America/Sao_Paulo',
  intervalo_min    int  not null default 30 check (intervalo_min between 5 and 240),
  antecedencia_min int  not null default 60 check (antecedencia_min between 0 and 10080),
  dias_a_frente    int  not null default 30 check (dias_a_frente between 1 and 180),
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

create table if not exists public.profissionais (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  nome        text not null check (length(nome) between 1 and 60),
  funcao      text not null default '',
  ativo       boolean not null default true,
  ordem       int not null default 0
);

create table if not exists public.servicos (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  nome        text not null check (length(nome) between 1 and 80),
  descricao   text not null default '',
  duracao_min int  not null check (duracao_min between 5 and 720),
  preco       numeric(10,2) not null default 0 check (preco >= 0),
  categoria   text not null default '',
  ativo       boolean not null default true,
  ordem       int not null default 0
);

-- Horário de funcionamento. Pode haver mais de uma faixa por dia (ex.: 9–12 e 14–19).
create table if not exists public.horarios (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  abre        time not null,
  fecha       time not null,
  check (fecha > abre)
);

-- Folgas, férias, almoço extra. profissional_id vazio = vale para todos.
create table if not exists public.bloqueios (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  profissional_id  uuid references public.profissionais(id) on delete cascade,
  inicio           timestamptz not null,
  fim              timestamptz not null,
  motivo           text not null default '',
  check (fim > inicio)
);

create table if not exists public.portfolio (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  titulo      text not null default '',
  categoria   text not null default '',
  img_url     text not null,
  ordem       int not null default 0
);

create table if not exists public.depoimentos (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  texto       text not null,
  autor       text not null,
  detalhe     text not null default '',
  ordem       int not null default 0
);

create table if not exists public.agendamentos (
  id                uuid primary key default gen_random_uuid(),
  negocio_id        uuid not null references public.negocios(id) on delete cascade,
  profissional_id   uuid references public.profissionais(id) on delete set null,
  profissional_nome text not null default '',
  cliente_nome      text not null,
  cliente_whatsapp  text not null,
  servicos          jsonb not null default '[]',   -- cópia dos serviços no momento da reserva
  valor_total       numeric(10,2) not null default 0,
  inicio            timestamptz not null,
  fim               timestamptz not null,
  status            text not null default 'confirmado'
                    check (status in ('confirmado','concluido','cancelado','faltou')),
  origem            text not null default 'online' check (origem in ('online','painel')),
  obs               text not null default '',
  criado_em         timestamptz not null default now(),
  check (fim > inicio),
  -- A REGRA DE OURO: o mesmo profissional não pode ter dois horários ativos que se sobrepõem.
  -- Quem garante é o próprio banco, mesmo se duas pessoas clicarem no mesmo segundo.
  constraint sem_conflito_de_horario exclude using gist (
    profissional_id with =,
    tstzrange(inicio, fim, '[)') with &&
  ) where (status in ('confirmado','concluido'))
);

create index if not exists agendamentos_negocio_inicio on public.agendamentos (negocio_id, inicio);
create index if not exists bloqueios_negocio_inicio   on public.bloqueios (negocio_id, inicio);
create index if not exists profissionais_negocio      on public.profissionais (negocio_id);
create index if not exists servicos_negocio           on public.servicos (negocio_id);
create index if not exists horarios_negocio           on public.horarios (negocio_id);
create index if not exists portfolio_negocio          on public.portfolio (negocio_id);
create index if not exists depoimentos_negocio        on public.depoimentos (negocio_id);

-- ---------------------------------------------------------------------
-- 2. SEGURANÇA (Row Level Security): cada dono só enxerga o que é dele
-- ---------------------------------------------------------------------

create or replace function public.eh_dono(p_negocio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.negocios where id = p_negocio and owner_id = auth.uid());
$$;

create or replace function public.negocio_publico(p_negocio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.negocios where id = p_negocio and ativo);
$$;

alter table public.negocios      enable row level security;
alter table public.profissionais enable row level security;
alter table public.servicos      enable row level security;
alter table public.horarios      enable row level security;
alter table public.bloqueios     enable row level security;
alter table public.portfolio     enable row level security;
alter table public.depoimentos   enable row level security;
alter table public.agendamentos  enable row level security;

-- negocios: público lê os ativos; dono lê e altera o seu
drop policy if exists negocios_ler on public.negocios;
create policy negocios_ler on public.negocios for select
  using (ativo or owner_id = auth.uid());
drop policy if exists negocios_criar on public.negocios;
create policy negocios_criar on public.negocios for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists negocios_alterar on public.negocios;
create policy negocios_alterar on public.negocios for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists negocios_apagar on public.negocios;
create policy negocios_apagar on public.negocios for delete to authenticated
  using (owner_id = auth.uid());

-- Tabelas que aparecem na página pública: qualquer um lê, só o dono altera
do $$
declare t text;
begin
  foreach t in array array['profissionais','servicos','horarios','portfolio','depoimentos'] loop
    execute format('drop policy if exists %1$s_ler on public.%1$s', t);
    execute format('create policy %1$s_ler on public.%1$s for select using (public.negocio_publico(negocio_id) or public.eh_dono(negocio_id))', t);
    execute format('drop policy if exists %1$s_dono on public.%1$s', t);
    execute format('create policy %1$s_dono on public.%1$s for all to authenticated using (public.eh_dono(negocio_id)) with check (public.eh_dono(negocio_id))', t);
  end loop;
end $$;

-- Tabelas privadas: só o dono (o público usa as funções abaixo, que não expõem dados de clientes)
drop policy if exists bloqueios_dono on public.bloqueios;
create policy bloqueios_dono on public.bloqueios for all to authenticated
  using (public.eh_dono(negocio_id)) with check (public.eh_dono(negocio_id));
drop policy if exists agendamentos_dono on public.agendamentos;
create policy agendamentos_dono on public.agendamentos for all to authenticated
  using (public.eh_dono(negocio_id)) with check (public.eh_dono(negocio_id));

-- ---------------------------------------------------------------------
-- 3. FUNÇÕES PÚBLICAS DE AGENDAMENTO
-- ---------------------------------------------------------------------

-- Um profissional está livre neste intervalo? (agendamentos ativos + folgas)
create or replace function public._livre(p_negocio uuid, p_prof uuid, p_ini timestamptz, p_fim timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
           select 1 from public.agendamentos a
           where a.negocio_id = p_negocio and a.profissional_id = p_prof
             and a.status in ('confirmado','concluido')
             and tstzrange(a.inicio, a.fim, '[)') && tstzrange(p_ini, p_fim, '[)'))
     and not exists (
           select 1 from public.bloqueios b
           where b.negocio_id = p_negocio
             and (b.profissional_id is null or b.profissional_id = p_prof)
             and tstzrange(b.inicio, b.fim, '[)') && tstzrange(p_ini, p_fim, '[)'));
$$;

-- Horários de início disponíveis em um dia, para os serviços escolhidos.
-- p_profissional nulo = "sem preferência" (basta um profissional livre).
create or replace function public.horarios_livres(
  p_slug text, p_data date, p_servicos uuid[], p_profissional uuid default null)
returns table (hora text, inicio timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  n public.negocios;
  v_dur int;
  v_hoje date;
begin
  select * into n from public.negocios where slug = p_slug and ativo;
  if not found then return; end if;

  select coalesce(sum(s.duracao_min), 0) into v_dur
  from public.servicos s where s.negocio_id = n.id and s.ativo and s.id = any(p_servicos);
  if v_dur = 0 then return; end if;

  v_hoje := (now() at time zone n.fuso)::date;
  if p_data < v_hoje or p_data > v_hoje + n.dias_a_frente then return; end if;

  return query
  with slots as (
    select distinct (t at time zone n.fuso) as ini
    from public.horarios h,
         generate_series(p_data + h.abre,
                         p_data + h.fecha - make_interval(mins => v_dur),
                         make_interval(mins => n.intervalo_min)) as t
    where h.negocio_id = n.id and h.dia_semana = extract(dow from p_data)
  )
  select to_char(sl.ini at time zone n.fuso, 'HH24:MI'), sl.ini
  from slots sl
  where sl.ini >= now() + make_interval(mins => n.antecedencia_min)
    and exists (
      select 1 from public.profissionais p
      where p.negocio_id = n.id and p.ativo
        and (p_profissional is null or p.id = p_profissional)
        and public._livre(n.id, p.id, sl.ini, sl.ini + make_interval(mins => v_dur)))
  order by sl.ini;
end $$;

-- Cria o agendamento. Revalida tudo no servidor e usa a trava do banco contra conflito.
create or replace function public.criar_agendamento(
  p_slug text, p_servicos uuid[], p_inicio timestamptz, p_profissional uuid,
  p_nome text, p_whatsapp text, p_obs text default '')
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  n public.negocios;
  v_dur int; v_total numeric; v_qtd int; v_lista jsonb;
  v_fim timestamptz;
  v_local_ini timestamp; v_local_fim timestamp;
  v_fone text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_nome text := btrim(coalesce(p_nome, ''));
  prof record;
  v_id uuid;
begin
  if length(v_nome) < 2 or length(v_nome) > 80 then
    raise exception 'NOME_INVALIDO' using hint = 'Informe seu nome.';
  end if;
  if length(v_fone) < 10 or length(v_fone) > 13 then
    raise exception 'WHATSAPP_INVALIDO' using hint = 'Informe um WhatsApp válido com DDD.';
  end if;
  if length(v_fone) <= 11 then v_fone := '55' || v_fone; end if;  -- padroniza com DDI do Brasil

  select * into n from public.negocios where slug = p_slug and ativo;
  if not found then raise exception 'NEGOCIO_NAO_ENCONTRADO'; end if;

  select coalesce(sum(duracao_min), 0), coalesce(sum(preco), 0), count(*),
         coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'duracao_min', duracao_min, 'preco', preco) order by ordem, nome), '[]')
    into v_dur, v_total, v_qtd, v_lista
  from public.servicos
  where negocio_id = n.id and ativo and id = any(p_servicos);

  if v_qtd = 0 or v_qtd <> (select count(distinct x) from unnest(p_servicos) x) then
    raise exception 'SERVICO_INVALIDO' using hint = 'Escolha os serviços novamente.';
  end if;

  v_fim := p_inicio + make_interval(mins => v_dur);
  v_local_ini := p_inicio at time zone n.fuso;
  v_local_fim := v_fim at time zone n.fuso;

  if p_inicio < now() + make_interval(mins => n.antecedencia_min)
     or v_local_ini::date > (now() at time zone n.fuso)::date + n.dias_a_frente then
    raise exception 'FORA_DO_PRAZO' using hint = 'Este horário não está mais disponível.';
  end if;

  if not exists (
    select 1 from public.horarios h
    where h.negocio_id = n.id and h.dia_semana = extract(dow from v_local_ini)
      and v_local_ini::date = v_local_fim::date
      and v_local_ini::time >= h.abre and v_local_fim::time <= h.fecha) then
    raise exception 'FORA_DO_HORARIO' using hint = 'Horário fora do funcionamento.';
  end if;

  -- Anti-abuso: no máximo 3 agendamentos futuros ativos por WhatsApp neste negócio
  if (select count(*) from public.agendamentos
      where negocio_id = n.id and cliente_whatsapp = v_fone
        and status = 'confirmado' and inicio > now()) >= 3 then
    raise exception 'LIMITE_AGENDAMENTOS' using hint = 'Você já tem agendamentos em aberto. Fale com a gente pelo WhatsApp.';
  end if;

  for prof in
    select p.id, p.nome from public.profissionais p
    where p.negocio_id = n.id and p.ativo and (p_profissional is null or p.id = p_profissional)
    order by p.ordem, p.nome
  loop
    continue when not public._livre(n.id, prof.id, p_inicio, v_fim);
    begin
      insert into public.agendamentos
        (negocio_id, profissional_id, profissional_nome, cliente_nome, cliente_whatsapp,
         servicos, valor_total, inicio, fim, origem, obs)
      values
        (n.id, prof.id, prof.nome, v_nome, v_fone,
         v_lista, v_total, p_inicio, v_fim, 'online', left(coalesce(p_obs, ''), 500))
      returning id into v_id;
    exception when exclusion_violation then
      continue;  -- alguém reservou no mesmo instante: tenta o próximo profissional
    end;
    return json_build_object(
      'id', v_id, 'inicio', p_inicio, 'fim', v_fim,
      'profissional', prof.nome, 'servicos', v_lista, 'valor_total', v_total);
  end loop;

  raise exception 'HORARIO_OCUPADO' using hint = 'Esse horário acabou de ser reservado. Escolha outro.';
end $$;

-- Funções internas não ficam expostas na API
revoke execute on function public._livre(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant  execute on function public.horarios_livres(text, date, uuid[], uuid) to anon, authenticated;
grant  execute on function public.criar_agendamento(text, uuid[], timestamptz, uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. FOTOS DO PORTFÓLIO (Supabase Storage)
--    Cada dono só envia/apaga arquivos na pasta com o id do próprio negócio.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists portfolio_upload on storage.objects;
create policy portfolio_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio'
              and (storage.foldername(name))[1] in (select id::text from public.negocios where owner_id = auth.uid()));
drop policy if exists portfolio_alterar on storage.objects;
create policy portfolio_alterar on storage.objects for update to authenticated
  using (bucket_id = 'portfolio'
         and (storage.foldername(name))[1] in (select id::text from public.negocios where owner_id = auth.uid()));
drop policy if exists portfolio_apagar on storage.objects;
create policy portfolio_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio'
         and (storage.foldername(name))[1] in (select id::text from public.negocios where owner_id = auth.uid()));
