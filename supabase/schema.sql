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
-- 1b. VERSÃO 2: planos, suspensão, comissões, pagamentos e acesso da equipe
--     (comandos "if not exists": seguro rodar em um banco que já tem dados)
-- ---------------------------------------------------------------------

-- Plano e suspensão: SÓ você (fornecedor) altera, pelo Table Editor do Supabase.
alter table public.negocios add column if not exists plano    text    not null default 'equipe';
alter table public.negocios add column if not exists suspenso boolean not null default false;
do $$ begin
  alter table public.negocios add constraint negocios_plano_valido check (plano in ('essencial','equipe','ilimitado'));
exception when duplicate_object then null; end $$;

-- Pagamento e comissão de cada atendimento
alter table public.agendamentos add column if not exists valor_cobrado   numeric(10,2);
alter table public.agendamentos add column if not exists forma_pagamento text;
alter table public.agendamentos add column if not exists comissao_valor  numeric(10,2) not null default 0;
do $$ begin
  alter table public.agendamentos add constraint agendamentos_forma_valida
    check (forma_pagamento is null or forma_pagamento in ('pix','dinheiro','credito','debito','outro'));
exception when duplicate_object then null; end $$;

-- Regras de comissão (privadas do dono). Prioridade na hora de calcular:
--   1º serviço + profissional · 2º padrão do serviço · 3º padrão do profissional · senão 0%
create table if not exists public.comissoes (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  servico_id       uuid references public.servicos(id) on delete cascade,
  profissional_id  uuid references public.profissionais(id) on delete cascade,
  percentual       numeric(5,2) not null check (percentual between 0 and 100),
  check (servico_id is not null or profissional_id is not null),
  unique nulls not distinct (negocio_id, servico_id, profissional_id)
);

-- Login de cada profissional (ligado a um profissional da equipe)
create table if not exists public.acessos (
  profissional_id  uuid primary key references public.profissionais(id) on delete cascade,
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  email            text not null default '',
  criado_em        timestamptz not null default now()
);

-- Código de convite que o dono gera para o profissional criar o login
create table if not exists public.convites (
  codigo           text primary key,
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  profissional_id  uuid not null references public.profissionais(id) on delete cascade,
  expira_em        timestamptz not null default now() + interval '7 days'
);
create index if not exists comissoes_negocio on public.comissoes (negocio_id);
create index if not exists acessos_negocio   on public.acessos (negocio_id);

-- ---------------------------------------------------------------------
-- 2. SEGURANÇA (Row Level Security): cada dono só enxerga o que é dele
-- ---------------------------------------------------------------------

create or replace function public.eh_dono(p_negocio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.negocios where id = p_negocio and owner_id = auth.uid());
$$;

create or replace function public.negocio_publico(p_negocio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.negocios where id = p_negocio and ativo and not suspenso);
$$;

-- Qual profissional da equipe é o usuário logado (nulo se não for da equipe)
create or replace function public.meu_profissional(p_negocio uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select profissional_id from public.acessos where negocio_id = p_negocio and user_id = auth.uid();
$$;

create or replace function public.eh_membro(p_negocio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acessos where negocio_id = p_negocio and user_id = auth.uid());
$$;

alter table public.negocios      enable row level security;
alter table public.profissionais enable row level security;
alter table public.servicos      enable row level security;
alter table public.horarios      enable row level security;
alter table public.bloqueios     enable row level security;
alter table public.portfolio     enable row level security;
alter table public.depoimentos   enable row level security;
alter table public.agendamentos  enable row level security;
alter table public.comissoes     enable row level security;
alter table public.acessos       enable row level security;
alter table public.convites      enable row level security;

-- negocios: público lê os ativos; dono lê e altera o seu
drop policy if exists negocios_ler on public.negocios;
create policy negocios_ler on public.negocios for select
  using ((ativo and not suspenso) or owner_id = auth.uid() or public.eh_membro(id));
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
    execute format('create policy %1$s_ler on public.%1$s for select using (public.negocio_publico(negocio_id) or public.eh_dono(negocio_id) or public.eh_membro(negocio_id))', t);
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
-- O profissional só LÊ a própria agenda (alterações passam pelas funções do item 6)
drop policy if exists agendamentos_profissional on public.agendamentos;
create policy agendamentos_profissional on public.agendamentos for select to authenticated
  using (profissional_id is not null and profissional_id = public.meu_profissional(negocio_id));
drop policy if exists bloqueios_membro on public.bloqueios;
create policy bloqueios_membro on public.bloqueios for select to authenticated
  using (public.eh_membro(negocio_id));

drop policy if exists comissoes_dono on public.comissoes;
create policy comissoes_dono on public.comissoes for all to authenticated
  using (public.eh_dono(negocio_id)) with check (public.eh_dono(negocio_id));
drop policy if exists acessos_dono on public.acessos;
create policy acessos_dono on public.acessos for select to authenticated
  using (public.eh_dono(negocio_id));
drop policy if exists acessos_dono_remover on public.acessos;
create policy acessos_dono_remover on public.acessos for delete to authenticated
  using (public.eh_dono(negocio_id));
drop policy if exists acessos_proprio on public.acessos;
create policy acessos_proprio on public.acessos for select to authenticated
  using (user_id = auth.uid());
drop policy if exists convites_dono on public.convites;
create policy convites_dono on public.convites for select to authenticated
  using (public.eh_dono(negocio_id));

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
  select * into n from public.negocios where slug = p_slug and ativo and not suspenso;
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

  select * into n from public.negocios where slug = p_slug and ativo and not suspenso;
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

-- ---------------------------------------------------------------------
-- 5. PLANOS: proteção e limite de profissionais
--    essencial = 1 profissional ativo · equipe = até 6 · ilimitado = sem limite
-- ---------------------------------------------------------------------

create or replace function public.limite_profissionais(p_plano text)
returns int language sql immutable as $$
  select case p_plano when 'essencial' then 1 when 'equipe' then 6 else null end;
$$;

-- Dono não consegue mudar o próprio plano nem tirar a suspensão. Você muda pelo Table Editor.
create or replace function public._proteger_negocio()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.plano := 'equipe';      -- plano inicial de toda conta nova (período de teste)
      new.suspenso := false;
    elsif new.plano is distinct from old.plano or new.suspenso is distinct from old.suspenso then
      raise exception 'SOMENTE_FORNECEDOR' using hint = 'Plano e suspensão só podem ser alterados pelo suporte.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists proteger_negocio on public.negocios;
create trigger proteger_negocio before insert or update on public.negocios
  for each row execute function public._proteger_negocio();

create or replace function public._limite_profissionais()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lim int; v_qtd int;
begin
  if not new.ativo or (tg_op = 'UPDATE' and old.ativo) then return new; end if;
  select public.limite_profissionais(plano) into v_lim from public.negocios where id = new.negocio_id;
  if v_lim is null then return new; end if;
  select count(*) into v_qtd from public.profissionais where negocio_id = new.negocio_id and ativo and id <> new.id;
  if v_qtd >= v_lim then
    raise exception 'LIMITE_PLANO' using hint = format('Seu plano permite até %s profissional(is) ativo(s). Fale com o suporte para mudar de plano.', v_lim);
  end if;
  return new;
end $$;
drop trigger if exists limite_profissionais on public.profissionais;
create trigger limite_profissionais before insert or update of ativo on public.profissionais
  for each row execute function public._limite_profissionais();

-- ---------------------------------------------------------------------
-- 6. COMISSÃO: calculada e "congelada" em cada agendamento
--    (mudar a regra depois não altera o que já foi lançado)
-- ---------------------------------------------------------------------

create or replace function public.pct_comissao(p_negocio uuid, p_servico uuid, p_prof uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(
    (select percentual from public.comissoes where negocio_id = p_negocio and servico_id = p_servico and profissional_id = p_prof),
    (select percentual from public.comissoes where negocio_id = p_negocio and servico_id = p_servico and profissional_id is null),
    (select percentual from public.comissoes where negocio_id = p_negocio and servico_id is null and profissional_id = p_prof),
    0);
$$;

create or replace function public._calcular_comissao()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  it jsonb; itens jsonb := '[]'; v_tab numeric := 0; v_com numeric := 0; v_base numeric; v_pct_medio numeric;
begin
  if tg_op = 'INSERT' or new.servicos is distinct from old.servicos or new.profissional_id is distinct from old.profissional_id then
    for it in select * from jsonb_array_elements(coalesce(new.servicos, '[]')) loop
      itens := itens || jsonb_build_array(it || jsonb_build_object('comissao_pct',
        public.pct_comissao(new.negocio_id, nullif(it->>'id', '')::uuid, new.profissional_id)));
    end loop;
    new.servicos := itens;
  end if;
  for it in select * from jsonb_array_elements(new.servicos) loop
    v_tab := v_tab + coalesce((it->>'preco')::numeric, 0);
    v_com := v_com + coalesce((it->>'preco')::numeric, 0) * coalesce((it->>'comissao_pct')::numeric, 0) / 100;
  end loop;
  v_base := coalesce(new.valor_cobrado, new.valor_total);
  if v_tab > 0 then
    new.comissao_valor := round(v_com * v_base / v_tab, 2);   -- proporcional se houve desconto/acréscimo
  else
    select coalesce(avg((x->>'comissao_pct')::numeric), 0) into v_pct_medio from jsonb_array_elements(new.servicos) x;
    new.comissao_valor := round(v_base * v_pct_medio / 100, 2);
  end if;
  return new;
end $$;
drop trigger if exists calcular_comissao on public.agendamentos;
create trigger calcular_comissao before insert or update of servicos, profissional_id, valor_cobrado, valor_total
  on public.agendamentos for each row execute function public._calcular_comissao();

-- ---------------------------------------------------------------------
-- 7. EQUIPE: convite, agenda e status pelo painel
-- ---------------------------------------------------------------------

-- Dono gera um código para o profissional criar o próprio login
create or replace function public.gerar_convite(p_profissional uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_neg public.negocios; v_cod text;
begin
  select n.* into v_neg from public.negocios n join public.profissionais p on p.negocio_id = n.id
  where p.id = p_profissional and n.owner_id = auth.uid();
  if not found then raise exception 'SEM_PERMISSAO'; end if;
  if v_neg.plano = 'essencial' then
    raise exception 'PLANO_NAO_PERMITE' using hint = 'Login para a equipe faz parte do plano Equipe. Fale com o suporte.';
  end if;
  delete from public.convites where profissional_id = p_profissional or expira_em < now();
  loop
    v_cod := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.convites where codigo = v_cod);
  end loop;
  insert into public.convites (codigo, negocio_id, profissional_id) values (v_cod, v_neg.id, p_profissional);
  return v_cod;
end $$;

-- Profissional logado usa o código e passa a ver a própria agenda
create or replace function public.aceitar_convite(p_codigo text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare c public.convites; v_email text;
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN'; end if;
  select * into c from public.convites where codigo = upper(btrim(p_codigo)) and expira_em > now();
  if not found then raise exception 'CONVITE_INVALIDO' using hint = 'Código inválido ou vencido. Peça um novo ao dono do negócio.'; end if;
  if exists (select 1 from public.negocios where owner_id = auth.uid()) then
    raise exception 'CONTA_DE_DONO' using hint = 'Este e-mail já é dono de um negócio. Crie o acesso com outro e-mail.';
  end if;
  if exists (select 1 from public.acessos where user_id = auth.uid()) then
    raise exception 'JA_TEM_ACESSO' using hint = 'Este e-mail já está ligado a um profissional. Use outro e-mail.';
  end if;
  if exists (select 1 from public.acessos where profissional_id = c.profissional_id) then
    raise exception 'PROFISSIONAL_JA_TEM_ACESSO' using hint = 'Esse profissional já tem login. O dono precisa remover o acesso antigo primeiro.';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.acessos (profissional_id, negocio_id, user_id, email) values (c.profissional_id, c.negocio_id, auth.uid(), coalesce(v_email, ''));
  delete from public.convites where codigo = c.codigo;
  return json_build_object('negocio_id', c.negocio_id, 'profissional_id', c.profissional_id);
end $$;

-- Agendamento lançado pelo painel (dono: qualquer profissional · profissional: só ele mesmo)
create or replace function public.agendar_pelo_painel(
  p_profissional uuid, p_servicos uuid[], p_inicio timestamptz, p_nome text, p_whatsapp text, p_obs text default '')
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  p public.profissionais; v_dur int; v_total numeric; v_qtd int; v_lista jsonb; v_id uuid;
  v_fone text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
begin
  select * into p from public.profissionais where id = p_profissional;
  if not found or not (public.eh_dono(p.negocio_id) or public.meu_profissional(p.negocio_id) = p.id) then
    raise exception 'SEM_PERMISSAO';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'NOME_INVALIDO' using hint = 'Informe o nome do cliente.'; end if;
  if length(v_fone) < 10 or length(v_fone) > 13 then raise exception 'WHATSAPP_INVALIDO' using hint = 'Informe o WhatsApp com DDD.'; end if;
  if length(v_fone) <= 11 then v_fone := '55' || v_fone; end if;
  select coalesce(sum(duracao_min), 0), coalesce(sum(preco), 0), count(*),
         coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'duracao_min', duracao_min, 'preco', preco) order by ordem, nome), '[]')
    into v_dur, v_total, v_qtd, v_lista
  from public.servicos where negocio_id = p.negocio_id and id = any(p_servicos);
  if v_qtd = 0 then raise exception 'SERVICO_INVALIDO' using hint = 'Escolha pelo menos um serviço.'; end if;
  begin
    insert into public.agendamentos (negocio_id, profissional_id, profissional_nome, cliente_nome, cliente_whatsapp,
                                     servicos, valor_total, inicio, fim, origem, obs)
    values (p.negocio_id, p.id, p.nome, btrim(p_nome), v_fone, v_lista, v_total,
            p_inicio, p_inicio + make_interval(mins => v_dur), 'painel', left(coalesce(p_obs, ''), 500))
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_OCUPADO' using hint = format('%s já tem atendimento nesse horário.', p.nome);
  end;
  return v_id;
end $$;

-- Mudar status (concluir com valor e forma de pagamento, faltou, cancelar, reabrir)
create or replace function public.mudar_status(p_id uuid, p_status text, p_valor numeric default null, p_forma text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare a public.agendamentos; v_dono boolean;
begin
  select * into a from public.agendamentos where id = p_id;
  if not found then raise exception 'SEM_PERMISSAO'; end if;
  v_dono := public.eh_dono(a.negocio_id);
  if not v_dono and (a.profissional_id is null or public.meu_profissional(a.negocio_id) is distinct from a.profissional_id) then
    raise exception 'SEM_PERMISSAO';
  end if;
  if p_status not in ('confirmado','concluido','faltou','cancelado') then raise exception 'STATUS_INVALIDO'; end if;
  if p_status = 'cancelado' and not v_dono then
    raise exception 'SEM_PERMISSAO' using hint = 'Só o dono do negócio pode cancelar agendamentos.';
  end if;
  if p_valor is not null and p_valor < 0 then raise exception 'VALOR_INVALIDO' using hint = 'O valor não pode ser negativo.'; end if;
  begin
    update public.agendamentos set
      status = p_status,
      valor_cobrado = case when p_status = 'concluido' then coalesce(p_valor, a.valor_total) end,
      forma_pagamento = case when p_status = 'concluido' then p_forma end
    where id = p_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_OCUPADO' using hint = 'Esse horário já foi ocupado por outro agendamento.';
  end;
end $$;

-- ---------------------------------------------------------------------
-- 8. RELATÓRIO FINANCEIRO (semana, mês ou qualquer período)
--    Dono vê tudo · profissional vê só os próprios números
-- ---------------------------------------------------------------------
create or replace function public.relatorio(p_ini timestamptz, p_fim timestamptz)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_neg public.negocios; v_prof uuid; v_papel text := 'dono';
begin
  select * into v_neg from public.negocios where owner_id = auth.uid();
  if not found then
    select n.* into v_neg from public.negocios n join public.acessos ac on ac.negocio_id = n.id where ac.user_id = auth.uid();
    if not found then raise exception 'SEM_PERMISSAO'; end if;
    v_papel := 'profissional';
    v_prof := public.meu_profissional(v_neg.id);
  end if;

  return (
    with base as (
      select * from public.agendamentos
      where negocio_id = v_neg.id and inicio >= p_ini and inicio < p_fim
        and (v_prof is null or profissional_id = v_prof)
    ), feitos as (select * from base where status = 'concluido')
    select json_build_object(
      'papel', v_papel,
      'resumo', (select json_build_object(
          'faturado',     coalesce((select sum(valor_cobrado) from feitos), 0),
          'comissoes',    coalesce((select sum(comissao_valor) from feitos), 0),
          'atendimentos', (select count(*) from feitos),
          'previsto',     coalesce((select sum(valor_total) from base where status = 'confirmado'), 0),
          'confirmados',  (select count(*) from base where status = 'confirmado'),
          'faltas',       (select count(*) from base where status = 'faltou'),
          'cancelados',   (select count(*) from base where status = 'cancelado'))),
      'por_profissional', coalesce((select json_agg(x order by x.faturado desc) from (
          select coalesce(nullif(profissional_nome, ''), '—') as nome,
                 count(*) filter (where status = 'concluido') as atendimentos,
                 coalesce(sum(valor_cobrado) filter (where status = 'concluido'), 0) as faturado,
                 coalesce(sum(comissao_valor) filter (where status = 'concluido'), 0) as comissao,
                 coalesce(sum(valor_total) filter (where status = 'confirmado'), 0) as previsto,
                 count(*) filter (where status = 'faltou') as faltas
          from base group by 1) x), '[]'),
      'por_forma', coalesce((select json_agg(x order by x.valor desc) from (
          select coalesce(forma_pagamento, 'nao_informado') as forma, count(*) as qtd, sum(valor_cobrado) as valor
          from feitos group by 1) x), '[]'),
      'por_servico', coalesce((select json_agg(x order by x.qtd desc, x.valor desc) from (
          select s->>'nome' as nome, count(*) as qtd, sum(coalesce((s->>'preco')::numeric, 0)) as valor
          from feitos, jsonb_array_elements(feitos.servicos) s group by 1 limit 15) x), '[]'),
      'por_dia', coalesce((select json_agg(x order by x.dia) from (
          select (inicio at time zone v_neg.fuso)::date as dia, sum(valor_cobrado) as valor, count(*) as qtd
          from feitos group by 1) x), '[]'),
      'itens', coalesce((select json_agg(x order by x.inicio) from (
          select inicio, cliente_nome, profissional_nome,
                 (select string_agg(s->>'nome', ' + ') from jsonb_array_elements(servicos) s) as servicos,
                 valor_total, valor_cobrado, forma_pagamento, comissao_valor
          from feitos order by inicio limit 5000) x), '[]')
    )
  );
end $$;

-- Funções do painel: só para quem está logado
revoke execute on function public.gerar_convite(uuid) from public, anon;
revoke execute on function public.aceitar_convite(text) from public, anon;
revoke execute on function public.agendar_pelo_painel(uuid, uuid[], timestamptz, text, text, text) from public, anon;
revoke execute on function public.mudar_status(uuid, text, numeric, text) from public, anon;
revoke execute on function public.relatorio(timestamptz, timestamptz) from public, anon;
revoke execute on function public.pct_comissao(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.gerar_convite(uuid) to authenticated;
grant execute on function public.aceitar_convite(text) to authenticated;
grant execute on function public.agendar_pelo_painel(uuid, uuid[], timestamptz, text, text, text) to authenticated;
grant execute on function public.mudar_status(uuid, text, numeric, text) to authenticated;
grant execute on function public.relatorio(timestamptz, timestamptz) to authenticated;
