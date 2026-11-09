/* =====================================================================
   PAINEL.JS — área do dono do negócio.
   Login → (primeira vez) criar negócio → abas de gestão.
   ===================================================================== */
(() => {
  'use strict';
  const { $, $$, esc, brl, fmtDur, isoDate, parseISO, dataLonga, icons, horaNoFuso, dataNoFuso, localParaISO, mascaraFone, soDigitos, waLink, msgErro, toast, slugify } = U;
  const sb = U.sb();
  const S = { user: null, neg: null, papel: 'dono', meuProf: null, profs: [], servicos: [], aba: 'agenda', dia: isoDate(new Date()), filtroProf: '' };
  let conviteURL = new URLSearchParams(location.search).get('convite');   // link de convite de profissional
  const fuso = () => S.neg?.fuso || 'America/Sao_Paulo';
  const linkPublico = () => new URL(`../agendar/?n=${S.neg.slug}`, location.href).href;
  const mostrar = (id) => ['v-carregando', 'v-auth', 'v-app'].forEach((v) => $(`#${v}`).classList.toggle('hidden', v !== id));
  const confirma = (msg) => window.confirm(msg);

  U.aplicarTema(TEMA_PRODUTO);
  document.title = `Painel · ${CONFIG.produto?.nome || 'Minha agenda'}`;

  /* =================================================================
     1. JANELA DE FORMULÁRIO (reaproveitada em todas as abas)
     ================================================================= */
  function modal({ titulo, corpo, ok = 'Salvar', aoSalvar }) {
    const dlg = $('#modal'), form = $('#modal-form'), erro = $('[data-slot="modal-erro"]');
    $('[data-slot="modal-titulo"]').textContent = titulo;
    $('[data-slot="modal-corpo"]').innerHTML = corpo;
    $('[data-slot="modal-ok"]').textContent = ok;
    erro.classList.add('hidden');
    icons();
    form.onsubmit = async (e) => {
      if (e.submitter?.value !== 'ok') return;
      e.preventDefault();
      const btn = $('[data-slot="modal-ok"]');
      btn.disabled = true;
      try { await aoSalvar(form); dlg.close(); }
      catch (err) { erro.textContent = msgErro(err); erro.classList.remove('hidden'); }
      finally { btn.disabled = false; }
    };
    dlg.showModal();
  }

  /* Campos de formulário a partir de uma definição */
  function campo(c, v) {
    const val = v ?? c.padrao ?? '';
    const base = `name="${c.k}" ${c.req ? 'required' : ''}`;
    switch (c.t) {
      case 'textarea': return `<label class="label">${c.r}<textarea ${base} rows="3" class="input" maxlength="${c.max || 500}">${esc(val)}</textarea></label>`;
      case 'number': return `<label class="label">${c.r}<input ${base} type="number" class="input" min="${c.min ?? 0}" max="${c.max ?? 99999}" step="${c.step || 1}" value="${esc(val)}"></label>`;
      case 'money': return `<label class="label">${c.r}<input ${base} type="number" class="input" min="0" step="0.01" value="${esc(val)}"><small>Use 0 para mostrar "Grátis".</small></label>`;
      case 'bool': return `<label class="flex items-center gap-3 text-sm font-medium"><input type="checkbox" name="${c.k}" class="w-5 h-5 accent-[rgb(var(--c-brand))]" ${val ? 'checked' : ''}>${c.r}</label>`;
      default: return `<label class="label">${c.r}<input ${base} class="input" maxlength="${c.max || 80}" value="${esc(val)}" ${c.ph ? `placeholder="${esc(c.ph)}"` : ''}>${c.dica ? `<small>${c.dica}</small>` : ''}</label>`;
    }
  }
  function lerCampos(form, campos) {
    const out = {};
    campos.forEach((c) => {
      const el = form.elements[c.k];
      if (c.t === 'bool') out[c.k] = el.checked;
      else if (c.t === 'number' || c.t === 'money') out[c.k] = el.value === '' ? (c.padrao ?? 0) : Number(el.value);
      else out[c.k] = el.value.trim();
      if (c.req && (out[c.k] === '' || out[c.k] === null)) throw new Error(`Preencha "${c.r}".`);
    });
    return out;
  }

  /* =================================================================
     2. LOGIN, CADASTRO E RECUPERAÇÃO DE SENHA
     ================================================================= */
  function telaAuth(modo = 'entrar', aviso = '') {
    mostrar('v-auth');
    const titulos = { entrar: 'Entrar no painel', criar: 'Criar conta', recuperar: 'Recuperar senha', nova: 'Criar nova senha' };
    $('#v-auth').innerHTML = `
      <div class="w-full max-w-sm">
        <a href="../" class="flex items-center justify-center gap-2 font-display text-2xl font-bold"><span class="w-9 h-9 rounded-xl bg-brand text-brand-contrast flex items-center justify-center"><i data-lucide="calendar-check" class="w-5 h-5"></i></span>${esc(CONFIG.produto?.nome || 'MinhaAgenda')}</a>
        <form id="f-auth" class="card p-6 mt-6 grid gap-4" novalidate>
          <h1 class="font-semibold text-lg">${titulos[modo]}</h1>
          ${aviso ? `<p class="text-sm rounded-xl bg-brand/10 text-brand p-3">${esc(aviso)}</p>` : ''}
          ${conviteURL && (modo === 'entrar' || modo === 'criar') ? `<p class="text-sm rounded-xl bg-green-500/10 text-green-700 p-3">Você recebeu um convite para a equipe (código <b>${esc(conviteURL)}</b>). ${modo === 'criar' ? 'Crie sua conta com seu e-mail' : 'Entre ou crie sua conta'} e o acesso é liberado na hora.</p>` : ''}
          ${modo !== 'nova' ? '<label class="label">E-mail<input name="email" type="email" class="input" autocomplete="email" required></label>' : ''}
          ${modo !== 'recuperar' ? `<label class="label">${modo === 'nova' ? 'Nova senha' : 'Senha'}<input name="senha" type="password" class="input" minlength="6" autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}" required>${modo !== 'entrar' ? '<small>Mínimo de 6 caracteres.</small>' : ''}</label>` : ''}
          <p class="text-sm text-red-600 hidden" data-slot="auth-erro"></p>
          <button class="btn btn-primary !py-3">${{ entrar: 'Entrar', criar: 'Criar conta', recuperar: 'Enviar link', nova: 'Salvar senha' }[modo]}</button>
          <div class="flex justify-between text-sm text-muted">
            ${modo === 'entrar' ? '<button type="button" data-auth="criar" class="hover:text-brand">Criar conta</button><button type="button" data-auth="recuperar" class="hover:text-brand">Esqueci a senha</button>' : '<button type="button" data-auth="entrar" class="hover:text-brand">← Voltar para entrar</button>'}
          </div>
        </form>
      </div>`;
    icons();
    $('#f-auth').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('button.btn-primary'), err = $('[data-slot="auth-erro"]');
      const email = f.email?.value.trim(), senha = f.senha?.value;
      err.classList.add('hidden'); btn.disabled = true;
      try {
        if (modo === 'entrar') {
          const { error } = await sb.auth.signInWithPassword({ email, password: senha });
          if (error) throw error;
        } else if (modo === 'criar') {
          const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.href.split(/[?#]/)[0] } });
          if (error) throw error;
          if (!data.session) return telaAuth('entrar', 'Conta criada! Abra o e-mail que enviamos e clique no link de confirmação. Depois volte aqui e entre.');
        } else if (modo === 'recuperar') {
          const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split(/[?#]/)[0] });
          if (error) throw error;
          return telaAuth('entrar', 'Se o e-mail tiver conta, você vai receber um link para criar uma nova senha.');
        } else if (modo === 'nova') {
          const { error } = await sb.auth.updateUser({ password: senha });
          if (error) throw error;
          toast('Senha alterada!');
          await carregarUsuario();
        }
      } catch (ex) { err.textContent = msgErro(ex); err.classList.remove('hidden'); }
      finally { btn.disabled = false; }
    };
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-auth]'); if (b) telaAuth(b.dataset.auth); });

  /* =================================================================
     3. PRIMEIRO ACESSO: CRIAR O NEGÓCIO A PARTIR DE UM NICHO
     ================================================================= */
  function telaNovoNegocio() {
    mostrar('v-auth');
    $('#v-auth').innerHTML = `
      <form id="f-neg" class="w-full max-w-2xl card p-6 grid gap-5" novalidate>
        <div>
          <p class="eyebrow">Primeiro acesso</p>
          <h1 class="h2 mt-3">Vamos criar a página do seu negócio</h1>
          <p class="text-muted mt-2">Escolha o tipo de negócio: já deixamos serviços, equipe e horários de exemplo para você só ajustar.</p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${Object.entries(NICHOS).map(([id, n], i) => `
            <label class="cursor-pointer">
              <input type="radio" name="nicho" value="${id}" class="peer sr-only" ${i === 0 ? 'checked' : ''}>
              <span class="flex flex-col items-center gap-1 rounded-xl border border-line p-3 text-center text-xs peer-checked:border-brand peer-checked:bg-brand/5 peer-checked:ring-2 peer-checked:ring-brand/30">
                <span class="text-2xl">${n.emoji}</span>${esc(n.rotulo)}
              </span>
            </label>`).join('')}
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <label class="label">Nome do negócio<input name="nome" class="input" maxlength="80" required placeholder="Ex.: Studio Bella"></label>
          <label class="label">WhatsApp do negócio<input name="whatsapp" class="input" inputmode="tel" required placeholder="(85) 99999-9999"></label>
          <label class="label">Cidade<input name="cidade" class="input" maxlength="60" placeholder="Fortaleza/CE"></label>
          <label class="label">Endereço do link<input name="slug" class="input" maxlength="60" required placeholder="studio-bella"><small data-slot="previa-link"></small></label>
        </div>
        <p class="text-sm text-red-600 hidden" data-slot="neg-erro"></p>
        <div class="flex flex-wrap justify-between gap-2">
          <button type="button" data-acao="sair" class="btn btn-ghost">Sair</button>
          <button type="button" data-acao="tenho-convite" class="btn btn-ghost"><i data-lucide="ticket" class="w-4 h-4"></i>Sou profissional e tenho um código</button>
          <button class="btn btn-primary">Criar minha página<i data-lucide="arrow-right" class="w-4 h-4"></i></button>
        </div>
      </form>`;
    icons();
    const f = $('#f-neg');
    let slugMexido = false;
    const previa = () => { $('[data-slot="previa-link"]').textContent = new URL(`../agendar/?n=${f.slug.value || 'seu-negocio'}`, location.href).href; };
    f.nome.oninput = () => { if (!slugMexido) f.slug.value = slugify(f.nome.value); previa(); };
    f.slug.oninput = () => { slugMexido = true; f.slug.value = slugify(f.slug.value); previa(); };
    f.whatsapp.oninput = () => { f.whatsapp.value = mascaraFone(f.whatsapp.value); };
    previa();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const err = $('[data-slot="neg-erro"]'), btn = f.querySelector('.btn-primary');
      err.classList.add('hidden');
      try {
        if (f.nome.value.trim().length < 2) throw new Error('Informe o nome do negócio.');
        if (soDigitos(f.whatsapp.value).length < 10) throw new Error('Informe o WhatsApp com DDD.');
        if (f.slug.value.length < 3) throw new Error('O endereço do link precisa ter pelo menos 3 letras.');
        btn.disabled = true;
        const nicho = f.nicho.value, p = NICHOS[nicho];
        const { data: neg, error } = await sb.from('negocios').insert({
          slug: f.slug.value, nome: f.nome.value.trim(), nicho, whatsapp: U.foneWa(f.whatsapp.value), cidade: f.cidade.value.trim()
        }).select().single();
        if (error) throw error;
        const id = neg.id;
        const r = await Promise.all([
          sb.from('profissionais').insert(p.profissionais.map((x, i) => ({ negocio_id: id, nome: x.nome, funcao: x.funcao, ordem: i }))),
          sb.from('servicos').insert(p.servicos.map((x, i) => ({ negocio_id: id, ...x, ordem: i }))),
          sb.from('horarios').insert(p.horarios.map(([dia_semana, abre, fecha]) => ({ negocio_id: id, dia_semana, abre, fecha })))
        ]);
        const falha = r.find((x) => x.error);
        if (falha) toast('Negócio criado, mas parte dos exemplos não foi copiada. Cadastre pelo painel.', 'erro');
        S.aba = 'divulgar';
        await carregarNegocio();
        toast('Página criada! Ajuste serviços, equipe e horários.');
      } catch (ex) { err.textContent = msgErro(ex); err.classList.remove('hidden'); }
      finally { btn.disabled = false; }
    };
  }

  /* =================================================================
     4. CARREGAMENTO (dono ou profissional da equipe)
     ================================================================= */
  async function carregarUsuario() {
    const { data: { session } } = await sb.auth.getSession();
    S.user = session?.user || null;
    if (!S.user) return telaAuth(conviteURL ? 'criar' : 'entrar');
    if (conviteURL) {
      const cod = conviteURL; conviteURL = null;
      history.replaceState(null, '', location.pathname);
      const { error } = await sb.rpc('aceitar_convite', { p_codigo: cod });
      if (error) toast(msgErro(error), 'erro'); else toast('Acesso liberado! Bem-vindo(a) à equipe.');
    }
    await carregarNegocio();
  }
  async function carregarNegocio() {
    let { data, error } = await sb.from('negocios').select('*').eq('owner_id', S.user.id).maybeSingle();
    if (error) { toast(msgErro(error), 'erro'); return telaAuth('entrar'); }
    S.papel = 'dono'; S.meuProf = null;
    if (!data) {
      const ac = await sb.from('acessos').select('negocio_id, profissional_id').eq('user_id', S.user.id).maybeSingle();
      if (ac.data) {
        const r = await sb.from('negocios').select('*').eq('id', ac.data.negocio_id).single();
        data = r.data;
        S.papel = 'prof'; S.meuProf = ac.data.profissional_id; S.filtroProf = '';
      }
    }
    if (!data) return telaNovoNegocio();
    S.neg = data;
    await recarregarBase();
    montarApp();
  }
  async function recarregarBase() {
    const [p, s] = await Promise.all([
      sb.from('profissionais').select('*').eq('negocio_id', S.neg.id).order('ordem').order('nome'),
      sb.from('servicos').select('*').eq('negocio_id', S.neg.id).order('ordem').order('nome')
    ]);
    S.profs = p.data || []; S.servicos = (s.data || []).map((x) => ({ ...x, preco: Number(x.preco) }));
  }

  /* =================================================================
     5. ESTRUTURA DO PAINEL E ABAS (cada papel vê abas diferentes)
     ================================================================= */
  const PLANOS = { essencial: 'Essencial', equipe: 'Equipe', ilimitado: 'Ilimitado' };
  const temEquipe = () => S.neg.plano !== 'essencial';
  function abasVisiveis() {
    if (S.papel === 'prof') return [['agenda', 'Minha agenda', 'calendar-days'], ['financeiro', 'Meus ganhos', 'wallet'], ['divulgar', 'Divulgar', 'share-2']];
    return [
      ['agenda', 'Agenda', 'calendar-days'], ['financeiro', 'Financeiro', 'wallet'], ['servicos', 'Serviços', 'scissors'], ['equipe', 'Equipe', 'users'],
      ...(temEquipe() ? [['comissoes', 'Comissões', 'percent']] : []),
      ['horarios', 'Horários', 'clock'], ['folgas', 'Folgas', 'calendar-off'], ['portfolio', 'Portfólio', 'image'],
      ['depoimentos', 'Depoimentos', 'message-square-quote'], ['negocio', 'Meu negócio', 'store'], ['divulgar', 'Divulgar', 'share-2']
    ];
  }
  function montarApp() {
    mostrar('v-app');
    $('[data-slot="emoji"]').textContent = (NICHOS[S.neg.nicho] || NICHOS.salao).emoji;
    const eu = S.profs.find((p) => p.id === S.meuProf);
    $('[data-slot="nome-negocio"]').textContent = S.papel === 'prof' ? `${S.neg.nome} · ${eu?.nome || ''}` : S.neg.nome;
    $('[data-slot="link-publico"]').href = linkPublico();
    if (!abasVisiveis().some(([k]) => k === S.aba)) S.aba = 'agenda';
    abrirAba(S.aba);
  }
  function abrirAba(id) {
    S.aba = id;
    $('[data-slot="abas"]').innerHTML = abasVisiveis().map(([k, r, ic]) => `
      <button data-aba="${k}" class="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 ${k === id ? 'border-brand text-brand font-semibold' : 'border-transparent text-muted hover:text-ink'}"><i data-lucide="${ic}" class="w-4 h-4"></i>${r}</button>`).join('');
    const ab = $(`[data-aba="${id}"]`);
    if (ab) ab.parentElement.scrollLeft = ab.offsetLeft - ab.parentElement.clientWidth / 2 + ab.clientWidth / 2;
    $('#conteudo').innerHTML = '<div class="skeleton h-40"></div>';
    icons();
    ({ agenda: abaAgenda, financeiro: abaFinanceiro, servicos: () => abaCrud(CRUD.servicos), equipe: () => abaCrud(CRUD.equipe), comissoes: abaComissoes, horarios: abaHorarios, folgas: abaFolgas, portfolio: abaPortfolio, depoimentos: () => abaCrud(CRUD.depoimentos), negocio: abaNegocio, divulgar: abaDivulgar })[id]();
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b) abrirAba(b.dataset.aba); });
  const avisoSuspenso = () => (S.neg?.suspenso ? `<div class="card p-4 mb-4 border-red-500/40 bg-red-500/5 text-sm flex flex-wrap items-center justify-between gap-3"><p><b class="text-red-600">Página suspensa.</b> Os clientes não conseguem agendar no momento. Fale com o suporte para reativar.</p><a href="${waLink(CONFIG.produto.whatsapp, `Olá! Minha página (${S.neg.nome}) está suspensa e quero reativar.`)}" target="_blank" rel="noopener" class="btn btn-wa btn-sm">Falar com o suporte</a></div>` : '');
  const cabecalho = (titulo, texto, botoes = '') => avisoSuspenso() + `
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div><h1 class="font-display text-2xl md:text-3xl font-bold">${titulo}</h1>${texto ? `<p class="text-muted text-sm mt-1 max-w-xl">${texto}</p>` : ''}</div>
      <div class="flex flex-wrap gap-2">${botoes}</div>
    </div>`;
  const vazio = (texto) => `<div class="card p-8 text-center text-muted">${texto}</div>`;
  const reais = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  /* =================================================================
     6. AGENDA
     ================================================================= */
  const STATUS = {
    confirmado: ['Confirmado', 'bg-blue-500/10 text-blue-600'],
    concluido: ['Concluído', 'bg-green-500/10 text-green-600'],
    faltou: ['Faltou', 'bg-amber-500/15 text-amber-700'],
    cancelado: ['Cancelado', 'bg-red-500/10 text-red-600']
  };
  const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', credito: 'Cartão de crédito', debito: 'Cartão de débito', outro: 'Outro', nao_informado: 'Não informado' };
  let timerAgenda, agendaAtual = [];
  async function abaAgenda() {
    clearInterval(timerAgenda);
    const ini = localParaISO(S.dia, '00:00', fuso());
    const fim = localParaISO(isoDate(new Date(parseISO(S.dia).getTime() + 86400000 * 1.5)), '00:00', fuso());
    let q = sb.from('agendamentos').select('*').eq('negocio_id', S.neg.id).gte('inicio', ini).lt('inicio', fim).order('inicio');
    if (S.filtroProf) q = q.eq('profissional_id', S.filtroProf);
    const { data, error } = await q;
    if (S.aba !== 'agenda') return;
    if (error) { $('#conteudo').innerHTML = vazio(esc(msgErro(error))); return; }
    const lista = agendaAtual = data.filter((a) => dataNoFuso(a.inicio, fuso()) === S.dia);
    const ativos = lista.filter((a) => a.status !== 'cancelado');
    const previsto = ativos.filter((a) => a.status === 'confirmado').reduce((t, a) => t + Number(a.valor_total), 0);
    const feitos = lista.filter((a) => a.status === 'concluido');
    const recebido = feitos.reduce((t, a) => t + Number(a.valor_cobrado ?? a.valor_total), 0);
    const comissao = feitos.reduce((t, a) => t + Number(a.comissao_valor), 0);
    const hoje = isoDate(new Date());
    const prof = S.papel === 'prof';

    $('#conteudo').innerHTML = cabecalho(prof ? 'Minha agenda' : 'Agenda', '', `<button data-acao="novo-agendamento" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i>Novo agendamento</button>`) + `
      <div class="card p-3 flex flex-wrap items-center gap-2">
        <button data-acao="dia" data-d="-1" class="btn btn-ghost !p-2.5" aria-label="Dia anterior"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
        <input type="date" class="input !w-auto !py-2" value="${S.dia}" data-acao-change="dia-escolhido">
        <button data-acao="dia" data-d="1" class="btn btn-ghost !p-2.5" aria-label="Próximo dia"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
        ${S.dia !== hoje ? '<button data-acao="hoje" class="btn btn-ghost btn-sm">Hoje</button>' : ''}
        <p class="font-semibold capitalize ml-1">${esc(dataLonga(S.dia))}</p>
        <button data-acao="atualizar" class="btn btn-ghost btn-sm ml-auto"><i data-lucide="refresh-cw" class="w-4 h-4"></i>Atualizar</button>
      </div>
      ${!prof && S.profs.length > 1 ? `<div class="mt-3 flex gap-2 overflow-x-auto no-scrollbar">${[{ id: '', nome: 'Todos' }, ...S.profs].map((p) => `<button data-acao="filtro-prof" data-id="${p.id}" class="chip ${S.filtroProf === p.id ? 'chip-on' : ''}">${esc(p.nome)}</button>`).join('')}</div>` : ''}
      <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="card p-4"><p class="text-xs text-muted">Agendamentos</p><p class="text-2xl font-bold">${ativos.length}</p></div>
        <div class="card p-4"><p class="text-xs text-muted">A realizar</p><p class="text-xl font-bold">${reais(previsto)}</p></div>
        <div class="card p-4"><p class="text-xs text-muted">Recebido</p><p class="text-xl font-bold text-green-600">${reais(recebido)}</p></div>
        <div class="card p-4"><p class="text-xs text-muted">${prof ? 'Minha comissão' : 'Comissões'}</p><p class="text-xl font-bold">${reais(comissao)}</p></div>
      </div>
      <div class="mt-4 grid gap-3">
        ${lista.length ? lista.map(cardAgendamento).join('') : vazio('Nenhum agendamento neste dia.')}
      </div>`;
    icons();
    timerAgenda = setInterval(() => { if (S.aba === 'agenda' && !document.hidden && !$('#modal').open) abaAgenda(); }, 60000);
  }

  function cardAgendamento(a) {
    const [rot, cor] = STATUS[a.status];
    const servs = (a.servicos || []).map((s) => s.nome).join(' + ') || '—';
    const h1 = horaNoFuso(a.inicio, fuso()), h2 = horaNoFuso(a.fim, fuso());
    const msg = `Olá, ${a.cliente_nome.split(' ')[0]}! Passando para lembrar do seu horário no ${S.neg.nome}:\n\n• ${servs}\n• ${dataLonga(dataNoFuso(a.inicio, fuso()))}, às ${h1}\n• Profissional: ${a.profissional_nome}${Number(a.valor_total) ? `\n• Valor: ${brl(a.valor_total)}` : ''}\n\nSe precisar remarcar, é só responder esta mensagem. Até lá!`;
    const dono = S.papel === 'dono';
    const pago = a.status === 'concluido'
      ? `<p class="text-sm mt-1"><span class="text-green-600 font-semibold">${reais(a.valor_cobrado ?? a.valor_total)}</span>${a.forma_pagamento ? ` · ${FORMAS[a.forma_pagamento]}` : ''} · comissão ${reais(a.comissao_valor)}</p>` : '';
    return `
      <article class="card p-4 ${a.status === 'cancelado' ? 'opacity-60' : ''}">
        <div class="flex flex-wrap items-start gap-3">
          <div class="w-16 shrink-0"><p class="font-bold text-lg text-brand leading-none">${h1}</p><p class="text-xs text-muted mt-1">até ${h2}</p></div>
          <div class="flex-1 min-w-[12rem]">
            <p class="font-semibold">${esc(a.cliente_nome)} <span class="ml-1 align-middle whitespace-nowrap text-[11px] font-semibold rounded-full px-2 py-0.5 ${cor}">${rot}</span>${a.origem === 'online' ? '<span class="ml-1 align-middle whitespace-nowrap text-[11px] rounded-full px-2 py-0.5 bg-brand/10 text-brand">pelo site</span>' : ''}</p>
            <p class="text-sm text-muted">${esc(servs)} · ${esc(a.profissional_nome || '—')} · ${brl(a.valor_total)}</p>
            <p class="text-sm"><a class="hover:text-brand" href="${waLink(a.cliente_whatsapp)}" target="_blank" rel="noopener">${esc(mascaraFone(a.cliente_whatsapp.replace(/^55(?=\d{10,11}$)/, '')))}</a></p>
            ${pago}
            ${a.obs ? `<p class="text-sm mt-1 rounded-lg bg-page border border-line px-3 py-2">“${esc(a.obs)}”</p>` : ''}
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          ${a.status === 'confirmado' ? `
            <a href="${waLink(a.cliente_whatsapp, msg)}" target="_blank" rel="noopener" class="btn btn-wa btn-sm"><i data-lucide="bell-ring" class="w-4 h-4"></i>Lembrete</a>
            <button data-acao="concluir" data-id="${a.id}" class="btn btn-primary btn-sm"><i data-lucide="check" class="w-4 h-4"></i>Concluir e receber</button>
            <button data-acao="status" data-id="${a.id}" data-s="faltou" class="btn btn-ghost btn-sm">Faltou</button>
            ${dono ? `<button data-acao="status" data-id="${a.id}" data-s="cancelado" class="btn btn-danger btn-sm">Cancelar</button>` : ''}`
          : `${a.status === 'concluido' ? `<button data-acao="concluir" data-id="${a.id}" class="btn btn-ghost btn-sm"><i data-lucide="pencil" class="w-4 h-4"></i>Corrigir pagamento</button>` : ''}
             <button data-acao="status" data-id="${a.id}" data-s="confirmado" class="btn btn-ghost btn-sm"><i data-lucide="rotate-ccw" class="w-4 h-4"></i>Voltar para confirmado</button>`}
        </div>
      </article>`;
  }

  /* Concluir: valor realmente cobrado (com desconto ou acréscimo) e forma de pagamento */
  function concluir(id) {
    const a = agendaAtual.find((x) => x.id === id);
    modal({
      titulo: 'Concluir atendimento',
      ok: 'Concluir',
      corpo: `
        <p class="text-sm text-muted">${esc(a.cliente_nome)} · ${esc((a.servicos || []).map((s) => s.nome).join(' + '))}</p>
        <label class="label">Valor cobrado (R$)<input name="valor" type="number" min="0" step="0.01" class="input" value="${Number(a.valor_cobrado ?? a.valor_total).toFixed(2)}"><small>Valor de tabela: ${reais(a.valor_total)}. Mude se deu desconto ou cobrou algo a mais. A comissão acompanha o valor.</small></label>
        <fieldset class="grid gap-2"><legend class="text-sm font-medium mb-1">Forma de pagamento</legend>
          <div class="grid grid-cols-2 gap-2">${['pix', 'dinheiro', 'credito', 'debito', 'outro'].map((f, i) => `
            <label class="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand/5"><input type="radio" name="forma" value="${f}" ${(a.forma_pagamento || 'pix') === f ? 'checked' : ''}>${FORMAS[f]}</label>`).join('')}</div>
        </fieldset>`,
      async aoSalvar(f) {
        const v = Number(f.valor.value);
        if (f.valor.value === '' || v < 0) throw new Error('Informe o valor cobrado.');
        const { error } = await sb.rpc('mudar_status', { p_id: id, p_status: 'concluido', p_valor: v, p_forma: f.forma.value });
        if (error) throw error;
        toast('Atendimento concluído.'); abaAgenda();
      }
    });
  }

  function novoAgendamento() {
    const profs = S.papel === 'prof' ? S.profs.filter((p) => p.id === S.meuProf) : S.profs.filter((p) => p.ativo);
    if (!profs.length || !S.servicos.filter((s) => s.ativo).length) return toast('Cadastre pelo menos um serviço e um profissional ativos.', 'erro');
    modal({
      titulo: 'Novo agendamento',
      corpo: `
        <div class="grid sm:grid-cols-2 gap-4">
          <label class="label">Cliente<input name="nome" class="input" required maxlength="80"></label>
          <label class="label">WhatsApp<input name="fone" class="input" inputmode="tel" required oninput="this.value=U.mascaraFone(this.value)"></label>
          <label class="label">Data<input name="data" type="date" class="input" required value="${S.dia}"></label>
          <label class="label">Hora<input name="hora" type="time" class="input" required step="300"></label>
        </div>
        <label class="label">Profissional<select name="prof" class="input" ${profs.length === 1 ? 'disabled' : ''}>${profs.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label>
        <fieldset class="grid gap-2"><legend class="text-sm font-medium mb-1">Serviços</legend>
          ${S.servicos.filter((s) => s.ativo).map((s) => `<label class="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm"><input type="checkbox" name="serv" value="${s.id}" class="w-4 h-4"><span class="flex-1">${esc(s.nome)}</span><span class="text-muted">${fmtDur(s.duracao_min)} · ${brl(s.preco)}</span></label>`).join('')}
        </fieldset>
        <label class="label">Observação<textarea name="obs" rows="2" class="input" maxlength="500"></textarea></label>`,
      async aoSalvar(f) {
        const ids = $$('input[name="serv"]:checked', f).map((i) => i.value);
        if (f.nome.value.trim().length < 2) throw new Error('Informe o nome do cliente.');
        if (soDigitos(f.fone.value).length < 10) throw new Error('Informe o WhatsApp com DDD.');
        if (!f.data.value || !f.hora.value) throw new Error('Informe data e hora.');
        if (!ids.length) throw new Error('Escolha pelo menos um serviço.');
        const { error } = await sb.rpc('agendar_pelo_painel', {
          p_profissional: f.prof.value, p_servicos: ids, p_inicio: localParaISO(f.data.value, f.hora.value, fuso()),
          p_nome: f.nome.value.trim(), p_whatsapp: f.fone.value, p_obs: f.obs.value.trim()
        });
        if (error) throw error;
        S.dia = f.data.value; toast('Agendamento criado.'); abaAgenda();
      }
    });
  }

  /* =================================================================
     6b. FINANCEIRO (semana, mês, por profissional)
     ================================================================= */
  function periodo(chave) {
    const hoje = parseISO(isoDate(new Date()));
    const d = (dt, n) => isoDate(new Date(dt.getTime() + n * 86400000 + 43200000));
    const seg = (dt) => d(dt, -((dt.getDay() + 6) % 7));            // semana começa na segunda
    const mesIni = (y, m) => isoDate(new Date(y, m, 1));
    switch (chave) {
      case 'hoje': return [isoDate(hoje), d(hoje, 1)];
      case 'semana': return [seg(hoje), d(parseISO(seg(hoje)), 7)];
      case 'semana_passada': return [d(parseISO(seg(hoje)), -7), seg(hoje)];
      case 'mes': return [mesIni(hoje.getFullYear(), hoje.getMonth()), mesIni(hoje.getFullYear(), hoje.getMonth() + 1)];
      case 'mes_passado': return [mesIni(hoje.getFullYear(), hoje.getMonth() - 1), mesIni(hoje.getFullYear(), hoje.getMonth())];
      default: return [S.perIni, d(parseISO(S.perFim), 1)];
    }
  }
  const fmtData = (iso) => parseISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const barras = (itens, rotulo, valor, texto) => {
    const max = Math.max(...itens.map(valor), 0) || 1;
    return `<ul class="grid gap-3">${itens.map((x) => `
      <li title="${esc(rotulo(x))}: ${esc(texto(x))}">
        <div class="flex justify-between gap-3 text-sm"><span class="truncate">${esc(rotulo(x))}</span><span class="font-semibold shrink-0">${esc(texto(x))}</span></div>
        <div class="mt-1 h-2 rounded-full bg-line/60"><div class="h-2 rounded-full bg-brand" style="width:${Math.max(2, (valor(x) / max) * 100)}%"></div></div>
      </li>`).join('')}</ul>`;
  };

  async function abaFinanceiro() {
    S.per = S.per || 'mes';
    if (!S.perIni) { S.perIni = isoDate(new Date()); S.perFim = isoDate(new Date()); }
    const [di, df] = periodo(S.per);
    const { data: r, error } = await sb.rpc('relatorio', { p_ini: localParaISO(di, '00:00', fuso()), p_fim: localParaISO(df, '00:00', fuso()) });
    if (S.aba !== 'financeiro') return;
    if (error) { $('#conteudo').innerHTML = vazio(esc(msgErro(error))); return; }
    S.relatorio = { r, di, df };
    const prof = r.papel === 'profissional', R = r.resumo;
    const liquido = R.faturado - R.comissoes, ticket = R.atendimentos ? R.faturado / R.atendimentos : 0;
    const fimVis = isoDate(new Date(parseISO(df).getTime() - 43200000));
    const PER = [['hoje', 'Hoje'], ['semana', 'Esta semana'], ['semana_passada', 'Semana passada'], ['mes', 'Este mês'], ['mes_passado', 'Mês passado'], ['outro', 'Escolher datas']];
    const card = (t, v, extra = '') => `<div class="card p-4"><p class="text-xs text-muted">${t}</p><p class="text-xl md:text-2xl font-bold ${extra}">${v}</p></div>`;

    $('#conteudo').innerHTML = cabecalho(prof ? 'Meus ganhos' : 'Financeiro',
      prof ? 'Seus atendimentos concluídos e sua comissão no período.' : 'Considera só os atendimentos marcados como concluídos. A comissão é calculada pelas regras da aba Comissões.',
      `<button data-acao="csv" class="btn btn-ghost"><i data-lucide="download" class="w-4 h-4"></i>Baixar planilha</button>`) + `
      <div class="flex gap-2 overflow-x-auto no-scrollbar">${PER.map(([k, t]) => `<button data-acao="periodo" data-p="${k}" class="chip ${S.per === k ? 'chip-on' : ''}">${t}</button>`).join('')}</div>
      ${S.per === 'outro' ? `<div class="mt-3 card p-3 flex flex-wrap items-end gap-3">
          <label class="label">De<input type="date" class="input !py-2" value="${S.perIni}" data-acao-change="per-ini"></label>
          <label class="label">Até<input type="date" class="input !py-2" value="${S.perFim}" data-acao-change="per-fim"></label></div>` : ''}
      <p class="mt-3 text-sm text-muted">Período: <b class="text-ink">${fmtData(di)} a ${fmtData(fimVis)}</b></p>
      <div class="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${card(prof ? 'Faturado por mim' : 'Faturado', reais(R.faturado), 'text-green-600')}
        ${card(prof ? 'Minha comissão' : 'Comissões a pagar', reais(R.comissoes), prof ? 'text-brand' : '')}
        ${prof ? card('Atendimentos', R.atendimentos) : card('Líquido do negócio', reais(liquido))}
        ${card(prof ? 'Ticket médio' : 'Atendimentos', prof ? reais(ticket) : R.atendimentos)}
        ${prof ? '' : card('Ticket médio', reais(ticket))}
        ${card('A realizar no período', reais(R.previsto))}
        ${card('Faltas', R.faltas, R.faltas ? 'text-amber-700' : '')}
        ${prof ? '' : card('Cancelados', R.cancelados)}
      </div>

      ${prof ? '' : `
      <div class="card mt-4 overflow-hidden">
        <p class="font-semibold p-4 pb-2">Por profissional</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[36rem]">
            <thead class="text-left text-muted"><tr class="border-b border-line">
              <th class="p-3 font-medium">Profissional</th><th class="p-3 font-medium text-right">Atend.</th><th class="p-3 font-medium text-right">Faturado</th>
              <th class="p-3 font-medium text-right">Comissão</th><th class="p-3 font-medium text-right">Líquido</th><th class="p-3 font-medium text-right">Faltas</th><th class="p-3"></th></tr></thead>
            <tbody>${r.por_profissional.length ? r.por_profissional.map((p, i) => `
              <tr class="border-b border-line last:border-0">
                <td class="p-3 font-medium">${esc(p.nome)}</td><td class="p-3 text-right">${p.atendimentos}</td>
                <td class="p-3 text-right">${reais(p.faturado)}</td><td class="p-3 text-right font-semibold">${reais(p.comissao)}</td>
                <td class="p-3 text-right">${reais(p.faturado - p.comissao)}</td><td class="p-3 text-right">${p.faltas}</td>
                <td class="p-3 text-right"><button data-acao="fechamento" data-i="${i}" class="btn btn-wa btn-sm !py-1" title="Enviar fechamento pelo WhatsApp"><i data-lucide="send" class="w-3.5 h-3.5"></i>Fechamento</button></td>
              </tr>`).join('') : '<tr><td colspan="7" class="p-6 text-center text-muted">Nenhum atendimento no período.</td></tr>'}
            </tbody>
            ${r.por_profissional.length > 1 ? `<tfoot class="font-semibold"><tr class="border-t border-line"><td class="p-3">Total</td><td class="p-3 text-right">${R.atendimentos}</td><td class="p-3 text-right">${reais(R.faturado)}</td><td class="p-3 text-right">${reais(R.comissoes)}</td><td class="p-3 text-right">${reais(liquido)}</td><td class="p-3 text-right">${R.faltas}</td><td></td></tr></tfoot>` : ''}
          </table>
        </div>
      </div>`}

      <div class="mt-4 grid lg:grid-cols-3 gap-4">
        <div class="card p-4"><p class="font-semibold mb-3">Por forma de pagamento</p>${r.por_forma.length ? barras(r.por_forma, (x) => FORMAS[x.forma] || x.forma, (x) => Number(x.valor), (x) => `${reais(x.valor)} · ${x.qtd}x`) : '<p class="text-sm text-muted">Sem dados.</p>'}</div>
        <div class="card p-4"><p class="font-semibold mb-3">Serviços mais feitos</p>${r.por_servico.length ? barras(r.por_servico, (x) => x.nome, (x) => Number(x.qtd), (x) => `${x.qtd}x · ${reais(x.valor)}`) : '<p class="text-sm text-muted">Sem dados.</p>'}</div>
        <div class="card p-4"><p class="font-semibold mb-3">Faturamento por dia</p>${r.por_dia.length ? barras(r.por_dia, (x) => parseISO(x.dia).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }), (x) => Number(x.valor), (x) => reais(x.valor)) : '<p class="text-sm text-muted">Sem dados.</p>'}</div>
      </div>`;
    icons();
  }

  function baixarCSV() {
    const { r, di } = S.relatorio || {};
    if (!r) return;
    const n = (v) => Number(v || 0).toFixed(2).replace('.', ',');
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const linhas = [['Data', 'Hora', 'Cliente', 'Profissional', 'Serviços', 'Valor de tabela', 'Valor cobrado', 'Forma de pagamento', 'Comissão'].map(q).join(';')];
    r.itens.forEach((x) => linhas.push([new Date(x.inicio).toLocaleDateString('pt-BR', { timeZone: fuso() }), horaNoFuso(x.inicio, fuso()), x.cliente_nome, x.profissional_nome, x.servicos,
      n(x.valor_total), n(x.valor_cobrado), FORMAS[x.forma_pagamento] || '', n(x.comissao_valor)].map((v, i) => (i >= 5 && i !== 7 ? v : q(v))).join(';')));
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `financeiro-${S.neg.slug}-${di}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function enviarFechamento(i) {
    const { r, di, df } = S.relatorio;
    const p = r.por_profissional[i];
    const fimVis = isoDate(new Date(parseISO(df).getTime() - 43200000));
    const msg = `Fechamento ${S.neg.nome}\nPeríodo: ${fmtData(di)} a ${fmtData(fimVis)}\n\nProfissional: ${p.nome}\nAtendimentos: ${p.atendimentos}\nFaturado: ${reais(p.faturado)}\nComissão: ${reais(p.comissao)}${p.faltas ? `\nFaltas de clientes: ${p.faltas}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  /* =================================================================
     6c. COMISSÕES (tabela serviço x profissional)
     ================================================================= */
  async function abaComissoes() {
    const { data, error } = await sb.from('comissoes').select('*').eq('negocio_id', S.neg.id);
    if (S.aba !== 'comissoes') return;
    if (error) { $('#conteudo').innerHTML = vazio(esc(msgErro(error))); return; }
    const profs = S.profs.filter((p) => p.ativo), servs = S.servicos.filter((s) => s.ativo);
    const regra = (sv, pf) => data.find((c) => (c.servico_id || null) === sv && (c.profissional_id || null) === pf)?.percentual;
    const val = (v) => (v == null ? '' : Number(v));
    const efetivo = (sv, pf) => regra(sv, pf) ?? regra(sv, null) ?? regra(null, pf) ?? 0;
    const inp = (sv, pf, ph) => `<input type="number" min="0" max="100" step="0.5" inputmode="decimal" class="input !w-20 !px-2 !py-1.5 text-center" data-sv="${sv || ''}" data-pf="${pf || ''}" value="${val(regra(sv, pf))}" placeholder="${ph}" aria-label="Comissão em %">`;
    $('#conteudo').innerHTML = cabecalho('Comissões', 'Defina a porcentagem que cada profissional ganha. Ex.: corte masculino R$ 35 com 10% = R$ 3,50 de comissão.', '') + `
      <div class="card p-4 text-sm grid gap-1 mb-4">
        <p class="font-semibold">Como o sistema decide a porcentagem (da mais específica para a mais geral):</p>
        <p>1. <b>Célula serviço × profissional</b>: exceção só daquele profissional naquele serviço.</p>
        <p>2. <b>Padrão do serviço</b>: vale para todos que fazem o serviço.</p>
        <p>3. <b>Padrão do profissional</b>: usado nos serviços que não têm porcentagem própria.</p>
        <p class="text-muted">Campo vazio = usa a regra de baixo (o número cinza mostra o valor que será usado). A comissão fica gravada no momento do agendamento; mudar aqui não altera atendimentos já lançados.</p>
      </div>
      ${!profs.length || !servs.length ? vazio('Cadastre serviços e profissionais ativos primeiro.') : `
      <form id="f-comissoes" class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="text-sm w-full">
            <thead><tr class="border-b border-line text-left">
              <th class="p-3 font-medium min-w-[10rem]">Serviço</th>
              <th class="p-3 font-medium text-center bg-brand/5">Padrão do serviço</th>
              ${profs.map((p) => `<th class="p-3 font-medium text-center whitespace-nowrap">${esc(p.nome)}</th>`).join('')}
            </tr>
            <tr class="border-b border-line bg-page">
              <td class="p-3 text-muted">Padrão do profissional</td><td class="p-3 bg-brand/5"></td>
              ${profs.map((p) => `<td class="p-2 text-center">${inp(null, p.id, '0')}</td>`).join('')}
            </tr></thead>
            <tbody>${servs.map((s) => `
              <tr class="border-b border-line last:border-0">
                <td class="p-3"><p class="font-medium">${esc(s.nome)}</p><p class="text-xs text-muted">${brl(s.preco)}</p></td>
                <td class="p-2 text-center bg-brand/5">${inp(s.id, null, '–')}</td>
                ${profs.map((p) => `<td class="p-2 text-center">${inp(s.id, p.id, String(efetivo(s.id, p.id)).replace('.', ','))}</td>`).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="p-4 border-t border-line flex flex-wrap justify-between items-center gap-3">
          <p class="text-xs text-muted">Valores em %. Ex.: 10 = 10%.</p>
          <button class="btn btn-primary"><i data-lucide="save" class="w-4 h-4"></i>Salvar comissões</button>
        </div>
      </form>`}`;
    icons();
    const f = $('#f-comissoes');
    if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const linhas = [];
      for (const el of $$('input[data-sv]', f)) {
        if (el.value === '') continue;
        const v = Number(el.value);
        if (!(v >= 0 && v <= 100)) return toast('As porcentagens precisam estar entre 0 e 100.', 'erro');
        linhas.push({ negocio_id: S.neg.id, servico_id: el.dataset.sv || null, profissional_id: el.dataset.pf || null, percentual: v });
      }
      const btn = f.querySelector('.btn-primary'); btn.disabled = true;
      try {
        let x = await sb.from('comissoes').delete().eq('negocio_id', S.neg.id);
        if (x.error) throw x.error;
        if (linhas.length) { x = await sb.from('comissoes').insert(linhas); if (x.error) throw x.error; }
        toast('Comissões salvas. Valem para os próximos agendamentos.');
        abaComissoes();
      } catch (ex) { toast(msgErro(ex), 'erro'); btn.disabled = false; }
    };
  }

  /* =================================================================
     7. CADASTROS SIMPLES (serviços, equipe, depoimentos)
     ================================================================= */
  const CRUD = {
    servicos: {
      tabela: 'servicos', titulo: 'Serviços', texto: 'O que aparece na sua página, com duração e preço. A duração define quanto tempo da agenda fica reservado.',
      campos: [
        { k: 'nome', r: 'Nome do serviço', req: true },
        { k: 'descricao', r: 'Descrição curta', t: 'textarea', max: 200 },
        { k: 'duracao_min', r: 'Duração (minutos)', t: 'number', min: 5, max: 720, step: 5, padrao: 60, req: true },
        { k: 'preco', r: 'Preço (R$)', t: 'money', padrao: 0 },
        { k: 'categoria', r: 'Categoria', ph: 'Ex.: Cortes', max: 40 },
        { k: 'ordem', r: 'Ordem na lista', t: 'number', padrao: 0 },
        { k: 'ativo', r: 'Mostrar na página de agendamento', t: 'bool', padrao: true }
      ],
      linha: (s) => `<p class="font-semibold">${esc(s.nome)}${s.ativo ? '' : ' <span class="text-xs text-muted">(oculto)</span>'}</p><p class="text-sm text-muted">${fmtDur(s.duracao_min)} · ${brl(s.preco)}${s.categoria ? ` · ${esc(s.categoria)}` : ''}</p>`,
      aposSalvar: recarregarBase
    },
    equipe: {
      tabela: 'profissionais', titulo: 'Equipe', texto: 'Cada profissional tem a própria agenda: dois clientes podem marcar no mesmo horário com profissionais diferentes.',
      campos: [
        { k: 'nome', r: 'Nome', req: true, max: 60 },
        { k: 'funcao', r: 'Função', ph: 'Ex.: Cabeleireira', max: 60 },
        { k: 'ordem', r: 'Ordem na lista', t: 'number', padrao: 0 },
        { k: 'ativo', r: 'Atendendo (aparece na página)', t: 'bool', padrao: true }
      ],
      preparar: async () => {
        if (!temEquipe()) return {};
        const { data } = await sb.from('acessos').select('profissional_id, email').eq('negocio_id', S.neg.id);
        return Object.fromEntries((data || []).map((a) => [a.profissional_id, a.email]));
      },
      linha: (p, acessos) => `<p class="font-semibold">${esc(p.nome)}${p.ativo ? '' : ' <span class="text-xs text-muted">(inativo)</span>'}</p><p class="text-sm text-muted">${esc(p.funcao || '—')}</p>
        ${temEquipe() ? (acessos[p.id]
          ? `<p class="mt-2 text-xs flex flex-wrap items-center gap-2"><span class="rounded-full bg-green-500/10 text-green-700 px-2 py-0.5">Login: ${esc(acessos[p.id])}</span><button data-acao="remover-acesso" data-id="${p.id}" class="text-red-600 underline">remover acesso</button></p>`
          : `<button data-acao="convite" data-id="${p.id}" class="mt-2 btn btn-ghost btn-sm"><i data-lucide="key-round" class="w-4 h-4"></i>Dar acesso ao painel</button>`) : ''}`,
      aviso: (lista) => {
        const lim = { essencial: 1, equipe: 6 }[S.neg.plano], ativos = lista.filter((p) => p.ativo).length;
        return `<p>Plano <b class="text-ink">${PLANOS[S.neg.plano]}</b>: ${lim ? `${ativos} de ${lim} profissionais ativos` : `${ativos} profissionais ativos (sem limite)`}.</p>` +
          (temEquipe() ? '<p>Com <b class="text-ink">Dar acesso ao painel</b>, o profissional ganha login próprio e vê <b class="text-ink">só a agenda e os ganhos dele</b>. Ele não altera preços, equipe nem dados do negócio.</p>'
            : '<p>Login individual para profissionais faz parte do plano Equipe.</p>') +
          '<p>Para tirar alguém da agenda sem perder o histórico, desmarque "Atendendo" em vez de excluir.</p>';
      },
      aposSalvar: recarregarBase
    },
    depoimentos: {
      tabela: 'depoimentos', titulo: 'Depoimentos', texto: 'Use só depoimentos reais, com autorização da cliente. Se não houver nenhum, a seção some da página.',
      campos: [
        { k: 'texto', r: 'Depoimento', t: 'textarea', req: true, max: 400 },
        { k: 'autor', r: 'Nome da cliente', req: true, max: 60 },
        { k: 'detalhe', r: 'Serviço feito', ph: 'Ex.: Coloração', max: 60 },
        { k: 'ordem', r: 'Ordem', t: 'number', padrao: 0 }
      ],
      linha: (d) => `<p class="text-sm">“${esc(d.texto)}”</p><p class="text-sm text-muted mt-1">— ${esc(d.autor)}${d.detalhe ? ` · ${esc(d.detalhe)}` : ''}</p>`
    }
  };

  async function abaCrud(def) {
    const aba = S.aba;
    const { data, error } = await sb.from(def.tabela).select('*').eq('negocio_id', S.neg.id).order('ordem').order(def.tabela === 'depoimentos' ? 'autor' : 'nome');
    const extra = def.preparar ? await def.preparar(data) : null;
    if (S.aba !== aba) return;
    if (error) { $('#conteudo').innerHTML = vazio(esc(msgErro(error))); return; }
    const aviso = typeof def.aviso === 'function' ? def.aviso(data, extra) : def.aviso;
    $('#conteudo').innerHTML = cabecalho(def.titulo, def.texto, `<button data-acao="crud-novo" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i>Adicionar</button>`) +
      (aviso ? `<div class="text-sm text-muted mb-4 grid gap-1">${aviso}</div>` : '') +
      `<div class="grid sm:grid-cols-2 gap-3">${data.length ? data.map((row) => `
        <div class="card p-4 flex items-start justify-between gap-3">
          <div class="min-w-0">${def.linha(row, extra)}</div>
          <div class="flex gap-1 shrink-0">
            <button data-acao="crud-editar" data-id="${row.id}" class="btn btn-ghost !p-2" aria-label="Editar"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button data-acao="crud-apagar" data-id="${row.id}" class="btn btn-danger !p-2" aria-label="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </div>`).join('') : vazio('Nada cadastrado ainda.')}</div>`;
    icons();
    const abrir = (row) => modal({
      titulo: `${row ? 'Editar' : 'Adicionar'} — ${def.titulo}`,
      corpo: def.campos.map((c) => campo(c, row?.[c.k])).join(''),
      async aoSalvar(f) {
        const v = lerCampos(f, def.campos);
        const { error: e } = row
          ? await sb.from(def.tabela).update(v).eq('id', row.id)
          : await sb.from(def.tabela).insert({ ...v, negocio_id: S.neg.id });
        if (e) throw e;
        toast('Salvo.');
        if (def.aposSalvar) await def.aposSalvar();
        abaCrud(def);
      }
    });
    CRUD._atual = { def, data, abrir };
  }
  async function crudApagar(id) {
    const { def } = CRUD._atual;
    if (!confirma('Excluir este item? Não dá para desfazer.')) return;
    const { error } = await sb.from(def.tabela).delete().eq('id', id);
    if (error) return toast(msgErro(error), 'erro');
    toast('Excluído.');
    if (def.aposSalvar) await def.aposSalvar();
    abaCrud(def);
  }

  /* =================================================================
     8. HORÁRIOS DE FUNCIONAMENTO
     ================================================================= */
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  async function abaHorarios() {
    const { data, error } = await sb.from('horarios').select('*').eq('negocio_id', S.neg.id).order('abre');
    if (error) { $('#conteudo').innerHTML = vazio(esc(msgErro(error))); return; }
    const porDia = DIAS.map((_, d) => data.filter((h) => h.dia_semana === d).map((h) => [h.abre.slice(0, 5), h.fecha.slice(0, 5)]));
    const faixa = (d, a = '09:00', f = '18:00') => `
      <div class="flex flex-wrap items-center gap-2" data-faixa="${d}">
        <input type="time" class="input !w-[8.5rem] !px-3 !py-2" value="${a}" data-k="abre" step="300"> <span class="text-muted">até</span>
        <input type="time" class="input !w-[8.5rem] !px-3 !py-2" value="${f}" data-k="fecha" step="300">
        <button type="button" data-acao="faixa-remover" class="btn btn-ghost !p-2" aria-label="Remover faixa"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>`;
    const op = (vals, atual, fmt) => vals.map((v) => `<option value="${v}" ${v === atual ? 'selected' : ''}>${fmt(v)}</option>`).join('');
    $('#conteudo').innerHTML = cabecalho('Horários', 'Quando sua agenda aceita reservas. Use duas faixas no mesmo dia para fazer pausa de almoço.') + `
      <form id="f-horarios" class="grid gap-4">
        <div class="card divide-y divide-line">
          ${DIAS.map((nome, d) => `
            <div class="p-4 flex flex-wrap items-start gap-4">
              <label class="w-28 flex items-center gap-2 font-medium pt-2"><input type="checkbox" data-dia="${d}" class="w-5 h-5" ${porDia[d].length ? 'checked' : ''}>${nome}</label>
              <div class="flex-1 min-w-[17rem] grid gap-2" data-faixas="${d}">
                ${porDia[d].map(([a, f]) => faixa(d, a, f)).join('') || '<p class="text-sm text-muted pt-2">Fechado</p>'}
                <button type="button" data-acao="faixa-add" data-d="${d}" class="text-sm text-brand justify-self-start ${porDia[d].length ? '' : 'hidden'}">+ adicionar faixa</button>
              </div>
            </div>`).join('')}
        </div>
        <div class="card p-4 grid sm:grid-cols-3 gap-4">
          <label class="label">Intervalo entre horários<select name="intervalo_min" class="input">${op([10, 15, 20, 30, 45, 60], S.neg.intervalo_min, (v) => `A cada ${v} min`)}</select></label>
          <label class="label">Antecedência mínima<select name="antecedencia_min" class="input">${op([0, 30, 60, 120, 240, 720, 1440], S.neg.antecedencia_min, (v) => (v === 0 ? 'Sem mínimo' : v < 60 ? `${v} min` : v < 1440 ? `${v / 60} h` : '1 dia'))}</select></label>
          <label class="label">Aceitar reservas até<select name="dias_a_frente" class="input">${op([7, 14, 30, 60, 90], S.neg.dias_a_frente, (v) => `${v} dias à frente`)}</select></label>
        </div>
        <div class="flex justify-end"><button class="btn btn-primary"><i data-lucide="save" class="w-4 h-4"></i>Salvar horários</button></div>
      </form>`;
    icons();
    const f = $('#f-horarios');
    f.addEventListener('change', (e) => {
      const d = e.target.dataset.dia;
      if (d === undefined) return;
      const box = $(`[data-faixas="${d}"]`);
      $$('[data-faixa], p', box).forEach((x) => x.remove());
      const add = $('[data-acao="faixa-add"]', box);
      if (e.target.checked) { add.insertAdjacentHTML('beforebegin', faixa(d)); add.classList.remove('hidden'); }
      else { add.insertAdjacentHTML('beforebegin', '<p class="text-sm text-muted pt-2">Fechado</p>'); add.classList.add('hidden'); }
      icons();
    });
    f.addEventListener('click', (e) => {
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      if (b.dataset.acao === 'faixa-add') { b.insertAdjacentHTML('beforebegin', faixa(b.dataset.d, '14:00', '18:00')); icons(); }
      if (b.dataset.acao === 'faixa-remover') b.closest('[data-faixa]').remove();
    });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const linhas = $$('[data-faixa]', f).map((el) => ({ negocio_id: S.neg.id, dia_semana: Number(el.dataset.faixa), abre: $('[data-k="abre"]', el).value, fecha: $('[data-k="fecha"]', el).value }))
        .filter((l) => $(`[data-dia="${l.dia_semana}"]`, f).checked);
      const ruim = linhas.find((l) => !l.abre || !l.fecha || l.fecha <= l.abre);
      if (ruim) return toast(`${DIAS[ruim.dia_semana]}: o horário de fechar precisa ser depois do de abrir.`, 'erro');
      const btn = f.querySelector('.btn-primary'); btn.disabled = true;
      try {
        let r = await sb.from('horarios').delete().eq('negocio_id', S.neg.id);
        if (r.error) throw r.error;
        if (linhas.length) { r = await sb.from('horarios').insert(linhas); if (r.error) throw r.error; }
        const cfg = { intervalo_min: Number(f.intervalo_min.value), antecedencia_min: Number(f.antecedencia_min.value), dias_a_frente: Number(f.dias_a_frente.value) };
        r = await sb.from('negocios').update(cfg).eq('id', S.neg.id);
        if (r.error) throw r.error;
        Object.assign(S.neg, cfg);
        toast('Horários salvos.');
      } catch (ex) { toast(msgErro(ex), 'erro'); }
      finally { btn.disabled = false; }
    };
  }

  /* =================================================================
     9. FOLGAS E BLOQUEIOS
     ================================================================= */
  async function abaFolgas() {
    const { data, error } = await sb.from('bloqueios').select('*').eq('negocio_id', S.neg.id).gte('fim', new Date().toISOString()).order('inicio');
    if (error) { $('#conteudo').innerHTML = vazio(esc(msgErro(error))); return; }
    const nomeP = (id) => (id ? S.profs.find((p) => p.id === id)?.nome || '—' : 'Todos');
    const fmt = (ts) => `${new Date(ts).toLocaleDateString('pt-BR', { timeZone: fuso(), day: '2-digit', month: '2-digit' })} ${horaNoFuso(ts, fuso())}`;
    $('#conteudo').innerHTML = cabecalho('Folgas e bloqueios', 'Feriado, férias, consulta médica, curso: bloqueie o período e ninguém consegue marcar nele.', `<button data-acao="folga-nova" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i>Bloquear período</button>`) +
      `<div class="grid gap-3">${data.length ? data.map((b) => `
        <div class="card p-4 flex items-center justify-between gap-3">
          <div><p class="font-semibold">${esc(b.motivo || 'Bloqueio')} · <span class="text-brand">${esc(nomeP(b.profissional_id))}</span></p><p class="text-sm text-muted">${fmt(b.inicio)} até ${fmt(b.fim)}</p></div>
          <button data-acao="folga-apagar" data-id="${b.id}" class="btn btn-danger !p-2" aria-label="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('') : vazio('Nenhum bloqueio programado.')}</div>`;
    icons();
  }
  function novaFolga() {
    const hoje = isoDate(new Date());
    modal({
      titulo: 'Bloquear período',
      corpo: `
        <label class="label">Quem<select name="prof" class="input"><option value="">Todos (o negócio fecha)</option>${S.profs.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label>
        <label class="label">Motivo<input name="motivo" class="input" maxlength="60" placeholder="Ex.: Feriado, férias, curso"></label>
        <label class="flex items-center gap-3 text-sm font-medium"><input type="checkbox" name="inteiro" class="w-5 h-5" checked onchange="this.form.querySelectorAll('[data-hora]').forEach(e=>e.classList.toggle('hidden',this.checked))">Dias inteiros</label>
        <div class="grid grid-cols-2 gap-4">
          <label class="label">De<input name="d1" type="date" class="input" value="${hoje}" required></label>
          <label class="label hidden" data-hora>Hora<input name="h1" type="time" class="input" value="12:00"></label>
          <label class="label">Até<input name="d2" type="date" class="input" value="${hoje}" required></label>
          <label class="label hidden" data-hora>Hora<input name="h2" type="time" class="input" value="14:00"></label>
        </div>`,
      ok: 'Bloquear',
      async aoSalvar(f) {
        const inteiro = f.inteiro.checked;
        const inicio = localParaISO(f.d1.value, inteiro ? '00:00' : f.h1.value, fuso());
        const fim = inteiro ? localParaISO(isoDate(new Date(parseISO(f.d2.value).getTime() + 86400000 * 1.5)), '00:00', fuso()) : localParaISO(f.d2.value, f.h2.value, fuso());
        if (new Date(fim) <= new Date(inicio)) throw new Error('O fim precisa ser depois do início.');
        const { error } = await sb.from('bloqueios').insert({ negocio_id: S.neg.id, profissional_id: f.prof.value || null, inicio, fim, motivo: f.motivo.value.trim() });
        if (error) throw error;
        toast('Período bloqueado.'); abaFolgas();
      }
    });
  }

  /* =================================================================
     10. PORTFÓLIO (fotos)
     ================================================================= */
  async function abaPortfolio() {
    const { data, error } = await sb.from('portfolio').select('*').eq('negocio_id', S.neg.id).order('ordem').order('id');
    if (error) { $('#conteudo').innerHTML = vazio(esc(msgErro(error))); return; }
    $('#conteudo').innerHTML = cabecalho('Portfólio', 'Fotos dos seus trabalhos. Elas são reduzidas automaticamente para carregar rápido no celular.', `
      <label class="btn btn-primary cursor-pointer"><i data-lucide="upload" class="w-4 h-4"></i>Enviar fotos<input type="file" accept="image/*" multiple class="sr-only" data-acao-change="upload"></label>`) +
      `<p class="text-sm text-muted mb-4" data-slot="upload-status"></p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">${data.length ? data.map((p) => `
        <div class="card overflow-hidden">
          <img src="${esc(p.img_url)}" alt="${esc(p.titulo)}" class="aspect-square w-full object-cover" loading="lazy">
          <div class="p-3 flex items-center justify-between gap-2">
            <div class="min-w-0"><p class="text-sm font-medium truncate">${esc(p.titulo || 'Sem título')}</p><p class="text-xs text-muted truncate">${esc(p.categoria)}</p></div>
            <div class="flex shrink-0">
              <button data-acao="foto-editar" data-id="${p.id}" class="p-1.5 text-muted hover:text-brand" aria-label="Editar"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-acao="foto-apagar" data-id="${p.id}" class="p-1.5 text-muted hover:text-red-600" aria-label="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
          </div>
        </div>`).join('') : `<div class="col-span-full">${vazio('Nenhuma foto ainda. Sem fotos, a seção de portfólio fica escondida na sua página.')}</div>`}</div>`;
    icons();
    abaPortfolio._dados = data;
  }
  function reduzir(arquivo, max = 1600) {
    return new Promise((ok, erro) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? ok(b) : erro(new Error('Não foi possível ler a imagem.'))), 'image/jpeg', 0.85);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => erro(new Error(`"${arquivo.name}" não é uma imagem válida.`));
      img.src = URL.createObjectURL(arquivo);
    });
  }
  async function enviarFotos(files) {
    const st = $('[data-slot="upload-status"]');
    let ok = 0;
    for (const [i, file] of [...files].entries()) {
      st.textContent = `Enviando ${i + 1} de ${files.length}…`;
      try {
        const blob = await reduzir(file);
        const caminho = `${S.neg.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const up = await sb.storage.from('portfolio').upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) throw up.error;
        const url = sb.storage.from('portfolio').getPublicUrl(caminho).data.publicUrl;
        const { error } = await sb.from('portfolio').insert({ negocio_id: S.neg.id, img_url: url, titulo: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').slice(0, 60), ordem: 0 });
        if (error) throw error;
        ok++;
      } catch (e) { toast(msgErro(e), 'erro'); }
    }
    toast(`${ok} foto(s) enviada(s). Clique no lápis para dar título e categoria.`);
    abaPortfolio();
  }
  function caminhoStorage(url) { const m = String(url).match(/\/object\/public\/portfolio\/(.+)$/); return m ? decodeURIComponent(m[1]) : null; }

  /* =================================================================
     11. MEU NEGÓCIO
     ================================================================= */
  function abaNegocio() {
    const n = S.neg, p = NICHOS[n.nicho] || NICHOS.salao;
    const corNicho = U.rgbParaHex(p.tema.brand);
    $('#conteudo').innerHTML = cabecalho('Meu negócio', 'Informações que aparecem na sua página de agendamento.') + `
      <form id="f-negocio" class="grid gap-4">
        <div class="card p-5 grid sm:grid-cols-2 gap-4">
          <label class="label">Nome<input name="nome" class="input" value="${esc(n.nome)}" maxlength="80" required></label>
          <label class="label">Tipo de negócio<select name="nicho" class="input">${Object.entries(NICHOS).map(([id, x]) => `<option value="${id}" ${id === n.nicho ? 'selected' : ''}>${x.emoji} ${esc(x.rotulo)}</option>`).join('')}</select><small>Define cores, fonte e textos padrão.</small></label>
          <label class="label">WhatsApp<input name="whatsapp" class="input" inputmode="tel" value="${esc(mascaraFone(n.whatsapp.replace(/^55(?=\d{10,11}$)/, '')))}" oninput="this.value=U.mascaraFone(this.value)" required></label>
          <label class="label">Instagram<input name="instagram" class="input" value="${esc(n.instagram)}" placeholder="@seuperfil" maxlength="60"></label>
          <label class="label">Endereço<input name="endereco" class="input" value="${esc(n.endereco)}" maxlength="120"></label>
          <label class="label">Cidade<input name="cidade" class="input" value="${esc(n.cidade)}" maxlength="60"></label>
          <label class="label sm:col-span-2">Link do Google Maps <small>(opcional)</small><input name="maps_url" class="input" value="${esc(n.maps_url)}" placeholder="https://maps.app.goo.gl/..." maxlength="300"></label>
          <label class="label sm:col-span-2">Texto de horário <small>(vazio = gerado automaticamente a partir da aba Horários)</small><input name="horario_texto" class="input" value="${esc(n.horario_texto)}" maxlength="120"></label>
        </div>
        <div class="card p-5 grid gap-4">
          <p class="font-semibold">Textos do topo da página <span class="text-sm font-normal text-muted">(vazio = texto padrão do nicho)</span></p>
          <label class="label">Selo<input name="hero_selo" class="input" value="${esc(n.hero_selo || '')}" placeholder="${esc(p.hero.selo)}" maxlength="60"></label>
          <label class="label">Título <small>Coloque *entre asteriscos* a parte que fica colorida.</small><input name="hero_titulo" class="input" value="${esc(n.hero_titulo || '')}" placeholder="${esc(p.hero.titulo)}" maxlength="90"></label>
          <label class="label">Subtítulo<textarea name="hero_subtitulo" class="input" rows="2" placeholder="${esc(p.hero.subtitulo)}" maxlength="220">${esc(n.hero_subtitulo || '')}</textarea></label>
        </div>
        <div class="card p-5 grid sm:grid-cols-2 gap-4 items-start">
          <div class="grid gap-2">
            <p class="font-semibold">Cor principal</p>
            <label class="flex items-center gap-3 text-sm"><input type="checkbox" name="usar_cor" class="w-5 h-5" ${n.cor_principal ? 'checked' : ''}>Usar a cor da marca do cliente</label>
            <input type="color" name="cor" value="${n.cor_principal || corNicho}" class="h-11 w-24 rounded-lg border border-line bg-transparent">
          </div>
          <div class="grid gap-2">
            <p class="font-semibold">Endereço do link</p>
            <input name="slug" class="input" value="${esc(n.slug)}" maxlength="60" oninput="this.value=U.slugify(this.value)">
            <p class="text-xs text-amber-700">Atenção: mudar isso quebra o link antigo (bio, QR Code impresso).</p>
          </div>
          <label class="flex items-center gap-3 text-sm font-medium sm:col-span-2"><input type="checkbox" name="ativo" class="w-5 h-5" ${n.ativo ? 'checked' : ''}>Página no ar (desmarque para pausar os agendamentos)</label>
          <div class="sm:col-span-2 rounded-xl bg-page border border-line p-3 text-sm flex flex-wrap items-center justify-between gap-2">
            <p>Seu plano: <b>${PLANOS[n.plano] || n.plano}</b>${n.plano === 'essencial' ? ' · 1 profissional' : n.plano === 'equipe' ? ' · até 6 profissionais com login individual e comissões' : ' · profissionais ilimitados'}</p>
            <a href="${waLink(CONFIG.produto.whatsapp, `Olá! Quero mudar o plano do ${n.nome}.`)}" target="_blank" rel="noopener" class="text-brand underline">Mudar de plano</a>
          </div>
        </div>
        <div class="flex justify-end"><button class="btn btn-primary"><i data-lucide="save" class="w-4 h-4"></i>Salvar</button></div>
      </form>`;
    icons();
    const f = $('#f-negocio');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector('.btn-primary');
      const v = {
        nome: f.nome.value.trim(), nicho: f.nicho.value, whatsapp: U.foneWa(f.whatsapp.value), instagram: f.instagram.value.trim().replace(/^@/, ''),
        endereco: f.endereco.value.trim(), cidade: f.cidade.value.trim(), maps_url: f.maps_url.value.trim(), horario_texto: f.horario_texto.value.trim(),
        hero_selo: f.hero_selo.value.trim() || null, hero_titulo: f.hero_titulo.value.trim() || null, hero_subtitulo: f.hero_subtitulo.value.trim() || null,
        cor_principal: f.usar_cor.checked ? f.cor.value : null, slug: f.slug.value, ativo: f.ativo.checked
      };
      if (v.nome.length < 2) return toast('Informe o nome.', 'erro');
      if (soDigitos(v.whatsapp).length < 12) return toast('Informe o WhatsApp com DDD.', 'erro');
      if (v.slug.length < 3) return toast('O endereço do link precisa ter pelo menos 3 letras.', 'erro');
      if (v.slug !== n.slug && !confirma('Mudar o endereço do link? O link antigo vai parar de funcionar.')) return;
      btn.disabled = true;
      const { data, error } = await sb.from('negocios').update(v).eq('id', n.id).select().single();
      btn.disabled = false;
      if (error) return toast(msgErro(error), 'erro');
      S.neg = data; montarApp(); S.aba = 'negocio'; toast('Salvo.');
    };
  }

  /* =================================================================
     12. DIVULGAR (link, QR Code e textos prontos)
     ================================================================= */
  function abaDivulgar() {
    const link = linkPublico();
    let qrSvg = '', qrPng = '';
    if (window.qrcode) {
      const qr = qrcode(0, 'M'); qr.addData(link); qr.make();
      qrSvg = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      qrPng = qr.createDataURL(10, 4);
    }
    const textos = [
      ['Bio do Instagram', `✨ Agende online, 24h, sem baixar app\n👇 ${link}`],
      ['Mensagem de saudação do WhatsApp Business', `Olá! Obrigada por chamar o ${S.neg.nome} 💜\n\nPara agendar na hora, escolha serviço, dia e horário por aqui:\n${link}\n\nSe preferir, é só mandar sua dúvida que respondemos assim que possível.`],
      ['Mensagem de ausência (fora do horário)', `Estamos fora do horário agora, mas você pode garantir seu horário a qualquer momento por aqui: ${link}`],
      ['Status / Stories', `Agenda aberta! 📅 Escolha seu horário em menos de 1 minuto: ${link}`]
    ];
    $('#conteudo').innerHTML = cabecalho('Divulgar', 'Seu link de agendamento e textos prontos para copiar.') + `
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 grid gap-4 min-w-0">
          <div class="card p-5">
            <p class="text-sm text-muted">Seu link</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <code class="flex-1 min-w-0 truncate rounded-xl bg-page border border-line px-3 py-2.5 text-sm">${esc(link)}</code>
              <button data-copiar="${esc(link)}" class="btn btn-primary"><i data-lucide="copy" class="w-4 h-4"></i>Copiar</button>
              <a href="${esc(link)}" target="_blank" rel="noopener" class="btn btn-ghost"><i data-lucide="external-link" class="w-4 h-4"></i>Abrir</a>
            </div>
          </div>
          ${textos.map(([t, txt]) => `
            <div class="card p-5">
              <div class="flex items-center justify-between gap-2"><p class="font-semibold min-w-0">${t}</p><button data-copiar="${esc(txt)}" class="btn btn-ghost btn-sm"><i data-lucide="copy" class="w-4 h-4"></i>Copiar</button></div>
              <pre class="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere] font-sans text-sm text-muted">${esc(txt)}</pre>
            </div>`).join('')}
          <div class="card p-5 text-sm">
            <p class="font-semibold">Como ativar a resposta automática no WhatsApp Business</p>
            <ol class="mt-2 list-decimal pl-5 grid gap-1 text-muted">
              <li>Abra o WhatsApp Business › Ferramentas comerciais › <b>Mensagem de saudação</b>.</li>
              <li>Ative, cole o texto de saudação acima e salve.</li>
              <li>Repita em <b>Mensagem de ausência</b> com o texto de fora do horário.</li>
            </ol>
            <p class="mt-2 text-muted">Pronto: quem chamar pela primeira vez já recebe o link para agendar.</p>
          </div>
        </div>
        <div class="card p-5 text-center self-start min-w-0">
          <p class="font-semibold">QR Code para o balcão</p>
          <div class="mx-auto mt-4 w-56 bg-white p-2 rounded-xl">${qrSvg}</div>
          ${qrPng ? `<a href="${qrPng}" download="qrcode-${esc(S.neg.slug)}.gif" class="btn btn-ghost mt-4"><i data-lucide="download" class="w-4 h-4"></i>Baixar imagem</a>` : ''}
          <p class="text-xs text-muted mt-3">Imprima e deixe no espelho, no balcão ou no cartão de visita.</p>
        </div>
      </div>`;
    icons();
  }

  /* =================================================================
     13. EVENTOS GERAIS
     ================================================================= */
  document.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copiar]');
    if (c) { try { await navigator.clipboard.writeText(c.dataset.copiar); toast('Copiado!'); } catch { toast('Não foi possível copiar.', 'erro'); } return; }
    const b = e.target.closest('[data-acao]');
    if (!b || b.closest('#f-horarios')) return;
    const d = b.dataset;
    switch (d.acao) {
      case 'sair': await sb.auth.signOut(); Object.assign(S, { neg: null, papel: 'dono', meuProf: null, aba: 'agenda', filtroProf: '' }); telaAuth('entrar'); break;
      case 'dia': S.dia = isoDate(new Date(parseISO(S.dia).getTime() + Number(d.d) * 86400000 + 43200000)); abaAgenda(); break;
      case 'hoje': S.dia = isoDate(new Date()); abaAgenda(); break;
      case 'atualizar': abaAgenda(); break;
      case 'filtro-prof': S.filtroProf = d.id; abaAgenda(); break;
      case 'novo-agendamento': novoAgendamento(); break;
      case 'status': {
        if (d.s === 'cancelado' && !confirma('Cancelar este agendamento? O horário volta a ficar livre.')) return;
        const { error } = await sb.rpc('mudar_status', { p_id: d.id, p_status: d.s });
        if (error) return toast(msgErro(error), 'erro');
        abaAgenda(); break;
      }
      case 'concluir': concluir(d.id); break;
      case 'periodo': S.per = d.p; abaFinanceiro(); break;
      case 'csv': baixarCSV(); break;
      case 'fechamento': enviarFechamento(Number(d.i)); break;
      case 'convite': {
        const p = S.profs.find((x) => x.id === d.id);
        const { data: cod, error } = await sb.rpc('gerar_convite', { p_profissional: d.id });
        if (error) return toast(msgErro(error), 'erro');
        const link = new URL(`./?convite=${cod}`, location.href.split(/[?#]/)[0]).href;
        const msg = `Olá, ${p.nome}! Criei seu acesso à agenda do ${S.neg.nome}.\n\n1. Abra: ${link}\n2. Crie sua conta com seu e-mail e uma senha.\n\nPronto: você vai ver sua agenda e seus ganhos. (Código: ${cod}, vale por 7 dias)`;
        modal({
          titulo: `Acesso para ${p.nome}`, ok: 'Fechar',
          corpo: `<p class="text-sm text-muted">Envie o link para ${esc(p.nome)}. Ao abrir, ele cria a conta com o próprio e-mail e já entra vendo <b>só a agenda e os ganhos dele</b>.</p>
            <div class="text-center rounded-2xl bg-brand/5 border border-brand/20 p-4"><p class="text-xs text-muted">Código de convite (vale 7 dias, uso único)</p><p class="font-mono text-3xl font-bold tracking-[.3em] text-brand mt-1">${cod}</p></div>
            <code class="block rounded-xl bg-page border border-line px-3 py-2.5 text-sm [overflow-wrap:anywhere]">${esc(link)}</code>
            <div class="grid sm:grid-cols-2 gap-2">
              <button type="button" data-copiar="${esc(link)}" class="btn btn-ghost"><i data-lucide="copy" class="w-4 h-4"></i>Copiar link</button>
              <a href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" class="btn btn-wa"><i data-lucide="send" class="w-4 h-4"></i>Enviar no WhatsApp</a>
            </div>`,
          async aoSalvar() {}
        });
        break;
      }
      case 'remover-acesso': {
        if (!confirma('Remover o login deste profissional? Ele deixa de ver a agenda na hora. O histórico de atendimentos continua.')) return;
        const { error } = await sb.from('acessos').delete().eq('profissional_id', d.id);
        if (error) return toast(msgErro(error), 'erro');
        toast('Acesso removido.'); abaCrud(CRUD.equipe); break;
      }
      case 'tenho-convite': {
        modal({
          titulo: 'Entrar na equipe', ok: 'Confirmar',
          corpo: '<p class="text-sm text-muted">Digite o código que o dono do negócio enviou para você.</p><label class="label">Código<input name="cod" class="input uppercase tracking-widest text-center text-xl" maxlength="6" required autocomplete="off"></label>',
          async aoSalvar(f) {
            const { error } = await sb.rpc('aceitar_convite', { p_codigo: f.cod.value });
            if (error) throw error;
            toast('Acesso liberado!'); setTimeout(carregarNegocio, 0);
          }
        });
        break;
      }
      case 'crud-novo': CRUD._atual.abrir(null); break;
      case 'crud-editar': CRUD._atual.abrir(CRUD._atual.data.find((r) => r.id === d.id)); break;
      case 'crud-apagar': crudApagar(d.id); break;
      case 'folga-nova': novaFolga(); break;
      case 'folga-apagar': {
        if (!confirma('Excluir este bloqueio?')) return;
        const { error } = await sb.from('bloqueios').delete().eq('id', d.id);
        if (error) return toast(msgErro(error), 'erro');
        abaFolgas(); break;
      }
      case 'foto-editar': {
        const p = abaPortfolio._dados.find((x) => x.id === d.id);
        const campos = [{ k: 'titulo', r: 'Título', max: 60 }, { k: 'categoria', r: 'Categoria', ph: 'Ex.: Cortes', max: 40, dica: 'Fotos com a mesma categoria viram um filtro na página.' }, { k: 'ordem', r: 'Ordem', t: 'number', padrao: 0 }];
        modal({ titulo: 'Editar foto', corpo: `<img src="${esc(p.img_url)}" class="w-full max-h-56 object-cover rounded-xl">` + campos.map((x) => campo(x, p[x.k])).join(''), async aoSalvar(f) {
          const { error } = await sb.from('portfolio').update(lerCampos(f, campos)).eq('id', p.id);
          if (error) throw error;
          abaPortfolio();
        } });
        break;
      }
      case 'foto-apagar': {
        const p = abaPortfolio._dados.find((x) => x.id === d.id);
        if (!confirma('Excluir esta foto?')) return;
        const cam = caminhoStorage(p.img_url);
        if (cam) await sb.storage.from('portfolio').remove([cam]);
        const { error } = await sb.from('portfolio').delete().eq('id', p.id);
        if (error) return toast(msgErro(error), 'erro');
        abaPortfolio(); break;
      }
    }
  });
  document.addEventListener('change', (e) => {
    const a = e.target.dataset.acaoChange;
    if (a === 'dia-escolhido' && e.target.value) { S.dia = e.target.value; abaAgenda(); }
    if ((a === 'per-ini' || a === 'per-fim') && e.target.value) {
      S[a === 'per-ini' ? 'perIni' : 'perFim'] = e.target.value;
      if (S.perFim < S.perIni) S.perFim = S.perIni;
      abaFinanceiro();
    }
    if (a === 'upload' && e.target.files.length) enviarFotos(e.target.files);
  });

  /* =================================================================
     14. INÍCIO
     ================================================================= */
  if (!U.configurado() || !sb) {
    mostrar('v-auth');
    $('#v-auth').innerHTML = `<div class="card p-6 max-w-md"><h1 class="font-semibold text-lg">Falta configurar o Supabase</h1><p class="text-muted text-sm mt-2">Abra <code>assets/config.js</code> e preencha <b>supabaseUrl</b> e <b>supabaseKey</b>. O passo a passo está no README.</p></div>`;
    return;
  }
  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'PASSWORD_RECOVERY') setTimeout(() => telaAuth('nova'), 0);
    if (evento === 'SIGNED_IN' && !S.neg && $('#v-auth').querySelector('#f-auth')) setTimeout(carregarUsuario, 0);
  });
  carregarUsuario().catch((e) => { toast(msgErro(e), 'erro'); telaAuth('entrar'); });
})();
