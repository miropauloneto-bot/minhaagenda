/* =====================================================================
   AGENDAR.JS — página pública de cada negócio.
     agendar/?n=slug-do-negocio  → dados reais do Supabase
     agendar/?demo=barbearia     → demonstração sem banco (nada é gravado)
   ===================================================================== */
(() => {
  'use strict';
  const { $, $$, esc, brl, fmtDur, toHHMM, toMin, isoDate, parseISO, dataLonga, icons, horaNoFuso, dataNoFuso, localParaISO, mascaraFone, soDigitos, waLink, msgErro, toast } = U;
  const params = new URLSearchParams(location.search);
  const demoId = params.get('demo');
  const slug = params.get('n');

  let N; // dados do negócio normalizados (mesmo formato no demo e no banco)
  let fonte; // { horariosLivres(), reservar() }

  /* ---------------------------------------------------------------
     1. CARREGAR DADOS
     --------------------------------------------------------------- */
  function falhar(titulo, texto) {
    $('[data-status="carregando"]').classList.add('hidden');
    $('[data-status="erro"]').classList.remove('hidden');
    $('[data-slot="erro-titulo"]').textContent = titulo;
    $('[data-slot="erro-texto"]').textContent = texto;
  }

  function deDemo(id) {
    const p = NICHOS[id];
    const hs = p.horarios.map(([dia_semana, abre, fecha]) => ({ dia_semana, abre, fecha }));
    N = {
      demo: true, nicho: id, preset: p, nome: p.nomeDemo, emoji: p.emoji, whatsapp: (CONFIG.produto || {}).whatsapp || '',
      instagram: '', endereco: 'Rua Exemplo, 123', cidade: (CONFIG.produto || {}).cidade || '', maps_url: '',
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

  async function doBanco() {
    const sb = U.sb();
    const { data: n, error } = await sb.from('negocios').select('*').eq('slug', slug).maybeSingle();
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
    const p = NICHOS[n.nicho] || NICHOS.salao;
    const hs = hr.data.map((h) => ({ dia_semana: h.dia_semana, abre: h.abre.slice(0, 5), fecha: h.fecha.slice(0, 5) }));
    N = {
      demo: false, nicho: n.nicho, preset: p, nome: n.nome, emoji: p.emoji, whatsapp: n.whatsapp, instagram: n.instagram,
      endereco: n.endereco, cidade: n.cidade, maps_url: n.maps_url, horario_texto: n.horario_texto || textoHorario(hs),
      hero: { selo: n.hero_selo || p.hero.selo, titulo: n.hero_titulo || p.hero.titulo, subtitulo: n.hero_subtitulo || p.hero.subtitulo },
      tema: p.tema, cor: n.cor_principal, fuso: n.fuso, intervalo: n.intervalo_min, antecedencia: n.antecedencia_min, diasAFrente: n.dias_a_frente,
      horarios: hs, profissionais: pr.data, servicos: sv.data.map((s) => ({ ...s, preco: Number(s.preco) })),
      portfolio: pf.data.map((x) => ({ titulo: x.titulo, categoria: x.categoria, img: x.img_url, emoji: p.emoji })),
      depoimentos: dp.data
    };
    fonte = fonteBanco();
    return true;
  }

  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  function textoHorario(hs) {
    if (!hs.length) return 'Horário a combinar';
    const porFaixa = {};
    hs.forEach((h) => { const k = `${h.abre}–${h.fecha}`; (porFaixa[k] = porFaixa[k] || []).push(h.dia_semana); });
    return Object.entries(porFaixa).map(([faixa, dias]) => `${[...new Set(dias)].sort().map((d) => DIAS[d]).join(', ')} · ${faixa.replace(/:00/g, 'h')}`).join(' | ');
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
        const dia = parseISO(iso).getDay();
        const limite = Date.now() + N.antecedencia * 60000;
        const out = [];
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
     3. RENDERIZAÇÃO DAS SEÇÕES
     --------------------------------------------------------------- */
  const tpl = (s) => String(s ?? '').replaceAll('{nome}', N.nome).replaceAll('{cidade}', N.cidade || '');
  const destaque = (s) => esc(tpl(s)).replace(/\*(.+?)\*/g, '<span class="text-brand">$1</span>');
  const slot = (nome, html) => $$(`[data-slot="${nome}"]`).forEach((el) => { el.innerHTML = html; });
  const mostrarSe = (nome, cond) => $$(`[data-se="${nome}"]`).forEach((el) => el.classList.toggle('hidden', !cond));

  function renderEstatico() {
    U.aplicarTema(N.tema, N.cor);
    document.title = `${N.nome} · Agende online`;
    slot('nome', esc(N.nome));
    slot('emoji', N.emoji);
    slot('produto', esc(CONFIG.produto?.nome || 'MinhaAgenda'));
    slot('hero-selo', esc(N.hero.selo));
    slot('hero-titulo', destaque(N.hero.titulo));
    slot('hero-subtitulo', esc(tpl(N.hero.subtitulo)));
    slot('horario', esc(N.horario_texto));
    slot('endereco', esc([N.endereco, N.cidade].filter(Boolean).join(' — ')));
    slot('ano', new Date().getFullYear());
    const precos = N.servicos.map((s) => s.preco).filter((p) => p > 0);
    slot('resumo-servicos', `${N.servicos.length} serviço(s)${precos.length ? ` · a partir de ${brl(Math.min(...precos))}` : ''}`);
    mostrarSe('endereco', N.endereco || N.cidade);
    mostrarSe('instagram', N.instagram);
    $$('[data-slot-href="instagram"]').forEach((a) => { a.href = `https://instagram.com/${N.instagram.replace(/^@/, '')}`; });
    $$('[data-slot-href="maps"]').forEach((a) => { a.href = N.maps_url || `https://www.google.com/maps/search/${encodeURIComponent([N.endereco, N.cidade].join(' '))}`; });
    $$('[data-wa]').forEach((a) => { a.href = waLink(N.whatsapp, tpl(a.dataset.wa)); a.target = '_blank'; a.rel = 'noopener'; });

    slot('beneficios', TEXTOS.beneficios.map((b) => `
      <div class="card p-6">
        <div class="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center"><i data-lucide="${esc(b.icone)}" class="w-5 h-5"></i></div>
        <h3 class="mt-4 font-semibold text-lg">${esc(b.titulo)}</h3>
        <p class="mt-2 text-sm text-muted">${esc(tpl(b.texto))}</p>
      </div>`).join(''));

    slot('passos', TEXTOS.passos.map((p, i) => `
      <li class="flex gap-4">
        <span class="w-9 h-9 shrink-0 rounded-full bg-brand text-brand-contrast font-semibold flex items-center justify-center">${i + 1}</span>
        <div><p class="font-semibold">${esc(p.titulo)}</p><p class="text-sm text-muted mt-1">${esc(p.texto)}</p></div>
      </li>`).join(''));

    slot('faq', TEXTOS.faq.map((f) => `
      <details class="card px-5">
        <summary class="py-4 flex items-center justify-between gap-4 cursor-pointer font-medium">${esc(tpl(f.p))}<i data-lucide="plus" class="faq-icon w-5 h-5 shrink-0 text-brand transition"></i></summary>
        <p class="pb-5 -mt-1 text-sm text-muted">${esc(tpl(f.r))}</p>
      </details>`).join(''));

    mostrarSe('depoimentos', N.depoimentos.length);
    slot('depoimentos', N.depoimentos.map((d) => `
      <figure class="card p-6 flex flex-col">
        <div class="flex gap-0.5 text-brand">${'<i data-lucide="star" class="w-4 h-4 fill-current"></i>'.repeat(5)}</div>
        <blockquote class="mt-4 flex-1">“${esc(d.texto)}”</blockquote>
        <figcaption class="mt-5 flex items-center gap-3">
          <span class="w-10 h-10 rounded-full bg-brand/15 text-brand font-semibold flex items-center justify-center">${esc((d.autor || '?').charAt(0))}</span>
          <span><span class="block font-semibold text-sm">${esc(d.autor)}</span><span class="block text-xs text-muted">${esc(d.detalhe)}</span></span>
        </figcaption>
      </figure>`).join(''));

    if (N.demo) {
      const barra = $('#barra-demo');
      barra.classList.remove('hidden');
      slot('nichos', `<span class="shrink-0 opacity-70 mr-1">Demonstração · nada é gravado ·</span>` +
        Object.entries(NICHOS).map(([id, n]) => `<a href="?demo=${id}" class="shrink-0 rounded-full px-3 py-1.5 ${id === N.nicho ? 'bg-brand text-brand-contrast' : 'hover:bg-white/10'}">${n.emoji} ${esc(n.rotulo)}</a>`).join('') +
        `<a href="../" class="shrink-0 ml-2 rounded-full px-3 py-1.5 border border-white/30">Quero no meu negócio →</a>`);
    }
  }

  function renderServicos() {
    slot('servicos', N.servicos.map((s) => {
      const on = B.servicos.includes(s.id);
      return `
      <article class="card p-5 flex flex-col transition ${on ? 'ring-2 ring-brand' : ''}">
        <div class="flex items-start justify-between gap-3">
          <h3 class="font-semibold text-lg">${esc(s.nome)}</h3>
          <span class="shrink-0 font-semibold text-brand">${brl(s.preco)}</span>
        </div>
        <p class="mt-2 text-sm text-muted flex-1">${esc(s.descricao)}</p>
        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-muted flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i>${fmtDur(s.duracao_min)}</span>
          <button data-add-servico="${s.id}" class="btn ${on ? 'btn-primary' : 'btn-ghost'} btn-sm"><i data-lucide="${on ? 'check' : 'plus'}" class="w-4 h-4"></i>${on ? 'Selecionado' : 'Agendar'}</button>
        </div>
      </article>`;
    }).join('') || '<p class="text-muted">Nenhum serviço cadastrado ainda.</p>');
  }

  let filtro = 'Todos';
  function tile(p, grande) {
    if (p.img) return `<img src="${esc(p.img)}" alt="${esc(p.titulo)}" loading="lazy" class="w-full h-full object-cover">`;
    return `<div class="w-full h-full bg-gradient-to-br from-brand/80 to-accent flex items-center justify-center"><span class="${grande ? 'text-7xl' : 'text-4xl md:text-5xl'}">${p.emoji}</span></div>`;
  }
  function renderPortfolio() {
    mostrarSe('portfolio', N.portfolio.length);
    const cats = ['Todos', ...new Set(N.portfolio.map((p) => p.categoria).filter(Boolean))];
    slot('filtros', cats.length > 2 ? cats.map((c) => `<button data-filtro="${esc(c)}" class="chip ${c === filtro ? 'chip-on' : ''}">${esc(c)}</button>`).join('') : '');
    slot('portfolio', N.portfolio.map((p, i) => ({ ...p, i })).filter((p) => filtro === 'Todos' || p.categoria === filtro).map((p) => `
      <button data-foto="${p.i}" class="group relative aspect-square overflow-hidden rounded-2xl border border-line text-left">
        <div class="w-full h-full transition duration-500 group-hover:scale-105">${tile(p)}</div>
        ${p.titulo ? `<span class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white text-sm font-medium">${esc(p.titulo)}</span>` : ''}
      </button>`).join(''));
  }
  function abrirFoto(i) {
    const p = N.portfolio[i];
    slot('lightbox', `
      <div class="aspect-[4/3] bg-black">${tile(p, true).replace('object-cover', 'object-contain')}</div>
      <div class="p-5 flex items-center justify-between gap-3">
        <div class="min-w-0"><p class="font-semibold truncate">${esc(p.titulo)}</p><p class="text-sm text-muted">${esc(p.categoria)}</p></div>
        <div class="flex gap-2 shrink-0">
          <a href="${waLink(N.whatsapp, `Olá, ${N.nome}! Vi o trabalho "${p.titulo || 'do portfólio'}" no site e quero fazer algo parecido.`)}" target="_blank" rel="noopener" class="btn btn-wa btn-sm">Quero esse</a>
          <button data-acao="fechar-foto" class="btn btn-ghost !p-2.5" aria-label="Fechar"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
      </div>`);
    icons();
    $('#lightbox').showModal();
  }

  /* Próximo horário livre (cartão do topo) */
  async function renderProximo() {
    const curto = [...N.servicos].sort((a, b) => a.duracao_min - b.duracao_min)[0];
    if (!curto || !N.profissionais.length) { slot('proximo', 'Agenda em breve'); return; }
    for (const d of proximosDias().slice(0, 7)) {
      try {
        const livres = await fonte.horariosLivres(isoDate(d), [curto.id], null);
        if (livres.length) {
          const hoje = isoDate(new Date()) === isoDate(d);
          slot('proximo', `${hoje ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase())}, ${livres[0].hora}`);
          slot('proximo-detalhe', esc(`${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} · para ${curto.nome.toLowerCase()}`));
          return;
        }
      } catch (e) { break; }
    }
    slot('proximo', 'Consulte pelo WhatsApp');
  }

  /* ---------------------------------------------------------------
     4. ASSISTENTE DE AGENDAMENTO
     --------------------------------------------------------------- */
  const B = { etapa: 0, servicos: [], prof: null, data: null, hora: null, inicio: null, slots: null, carregando: false, enviando: false, erro: '', nome: '', fone: '', obs: '', resultado: null };
  const etapas = () => (N.profissionais.length > 1 ? ['servicos', 'prof', 'hora', 'dados'] : ['servicos', 'hora', 'dados']);
  const ROTULO = { servicos: 'Serviços', prof: 'Profissional', hora: 'Data e hora', dados: 'Seus dados' };
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
      let dias = proximosDias(), idx = dias.findIndex((d) => isoDate(d) === B.data);
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
    /* Centraliza o dia escolhido na faixa de datas, sem rolar a página */
    const chip = $(`[data-acao="data"][data-id="${B.data}"]`);
    if (chip) chip.parentElement.scrollLeft = chip.offsetLeft - chip.parentElement.clientWidth / 2 + chip.clientWidth / 2;
  }

  function podeAvancar() {
    return { servicos: B.servicos.length > 0, prof: B.prof !== undefined && B._profEscolhido, hora: !!B.inicio, dados: true }[etapaAtual()];
  }

  function resumo() {
    if (!B.servicos.length) return '<span class="text-muted">Nenhum serviço selecionado</span>';
    return `<span><b>${B.servicos.length}</b> serviço(s) · ${fmtDur(dur())}</span><b class="text-brand">${brl(total())}</b>`;
  }

  function corpo() {
    switch (etapaAtual()) {
      case 'servicos':
        return `<p class="font-semibold">O que você quer fazer?</p>
          <p class="text-sm text-muted">Pode escolher mais de um.</p>
          <div class="mt-4 grid gap-2 max-h-[22rem] overflow-y-auto pr-1">
          ${N.servicos.map((s) => {
            const on = B.servicos.includes(s.id);
            return `<button data-acao="toggle-servico" data-id="${s.id}" class="flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'}">
              <span class="w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ${on ? 'bg-brand border-brand text-brand-contrast' : 'border-line'}">${on ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}</span>
              <span class="flex-1 min-w-0"><span class="block font-medium">${esc(s.nome)}</span><span class="block text-xs text-muted">${fmtDur(s.duracao_min)}</span></span>
              <span class="text-sm font-semibold">${brl(s.preco)}</span>
            </button>`;
          }).join('')}</div>`;

      case 'prof': {
        const ops = [{ id: null, nome: 'Sem preferência', funcao: 'Primeiro horário livre' }, ...N.profissionais];
        return `<p class="font-semibold">Com quem você prefere?</p>
          <div class="mt-4 grid sm:grid-cols-2 gap-2">
          ${ops.map((p) => {
            const on = B._profEscolhido && B.prof === p.id;
            return `<button data-acao="prof" data-id="${p.id || ''}" class="flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'}">
              <span class="w-11 h-11 shrink-0 rounded-full ${p.id ? 'bg-brand/15 text-brand' : 'bg-line text-muted'} font-semibold flex items-center justify-center">${p.id ? esc(p.nome.charAt(0)) : '<i data-lucide="shuffle" class="w-4 h-4"></i>'}</span>
              <span class="min-w-0"><span class="block font-medium">${esc(p.nome)}</span><span class="block text-xs text-muted">${esc(p.funcao)}</span></span>
            </button>`;
          }).join('')}</div>`;
      }

      case 'hora': {
        const dias = proximosDias();
        if (!dias.length) return '<p class="text-muted">Ainda não há horários de funcionamento cadastrados.</p>';
        const slots = B.carregando
          ? `<div class="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2">${'<div class="skeleton h-10"></div>'.repeat(10)}</div>`
          : B.erro ? `<p class="mt-3 text-sm text-red-600">${esc(B.erro)}</p>`
          : B.slots?.length ? `<div class="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
              ${B.slots.map((h) => `<button data-acao="hora" data-id="${h.hora}" data-inicio="${h.inicio}" class="rounded-lg border py-2 text-sm transition ${h.hora === B.hora ? 'bg-brand text-brand-contrast border-brand' : 'border-line hover:border-brand'}">${h.hora}</button>`).join('')}</div>`
          : `<p class="mt-3 rounded-xl border border-dashed border-line p-4 text-sm text-muted">Sem horários livres neste dia. Escolha outra data ou <a class="text-brand underline" target="_blank" rel="noopener" href="${waLink(N.whatsapp, `Olá, ${N.nome}! Procuro um horário em ${dataLonga(B.data)}.`)}">chame no WhatsApp</a>.</p>`;
        return `<p class="font-semibold">Escolha o dia</p>
          <div class="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          ${dias.map((d) => {
            const iso = isoDate(d), on = iso === B.data;
            return `<button data-acao="data" data-id="${iso}" class="shrink-0 w-16 rounded-xl border py-2 text-center transition ${on ? 'bg-brand text-brand-contrast border-brand' : 'border-line hover:border-brand/40'}">
              <span class="block text-[11px] uppercase opacity-80">${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
              <span class="block text-lg font-semibold leading-tight">${d.getDate()}</span>
              <span class="block text-[11px] opacity-80">${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
            </button>`;
          }).join('')}</div>
          <div class="mt-5 flex items-baseline justify-between gap-2">
            <p class="font-semibold">Horários de início</p>
            <p class="text-xs text-muted">Duração: ${fmtDur(dur())} · ${esc(nomeProf())}</p>
          </div>${slots}`;
      }

      case 'dados': {
        const fim = toHHMM(toMin(B.hora) + dur());
        return `<p class="font-semibold">Quase lá! Confira e confirme.</p>
          <div class="mt-4 rounded-xl bg-brand/5 border border-brand/20 p-4 text-sm grid gap-1.5">
            <p><b>Serviços:</b> ${sel().map((s) => esc(s.nome)).join(' + ')}</p>
            <p><b>Profissional:</b> ${esc(nomeProf())}</p>
            <p><b>Quando:</b> ${esc(dataLonga(B.data))}, das ${B.hora} às ${fim}</p>
            <p><b>Valor estimado:</b> ${brl(total())}</p>
          </div>
          <form id="form-agenda" class="mt-4 grid gap-3" novalidate>
            <label class="label">Seu nome<input name="nome" class="input" autocomplete="name" placeholder="Como podemos te chamar?" value="${esc(B.nome)}" maxlength="80"></label>
            <label class="label">WhatsApp<input name="fone" class="input" inputmode="tel" autocomplete="tel" placeholder="(85) 99999-9999" value="${esc(B.fone)}"></label>
            <label class="label">Observação <small>(opcional)</small><textarea name="obs" rows="2" class="input" maxlength="500" placeholder="Alguma preferência ou referência?">${esc(B.obs)}</textarea></label>
            ${B.erro ? `<p class="text-sm text-red-600">${esc(B.erro)}</p>` : ''}
            <p class="text-xs text-muted">Seus dados são usados só para este agendamento.</p>
          </form>`;
      }

      case 'fim': {
        const r = B.resultado;
        const ini = new Date(r.inicio), fim = new Date(r.fim);
        const servs = (r.servicos || []).map((s) => s.nome).join(' + ');
        const quando = `${dataLonga(dataNoFuso(r.inicio, N.fuso))}, ${horaNoFuso(r.inicio, N.fuso)}`;
        const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${servs} — ${N.nome}`)}&dates=${ini.toISOString().replace(/[-:]|\.\d{3}/g, '')}/${fim.toISOString().replace(/[-:]|\.\d{3}/g, '')}&details=${encodeURIComponent(`Profissional: ${r.profissional}`)}&location=${encodeURIComponent([N.endereco, N.cidade].filter(Boolean).join(', '))}`;
        const msg = `Olá, ${N.nome}! Acabei de agendar pelo site:\n\n• ${servs}\n• ${quando}\n• Profissional: ${r.profissional}\n\nNome: ${B.nome.trim()}`;
        return `<div class="text-center py-4">
            <div class="mx-auto w-16 h-16 rounded-full bg-green-500/15 text-green-600 flex items-center justify-center"><i data-lucide="check" class="w-8 h-8"></i></div>
            <p class="mt-4 font-display text-2xl font-bold">${N.demo ? 'Agendamento simulado!' : 'Horário reservado!'}</p>
            <p class="mt-2 text-muted">${esc(quando)}<br>${esc(servs)} com ${esc(r.profissional)}</p>
            ${N.demo ? '<p class="mt-3 text-xs text-muted">Isto é uma demonstração: nenhum dado foi gravado.</p>' : ''}
            <div class="mt-6 grid sm:grid-cols-2 gap-2 max-w-md mx-auto">
              <a href="${waLink(N.whatsapp, msg)}" target="_blank" rel="noopener" class="btn btn-wa"><i data-lucide="message-circle" class="w-4 h-4"></i>Avisar no WhatsApp</a>
              <a href="${gcal}" target="_blank" rel="noopener" class="btn btn-ghost"><i data-lucide="calendar-plus" class="w-4 h-4"></i>Salvar na agenda</a>
            </div>
            <button data-acao="reiniciar" class="mt-4 text-sm text-muted underline">Fazer outro agendamento</button>
          </div>`;
      }
    }
  }

  function renderBooking() {
    const el = $('#booking'), et = etapas(), atual = etapaAtual();
    const topo = atual === 'fim' ? '' : `
      <div class="px-5 pt-5">
        <div class="flex justify-between text-xs text-muted">${et.map((k, i) => `<span class="${i <= B.etapa ? 'text-brand font-semibold' : ''}">${i + 1}. <span class="hidden sm:inline">${ROTULO[k]}</span></span>`).join('')}</div>
        <div class="mt-2 h-1.5 rounded-full bg-line overflow-hidden"><div class="h-full bg-brand transition-all duration-500" style="width:${((B.etapa + 1) / et.length) * 100}%"></div></div>
      </div>`;
    const ultimo = B.etapa === et.length - 1;
    const rodape = atual === 'fim' ? '' : `
      <div class="border-t border-line bg-surface px-5 py-4">
        <div class="flex items-center justify-between text-sm gap-3">${resumo()}</div>
        <div class="mt-3 flex gap-2">
          ${B.etapa > 0 ? '<button data-acao="voltar" class="btn btn-ghost"><i data-lucide="arrow-left" class="w-4 h-4"></i>Voltar</button>' : ''}
          ${ultimo
            ? `<button data-acao="confirmar" class="btn btn-primary flex-1" ${B.enviando ? 'disabled' : ''}>${B.enviando ? 'Reservando…' : '<i data-lucide="check" class="w-4 h-4"></i>Confirmar agendamento'}</button>`
            : `<button data-acao="avancar" class="btn btn-primary flex-1" ${podeAvancar() ? '' : 'disabled'}>Continuar<i data-lucide="arrow-right" class="w-4 h-4"></i></button>`}
        </div>
      </div>`;
    el.innerHTML = `${topo}<div class="p-5">${corpo()}</div>${rodape}`;
    icons();
  }

  function irPara(etapa) {
    B.etapa = etapa; B.erro = '';
    if (etapaAtual() === 'hora') {
      if (!B.data) B.data = isoDate(proximosDias()[0] || new Date());
      carregarSlots(!B._dataEscolhida);
    } else renderBooking();
  }

  async function confirmar() {
    if (B.nome.trim().length < 2) { B.erro = 'Informe seu nome.'; return renderBooking(); }
    if (soDigitos(B.fone).length < 10) { B.erro = 'Informe um WhatsApp válido com DDD.'; return renderBooking(); }
    B.enviando = true; B.erro = ''; renderBooking();
    try {
      B.resultado = await fonte.reservar({ servicoIds: B.servicos, inicio: B.inicio, profId: B.prof, nome: B.nome.trim(), fone: B.fone, obs: B.obs.trim() });
      B.enviando = false; B.etapa = etapas().length;
      renderBooking();
      $('#agendar').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      B.enviando = false;
      if (/HORARIO_OCUPADO|FORA_DO_PRAZO/.test(e.message || '')) {
        toast(msgErro(e), 'erro');
        B.hora = null; B.inicio = null; B._dataEscolhida = true;
        irPara(etapas().indexOf('hora'));
      } else { B.erro = msgErro(e); renderBooking(); }
    }
  }

  function reiniciar() {
    Object.assign(B, { etapa: 0, servicos: [], prof: null, _profEscolhido: false, data: null, _dataEscolhida: false, hora: null, inicio: null, slots: null, erro: '', obs: '', resultado: null });
    if (N.profissionais.length === 1) { B.prof = N.profissionais[0].id; B._profEscolhido = true; }
    renderServicos(); renderBooking();
  }

  /* ---------------------------------------------------------------
     5. EVENTOS
     --------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-add-servico],[data-filtro],[data-foto],[data-acao]');
    if (!alvo) return;
    const d = alvo.dataset;
    if (d.addServico) {
      if (etapaAtual() === 'fim') reiniciar();
      if (!B.servicos.includes(d.addServico)) B.servicos.push(d.addServico);
      B.hora = B.inicio = null; B.etapa = 0;
      renderServicos(); renderBooking();
      $('#agendar').scrollIntoView({ behavior: 'smooth' });
      return toast('Serviço adicionado ao agendamento');
    }
    if (d.filtro) { filtro = d.filtro; return renderPortfolio(); }
    if (d.foto) return abrirFoto(Number(d.foto));
    switch (d.acao) {
      case 'toggle-servico': {
        const i = B.servicos.indexOf(d.id);
        i >= 0 ? B.servicos.splice(i, 1) : B.servicos.push(d.id);
        B.hora = B.inicio = null;
        renderServicos(); renderBooking(); break;
      }
      case 'prof': B.prof = d.id || null; B._profEscolhido = true; B.hora = B.inicio = null; renderBooking(); break;
      case 'data': B.data = d.id; B._dataEscolhida = true; B.hora = B.inicio = null; carregarSlots(false); break;
      case 'hora': B.hora = d.id; B.inicio = d.inicio; renderBooking(); break;
      case 'avancar': if (podeAvancar()) irPara(B.etapa + 1); break;
      case 'voltar': irPara(B.etapa - 1); break;
      case 'confirmar': confirmar(); break;
      case 'reiniciar': reiniciar(); break;
      case 'fechar-foto': $('#lightbox').close(); break;
    }
  });
  document.addEventListener('input', (e) => {
    if (!e.target.closest('#form-agenda')) return;
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
        if (!NICHOS[demoId]) return falhar('Demonstração não encontrada', 'Escolha um dos nichos na página inicial.');
        deDemo(demoId);
      } else if (slug) {
        if (!U.configurado()) return falhar('Sistema ainda não configurado', 'Preencha o endereço e a chave do Supabase em assets/config.js.');
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
    icons(); U.revelar(); renderProximo();
  }
  iniciar();
})();
