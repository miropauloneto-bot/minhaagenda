-- =====================================================================
-- ATUALIZAÇÃO v5 — GESTÃO DE PEDIDOS (marmitarias, passeios e outros nichos de pedido)
-- Rode UMA VEZ no Supabase: SQL Editor > New query > cole tudo > Run.
-- Precisa da atualizacao-v4.sql rodada antes. Pode rodar de novo sem problema.
-- O mesmo conteúdo também está no fim do schema.sql (seção 12).
-- =====================================================================

create table if not exists public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  dia              date not null,                       -- dia do pedido no fuso do negócio
  numero           int  not null,                       -- nº do pedido no dia: 1, 2, 3...
  cliente_nome     text not null,
  cliente_whatsapp text not null,
  modo             text not null default 'retirada' check (modo in ('entrega','retirada')),
  endereco         text not null default '',
  pagamento        text not null default '',
  troco            text not null default '',
  itens            jsonb not null default '[]',         -- cópia dos itens, escolhas e preços no momento do pedido
  subtotal         numeric(10,2) not null default 0,
  taxa             numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  status           text not null default 'novo'
                   check (status in ('novo','preparo','saiu','pronto','entregue','cancelado')),
  obs              text not null default '',
  ip_hash          text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (negocio_id, dia, numero),
  check (length(cliente_nome) <= 80 and cliente_whatsapp ~ '^[0-9]{10,15}$'
         and length(endereco) <= 200 and length(pagamento) <= 60 and length(troco) <= 20 and length(obs) <= 300)
);
create index if not exists pedidos_negocio_dia on public.pedidos (negocio_id, dia, criado_em);

alter table public.pedidos enable row level security;
drop policy if exists pedidos_dono on public.pedidos;
create policy pedidos_dono on public.pedidos for all to authenticated
  using (public.eh_dono(negocio_id)) with check (public.eh_dono(negocio_id));
drop policy if exists pedidos_membro on public.pedidos;
create policy pedidos_membro on public.pedidos for select to authenticated
  using (public.eh_membro(negocio_id));
revoke all on public.pedidos from anon;

-- Guarda a hora da última mudança de status
create or replace function public._pedido_atualizado() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists pedido_atualizado on public.pedidos;
create trigger pedido_atualizado before update on public.pedidos for each row execute function public._pedido_atualizado();

-- Cria o pedido. O navegador manda só QUAIS itens e escolhas; preços, taxa e total
-- são calculados aqui com os dados do banco (ninguém consegue mudar preço pelo navegador).
--   p_itens: [{"id": "<id do item>", "qtd": 2, "escolhas": [[0], [1, 3]], "obs": "sem cebola"}]
--   escolhas: para cada grupo do item, as posições das opções marcadas (0 = primeira)
create or replace function public.criar_pedido(
  p_slug text, p_itens jsonb, p_nome text, p_whatsapp text, p_modo text,
  p_endereco text default '', p_pagamento text default '', p_troco text default '', p_obs text default '')
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  n public.negocios;
  s public.servicos;
  it jsonb; g jsonb; esc jsonb; idx jsonb;
  gi int; v_i int; v_qtd int; v_unit numeric;
  v_nomes text[]; v_partes text[]; v_vistos int[];
  v_itens jsonb := '[]'; v_sub numeric := 0; v_taxa numeric := 0;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_fone text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_modo text := coalesce(p_modo, 'retirada');
  v_end text := left(btrim(coalesce(p_endereco, '')), 200);
  v_dia date; v_num int; v_id uuid;
  v_ip text := nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), '');
  v_ip_hash text;
begin
  if length(v_nome) < 2 or length(v_nome) > 80 then
    raise exception 'NOME_INVALIDO' using hint = 'Informe seu nome.';
  end if;
  if length(v_fone) < 10 or length(v_fone) > 13 then
    raise exception 'WHATSAPP_INVALIDO' using hint = 'Informe um WhatsApp válido com DDD.';
  end if;
  if length(v_fone) <= 11 then v_fone := '55' || v_fone; end if;

  select * into n from public.negocios where slug = p_slug and ativo and not suspenso;
  if not found then raise exception 'NEGOCIO_NAO_ENCONTRADO'; end if;

  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 40 then
    raise exception 'PEDIDO_VAZIO' using hint = 'Seu pedido está vazio.';
  end if;
  if v_modo not in ('entrega', 'retirada') then v_modo := 'retirada'; end if;
  if v_modo = 'entrega' and not n.faz_entrega then
    raise exception 'SEM_ENTREGA' using hint = 'Este estabelecimento não faz entrega. Escolha retirada.';
  end if;
  if v_modo = 'entrega' and length(v_end) < 8 then
    raise exception 'ENDERECO_INVALIDO' using hint = 'Informe o endereço de entrega completo.';
  end if;

  for it in select * from jsonb_array_elements(p_itens) loop
    if coalesce(it ->> 'id', '') !~ '^[0-9a-f-]{36}$' or coalesce(it ->> 'qtd', '') !~ '^[0-9]{1,2}$' then
      raise exception 'ITEM_MUDOU' using hint = 'O cardápio foi atualizado. Recarregue a página e monte o pedido de novo.';
    end if;
    v_qtd := (it ->> 'qtd')::int;
    if v_qtd < 1 then raise exception 'ITEM_MUDOU' using hint = 'Quantidade inválida.'; end if;
    select * into s from public.servicos where id = (it ->> 'id')::uuid and negocio_id = n.id and ativo;
    if not found then
      raise exception 'ITEM_INDISPONIVEL' using hint = 'Um dos itens acabou ou saiu do cardápio. Recarregue a página.';
    end if;

    esc := coalesce(it -> 'escolhas', '[]');
    if jsonb_typeof(esc) <> 'array' or jsonb_array_length(esc) <> jsonb_array_length(coalesce(s.opcoes, '[]')) then
      raise exception 'ITEM_MUDOU' using hint = 'O cardápio foi atualizado. Recarregue a página e monte o pedido de novo.';
    end if;

    v_unit := s.preco; v_partes := '{}'; gi := 0;
    for g in select * from jsonb_array_elements(coalesce(s.opcoes, '[]')) loop
      v_nomes := '{}'; v_vistos := '{}';
      if jsonb_typeof(esc -> gi) <> 'array' then
        raise exception 'ITEM_MUDOU' using hint = 'O cardápio foi atualizado. Recarregue a página e monte o pedido de novo.';
      end if;
      for idx in select * from jsonb_array_elements(esc -> gi) loop
        if jsonb_typeof(idx) <> 'number' then raise exception 'ITEM_MUDOU' using hint = 'Escolha inválida.'; end if;
        v_i := (idx #>> '{}')::int;
        if v_i < 0 or v_i >= jsonb_array_length(coalesce(g -> 'itens', '[]')) or v_i = any(v_vistos) then
          raise exception 'ITEM_MUDOU' using hint = 'O cardápio foi atualizado. Recarregue a página e monte o pedido de novo.';
        end if;
        v_vistos := v_vistos || v_i;
        v_nomes := v_nomes || (g -> 'itens' -> v_i ->> 'nome');
        v_unit := v_unit + greatest(coalesce((g -> 'itens' -> v_i ->> 'preco')::numeric, 0), 0);
      end loop;
      if cardinality(v_vistos) < coalesce((g ->> 'min')::int, 0) or cardinality(v_vistos) > greatest(coalesce((g ->> 'max')::int, 1), 1) then
        raise exception 'ESCOLHA_INVALIDA' using hint = format('Confira as escolhas de "%s" em "%s".', g ->> 'titulo', s.nome);
      end if;
      if cardinality(v_nomes) > 0 then
        v_partes := v_partes || ((g ->> 'titulo') || ': ' || array_to_string(v_nomes, ', '));
      end if;
      gi := gi + 1;
    end loop;

    v_itens := v_itens || jsonb_build_array(jsonb_build_object(
      'id', s.id, 'nome', s.nome, 'qtd', v_qtd, 'escolhas', array_to_string(v_partes, ' · '),
      'obs', left(btrim(coalesce(it ->> 'obs', '')), 140), 'unit', v_unit, 'total', v_unit * v_qtd));
    v_sub := v_sub + v_unit * v_qtd;
  end loop;

  if v_modo = 'entrega' then
    v_taxa := n.taxa_entrega;
    if v_sub < n.pedido_minimo then
      raise exception 'PEDIDO_MINIMO' using hint = format('O pedido mínimo para entrega é R$ %s.', replace(to_char(n.pedido_minimo, 'FM999990.00'), '.', ','));
    end if;
  end if;

  -- Anti-abuso: rajada de pedidos no negócio (robô) e no mesmo aparelho/rede
  if (select count(*) from public.pedidos where negocio_id = n.id and criado_em > now() - interval '10 minutes') >= 40 then
    raise exception 'MUITAS_TENTATIVAS' using hint = 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.';
  end if;
  if v_ip is not null then
    v_ip_hash := encode(sha256(convert_to(v_ip || n.id::text, 'UTF8')), 'hex');   -- guarda só um código, não o IP
    if (select count(*) from public.pedidos where negocio_id = n.id and ip_hash = v_ip_hash and criado_em > now() - interval '30 minutes') >= 6 then
      raise exception 'MUITAS_TENTATIVAS' using hint = 'Muitos pedidos seguidos deste aparelho. Espere alguns minutos ou chame no WhatsApp.';
    end if;
  end if;

  -- Número do pedido no dia (a trava evita dois pedidos com o mesmo número)
  v_dia := (now() at time zone n.fuso)::date;
  perform pg_advisory_xact_lock(hashtext('pedido-' || n.id::text));
  select coalesce(max(numero), 0) + 1 into v_num from public.pedidos where negocio_id = n.id and dia = v_dia;

  insert into public.pedidos (negocio_id, dia, numero, cliente_nome, cliente_whatsapp, modo, endereco, pagamento, troco,
                              itens, subtotal, taxa, total, obs, ip_hash)
  values (n.id, v_dia, v_num, v_nome, v_fone, v_modo, case when v_modo = 'entrega' then v_end else '' end,
          left(btrim(coalesce(p_pagamento, '')), 60), left(btrim(coalesce(p_troco, '')), 20),
          v_itens, v_sub, v_taxa, v_sub + v_taxa, left(btrim(coalesce(p_obs, '')), 300), v_ip_hash)
  returning id into v_id;

  return json_build_object('id', v_id, 'numero', v_num, 'subtotal', v_sub, 'taxa', v_taxa,
                           'total', v_sub + v_taxa, 'itens', v_itens, 'modo', v_modo);
end $$;

revoke execute on function public.criar_pedido(text, jsonb, text, text, text, text, text, text, text) from public;
grant  execute on function public.criar_pedido(text, jsonb, text, text, text, text, text, text, text) to anon, authenticated;
