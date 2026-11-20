/* =====================================================================
   AGENDAR.JS — página pública de cada negócio.
     agendar.html?n=slug-do-negocio  → dados reais do Supabase
     agendar.html?demo=barbearia     → demonstração sem banco (nada é gravado)
   ===================================================================== */
(() => {
  'use strict';
  const { $, $$, esc, brl, fmtDur, toHHMM, toMin, isoDate, parseISO, dataLonga, icons, horaNoFuso, dataNoFuso, localParaISO, mascaraFone, soDigitos, waLink, msgErro, toast, urlSegura, lsGet, lsSet } = U;
  const params = new URLSearchParams(location.search);
  const demoId = params.get('demo');
  const slug = (params.get('n') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let N, fonte;

  /* ---------------------------------------------------------------
     1. DADOS
     --------------------------------------------------------------- */
  function falhar(titulo, texto) {
    $('[data-status="carregando"]').classList.add('hidden');
    $('[data-status="erro"]').classList.remove('hidden');
    $('[data-slot="erro-titulo"]').textContent = titulo;
    $('[data-slot="erro-texto"]').textContent = texto;
  }

  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DIAS_C = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  function textoHorario(hs) {
    if (!hs.length) return 'Horário a combinar';
    const porFaixa = {};
    hs.forEach((h) => { const k = `${h.abre}–${h.fecha}`; (porFaixa[k] = porFaixa[k] || []).push(h.dia_semana); });
    return Object.entries(porFaixa).map(([faixa, dias]) => `${[...new Set(dias)].sort().map((d) => DIAS_C[d]).join(', ')}: ${faixa.replace(/:00/g, 'h')}`).join(' | ');
  }

  function deDemo(id) {
    const p = NICHOS[id];
    const hs = p.horarios.map(([dia_semana, abre, fecha]) => ({ dia_semana, abre, fecha }));
    N = {
      demo: true, nicho: id, nome: p.nomeDemo, emoji: p.emoji, whatsapp: CONFIG.produto?.whatsapp || '',
      instagram: '', endereco: 'Rua Exemplo, 123', cidade: CONFIG.produto?.cidade || '', maps_url: '',
      horario_texto: textoHorario(hs), hero: p.hero, tema: p.tema, cor: null, fuso: 'America/Sao_Paulo',
      intervalo: 30, antecedencia: 60, diasAFrente: 21, horarios: hs,
      profissionais: p.profissionais.map((x, i) => ({ id: `p${i}`, ...x })),
      servicos: p.servicos.map((x, i) => ({ id: `s${i}`, ...x })),
      portfolio: p.portfolio.map(([titulo, categoria, emoji]) => ({ titulo, categoria, emoji, img: '' })),
      depoimentos: [
        { texto: 'Exemplo de depoimento: agendei pelo celular à noite e no outro dia já estava sendo atendida.', autor: 'Cliente (exemplo)', detalhe: p.servicos[0].nome },
        { texto: 'Exemplo de depoimento: muito prático escolher o horário sem precisar ligar nem esperar resposta.', autor: 'Cliente (exemplo)', detalhe: p.servicos[1].nome },
        { texto: 'Exemplo de depoimento: consegui marcar dois serviços juntos em poucos segundos.', autor: 'Cliente (exemplo)', detalhe: 'Combo' }
      ]
    };
    fonte = fonteDemo();
  }

  /* Só as colunas públicas (as demais nem chegam ao navegador) */
  const COLS_NEGOCIO = 'id,slug,nome,nicho,whatsapp,instagram,endereco,cidade,maps_url,horario_texto,hero_selo,hero_titulo,hero_subtitulo,cor_principal,fuso,intervalo_min,antecedencia_min,dias_a_frente,ativo';
  async function doBanco() {
    const sb = U.sb();
    const { data: n, error } = await sb.from('negocios').select(COLS_NEGOCIO).eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!n || !n.ativo) return false;
    const [pr, sv, hr, pf, dp] = await Promise.all([
      sb.from('profissionais').select('id,nome,funcao').eq('negocio_id', n.id).eq('ativo', true).order('ordem').order('nome'),
      sb.from('servicos').select('id,nome,descricao,duracao_min,preco,categoria').eq('negocio_id', n.id).eq('ativo', true).order('ordem').order('nome'),
      sb.from('horarios').select('dia_semana,abre,fecha').eq('negocio_id', n.id).order('dia_semana').order('abre'),
      sb.from('portfolio').select('titulo,categoria,img_url').eq('negocio_id', n.id).order('ordem'),
      sb.from('depoimentos').select('texto,autor,detalhe').eq('negocio_id', n.id).order('ordem')
    ]);
    const erro = [pr, sv, hr, pf, dp].find((r) => r.error);
    if (erro) throw erro.error;
    const p = nichoPorId(n.nicho);
    const hs = hr.data.map((h) => ({ dia_semana: h.dia_semana, abre: h.abre.slice(0, 5), fecha: h.fecha.slice(0, 5) }));
    N = {
      demo: false, nicho: n.nicho, nome: n.nome, emoji: p.emoji, whatsapp: n.whatsapp, instagram: U.instagramUser(n.instagram),
      endereco: n.endereco, cidade: n.cidade, maps_url: urlSegura(n.maps_url), horario_texto: n.horario_texto || textoHorario(hs),
      hero: { selo: n.hero_selo || p.hero.selo, titulo: n.hero_titulo || p.hero.titulo, subtitulo: n.hero_subtitulo || p.hero.subtitulo },
      tema: p.tema, cor: n.cor_principal, fuso: n.fuso, intervalo: n.intervalo_min, antecedencia: n.antecedencia_min, diasAFrente: n.dias_a_frente,
      horarios: hs, profissionais: pr.data, servicos: sv.data.map((s) => ({ ...s, preco: Number(s.preco) })),
      portfolio: pf.data.map((x) => ({ titulo: x.titulo, categoria: x.categoria, img: urlSegura(x.img_url), emoji: p.emoji })).filter((x) => x.img),
      depoimentos: dp.data
    };
    fonte = fonteBanco();
    return true;
  }

  /* ---------------------------------------------------------------
     2. FONTES DE HORÁRIOS (banco real ou simulação)
     --------------------------------------------------------------- */
  function fonteBanco() {
    const sb = U.sb();
    return {
      async horariosLivres(iso, servicoIds, profId) {
        const { data, error } = await sb.rpc('horarios_livres', { p_slug: slug, p_data: iso, p_servicos: servicoIds, p_profissional: profId });
        if (error) throw error;
        return data;
      },
      async reservar(r) {
        const { data, error } = await sb.rpc('criar_agendamento', {
          p_slug: slug, p_servicos: r.servicoIds, p_inicio: r.inicio, p_profissional: r.profId,
          p_nome: r.nome, p_whatsapp: r.fone, p_obs: r.obs
        });
        if (error) throw error;
        return data;
      }
    };
  }

  function fonteDemo() {
    const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
    return {
      async horariosLivres(iso, servicoIds, profId) {
        const dur = N.servicos.filter((s) => servicoIds.includes(s.id)).reduce((t, s) => t + s.duracao_min, 0);
        const dia = parseISO(iso).getDay(), limite = Date.now() + N.antecedencia * 60000, out = [];
        N.horarios.filter((h) => h.dia_semana === dia).forEach((h) => {
          for (let t = toMin(h.abre); t + dur <= toMin(h.fecha); t += N.intervalo) {
            const hora = toHHMM(t), inicio = localParaISO(iso, hora, N.fuso);
            if (new Date(inicio).getTime() < limite || hash(`${iso}${profId}${hora}`) % 4 === 0) continue;
            out.push({ hora, inicio });
          }
        });
        return out;
      },
      async reservar(r) {
        await new Promise((ok) => setTimeout(ok, 500));
        const sel = N.servicos.filter((s) => r.servicoIds.includes(s.id));
        const dur = sel.reduce((t, s) => t + s.duracao_min, 0);
        const prof = N.profissionais.find((p) => p.id === r.profId) || N.profissionais[0];
        return { id: 'demo', inicio: r.inicio, fim: new Date(new Date(r.inicio).getTime() + dur * 60000).toISOString(), profissional: prof.nome, servicos: sel, valor_total: sel.reduce((t, s) => t + s.preco, 0) };
      }
    };
  }

  /* ---------------------------------------------------------------
     3. SEÇÕES
     --------------------------------------------------------------- */
  const tpl = (s) => String(s ?? '').replaceAll('{nome}', N.nome).replaceAll('{cidade}', N.cidade || '');
  const destaque = (s) => esc(tpl(s)).replace(/\*(.+?)\*/g, '<span class="text-brand">$1</span>');
  const slot = (nome, html) => $$(`[data-slot="${nome}"]`).forEach((el) => { el.innerHTML = html; });
  const mostrarSe = (nome, cond) => $$(`[data-se="${nome}"]`).forEach((el) => el.classList.toggle('hidden', !cond));
  const enderecoTxt = () => [N.endereco, N.cidade].filter(Boolean).join(' — ');

  function renderEstatico() {
    U.aplicarTema(N.tema, N.cor);
    document.title = `${N.nome} · Agende online`;
    slot('nome', esc(N.nome));
    slot('emoji', N.emoji);
    slot('hero-selo', esc(N.hero.selo));
    slot('hero-titulo', destaque(N.hero.titulo));
    slot('hero-subtitulo', esc(tpl(N.hero.subtitulo)));
    slot('horario', esc(N.horario_texto));
    slot('endereco', esc(enderecoTxt()));
    slot('endereco-completo', esc(enderecoTxt() || 'Endereço não informado.'));
    slot('ano', new Date().getFullYear());
    const prod = $('[data-slot="produto-link"]');
    prod.textContent = CONFIG.produto?.nome || 'MinhaAgenda';
    prod.href = `index.html?utm_source=rodape&utm_campaign=${encodeURIComponent(slug || demoId || '')}`;
    mostrarSe('endereco', enderecoTxt());
    mostrarSe('instagram', N.instagram);
    $$('[data-slot-href="instagram"]').forEach((a) => { a.href = `https://instagram.com/${encodeURIComponent(N.instagram)}`; });
    $$('[data-slot-href="maps"]').forEach((a) => { a.href = N.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(enderecoTxt())}`; });
    $$('[data-wa]').forEach((a) => { a.href = waLink(N.whatsapp, tpl(a.dataset.wa)); a.target = '_blank'; a.rel = 'noopener'; });

    // Visual do topo: fotos reais do portfólio, ou um cartão com os destaques
    const fotos = N.portfolio.filter((p) => p.img).slice(0, 3);
    slot('hero-visual', fotos.length >= 2
      ? `<div class="grid h-[22rem] grid-cols-2 grid-rows-2 gap-3 md:h-[28rem]">${fotos.map((f, i) => `<img src="${esc(f.img)}" alt="" class="h-full w-full rounded-[1.5rem] object-cover ${i === 0 ? 'row-span-2' : ''} ${fotos.length === 2 && i === 1 ? 'row-span-2' : ''}">`).join('')}</div>`
      : `<div class="relative overflow-hidden rounded-[2rem] bg-brand p-8 text-brand-contrast md:p-10">
           <div class="absolute -right-10 -top-10 text-[11rem] leading-none opacity-20">${N.emoji}</div>
           <p class="relative text-sm font-semibold opacity-80">Mais pedidos</p>
           <ul class="relative mt-4 grid gap-3">${[...N.servicos].slice(0, 4).map((s) => `<li class="flex items-baseline justify-between gap-4 border-b border-current/20 pb-3"><span class="font-display text-xl font-semibold">${esc(s.nome)}</span><span class="shrink-0 text-sm font-bold">${brl(s.preco)}</span></li>`).join('')}</ul>
         </div>`);

    // Tabela de horários por dia
    slot('tabela-horarios', DIAS.map((nome, d) => {
      const f = N.horarios.filter((h) => h.dia_semana === d);
      const hoje = new Date().getDay() === d;
      return `<div class="flex justify-between gap-4 rounded-xl px-3 py-2 ${hoje ? 'bg-brand/10 font-bold' : ''}"><dt>${nome}${hoje ? ' (hoje)' : ''}</dt><dd class="${f.length ? '' : 'text-muted'}">${f.length ? f.map((h) => `${h.abre}–${h.fecha}`).join(', ') : 'Fechado'}</dd></div>`;
    }).join(''));

    slot('passos', TEXTOS.passos.map((p, i) => `
      <li class="flex gap-4"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand font-bold text-brand-contrast">${i + 1}</span>
      <div><p class="font-bold">${esc(p.titulo)}</p><p class="mt-1 text-sm text-muted">${esc(p.texto)}</p></div></li>`).join(''));

    slot('faq', TEXTOS.faq.map((f) => `
      <details class="card px-5">
        <summary class="flex cursor-pointer items-center justify-between gap-4 py-4 font-semibold">${esc(tpl(f.p))}<i data-lucide="plus" class="faq-icon h-5 w-5 shrink-0 text-brand transition"></i></summary>
        <p class="-mt-1 pb-5 text-sm text-muted">${esc(tpl(f.r))}</p>
      </details>`).join(''));

    mostrarSe('depoimentos', N.depoimentos.length);
    slot('depoimentos', N.depoimentos.map((d) => `
      <figure class="card flex flex-col p-6">
        <blockquote class="flex-1 text-lg leading-relaxed">“${esc(d.texto)}”</blockquote>
        <figcaption class="mt-5 text-sm"><b>${esc(d.autor)}</b>${d.detalhe ? `<span class="text-muted"> · ${esc(d.detalhe)}</span>` : ''}</figcaption>
      </figure>`).join(''));

    if (N.demo) {
      $('#barra-demo').classList.remove('hidden');
      slot('nichos', `<span class="shrink-0 opacity-70">Demonstração, nada é gravado.</span>` +
        Object.entries(NICHOS).map(([id, n]) => `<a href="?demo=${id}" class="shrink-0 rounded-full px-3 py-1.5 ${id === N.nicho ? 'bg-page text-ink' : 'hover:bg-white/10'}">${n.emoji} ${esc(n.rotulo)}</a>`).join('') +
        `<a href="index.html" target="_top" class="ml-2 shrink-0 rounded-full border border-white/30 px-3 py-1.5">Quero no meu negócio</a>`);
    }
  }

  /* Serviços com filtro por categoria */
  let catServ = 'Todos';
  function renderServicos() {
    const cats = ['Todos', ...new Set(N.servicos.map((s) => s.categoria).filter(Boolean))];
    slot('cat-servicos', cats.length > 2 ? cats.map((c) => `<button type="button" role="tab" aria-selected="${c === catServ}" data-cat="${esc(c)}" class="chip ${c === catServ ? 'chip-on' : ''}">${esc(c)}</button>`).join('') : '');
    const lista = N.servicos.filter((s) => catServ === 'Todos' || s.categoria === catServ);
    slot('servicos', lista.map((s) => {
      const on = B.servicos.includes(s.id);
      return `
      <button type="button" data-toggle-servico="${s.id}" aria-pressed="${on}" class="group flex items-center gap-4 rounded-[1.25rem] border p-4 text-left transition ${on ? 'border-brand bg-brand/5' : 'border-line bg-page hover:border-brand/40'}">
        <span class="min-w-0 flex-1">
          <span class="block font-display text-lg font-semibold leading-tight">${esc(s.nome)}</span>
          ${s.descricao ? `<span class="mt-1 block text-sm text-muted">${esc(s.descricao)}</span>` : ''}
          <span class="mt-2 flex items-center gap-3 text-sm"><span class="font-bold">${brl(s.preco)}</span><span class="flex items-center gap-1 text-muted"><i data-lucide="clock" class="h-3.5 w-3.5"></i>${fmtDur(s.duracao_min)}</span></span>
        </span>
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition ${on ? 'border-brand bg-brand text-brand-contrast' : 'border-line text-muted group-hover:border-brand/50'}"><i data-lucide="${on ? 'check' : 'plus'}" class="h-5 w-5"></i></span>
      </button>`;
    }).join('') || '<p class="text-muted">Nenhum serviço cadastrado ainda.</p>');
    renderBarra();
  }

  /* Barra inferior: WhatsApp + Agendar, ou o resumo da escolha */
  function renderBarra() {
    const n = B.servicos.length, emAgendar = B.etapa > 0, resumo = n && !emAgendar;
    $('[data-slot="barra"]').classList.toggle('md:hidden', !resumo);
    slot('barra', resumo
      ? `<div class="wrap flex items-center justify-between gap-3 !px-0">
           <div class="min-w-0 text-sm"><b>${n} serviço(s) · ${fmtDur(dur())}</b><span class="block text-muted">${brl(total())}</span></div>
           <button type="button" data-acao="ir-agendar" class="btn btn-primary">Escolher horário<i data-lucide="chevron-right" class="h-4 w-4"></i></button>
         </div>`
      : `<div class="wrap grid grid-cols-2 gap-2 !px-0 md:flex md:justify-end">
           <a href="${waLink(N.whatsapp, `Olá, ${N.nome}! Vim pelo site.`)}" target="_blank" rel="noopener" class="btn btn-ghost"><i data-lucide="message-circle" class="h-4 w-4"></i>WhatsApp</a>
           <a href="#agendar" class="btn btn-primary"><i data-lucide="calendar-plus" class="h-4 w-4"></i>Agendar</a>
         </div>`);
    icons();
  }

  let filtro = 'Todos';
  function tile(p, grande) {
    if (p.img) return `<img src="${esc(p.img)}" alt="${esc(p.titulo)}" loading="lazy" class="h-full w-full ${grande ? 'object-contain' : 'object-cover'}">`;
    return `<div class="grid h-full w-full place-items-center bg-gradient-to-br from-brand/80 to-accent"><span class="${grande ? 'text-7xl' : 'text-5xl'}">${p.emoji}</span></div>`;
  }
  function renderPortfolio() {
    mostrarSe('portfolio', N.portfolio.length);
    const cats = ['Todos', ...new Set(N.portfolio.map((p) => p.categoria).filter(Boolean))];
    slot('filtros', cats.length > 2 ? cats.map((c) => `<button type="button" data-filtro="${esc(c)}" class="chip ${c === filtro ? 'chip-on' : ''}">${esc(c)}</button>`).join('') : '');
    slot('portfolio', N.portfolio.map((p, i) => ({ ...p, i })).filter((p) => filtro === 'Todos' || p.categoria === filtro).map((p) => `
      <button type="button" data-foto="${p.i}" class="group relative aspect-[4/5] w-[72%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] bg-sunken text-left md:w-auto" aria-label="Ampliar ${esc(p.titulo || 'foto')}">
        <div class="h-full w-full transition duration-500 group-hover:scale-[1.03]">${tile(p)}</div>
        ${p.titulo ? `<span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm font-semibold text-white">${esc(p.titulo)}</span>` : ''}
      </button>`).join(''));
  }
  function abrirFoto(i) {
    const p = N.portfolio[i];
    slot('lightbox', `
      <div class="aspect-[4/3] bg-black">${tile(p, true)}</div>
      <div class="flex items-center justify-between gap-3 p-5">
        <div class="min-w-0"><p class="truncate font-bold">${esc(p.titulo)}</p><p class="text-sm text-muted">${esc(p.categoria)}</p></div>
        <div class="flex shrink-0 gap-2">
          <a href="${waLink(N.whatsapp, `Olá, ${N.nome}! Vi o trabalho "${p.titulo || 'do portfólio'}" no site e quero fazer algo parecido.`)}" target="_blank" rel="noopener" class="btn btn-wa btn-sm">Quero esse</a>
          <button type="button" data-acao="fechar-foto" class="btn btn-ghost btn-icon" aria-label="Fechar"><i data-lucide="x" class="h-4 w-4"></i></button>
        </div>
      </div>`);
    icons();
    $('#lightbox').showModal();
  }

  async function renderProximo() {
    const curto = [...N.servicos].sort((a, b) => a.duracao_min - b.duracao_min)[0];
    if (!curto || !N.profissionais.length) { slot('proximo', 'Agenda em breve'); return; }
    for (const d of proximosDias().slice(0, 7)) {
      try {
        const livres = await fonte.horariosLivres(isoDate(d), [curto.id], null);
        if (livres.length) {
          const hoje = isoDate(new Date()) === isoDate(d), amanha = isoDate(new Date(Date.now() + 86400000)) === isoDate(d);
          slot('proximo', `${hoje ? 'Hoje' : amanha ? 'Amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase())}, ${livres[0].hora}`);
          return;
        }
      } catch { break; }
    }
    slot('proximo', 'Consulte pelo WhatsApp');
  }

  /* ---------------------------------------------------------------
     4. ASSISTENTE DE AGENDAMENTO
     --------------------------------------------------------------- */
  const salvo = lsGet('cliente') || {};
  const B = { etapa: 0, servicos: [], prof: null, data: null, hora: null, inicio: null, slots: null, carregando: false, enviando: false, erro: '', nome: salvo.nome || '', fone: salvo.fone || '', obs: '', lembrar: !!salvo.nome, resultado: null };
  const etapas = () => (N.profissionais.length > 1 ? ['servicos', 'prof', 'hora', 'dados'] : ['servicos', 'hora', 'dados']);
  const ROTULO = { servicos: 'Serviços', prof: 'Profissional', hora: 'Dia e hora', dados: 'Seus dados' };
  const etapaAtual = () => etapas()[B.etapa] || 'fim';
  const sel = () => N.servicos.filter((s) => B.servicos.includes(s.id));
  const dur = () => sel().reduce((t, s) => t + s.duracao_min, 0);
  const total = () => sel().reduce((t, s) => t + Number(s.preco), 0);
  const nomeProf = () => (B.prof ? N.profissionais.find((p) => p.id === B.prof)?.nome : N.profissionais.length === 1 ? N.profissionais[0].nome : 'Sem preferência');

  function proximosDias() {
    const dias = new Set(N.horarios.map((h) => h.dia_semana));
    const out = [], hoje = new Date();
    for (let i = 0; i <= N.diasAFrente && out.length < 30; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
      if (dias.has(d.getDay())) out.push(d);
    }
    return out;
  }

  let reqId = 0;
  async function carregarSlots(autoAvancar = false) {
    const meu = ++reqId;
    B.carregando = true; B.slots = null; B.erro = ''; renderBooking();
    try {
      const dias = proximosDias();
      let idx = dias.findIndex((d) => isoDate(d) === B.data);
      for (let tent = 0; tent < (autoAvancar ? 7 : 1); tent++) {
        const slots = await fonte.horariosLivres(B.data, B.servicos, B.prof);
        if (meu !== reqId) return;
        B.slots = slots;
        if (slots.length || !autoAvancar || !dias[idx + 1]) break;
        B.data = isoDate(dias[++idx]);
      }
    } catch (e) {
      if (meu !== reqId) return;
      B.erro = msgErro(e); B.slots = [];
    }
    B.carregando = false; renderBooking();
    const chip = $(`[data-acao="data"][data-id="${B.data}"]`);
    if (chip) chip.parentElement.scrollLeft = chip.offsetLeft - chip.parentElement.clientWidth / 2 + chip.clientWidth / 2;
  }

  const podeAvancar = () => ({ servicos: B.servicos.length > 0, prof: !!B._profEscolhido, hora: !!B.inicio, dados: true }[etapaAtual()]);

  function corpo() {
    switch (etapaAtual()) {
      case 'servicos':
        return `<p class="font-display text-xl font-bold">O que você quer fazer?</p>
          <div class="mt-4 grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
          ${N.servicos.map((s) => {
            const on = B.servicos.includes(s.id);
            return `<button type="button" data-toggle-servico="${s.id}" aria-pressed="${on}" class="flex items-center gap-3 rounded-2xl border p-3 text-left transition ${on ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'}">
              <span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${on ? 'border-brand bg-brand text-brand-contrast' : 'border-line'}">${on ? '<i data-lucide="check" class="h-4 w-4"></i>' : ''}</span>
              <span class="min-w-0 flex-1"><span class="block font-semibold">${esc(s.nome)}</span><span class="block text-xs text-muted">${fmtDur(s.duracao_min)}</span></span>
              <span class="text-sm font-bold">${brl(s.preco)}</span>
            </button>`;
          }).join('')}</div>`;

      case 'prof': {
        const ops = [{ id: null, nome: 'Sem preferência', funcao: 'Primeiro horário livre' }, ...N.profissionais];
        return `<p class="font-display text-xl font-bold">Com quem você prefere?</p>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
          ${ops.map((p) => {
            const on = B._profEscolhido && B.prof === p.id;
            return `<button type="button" data-acao="prof" data-id="${p.id || ''}" aria-pressed="${on}" class="flex items-center gap-3 rounded-2xl border p-3 text-left transition ${on ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'}">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-lg font-bold ${p.id ? 'bg-brand/15 text-brand' : 'bg-sunken text-muted'}">${p.id ? esc(p.nome.charAt(0)) : '<i data-lucide="shuffle" class="h-5 w-5"></i>'}</span>
              <span class="min-w-0"><span class="block font-semibold">${esc(p.nome)}</span><span class="block text-xs text-muted">${esc(p.funcao)}</span></span>
            </button>`;
          }).join('')}</div>`;
      }

      case 'hora': {
        const dias = proximosDias();
        if (!dias.length) return '<p class="text-muted">Ainda não há horários de funcionamento cadastrados.</p>';
        const slots = B.carregando
          ? `<div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">${'<div class="skeleton h-11"></div>'.repeat(10)}</div>`
          : B.erro ? `<p class="mt-3 text-sm text-bad">${esc(B.erro)}</p>`
          : B.slots?.length ? `<div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              ${B.slots.map((h) => `<button type="button" data-acao="hora" data-id="${h.hora}" data-inicio="${h.inicio}" aria-pressed="${h.hora === B.hora}" class="min-h-[2.75rem] rounded-xl border text-sm font-semibold transition ${h.hora === B.hora ? 'border-brand bg-brand text-brand-contrast' : 'border-line hover:border-brand'}">${h.hora}</button>`).join('')}</div>`
          : `<p class="mt-3 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Sem horários livres neste dia. Escolha outra data ou <a class="font-semibold text-brand underline" target="_blank" rel="noopener" href="${waLink(N.whatsapp, `Olá, ${N.nome}! Procuro um horário em ${dataLonga(B.data)}.`)}">chame no WhatsApp</a>.</p>`;
        return `<p class="font-display text-xl font-bold">Escolha o dia</p>
          <div class="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
          ${dias.map((d) => {
            const iso = isoDate(d), on = iso === B.data;
            return `<button type="button" data-acao="data" data-id="${iso}" aria-pressed="${on}" class="w-[4.25rem] shrink-0 rounded-2xl border py-2.5 text-center transition ${on ? 'border-ink bg-ink text-page' : 'border-line hover:border-brand/40'}">
              <span class="block text-[11px] font-semibold uppercase opacity-70">${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
              <span class="block font-display text-xl font-bold leading-tight">${d.getDate()}</span>
              <span class="block text-[11px] opacity-70">${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
            </button>`;
          }).join('')}</div>
          <div class="mt-5 flex items-baseline justify-between gap-2">
            <p class="font-display text-lg font-bold">Horário de início</p>
            <p class="text-xs text-muted">${fmtDur(dur())} · ${esc(nomeProf())}</p>
          </div>${slots}`;
      }

      case 'dados': {
        const fim = toHHMM(toMin(B.hora) + dur());
        return `<p class="font-display text-xl font-bold">Confira e confirme</p>
          <div class="mt-4 grid gap-1.5 rounded-2xl bg-sunken p-4 text-sm">
            <p><b>${sel().map((s) => esc(s.nome)).join(' + ')}</b></p>
            <p class="capitalize">${esc(dataLonga(B.data))}, das ${B.hora} às ${fim}</p>
            <p>Com ${esc(nomeProf())} · ${brl(total())}</p>
          </div>
          <form id="form-agenda" class="mt-4 grid gap-3" novalidate autocomplete="on">
            <label class="label">Seu nome<input name="nome" class="input" autocomplete="name" placeholder="Como podemos te chamar?" value="${esc(B.nome)}" maxlength="80" required></label>
            <label class="label">WhatsApp<input name="fone" class="input" inputmode="tel" autocomplete="tel" placeholder="(85) 99999-9999" value="${esc(B.fone)}" required></label>
            <label class="label">Observação <small>opcional</small><textarea name="obs" rows="2" class="input" maxlength="500" placeholder="Alguma preferência ou referência?">${esc(B.obs)}</textarea></label>
            <label class="hidden" aria-hidden="true">Site<input name="site" tabindex="-1" autocomplete="off"></label>
            <label class="flex items-center gap-3 text-sm"><input type="checkbox" name="lembrar" class="h-5 w-5 accent-[rgb(var(--c-brand))]" ${B.lembrar ? 'checked' : ''}>Lembrar meus dados neste aparelho</label>
            ${B.erro ? `<p class="text-sm font-semibold text-bad" role="alert">${esc(B.erro)}</p>` : ''}
            <p class="text-xs text-muted">Seus dados são usados só para este agendamento. <a href="privacidade.html" target="_blank" class="underline">Política de privacidade</a>.</p>
          </form>`;
      }

      case 'fim': {
        const r = B.resultado;
        const servs = (r.servicos || []).map((s) => s.nome).join(' + ');
        const quando = `${dataLonga(dataNoFuso(r.inicio, N.fuso))}, ${horaNoFuso(r.inicio, N.fuso)}`;
        const ini = new Date(r.inicio), fim = new Date(r.fim), z = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
        const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${servs} — ${N.nome}`)}&dates=${z(ini)}/${z(fim)}&details=${encodeURIComponent(`Com ${r.profissional}`)}&location=${encodeURIComponent(enderecoTxt())}`;
        const msg = `Olá, ${N.nome}! Acabei de agendar pelo site:\n\n${servs}\n${quando}\nCom ${r.profissional}\n\nNome: ${B.nome.trim()}`;
        return `<div class="py-4 text-center">
            <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok/15 text-ok"><i data-lucide="check" class="h-8 w-8"></i></div>
            <p class="mt-4 font-display text-3xl font-bold">${N.demo ? 'Agendamento simulado' : 'Horário reservado'}</p>
            <p class="mt-2 text-muted"><span class="capitalize">${esc(quando)}</span><br>${esc(servs)} com ${esc(r.profissional)}</p>
            ${N.demo ? '<p class="mt-3 text-xs text-muted">Isto é uma demonstração: nenhum dado foi gravado.</p>' : ''}
            <div class="mx-auto mt-6 grid max-w-md gap-2 sm:grid-cols-2">
              <a href="${waLink(N.whatsapp, msg)}" target="_blank" rel="noopener" class="btn btn-wa"><i data-lucide="message-circle" class="h-4 w-4"></i>Avisar no WhatsApp</a>
              <button type="button" data-acao="ics" class="btn btn-ghost"><i data-lucide="calendar-plus" class="h-4 w-4"></i>Salvar na agenda</button>
              <a href="${gcal}" target="_blank" rel="noopener" class="btn btn-ghost sm:col-span-2"><i data-lucide="calendar" class="h-4 w-4"></i>Google Agenda</a>
            </div>
            <button type="button" data-acao="reiniciar" class="mt-5 text-sm font-semibold text-muted underline">Fazer outro agendamento</button>
          </div>`;
      }
    }
  }

  function renderBooking() {
    const el = $('#booking'), et = etapas(), atual = etapaAtual();
    const topo = atual === 'fim' ? '' : `
      <div class="flex gap-1.5 px-5 pt-5" aria-label="Etapa ${B.etapa + 1} de ${et.length}: ${ROTULO[atual]}">
        ${et.map((k, i) => `<div class="flex-1"><div class="h-1.5 rounded-full ${i <= B.etapa ? 'bg-brand' : 'bg-line'} transition-colors"></div><p class="mt-2 hidden text-xs font-semibold sm:block ${i === B.etapa ? 'text-ink' : 'text-muted'}">${ROTULO[k]}</p></div>`).join('')}
      </div>`;
    const ultimo = B.etapa === et.length - 1;
    const rodape = atual === 'fim' ? '' : `
      <div class="border-t border-line bg-sunken px-5 py-4">
        <div class="flex items-center justify-between gap-3 text-sm">${B.servicos.length ? `<span><b>${B.servicos.length} serviço(s)</b> · ${fmtDur(dur())}</span><b>${brl(total())}</b>` : '<span class="text-muted">Nenhum serviço escolhido</span>'}</div>
        <div class="mt-3 flex gap-2">
          ${B.etapa > 0 ? '<button type="button" data-acao="voltar" class="btn btn-ghost btn-icon" aria-label="Voltar"><i data-lucide="arrow-left" class="h-4 w-4"></i></button>' : ''}
          ${ultimo
            ? `<button type="button" data-acao="confirmar" class="btn btn-primary flex-1" ${B.enviando ? 'disabled' : ''}>${B.enviando ? 'Reservando…' : '<i data-lucide="check" class="h-4 w-4"></i>Confirmar agendamento'}</button>`
            : `<button type="button" data-acao="avancar" class="btn btn-primary flex-1" ${podeAvancar() ? '' : 'disabled'}>Continuar<i data-lucide="arrow-right" class="h-4 w-4"></i></button>`}
        </div>
      </div>`;
    el.innerHTML = `${topo}<div class="p-5">${corpo()}</div>${rodape}`;
    icons();
    renderBarra();
  }

  function irPara(etapa) {
    B.etapa = etapa; B.erro = '';
    if (etapaAtual() === 'hora') {
      if (!B.data) B.data = isoDate(proximosDias()[0] || new Date());
      carregarSlots(!B._dataEscolhida);
    } else renderBooking();
  }

  function confete() {
    if (reduzMovimento) return;
    const box = $('#booking'), cores = ['rgb(var(--c-brand))', 'rgb(var(--c-accent))', '#ffcfc2', '#bdefd9', '#ffd166'];
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('span');
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 160;
      s.style.cssText = `position:absolute;left:50%;top:5.5rem;width:8px;height:12px;border-radius:2px;pointer-events:none;background:${cores[i % cores.length]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 60}px;--r:${Math.random() * 720}deg;animation:confete 1.1s cubic-bezier(.2,.7,.3,1) forwards`;
      box.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
  }

  async function confirmar() {
    const f = $('#form-agenda');
    if (f?.site.value) return; // armadilha para robôs
    B.lembrar = !!f?.lembrar.checked;
    if (B.nome.trim().length < 2) { B.erro = 'Informe seu nome.'; return renderBooking(); }
    if (soDigitos(B.fone).length < 10) { B.erro = 'Informe um WhatsApp válido com DDD.'; return renderBooking(); }
    B.enviando = true; B.erro = ''; renderBooking();
    try {
      B.resultado = await fonte.reservar({ servicoIds: B.servicos, inicio: B.inicio, profId: B.prof, nome: B.nome.trim(), fone: B.fone, obs: B.obs.trim() });
      lsSet('cliente', B.lembrar ? { nome: B.nome.trim(), fone: B.fone } : null);
      B.enviando = false; B.etapa = etapas().length;
      renderBooking();
      $('#booking').style.position = 'relative';
      confete();
      $('#agendar').scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth' });
    } catch (e) {
      B.enviando = false;
      if (/HORARIO_OCUPADO|FORA_DO_PRAZO/.test(e.message || '')) {
        toast(msgErro(e), 'erro');
        B.hora = null; B.inicio = null; B._dataEscolhida = true;
        irPara(etapas().indexOf('hora'));
      } else { B.erro = msgErro(e); renderBooking(); }
    }
  }

  function baixarICS() {
    const r = B.resultado, z = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const limpa = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MinhaAgenda//PT-BR', 'BEGIN:VEVENT', `UID:${r.id}@minhaagenda`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(r.inicio)}`, `DTEND:${z(r.fim)}`,
      `SUMMARY:${limpa(`${(r.servicos || []).map((s) => s.nome).join(' + ')} — ${N.nome}`)}`, `LOCATION:${limpa(enderecoTxt())}`, `DESCRIPTION:${limpa(`Com ${r.profissional}`)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'agendamento.ics';
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function compartilhar() {
    const dados = { title: N.nome, text: `Agende no ${N.nome}:`, url: location.href.split('#')[0] };
    try {
      if (navigator.share) await navigator.share(dados);
      else { await navigator.clipboard.writeText(dados.url); toast('Link copiado.'); }
    } catch { /* cancelado */ }
  }

  function reiniciar() {
    Object.assign(B, { etapa: 0, servicos: [], prof: null, _profEscolhido: false, data: null, _dataEscolhida: false, hora: null, inicio: null, slots: null, erro: '', obs: '', resultado: null });
    if (N.profissionais.length === 1) { B.prof = N.profissionais[0].id; B._profEscolhido = true; }
    renderServicos(); renderBooking();
  }

  function toggleServico(id) {
    if (etapaAtual() === 'fim') reiniciar();
    const i = B.servicos.indexOf(id);
    i >= 0 ? B.servicos.splice(i, 1) : B.servicos.push(id);
    B.hora = B.inicio = null;
    if (B.etapa > 0 && !B.servicos.length) B.etapa = 0;
    renderServicos(); renderBooking();
  }

  /* ---------------------------------------------------------------
     5. EVENTOS
     --------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-toggle-servico],[data-cat],[data-filtro],[data-foto],[data-acao]');
    if (!alvo) return;
    const d = alvo.dataset;
    if (d.toggleServico) return toggleServico(d.toggleServico);
    if (d.cat) { catServ = d.cat; return renderServicos(); }
    if (d.filtro) { filtro = d.filtro; return renderPortfolio(); }
    if (d.foto) return abrirFoto(Number(d.foto));
    switch (d.acao) {
      case 'ir-agendar': irPara(1); $('#agendar').scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth' }); break;
      case 'prof': B.prof = d.id || null; B._profEscolhido = true; B.hora = B.inicio = null; renderBooking(); break;
      case 'data': B.data = d.id; B._dataEscolhida = true; B.hora = B.inicio = null; carregarSlots(false); break;
      case 'hora': B.hora = d.id; B.inicio = d.inicio; renderBooking(); break;
      case 'avancar': if (podeAvancar()) irPara(B.etapa + 1); break;
      case 'voltar': irPara(B.etapa - 1); break;
      case 'confirmar': confirmar(); break;
      case 'reiniciar': reiniciar(); break;
      case 'ics': baixarICS(); break;
      case 'compartilhar': compartilhar(); break;
      case 'fechar-foto': $('#lightbox').close(); break;
    }
  });
  document.addEventListener('input', (e) => {
    if (!e.target.closest('#form-agenda') || e.target.name === 'site' || e.target.name === 'lembrar') return;
    if (e.target.name === 'fone') e.target.value = mascaraFone(e.target.value);
    B[e.target.name] = e.target.value;
  });
  document.addEventListener('submit', (e) => { if (e.target.id === 'form-agenda') { e.preventDefault(); confirmar(); } });
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') e.target.close(); });

  /* ---------------------------------------------------------------
     6. INÍCIO
     --------------------------------------------------------------- */
  async function iniciar() {
    try {
      if (demoId) {
        if (!NICHOS[demoId]) return falhar('Demonstração não encontrada', 'Escolha um dos tipos de negócio na página inicial.');
        deDemo(demoId);
      } else if (slug) {
        if (!U.configurado()) return falhar('Sistema ainda não configurado', 'Preencha o endereço e a chave do Supabase em config.js.');
        if (!(await doBanco())) return falhar('Página não encontrada', 'Este negócio não existe ou está temporariamente fora do ar.');
      } else {
        return falhar('Qual negócio?', 'Abra o link que o estabelecimento enviou para você.');
      }
    } catch (e) {
      return falhar('Não foi possível carregar', msgErro(e));
    }
    if (N.profissionais.length === 1) { B.prof = N.profissionais[0].id; B._profEscolhido = true; }
    $('#tela-status').remove();
    $('#site').classList.remove('hidden');
    renderEstatico(); renderServicos(); renderPortfolio(); renderBooking();
    icons(); renderProximo();
  }
  iniciar();
})();
