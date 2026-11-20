-- =====================================================================
-- ATUALIZAÇÃO v4 — nichos de PEDIDO (Marmitarias e Passeios)
-- Rode UMA VEZ no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem problema (não apaga nada, só acrescenta).
-- O mesmo conteúdo também está no fim do schema.sql (seção 11).
-- =====================================================================

-- Itens do cardápio / pacotes usam a tabela de serviços que já existe.
alter table public.servicos add column if not exists opcoes   jsonb         not null default '[]'::jsonb;  -- escolhas: proteínas, guarnições, datas de saída...
alter table public.servicos add column if not exists preco_de numeric(10,2);                              -- preço antigo (aparece riscado)
alter table public.servicos add column if not exists selo     text          not null default '';           -- etiqueta: "Mais pedido", "Promoção"
alter table public.servicos add column if not exists img_url  text          not null default '';           -- foto do item

-- Entrega e pagamento do negócio
alter table public.negocios add column if not exists faz_entrega      boolean       not null default true;
alter table public.negocios add column if not exists taxa_entrega     numeric(10,2) not null default 0;
alter table public.negocios add column if not exists pedido_minimo    numeric(10,2) not null default 0;
alter table public.negocios add column if not exists formas_pagamento text          not null default 'Pix, Cartão, Dinheiro';
alter table public.negocios add column if not exists prazo_entrega    text          not null default '';

-- Regras de formato (valem para o que for salvo daqui em diante)
do $$ begin
  alter table public.servicos add constraint servicos_pedido_formato check (
    jsonb_typeof(opcoes) = 'array' and length(opcoes::text) <= 20000
    and (preco_de is null or preco_de >= 0)
    and length(selo) <= 30
    and (img_url = '' or img_url ~* '^https://[^\s<>"]+$')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.negocios add constraint negocios_pedido_formato check (
    taxa_entrega >= 0 and pedido_minimo >= 0
    and length(formas_pagamento) <= 200 and length(prazo_entrega) <= 120) not valid;
exception when duplicate_object then null; end $$;

-- Visitante anônimo passa a ler também as colunas de entrega (continua sem ver dono, plano e suspensão)
grant select (id, slug, nome, nicho, whatsapp, instagram, endereco, cidade, maps_url, horario_texto,
              hero_selo, hero_titulo, hero_subtitulo, cor_principal, fuso, intervalo_min,
              antecedencia_min, dias_a_frente, ativo,
              faz_entrega, taxa_entrega, pedido_minimo, formas_pagamento, prazo_entrega) on public.negocios to anon;
