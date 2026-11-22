/* =====================================================================
   PAINEL.JS — área do dono do negócio.
   Login → (primeira vez) criar negócio → abas de gestão.
   ===================================================================== */
(() => {
  'use strict';
  const { $, $$, esc, brl, fmtDur, isoDate, parseISO, dataLonga, icons, horaNoFuso, dataNoFuso, localParaISO, mascaraFone, soDigitos, waLink, msgErro, toast, slugify } = U;
  const sb = U.sb();
  const S = { user: null, neg: null, papel: 'dono', meuProf: null, profs: [], servicos: [], aba: U.lsGet('aba', 'inicio'), dia: isoDate(new Date()), filtroProf: '' };
  let conviteURL = new URLSearchParams(location.search).get('convite');   // link de convite de profissional
  const fuso = () => S.neg?.fuso || 'America/Sao_Paulo';
  /* Nichos de pedido (marmitaria, passeios...) têm cardápio/pacotes em vez de agenda */
  const pedido = () => !!S.neg && ehPedido(S.neg.nicho);
  const L = () => nichoPorId(S.neg.nicho).loja;
  const linkPublico = () => new URL(`${pedido() ? 'loja' : 'agendar'}.html?n=${S.neg.slug}`, location.href).href;
  const mostrar = (id) => ['v-carregando', 'v-auth', 'v-app'].forEach((v) => $(`#${v}`).classList.toggle('hidden', v !== id));
  const confirma = (msg) => window.confirm(msg);

  document.title = `Painel · ${CONFIG.produto?.nome || 'Minha agenda'}`;

  /* =================================================================
     1. JANELA DE FORMULÁRIO (reaproveitada em todas as abas)
     ================================================================= */
  function modal({ titulo, corpo, ok = 'Salvar', aoSalvar, soFechar = false }) {
    const dlg = $('#modal'), form = $('#modal-form'), erro = $('[data-slot="modal-erro"]');
    $('[data-slot="modal-titulo"]').textContent = titulo;
    $('[data-slot="modal-corpo"]').innerHTML = corpo;
    $('[data-slot="modal-ok"]').textContent = ok;
    $('[data-slot="modal-cancelar"]').classList.toggle('hidden', soFechar);
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
      case 'moneyopc': return `<label class="label">${c.r}<input name="${c.k}" type="number" class="input" min="0" step="0.01" value="${v == null ? '' : esc(v)}">${c.dica ? `<small>${c.dica}</small>` : ''}</label>`;
      case 'opcoes': return `<label class="label">${c.r}<textarea name="${c.k}" rows="8" class="input font-mono text-sm" spellcheck="false" placeholder="${esc(c.ph || '')}">${esc(opcoesParaTexto(v))}</textarea><small>${c.dica || ''}</small></label>`;
      case 'foto': return `<div class="grid gap-2"><p class="text-sm font-semibold">${c.r}</p>
        <div class="flex items-center gap-3">${v ? `<img src="${esc(v)}" alt="" class="h-16 w-16 shrink-0 rounded-xl object-cover border border-line">` : '<span class="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">Sem foto</span>'}
        <input type="file" name="${c.k}_arquivo" accept="image/*" class="min-w-0 text-sm"></div>
        ${v ? `<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="${c.k}_remover" class="w-4 h-4">Remover a foto</label>` : ''}<small class="text-muted">${c.dica || 'A foto é reduzida automaticamente.'}</small></div>`;
      default: return `<label class="label">${c.r}<input ${base} class="input" maxlength="${c.max || 80}" value="${esc(val)}" ${c.ph ? `placeholder="${esc(c.ph)}"` : ''}>${c.dica ? `<small>${c.dica}</small>` : ''}</label>`;
    }
  }
  function lerCampos(form, campos) {
    const out = {};
    campos.forEach((c) => {
      const el = form.elements[c.k];
      if (c.t === 'foto') return;                       /* tratado em antesSalvar (envio do arquivo) */
      if (c.t === 'bool') out[c.k] = el.checked;
      else if (c.t === 'moneyopc') out[c.k] = el.value === '' ? null : Number(el.value);
      else if (c.t === 'opcoes') out[c.k] = textoParaOpcoes(el.value);
      else if (c.t === 'number' || c.t === 'money') out[c.k] = el.value === '' ? (c.padrao ?? 0) : Number(el.value);
      else out[c.k] = el.value.trim();
      if (c.req && (out[c.k] === '' || out[c.k] === null)) throw new Error(`Preencha "${c.r}".`);
    });
    return out;
  }

  /* Escolhas de um item (proteínas, guarnições, datas de saída...) em texto simples:
       Proteína (escolha 1)
       - Frango grelhado
       - Peixe frito + 3,00
       Guarnições (escolha de 1 a 3)
       - Arroz
       Adicionais (até 2)          ← opcional
       - Ovo frito + 2,00                                                  */
  const precoTxt = (n) => Number(n).toFixed(2).replace('.', ',');
  function regraTxt(g) {
    if (g.min === 0) return g.max === 1 ? 'opcional' : `até ${g.max}`;
    return g.min === g.max ? `escolha ${g.max}` : `escolha de ${g.min} a ${g.max}`;
  }
  function opcoesParaTexto(grupos) {
    if (!Array.isArray(grupos) || !grupos.length) return '';
    return grupos.map((g) => [`${g.titulo} (${regraTxt(g)})`, ...g.itens.map((o) => `- ${o.nome}${Number(o.preco) ? ` + ${precoTxt(o.preco)}` : ''}`)].join('\n')).join('\n\n');
  }
  function textoParaOpcoes(txt) {
    const grupos = [];
    String(txt || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((linha, i) => {
      if (/^[-•*]/.test(linha)) {
        const g = grupos[grupos.length - 1];
        if (!g) throw new Error(`Linha ${i + 1}: antes dos itens com "-", escreva o nome do grupo. Ex.: Proteína (escolha 1)`);
        const m = linha.replace(/^[-•*]\s*/, '').match(/^(.*?)(?:\s*\+\s*(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?))?$/i);
        const nome = m[1].trim().slice(0, 80);
        if (nome) g.itens.push(m[2] ? { nome, preco: Number(m[2].replace(',', '.')) } : { nome });
        return;
      }
      const r = linha.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      const titulo = (r ? r[1] : linha).trim().slice(0, 60);
      const regra = (r ? r[2] : 'escolha 1').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let min = 1, max = 1, x;
      if ((x = regra.match(/de\s*(\d+)\s*a\s*(\d+)/))) { min = +x[1]; max = +x[2]; }
      else if ((x = regra.match(/ate\s*(\d+)/))) { min = 0; max = +x[1]; }
      else if (/opcional/.test(regra)) { min = 0; max = 1; }
      else if ((x = regra.match(/(\d+)/))) { min = max = +x[1]; }
      if (!titulo) throw new Error(`Linha ${i + 1}: falta o nome do grupo.`);
      if (max < 1 || min > max) throw new Error(`"${titulo}": a regra "(${r ? r[2] : ''})" não faz sentido.`);
      grupos.push({ titulo, min, max, itens: [] });
    });
    grupos.forEach((g) => {
      if (!g.itens.length) throw new Error(`"${g.titulo}" está sem itens. Coloque cada opção numa linha começando com "-".`);
      if (g.min > g.itens.length) throw new Error(`"${g.titulo}" pede ${g.min} escolha(s), mas só tem ${g.itens.length} opção(ões).`);
      g.max = Math.min(g.max, g.itens.length);
    });
    if (grupos.length > 8) throw new Error('Use no máximo 8 grupos de escolha por item.');
    return grupos;
  }

  /* =================================================================
     2. LOGIN, CADASTRO E RECUPERAÇÃO DE SENHA
     ================================================================= */
  /* Tela dividida: marca à esquerda (computador), formulário à direita */
  const moldura = (conteudo, largo = false) => `
    <div class="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div class="relative hidden overflow-hidden bg-brand p-12 text-brand-contrast lg:flex lg:flex-col lg:justify-between">
        <a href="index.html" class="flex items-center gap-2.5 font-display text-xl font-extrabold"><span class="grid h-9 w-9 place-items-center rounded-[.7rem] bg-brand-contrast text-brand"><i data-lucide="calendar-check-2" class="h-5 w-5"></i></span>${esc(CONFIG.produto?.nome || 'MinhaAgenda')}</a>
        <p class="relative max-w-md font-display text-5xl font-extrabold leading-[1.02]">Agenda, equipe e dinheiro do dia, no seu bolso.</p>
        <div aria-hidden="true" class="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-blush/40 blur-3xl"></div>
        <p class="relative text-sm opacity-75">Seus clientes marcam pelo link. Você acompanha tudo aqui.</p>
      </div>
      <div class="flex items-center justify-center p-4 sm:p-8">
        <div class="w-full ${largo ? 'max-w-2xl' : 'max-w-sm'}">
          <a href="index.html" class="mb-8 flex items-center gap-2.5 font-display text-xl font-extrabold lg:hidden"><span class="grid h-9 w-9 place-items-center rounded-[.7rem] bg-brand text-brand-contrast"><i data-lucide="calendar-check-2" class="h-5 w-5"></i></span>${esc(CONFIG.produto?.nome || 'MinhaAgenda')}</a>
          ${conteudo}
        </div>
      </div>
    </div>`;

  function telaAuth(modo = 'entrar', aviso = '') {
    mostrar('v-auth');
    const titulos = { entrar: 'Entrar no painel', criar: 'Criar conta', recuperar: 'Recuperar senha', nova: 'Criar nova senha' };
    $('#v-auth').innerHTML = moldura(`
        <form id="f-auth" class="grid gap-4" novalidate>
          <h1 class="font-display text-3xl font-bold">${titulos[modo]}</h1>
          ${aviso ? `<p class="text-sm rounded-xl bg-brand/10 text-brand p-3">${esc(aviso)}</p>` : ''}
          ${conviteURL && (modo === 'entrar' || modo === 'criar') ? `<p class="text-sm rounded-xl bg-ok/10 text-ok p-3">Você recebeu um convite para a equipe (código <b>${esc(conviteURL)}</b>). ${modo === 'criar' ? 'Crie sua conta com seu e-mail' : 'Entre ou crie sua conta'} e o acesso é liberado na hora.</p>` : ''}
          ${modo !== 'nova' ? '<label class="label">E-mail<input name="email" type="email" class="input" autocomplete="email" required></label>' : ''}
          ${modo !== 'recuperar' ? `<label class="label">${modo === 'nova' ? 'Nova senha' : 'Senha'}<input name="senha" type="password" class="input" minlength="${modo === 'entrar' ? 6 : 8}" autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}" required>${modo !== 'entrar' ? '<small>Pelo menos 8 caracteres, com letras e números.</small>' : ''}</label>` : ''}
          <p class="text-sm text-bad hidden" data-slot="auth-erro"></p>
          <button class="btn btn-primary !min-h-[3.25rem]">${{ entrar: 'Entrar', criar: 'Criar conta', recuperar: 'Enviar link', nova: 'Salvar senha' }[modo]}</button>
          <div class="flex justify-between text-sm text-muted">
            ${modo === 'entrar' ? '<button type="button" data-auth="criar" class="hover:text-brand">Criar conta</button><button type="button" data-auth="recuperar" class="hover:text-brand">Esqueci a senha</button>' : '<button type="button" data-auth="entrar" class="hover:text-brand">← Voltar para entrar</button>'}
          </div>
        </form>`);
    icons();
    $('#f-auth').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('button.btn-primary'), err = $('[data-slot="auth-erro"]');
      const email = f.email?.value.trim(), senha = f.senha?.value;
      err.classList.add('hidden');
      if (modo !== 'entrar' && modo !== 'recuperar' && (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha))) {
        err.textContent = 'Use pelo menos 8 caracteres, misturando letras e números.'; err.classList.remove('hidden'); return;
      }
      btn.disabled = true;
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
    $('#v-auth').innerHTML = moldura(`
      <form id="f-neg" class="grid gap-5" novalidate>
        <div>
          <h1 class="font-display text-3xl font-bold md:text-4xl">Vamos criar a página do seu negócio</h1>
          <p class="text-muted mt-2">Escolha o tipo de negócio: já deixamos serviços, equipe e horários de exemplo para você só ajustar.</p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${Object.entries(NICHOS).map(([id, n], i) => `
            <label class="cursor-pointer">
              <input type="radio" name="nicho" value="${id}" class="peer sr-only" ${i === 0 ? 'checked' : ''}>
              <span class="flex flex-col items-center gap-1 rounded-2xl border border-line p-3 text-center text-xs font-semibold peer-checked:border-brand peer-focus-visible:ring-4 peer-checked:bg-brand/5 peer-checked:ring-2 peer-checked:ring-brand/30">
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
        <p class="text-sm text-bad hidden" data-slot="neg-erro"></p>
        <div class="flex flex-wrap justify-between gap-2">
          <button type="button" data-acao="sair" class="btn btn-ghost">Sair</button>
          <button type="button" data-acao="tenho-convite" class="btn btn-ghost"><i data-lucide="ticket" class="w-4 h-4"></i>Sou profissional e tenho um código</button>
          <button class="btn btn-primary">Criar minha página<i data-lucide="arrow-right" class="w-4 h-4"></i></button>
        </div>
      </form>`, true);
    icons();
    const f = $('#f-neg');
    let slugMexido = false;
    const previa = () => { $('[data-slot="previa-link"]').textContent = new URL(`agendar.html?n=${f.slug.value || 'seu-negocio'}`, location.href).href; };
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
        const extra = p.modo === 'pedido'
          ? { faz_entrega: p.loja.entrega, taxa_entrega: p.loja.taxa, pedido_minimo: p.loja.minimo, formas_pagamento: p.loja.pagamentos, prazo_entrega: p.loja.prazo }
          : {};
        const { data: neg, error } = await sb.from('negocios').insert({
          slug: f.slug.value, nome: f.nome.value.trim(), nicho, whatsapp: U.foneWa(f.whatsapp.value), cidade: f.cidade.value.trim(), ...extra
        }).select().single();
        if (error) throw error;
        const id = neg.id;
        /* só as colunas do banco (figura e cor são só da demonstração) */
        const servico = (x, i) => {
          const o = { negocio_id: id, nome: x.nome, descricao: x.descricao, duracao_min: x.duracao_min, preco: x.preco, categoria: x.categoria, ordem: i };
          if (x.opcoes) o.opcoes = x.opcoes;
          if (x.preco_de) o.preco_de = x.preco_de;
          if (x.selo) o.selo = x.selo;
          return o;
        };
        const r = await Promise.all([
          p.profissionais.length ? sb.from('profissionais').insert(p.profissionais.map((x, i) => ({ negocio_id: id, nome: x.nome, funcao: x.funcao, ordem: i }))) : { error: null },
          sb.from('servicos').insert(p.servicos.map(servico)),
          sb.from('horarios').insert(p.horarios.map(([dia_semana, abre, fecha]) => ({ negocio_id: id, dia_semana, abre, fecha })))
        ]);
        const falha = r.find((x) => x.error);
        if (falha) toast('Negócio criado, mas parte dos exemplos não foi copiada. Cadastre pelo painel.', 'erro');
        S.aba = 'divulgar';
        await carregarNegocio();
        toast(p.modo === 'pedido' ? `Página criada! Ajuste ${p.loja.itens}, preços e horários.` : 'Página criada! Ajuste serviços, equipe e horários.');
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
    if (S.papel === 'prof') return [
      ['Principal', [['inicio', 'Início', 'layout-dashboard'], ['agenda', 'Minha agenda', 'calendar-days'], ['clientes', 'Meus clientes', 'contact'], ['financeiro', 'Meus ganhos', 'wallet']]],
      ['Página', [['divulgar', 'Divulgar', 'share-2']]]
    ];
    if (pedido()) return [
      ['Principal', [['inicio', 'Início', 'layout-dashboard'], ['pedidos', L().acao === 'reserva' ? 'Reservas' : 'Pedidos', 'bell-ring'], ['servicos', L().aba, L().icone], ['negocio', 'Meu negócio', 'store']]],
      ['Sua página', [['horarios', 'Horários', 'clock'], ['divulgar', 'Divulgar', 'share-2']]]
    ];
    return [
      ['Principal', [['inicio', 'Início', 'layout-dashboard'], ['agenda', 'Agenda', 'calendar-days'], ['clientes', 'Clientes', 'contact'], ['financeiro', 'Financeiro', 'wallet']]],
      ['Cadastros', [['servicos', 'Serviços', 'scissors'], ['equipe', 'Equipe', 'users'], ...(temEquipe() ? [['comissoes', 'Comissões', 'percent']] : []), ['horarios', 'Horários', 'clock'], ['folgas', 'Folgas', 'calendar-off']]],
      ['Sua página', [['portfolio', 'Portfólio', 'image'], ['depoimentos', 'Depoimentos', 'message-square-quote'], ['negocio', 'Meu negócio', 'store'], ['divulgar', 'Divulgar', 'share-2']]]
    ];
  }
  const todasAbas = () => abasVisiveis().flatMap(([, itens]) => itens);
  function montarApp() {
    mostrar('v-app');
    $$('[data-slot="emoji"]').forEach((el) => { el.textContent = nichoPorId(S.neg.nicho).emoji; });
    const eu = S.profs.find((p) => p.id === S.meuProf);
    $$('[data-slot="nome-negocio"]').forEach((el) => { el.textContent = S.neg.nome; });
    $('[data-slot="papel"]').textContent = S.papel === 'prof' ? `Profissional: ${eu?.nome || ''}` : `Plano ${PLANOS[S.neg.plano] || ''}`;
    $$('[data-slot="link-publico"]').forEach((a) => { a.href = linkPublico(); });
    atualizarRotuloTema();
    if (!todasAbas().some(([k]) => k === S.aba)) S.aba = 'inicio';
    abrirAba(S.aba);
    iniciarVigia();
  }
  function abrirAba(id) {
    S.aba = id; U.lsSet('aba', id);
    const item = ([k, r, ic], estilo) => `<button type="button" data-aba="${k}" aria-current="${k === id ? 'page' : 'false'}" class="${estilo(k === id)}"><i data-lucide="${ic}" class="h-5 w-5 shrink-0"></i><span class="truncate">${r}</span></button>`;
    $('[data-slot="nav-lateral"]').innerHTML = abasVisiveis().map(([grupo, itens]) => `
      <p class="px-3 pb-1 pt-4 text-xs font-bold text-white/45">${grupo}</p>
      ${itens.map((x) => item(x, (on) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${on ? 'bg-brand text-brand-contrast shadow-lg shadow-black/20' : 'text-white/75 hover:bg-white/10 hover:text-white'}`)).join('')}`).join('');
    const principais = abasVisiveis()[0][1], emPrincipal = principais.some(([k]) => k === id);
    const curto = ([k, r, ic]) => [k, r.replace(/^(Minha|Meus) (.)/, (_, __, c) => c.toUpperCase()), ic];
    $('[data-slot="nav-inferior"]').innerHTML = principais.map(curto).map((x) => item(x, (on) => `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold ${on ? 'text-brand' : 'text-muted'}`)).join('') +
      `<button type="button" data-acao="mais" class="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold ${emPrincipal ? 'text-muted' : 'text-brand'}"><i data-lucide="menu" class="h-5 w-5"></i>Mais</button>`;
    $('[data-slot="nav-mais"]').innerHTML = abasVisiveis().slice(1).map(([grupo, itens]) => `
      <p class="px-3 pb-1 pt-3 text-xs font-bold text-muted">${grupo}</p>
      <div class="grid grid-cols-2 gap-1">${itens.map((x) => item(x, (on) => `flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${on ? 'bg-brand text-brand-contrast' : 'hover:bg-sunken'}`)).join('')}</div>`).join('');
    $('#conteudo').innerHTML = '<div class="skeleton h-10 w-48"></div><div class="skeleton mt-6 h-40"></div>';
    icons();
    if ($('#mais').open) $('#mais').close();
    window.scrollTo({ top: 0 });
    if (pedido()) setTimeout(() => vigiarPedidos(), 0);
    ({ inicio: () => (pedido() ? abaInicioLoja() : abaInicio()), pedidos: abaPedidos, agenda: abaAgenda, clientes: abaClientes, financeiro: abaFinanceiro, servicos: () => abaCrud(pedido() ? CRUD.produtos() : CRUD.servicos), equipe: () => abaCrud(CRUD.equipe), comissoes: abaComissoes, horarios: abaHorarios, folgas: abaFolgas, portfolio: abaPortfolio, depoimentos: () => abaCrud(CRUD.depoimentos), negocio: abaNegocio, divulgar: abaDivulgar })[id]();
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b) abrirAba(b.dataset.aba); });

  /* Modo escuro */
  const escuro = () => document.documentElement.getAttribute('data-tema') === 'escuro';
  function atualizarRotuloTema() { $('[data-slot="tema-rotulo"]').textContent = escuro() ? 'Modo claro' : 'Modo escuro'; }
  function alternarTema() {
    if (escuro()) document.documentElement.removeAttribute('data-tema'); else document.documentElement.setAttribute('data-tema', 'escuro');
    U.lsSet('tema', escuro() ? 'escuro' : 'claro');
    atualizarRotuloTema();
  }

  $('#mais').addEventListener('click', (e) => { if (e.target.id === 'mais') e.target.close(); });

  /* Máscaras e alternâncias sem JavaScript dentro do HTML (exigência da política de segurança) */
  document.addEventListener('input', (e) => {
    const m = e.target.dataset?.mascara;
    if (m === 'fone') e.target.value = mascaraFone(e.target.value);
    if (m === 'slug') e.target.value = slugify(e.target.value);
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-alterna-horas]')) e.target.form.querySelectorAll('[data-hora]').forEach((x) => x.classList.toggle('hidden', e.target.checked));
  });

  /* =================================================================
     5b. INÍCIO (resumo do dia)
     ================================================================= */
  const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
  async function abaInicio() {
    const hoje = isoDate(new Date());
    const ini = localParaISO(hoje, '00:00', fuso()), fimHoje = localParaISO(isoDate(new Date(Date.now() + 86400000)), '00:00', fuso());
    const seg = (() => { const d = parseISO(hoje); return isoDate(new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86400000 + 43200000)); })();
    const [ag, rel] = await Promise.all([
      sb.from('agendamentos').select('*').eq('negocio_id', S.neg.id).gte('inicio', ini).lt('inicio', fimHoje).neq('status', 'cancelado').order('inicio'),
      sb.rpc('relatorio', { p_ini: localParaISO(seg, '00:00', fuso()), p_fim: fimHoje })
    ]);
    if (S.aba !== 'inicio') return;
    if (ag.error) { $('#conteudo').innerHTML = vazio(esc(msgErro(ag.error))); return; }
    agendaAtual = ag.data;
    const agora = Date.now();
    const proximo = ag.data.find((a) => a.status === 'confirmado' && new Date(a.fim).getTime() > agora);
    const previsto = ag.data.filter((a) => a.status !== 'faltou').reduce((t, a) => t + Number(a.valor_cobrado ?? a.valor_total), 0);
    const feitos = ag.data.filter((a) => a.status === 'concluido').length;
    const R = rel.data?.resumo || { faturado: 0, comissoes: 0, atendimentos: 0 };
    const eu = S.profs.find((p) => p.id === S.meuProf);
    const minutos = proximo ? Math.round((new Date(proximo.inicio).getTime() - agora) / 60000) : 0;
    const quando = !proximo ? '' : minutos <= 0 ? 'acontecendo agora' : minutos < 60 ? `em ${minutos} min` : `às ${horaNoFuso(proximo.inicio, fuso())}`;

    $('#conteudo').innerHTML = avisoSuspenso() + `
      <p class="text-sm font-semibold text-muted capitalize">${esc(dataLonga(hoje))}</p>
      <h1 class="mt-1 font-display text-3xl font-bold md:text-4xl">${saudacao()}${S.papel === 'prof' && eu ? `, ${esc(eu.nome)}` : ''}.</h1>
      <div class="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div class="rounded-panel bg-brand p-6 text-brand-contrast">
          ${proximo ? `
            <p class="text-sm font-semibold opacity-80">Próximo atendimento, ${quando}</p>
            <p class="mt-2 font-display text-3xl font-bold">${esc(proximo.cliente_nome)}</p>
            <p class="mt-1 opacity-90">${esc((proximo.servicos || []).map((x) => x.nome).join(' + '))} · ${horaNoFuso(proximo.inicio, fuso())} com ${esc(proximo.profissional_nome)}</p>
            <div class="mt-5 flex flex-wrap gap-2">
              <a href="${waLink(proximo.cliente_whatsapp, `Olá, ${proximo.cliente_nome.split(' ')[0]}! Te esperamos hoje às ${horaNoFuso(proximo.inicio, fuso())} no ${S.neg.nome}.`)}" target="_blank" rel="noopener" class="btn btn-sm bg-brand-contrast text-brand"><i data-lucide="message-circle" class="h-4 w-4"></i>Mandar mensagem</a>
              <button type="button" data-acao="concluir" data-id="${proximo.id}" class="btn btn-sm border border-current/30"><i data-lucide="check" class="h-4 w-4"></i>Concluir e receber</button>
            </div>`
          : `<p class="text-sm font-semibold opacity-80">Próximo atendimento</p><p class="mt-2 font-display text-3xl font-bold">${ag.data.length ? 'Tudo atendido por hoje' : 'Nenhum horário hoje'}</p><p class="mt-1 opacity-90">Compartilhe seu link para encher a agenda.</p>
             <button type="button" data-aba="divulgar" class="btn btn-sm mt-5 bg-brand-contrast text-brand"><i data-lucide="share-2" class="h-4 w-4"></i>Divulgar meu link</button>`}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="card p-4"><p class="text-xs font-semibold text-muted">Hoje</p><p class="mt-1 font-display text-3xl font-bold">${ag.data.length}</p><p class="text-xs text-muted">${feitos} concluído(s)</p></div>
          <div class="card p-4"><p class="text-xs font-semibold text-muted">Previsto hoje</p><p class="mt-1 font-display text-2xl font-bold">${reais(previsto)}</p></div>
          <div class="card p-4"><p class="text-xs font-semibold text-muted">${S.papel === 'prof' ? 'Faturado por mim' : 'Faturado'} na semana</p><p class="mt-1 font-display text-2xl font-bold text-ok">${reais(R.faturado)}</p></div>
          <div class="card p-4"><p class="text-xs font-semibold text-muted">${S.papel === 'prof' ? 'Minha comissão' : 'Comissões'} na semana</p><p class="mt-1 font-display text-2xl font-bold">${reais(R.comissoes)}</p></div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button type="button" data-acao="novo-agendamento" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="calendar-plus" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Novo agendamento</span></button>
        <button type="button" data-copiar="${esc(linkPublico())}" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="link" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Copiar meu link</span></button>
        ${S.papel === 'dono' ? `<button type="button" data-aba="folgas" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="calendar-off" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Bloquear horário</span></button>` : ''}
        <button type="button" data-aba="clientes" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="heart-handshake" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Clientes sumidos</span></button>
      </div>

      <div class="mt-8 flex items-baseline justify-between"><h2 class="font-display text-xl font-bold">Agenda de hoje</h2><button type="button" data-aba="agenda" class="text-sm font-bold text-brand">Ver agenda completa</button></div>
      <div class="mt-3 grid gap-2">${ag.data.length ? ag.data.map((a) => `
        <div class="card flex items-center gap-4 p-3 ${new Date(a.fim).getTime() < agora && a.status === 'confirmado' ? 'border-warn/50' : ''}">
          <span class="w-14 shrink-0 text-center font-display text-lg font-bold ${a.status === 'concluido' ? 'text-muted line-through' : 'text-brand'}">${horaNoFuso(a.inicio, fuso())}</span>
          <div class="min-w-0 flex-1"><p class="truncate font-semibold">${esc(a.cliente_nome)}</p><p class="truncate text-xs text-muted">${esc((a.servicos || []).map((x) => x.nome).join(' + '))} · ${esc(a.profissional_nome)}</p></div>
          <span class="badge ${STATUS[a.status][1]}">${STATUS[a.status][0]}</span>
        </div>`).join('') : vazio('Nenhum agendamento hoje.')}</div>`;
    icons();
  }

  /* Início dos nichos de pedido (marmitaria, passeios...): link, resumo e atalhos */
  async function abaInicioLoja() {
    const l = L(), n = S.neg, link = linkPublico(), hoje = isoDate(new Date());
    const ativos = S.servicos.filter((s) => s.ativo), fora = S.servicos.length - ativos.length;
    const r = await sb.from('pedidos').select('status,total').eq('negocio_id', n.id).eq('dia', hojeNoFuso());
    if (S.aba !== 'inicio') return;
    const peds = r.data || [], validos = peds.filter((p) => p.status !== 'cancelado');
    const abertos = validos.filter((p) => p.status !== 'entregue').length;
    const vendido = validos.reduce((t, p) => t + Number(p.total), 0);
    const palavra = l.acao === 'reserva' ? 'Reservas' : 'Pedidos';
    $('#conteudo').innerHTML = avisoSuspenso() + `
      <p class="text-sm font-semibold text-muted capitalize">${esc(dataLonga(hoje))}</p>
      <h1 class="mt-1 font-display text-3xl font-bold md:text-4xl">${saudacao()}.</h1>
      <div class="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div class="rounded-panel bg-brand p-6 text-brand-contrast">
          <p class="text-sm font-semibold opacity-80">Sua página de ${esc(l.aba.toLowerCase())}</p>
          <p class="mt-2 font-display text-2xl font-bold [overflow-wrap:anywhere]">${esc(link.replace(/^https?:\/\//, ''))}</p>
          <p class="mt-1 opacity-90">${n.ativo ? `Os ${l.acao === 'reserva' ? 'pedidos de reserva' : 'pedidos'} entram na aba ${palavra} e o cliente também avisa no WhatsApp ${esc(mascaraFone(String(n.whatsapp).replace(/^55(?=\d{10,11}$)/, '')))}.` : 'Página pausada: ninguém consegue fazer pedido agora. Reative em Meu negócio.'}</p>
          <div class="mt-5 flex flex-wrap gap-2">
            <button type="button" data-copiar="${esc(link)}" class="btn btn-sm bg-brand-contrast text-brand"><i data-lucide="copy" class="h-4 w-4"></i>Copiar link</button>
            <a href="${esc(link)}" target="_blank" rel="noopener" class="btn btn-sm border border-current/30"><i data-lucide="external-link" class="h-4 w-4"></i>Abrir minha página</a>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button type="button" data-aba="pedidos" class="card p-4 text-left hover:border-brand/50"><p class="text-xs font-semibold text-muted">Em aberto agora</p><p class="mt-1 font-display text-3xl font-bold ${abertos ? 'text-brand' : ''}">${r.error ? '–' : abertos}</p><p class="text-xs text-muted">${palavra.toLowerCase()} na fila</p></button>
          <div class="card p-4"><p class="text-xs font-semibold text-muted">${palavra} hoje</p><p class="mt-1 font-display text-3xl font-bold">${r.error ? '–' : validos.length}</p><p class="text-xs text-muted">${peds.length - validos.length ? `${peds.length - validos.length} cancelado(s)` : 'sem cancelamentos'}</p></div>
          <div class="card p-4"><p class="text-xs font-semibold text-muted">Vendido hoje</p><p class="mt-1 font-display text-2xl font-bold text-ok">${r.error ? '–' : reais(vendido)}</p><p class="text-xs text-muted">${validos.length ? `ticket médio ${reais(vendido / validos.length)}` : '&nbsp;'}</p></div>
          <div class="card p-4"><p class="text-xs font-semibold text-muted">${esc(l.aba)}</p><p class="mt-1 font-display text-3xl font-bold">${ativos.length}</p><p class="text-xs ${fora ? 'text-warn' : 'text-muted'}">${fora ? `${fora} indisponível(is)` : `${esc(l.itens)} no ar`}</p></div>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button type="button" data-aba="servicos" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="${esc(l.icone)}" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Editar ${esc(l.aba.toLowerCase())}</span></button>
        <button type="button" data-aba="pedidos" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="bell-ring" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Ver ${palavra.toLowerCase()}</span></button>
        <button type="button" data-aba="negocio" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="store" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Entrega e pagamento</span></button>
        <button type="button" data-aba="divulgar" class="card flex flex-col items-start gap-3 p-4 text-left hover:border-brand/50"><i data-lucide="share-2" class="h-6 w-6 text-brand"></i><span class="text-sm font-bold">Divulgar</span></button>
      </div>
      <div class="mt-8 card p-5 text-sm">
        <p class="font-semibold">Como funciona</p>
        <ol class="mt-2 list-decimal pl-5 grid gap-1 text-muted">
          <li>O cliente abre seu link, escolhe os ${esc(l.itens)} e as opções, informa nome e WhatsApp e toca em enviar.</li>
          <li>O ${l.acao} entra na aba <b class="text-ink">${palavra}</b> com número, horário, itens, total${n.faz_entrega ? ', endereço' : ''} e pagamento. O cliente também te avisa no WhatsApp.</li>
          <li>Você avança as etapas (${esc(Object.values(l.fluxo.rotulos).filter((x) => !/cancel/i.test(x)).join(' → '))}) e manda a mensagem pronta para o cliente com um toque.</li>
          <li>Acabou algum item? Em ${esc(l.aba)}, desmarque "Disponível" e ele some da página na hora.</li>
        </ol>
      </div>`;
    icons();
  }

  /* =================================================================
     5b2. PEDIDOS (fila do dia dos nichos de pedido)
     ================================================================= */
  const hojeNoFuso = () => dataNoFuso(Date.now(), fuso());
  const ABERTOS = ['novo', 'preparo', 'saiu', 'pronto'];
  const COR_STATUS = { novo: 'bg-brand text-brand-contrast', preparo: 'bg-warn/15 text-warn', saiu: 'bg-accent text-ink', pronto: 'bg-accent text-ink', entregue: 'bg-ok/15 text-ok', cancelado: 'bg-bad/10 text-bad' };
  const PD = { dia: null, filtro: 'abertos', lista: [] };
  let timerPedidos;
  const minutosDesde = (ts) => Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  const tempoTxt = (m) => (m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`);
  function proximoStatus(p) {
    const etapas = L().fluxo[p.modo] || L().fluxo.retirada, i = etapas.indexOf(p.status);
    return i >= 0 && i < etapas.length - 1 ? etapas[i + 1] : null;
  }
  const avisoCliente = (p, st) => String(L().fluxo.avisos[st] || '').replaceAll('{n}', p.numero).replaceAll('{nome}', String(p.cliente_nome).split(' ')[0]);

  async function abaPedidos() {
    clearInterval(timerPedidos);
    const l = L(), palavra = l.acao === 'reserva' ? 'Reservas' : 'Pedidos';
    PD.dia = PD.dia || hojeNoFuso();
    const { data, error } = await sb.from('pedidos').select('*').eq('negocio_id', S.neg.id).eq('dia', PD.dia).order('criado_em');
    if (S.aba !== 'pedidos') return;
    if (error) { $('#conteudo').innerHTML = cabecalho(palavra, '') + vazio(esc(msgErro(error))); return; }
    PD.lista = data;
    const R = l.fluxo.rotulos, ehHoje = PD.dia === hojeNoFuso();
    const validos = data.filter((p) => p.status !== 'cancelado');
    const abertos = data.filter((p) => ABERTOS.includes(p.status));
    const vendido = validos.reduce((t, p) => t + Number(p.total), 0);
    const filtros = { abertos: ['Em aberto', abertos], concluidos: [R.entregue, data.filter((p) => p.status === 'entregue')], cancelados: [R.cancelado, data.filter((p) => p.status === 'cancelado')], todos: ['Todos', data] };
    const lista = filtros[PD.filtro][1];
    /* o que mais saiu no dia (quantidade por item) */
    const contagem = {};
    validos.forEach((p) => (p.itens || []).forEach((i) => { contagem[i.nome] = (contagem[i.nome] || 0) + Number(i.qtd || 0); }));
    const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const porEtapa = (st) => data.filter((p) => p.status === st).length;
    const etapasAbertas = [...new Set([...(l.fluxo.entrega || []), ...(l.fluxo.retirada || [])])].filter((st) => ABERTOS.includes(st));

    $('#conteudo').innerHTML = cabecalho(palavra, ehHoje ? 'Fila do dia, do mais antigo para o mais novo. A lista se atualiza sozinha a cada 20 segundos.' : 'Pedidos de um dia anterior.', `
        <div class="flex items-center gap-1">
          <button type="button" data-acao="ped-dia" data-delta="-1" class="btn btn-ghost btn-icon" aria-label="Dia anterior"><i data-lucide="chevron-left" class="h-4 w-4"></i></button>
          <input type="date" class="input !min-h-[2.75rem] !w-auto" value="${PD.dia}" data-acao-change="ped-data" aria-label="Dia">
          <button type="button" data-acao="ped-dia" data-delta="1" class="btn btn-ghost btn-icon" aria-label="Próximo dia" ${ehHoje ? 'disabled' : ''}><i data-lucide="chevron-right" class="h-4 w-4"></i></button>
        </div>`) + `
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="card p-4"><p class="text-xs font-semibold text-muted">Em aberto</p><p class="mt-1 font-display text-3xl font-bold ${abertos.length ? 'text-brand' : ''}">${abertos.length}</p><p class="text-xs text-muted">${etapasAbertas.map((st) => `${porEtapa(st)} ${esc(R[st].toLowerCase())}`).join(' · ')}</p></div>
        <div class="card p-4"><p class="text-xs font-semibold text-muted">${palavra} no dia</p><p class="mt-1 font-display text-3xl font-bold">${validos.length}</p><p class="text-xs text-muted">${porEtapa('entregue')} ${esc(R.entregue.toLowerCase())} · ${porEtapa('cancelado')} ${esc(R.cancelado.toLowerCase())}</p></div>
        <div class="card p-4"><p class="text-xs font-semibold text-muted">Vendido no dia</p><p class="mt-1 font-display text-2xl font-bold text-ok">${reais(vendido)}</p><p class="text-xs text-muted">sem os cancelados</p></div>
        <div class="card p-4"><p class="text-xs font-semibold text-muted">Ticket médio</p><p class="mt-1 font-display text-2xl font-bold">${validos.length ? reais(vendido / validos.length) : '–'}</p><p class="text-xs text-muted">${validos.filter((p) => p.modo === 'entrega').length} entrega(s) · ${validos.filter((p) => p.modo === 'retirada').length} retirada(s)</p></div>
      </div>
      ${top.length ? `<div class="card mt-3 p-4 text-sm"><p class="font-semibold">O que mais saiu ${ehHoje ? 'hoje' : 'no dia'}</p><div class="mt-2 flex flex-wrap gap-2">${top.map(([nome, q]) => `<span class="rounded-full bg-sunken px-3 py-1"><b>${q}×</b> ${esc(nome)}</span>`).join('')}</div></div>` : ''}
      <div class="mt-5 flex gap-2 overflow-x-auto no-scrollbar">${Object.entries(filtros).map(([k, [rot, arr]]) => `<button type="button" data-acao="ped-filtro" data-filtro="${k}" class="chip ${PD.filtro === k ? 'chip-on' : ''}">${esc(rot)} (${arr.length})</button>`).join('')}</div>
      <div class="mt-4 grid gap-3 lg:grid-cols-2">${lista.length ? lista.map(cartaoPedido).join('') : vazio(PD.filtro === 'abertos' ? `Nenhum ${l.acao} em aberto. Os novos aparecem aqui sozinhos.` : 'Nada por aqui.')}</div>`;
    icons();
    if (ehHoje) timerPedidos = setInterval(() => { if (S.aba === 'pedidos' && !document.hidden && !$('#modal').open) abaPedidos(); }, 20000);
  }

  function cartaoPedido(p) {
    const R = L().fluxo.rotulos, prox = proximoStatus(p), m = minutosDesde(p.criado_em);
    const atrasado = ABERTOS.includes(p.status) && m >= 40;
    const fone = String(p.cliente_whatsapp);
    return `<div class="card p-4 ${p.status === 'novo' ? 'border-brand' : atrasado ? 'border-warn/50' : ''} ${['entregue', 'cancelado'].includes(p.status) ? 'opacity-75' : ''}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-display text-xl font-bold">Nº ${p.numero} <span class="text-sm font-semibold text-muted">· ${horaNoFuso(p.criado_em, fuso())}${ABERTOS.includes(p.status) ? ` · <span class="${atrasado ? 'text-warn' : ''}">${tempoTxt(m)}</span>` : ''}</span></p>
          <p class="mt-0.5 truncate font-semibold">${esc(p.cliente_nome)} <a href="${waLink(fone)}" target="_blank" rel="noopener" class="text-sm font-normal text-brand underline">${esc(mascaraFone(fone.replace(/^55(?=\d{10,11}$)/, '')))}</a></p>
        </div>
        <span class="badge shrink-0 ${COR_STATUS[p.status]}">${esc(R[p.status] || p.status)}</span>
      </div>
      <p class="mt-2 text-sm"><b>${p.modo === 'entrega' ? '🛵 Entrega' : `🏪 ${esc(L().textos.retirada || 'Retirada')}`}</b>${p.modo === 'entrega' && p.endereco ? ` · ${esc(p.endereco)}` : ''}</p>
      <ul class="mt-2 grid gap-1 rounded-xl bg-sunken p-3 text-sm">${(p.itens || []).map((i) => `<li><b>${i.qtd}×</b> ${esc(i.nome)} <span class="text-muted">— ${reais(i.total)}</span>${i.escolhas ? `<br><span class="text-xs text-muted">${esc(i.escolhas)}</span>` : ''}${i.obs ? `<br><span class="text-xs text-warn">Obs.: ${esc(i.obs)}</span>` : ''}</li>`).join('')}</ul>
      <div class="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span class="text-muted">${esc(p.pagamento || '—')}${p.troco ? ` · troco para R$ ${esc(p.troco)}` : ''}${Number(p.taxa) ? ` · entrega ${reais(p.taxa)}` : ''}</span>
        <span class="font-display text-lg font-bold">${reais(p.total)}</span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        ${prox ? `<button type="button" data-acao="ped-status" data-id="${p.id}" data-status="${prox}" class="btn btn-primary btn-sm"><i data-lucide="check" class="h-4 w-4"></i>${esc(L().fluxo.acoes[prox] || R[prox])}</button>` : ''}
        <a href="${waLink(fone, avisoCliente(p, p.status))}" target="_blank" rel="noopener" class="btn btn-wa btn-sm"><i data-lucide="message-circle" class="h-4 w-4"></i>Avisar cliente</a>
        ${ABERTOS.includes(p.status) ? `<button type="button" data-acao="ped-status" data-id="${p.id}" data-status="cancelado" class="btn btn-danger btn-sm">Cancelar</button>` : ''}
        ${['entregue', 'cancelado'].includes(p.status) ? `<button type="button" data-acao="ped-status" data-id="${p.id}" data-status="${p.status === 'cancelado' ? 'novo' : (L().fluxo[p.modo] || L().fluxo.retirada).slice(-2)[0]}" class="btn btn-ghost btn-sm"><i data-lucide="rotate-ccw" class="h-4 w-4"></i>Reabrir</button>` : ''}
      </div>
    </div>`;
  }

  async function mudarStatusPedido(id, status) {
    const p = PD.lista.find((x) => x.id === id);
    if (status === 'cancelado' && !confirma(`Cancelar o nº ${p?.numero}? Ele sai da fila e não entra no total vendido.`)) return;
    const { error } = await sb.from('pedidos').update({ status }).eq('id', id);
    if (error) return toast(msgErro(error), 'erro');
    toast(`Nº ${p?.numero}: ${L().fluxo.rotulos[status]}.${['entregue'].includes(status) ? '' : ' Toque em "Avisar cliente" para mandar a mensagem.'}`);
    vigiarPedidos();
    abaPedidos();
  }

  /* Alerta de pedido novo em qualquer aba do painel: número no menu, título da aba e um bipe */
  let timerVigia, ultimosNovos = null;
  function bipe() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.15, ctx.currentTime + t); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.12); });
    } catch { /* sem som neste navegador */ }
  }
  async function vigiarPedidos() {
    if (!S.neg || !pedido()) return;
    const { data, error } = await sb.from('pedidos').select('id').eq('negocio_id', S.neg.id).eq('dia', hojeNoFuso()).eq('status', 'novo');
    if (error || !data) return;
    const n = data.length;
    $$('[data-aba="pedidos"]').forEach((b) => {
      let tag = b.querySelector('[data-novos]');
      if (!tag) { tag = document.createElement('span'); tag.dataset.novos = ''; tag.className = 'ml-auto rounded-full bg-bad px-1.5 text-[11px] font-bold leading-5 text-white'; b.appendChild(tag); }
      tag.textContent = n; tag.classList.toggle('hidden', !n);
    });
    document.title = `${n ? `(${n}) ` : ''}Painel · ${CONFIG.produto?.nome || 'Minha agenda'}`;
    if (ultimosNovos !== null && n > ultimosNovos) {
      bipe(); toast(n - ultimosNovos > 1 ? `${n - ultimosNovos} ${L().acao === 'reserva' ? 'reservas novas' : 'pedidos novos'}!` : `${L().acao === 'reserva' ? 'Nova reserva' : 'Novo pedido'}!`);
      if (S.aba === 'pedidos' && !$('#modal').open) abaPedidos();
      if (S.aba === 'inicio') abaInicioLoja();
    }
    ultimosNovos = n;
  }
  function iniciarVigia() {
    clearInterval(timerVigia); ultimosNovos = null;
    if (!pedido()) return;
    vigiarPedidos();
    timerVigia = setInterval(() => { if (!document.hidden) vigiarPedidos(); }, 20000);
  }

  /* =================================================================
     5c. CLIENTES (histórico, frequência e reativação)
     ================================================================= */
  async function abaClientes() {
    S.filtroCli = S.filtroCli || 'todos';
    const { data, error } = await sb.rpc('clientes', { p_busca: S.buscaCli || '' });
    if (S.aba !== 'clientes') return;
    if (error) { $('#conteudo').innerHTML = cabecalho('Clientes', '') + vazio(esc(msgErro(error))); return; }
    const diasDesde = (ts) => (ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : null);
    const lista = data.filter((c) => S.filtroCli === 'todos' || (S.filtroCli === 'sumidos' && !c.proxima && diasDesde(c.ultima) >= 45) || (S.filtroCli === 'fieis' && c.visitas >= 4) || (S.filtroCli === 'faltas' && c.faltas > 0));
    const FILTROS = [['todos', 'Todos'], ['sumidos', 'Sumidos há 45+ dias'], ['fieis', 'Fiéis (4+ visitas)'], ['faltas', 'Com faltas']];
    $('#conteudo').innerHTML = cabecalho(S.papel === 'prof' ? 'Meus clientes' : 'Clientes', 'Montado automaticamente a partir dos agendamentos. Ninguém precisa cadastrar nada.') + `
      <form data-slot="busca-cli" class="relative"><i data-lucide="search" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"></i><input name="q" type="search" class="input !pl-12" placeholder="Buscar por nome ou WhatsApp" value="${esc(S.buscaCli || '')}" aria-label="Buscar cliente"></form>
      <div class="mt-3 flex gap-2 overflow-x-auto no-scrollbar">${FILTROS.map(([k, t]) => `<button type="button" data-acao="filtro-cli" data-f="${k}" class="chip ${S.filtroCli === k ? 'chip-on' : ''}">${t}</button>`).join('')}</div>
      <p class="mt-4 text-sm text-muted">${lista.length} cliente(s)</p>
      <div class="mt-2 grid gap-2">${lista.length ? lista.map((c) => {
        const d = diasDesde(c.ultima), primeiro = c.nome.split(' ')[0];
        const msg = d >= 45 && !c.proxima
          ? `Oi, ${primeiro}! Faz um tempinho que você não aparece no ${S.neg.nome} e sentimos sua falta. Que tal marcar um horário? É só escolher aqui: ${linkPublico()}`
          : `Oi, ${primeiro}! Aqui é do ${S.neg.nome}.`;
        return `
        <div class="card flex flex-wrap items-center gap-4 p-4">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 font-display text-lg font-bold text-brand">${esc(primeiro.charAt(0))}</span>
          <div class="min-w-[10rem] flex-1">
            <p class="font-semibold">${esc(c.nome)}</p>
            <p class="text-xs text-muted">${c.visitas} visita(s) · ${reais(c.total)}${c.faltas ? ` · <span class="text-warn">${c.faltas} falta(s)</span>` : ''}</p>
            <p class="text-xs text-muted">${c.proxima ? `Próxima: ${new Date(c.proxima).toLocaleDateString('pt-BR', { timeZone: fuso(), day: '2-digit', month: '2-digit' })}` : c.ultima ? `Última visita há ${d} dia(s)` : 'Ainda não veio'}</p>
          </div>
          <a href="${waLink(c.whatsapp, msg)}" target="_blank" rel="noopener" class="btn btn-sm ${d >= 45 && !c.proxima ? 'btn-wa' : 'btn-ghost'}"><i data-lucide="message-circle" class="h-4 w-4"></i>${d >= 45 && !c.proxima ? 'Chamar de volta' : 'WhatsApp'}</a>
        </div>`;
      }).join('') : vazio(S.buscaCli ? 'Ninguém encontrado com essa busca.' : 'Os clientes aparecem aqui assim que fizerem o primeiro agendamento.')}</div>`;
    icons();
    $('[data-slot="busca-cli"]').onsubmit = (e) => { e.preventDefault(); S.buscaCli = e.target.q.value.trim().slice(0, 60); abaClientes(); };
  }
  const avisoSuspenso = () => (S.neg?.suspenso ? `<div class="card p-4 mb-4 border-bad/40 bg-bad/5 text-sm flex flex-wrap items-center justify-between gap-3"><p><b class="text-bad">Página suspensa.</b> Os clientes não conseguem agendar no momento. Fale com o suporte para reativar.</p><a href="${waLink(CONFIG.produto.whatsapp, `Olá! Minha página (${S.neg.nome}) está suspensa e quero reativar.`)}" target="_blank" rel="noopener" class="btn btn-wa btn-sm">Falar com o suporte</a></div>` : '');
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
    confirmado: ['Confirmado', 'bg-brand/10 text-brand'],
    concluido: ['Concluído', 'bg-ok/15 text-ok'],
    faltou: ['Faltou', 'bg-warn/15 text-warn'],
    cancelado: ['Cancelado', 'bg-bad/10 text-bad']
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
        <div class="card p-4"><p class="text-xs text-muted">Recebido</p><p class="text-xl font-bold text-ok">${reais(recebido)}</p></div>
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
      ? `<p class="text-sm mt-1"><span class="text-ok font-semibold">${reais(a.valor_cobrado ?? a.valor_total)}</span>${a.forma_pagamento ? ` · ${FORMAS[a.forma_pagamento]}` : ''} · comissão ${reais(a.comissao_valor)}</p>` : '';
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
        toast('Atendimento concluído.'); abrirAba(S.aba);
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
          <label class="label">WhatsApp<input name="fone" class="input" inputmode="tel" required data-mascara="fone"></label>
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
        S.dia = f.data.value; toast('Agendamento criado.'); abrirAba(S.aba === 'inicio' ? 'inicio' : 'agenda');
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
        ${card(prof ? 'Faturado por mim' : 'Faturado', reais(R.faturado), 'text-ok')}
        ${card(prof ? 'Minha comissão' : 'Comissões a pagar', reais(R.comissoes), prof ? 'text-brand' : '')}
        ${prof ? card('Atendimentos', R.atendimentos) : card('Líquido do negócio', reais(liquido))}
        ${card(prof ? 'Ticket médio' : 'Atendimentos', prof ? reais(ticket) : R.atendimentos)}
        ${prof ? '' : card('Ticket médio', reais(ticket))}
        ${card('A realizar no período', reais(R.previsto))}
        ${card('Faltas', R.faltas, R.faltas ? 'text-warn' : '')}
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
          ? `<p class="mt-2 text-xs flex flex-wrap items-center gap-2"><span class="rounded-full bg-ok/10 text-ok px-2 py-0.5">Login: ${esc(acessos[p.id])}</span><button data-acao="remover-acesso" data-id="${p.id}" class="text-bad underline">remover acesso</button></p>`
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
    /* Itens dos nichos de pedido: pratos do cardápio, pacotes de passeio... */
    produtos: () => {
      const l = L(), exemplo = nichoPorId(S.neg.nicho).servicos.find((x) => x.opcoes && x.opcoes.length > 1) || {};
      return {
        tabela: 'servicos', titulo: l.aba,
        texto: `Os ${l.itens} que aparecem na sua página. Cada categoria vira uma aba. Quando algo acabar, desmarque "Disponível" em vez de excluir.`,
        fixos: { duracao_min: 30 },
        campos: [
          { k: 'nome', r: `Nome do ${l.item.toLowerCase()}`, req: true },
          { k: 'descricao', r: 'Descrição curta', t: 'textarea', max: 300 },
          { k: 'preco', r: `Preço (R$)${l.textos.unidade ? ` ${l.textos.unidade}` : ''}`, t: 'money', padrao: 0 },
          { k: 'preco_de', r: 'Preço antigo (opcional)', t: 'moneyopc', dica: 'Aparece riscado, ao lado do preço. Deixe vazio se não estiver em promoção.' },
          { k: 'categoria', r: 'Categoria (vira uma aba)', ph: exemplo.categoria ? `Ex.: ${exemplo.categoria}` : 'Ex.: Bebidas', max: 40, req: true },
          { k: 'selo', r: 'Etiqueta (opcional)', ph: 'Ex.: Mais pedido, Promoção', max: 30 },
          { k: 'img_url', r: 'Foto', t: 'foto' },
          { k: 'opcoes', r: 'Escolhas do cliente (opcional)', t: 'opcoes', ph: opcoesParaTexto(exemplo.opcoes || []),
            dica: 'Escreva o nome do grupo e a regra entre parênteses: <b>(escolha 1)</b>, <b>(escolha 2)</b>, <b>(escolha de 1 a 3)</b>, <b>(até 2)</b> ou <b>(opcional)</b>. Embaixo, uma opção por linha começando com "-". Para cobrar a mais, termine a linha com <b>+ 3,00</b>.' },
          { k: 'ordem', r: 'Ordem na lista', t: 'number', padrao: 0 },
          { k: 'ativo', r: 'Disponível (aparece na página)', t: 'bool', padrao: true }
        ],
        async antesSalvar(f, v) {
          if (f.elements.img_url_remover?.checked) v.img_url = '';
          const arq = f.elements.img_url_arquivo?.files?.[0];
          if (!arq) return;
          const blob = await reduzir(arq, 1000);
          const caminho = `${S.neg.id}/itens/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
          const up = await sb.storage.from('portfolio').upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
          if (up.error) throw up.error;
          v.img_url = sb.storage.from('portfolio').getPublicUrl(caminho).data.publicUrl;
        },
        linha: (s) => `<div class="flex gap-3">${s.img_url ? `<img src="${esc(s.img_url)}" alt="" class="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy">` : ''}<div class="min-w-0">
          <p class="font-semibold">${esc(s.nome)}${s.ativo ? '' : ' <span class="text-xs text-warn">(indisponível)</span>'}${s.selo ? ` <span class="badge bg-accent text-ink">${esc(s.selo)}</span>` : ''}</p>
          <p class="text-sm text-muted">${brl(s.preco)}${s.preco_de ? ` <s>${brl(s.preco_de)}</s>` : ''}${s.categoria ? ` · ${esc(s.categoria)}` : ''}</p>
          ${(s.opcoes || []).length ? `<p class="mt-1 text-xs text-muted">Escolhas: ${esc(s.opcoes.map((g) => g.titulo).join(', '))}</p>` : ''}</div></div>`,
        aposSalvar: recarregarBase
      };
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
        if (def.antesSalvar) await def.antesSalvar(f, v, row);
        const { error: e } = row
          ? await sb.from(def.tabela).update(v).eq('id', row.id)
          : await sb.from(def.tabela).insert({ ...(def.fixos || {}), ...v, negocio_id: S.neg.id });
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
        <label class="flex items-center gap-3 text-sm font-medium"><input type="checkbox" name="inteiro" class="w-5 h-5" checked data-alterna-horas>Dias inteiros</label>
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
              <button data-acao="foto-apagar" data-id="${p.id}" class="p-1.5 text-muted hover:text-bad" aria-label="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
    const n = S.neg, p = nichoPorId(n.nicho);
    const corNicho = U.rgbParaHex(p.tema.brand);
    $('#conteudo').innerHTML = cabecalho('Meu negócio', `Informações que aparecem na sua página${pedido() ? '' : ' de agendamento'}.`) + `
      <form id="f-negocio" class="grid gap-4">
        <div class="card p-5 grid sm:grid-cols-2 gap-4">
          <label class="label">Nome<input name="nome" class="input" value="${esc(n.nome)}" maxlength="80" required></label>
          <label class="label">Tipo de negócio<select name="nicho" class="input">${Object.entries(NICHOS).map(([id, x]) => `<option value="${id}" ${id === n.nicho ? 'selected' : ''}>${x.emoji} ${esc(x.rotulo)}</option>`).join('')}</select><small>Define cores, fonte e textos padrão.</small></label>
          <label class="label">WhatsApp<input name="whatsapp" class="input" inputmode="tel" value="${esc(mascaraFone(n.whatsapp.replace(/^55(?=\d{10,11}$)/, '')))}" data-mascara="fone" required></label>
          <label class="label">Instagram<input name="instagram" class="input" value="${esc(n.instagram)}" placeholder="@seuperfil" maxlength="60"></label>
          <label class="label">Endereço<input name="endereco" class="input" value="${esc(n.endereco)}" maxlength="120"></label>
          <label class="label">Cidade<input name="cidade" class="input" value="${esc(n.cidade)}" maxlength="60"></label>
          <label class="label sm:col-span-2">Link do Google Maps <small>(opcional)</small><input name="maps_url" class="input" value="${esc(n.maps_url)}" placeholder="https://maps.app.goo.gl/..." maxlength="300"></label>
          <label class="label sm:col-span-2">Texto de horário <small>(vazio = gerado automaticamente a partir da aba Horários)</small><input name="horario_texto" class="input" value="${esc(n.horario_texto)}" maxlength="120"></label>
        </div>
        ${pedido() ? `<div class="card p-5 grid sm:grid-cols-2 gap-4">
          <p class="font-semibold sm:col-span-2">Entrega e pagamento</p>
          <label class="flex items-center gap-3 text-sm font-medium sm:col-span-2"><input type="checkbox" name="faz_entrega" class="w-5 h-5" ${n.faz_entrega ? 'checked' : ''}>Faço entrega (sem marcar, o cliente só vê a opção de retirada)</label>
          <label class="label">Taxa de entrega (R$)<input name="taxa_entrega" type="number" min="0" step="0.01" class="input" value="${esc(Number(n.taxa_entrega || 0))}"><small>Use 0 para entrega grátis.</small></label>
          <label class="label">Pedido mínimo para entrega (R$)<input name="pedido_minimo" type="number" min="0" step="0.01" class="input" value="${esc(Number(n.pedido_minimo || 0))}"><small>Use 0 para não ter mínimo.</small></label>
          <label class="label sm:col-span-2">Formas de pagamento <small>Separe por vírgula. A primeira já vem marcada para o cliente.</small><input name="formas_pagamento" class="input" maxlength="200" value="${esc(n.formas_pagamento || '')}" placeholder="${esc(L().pagamentos)}"></label>
          <label class="label sm:col-span-2">Prazo ou aviso <small>(opcional)</small><input name="prazo_entrega" class="input" maxlength="120" value="${esc(n.prazo_entrega || '')}" placeholder="${esc(L().prazo)}"></label>
        </div>` : ''}
        <div class="card p-5 grid gap-4 ${pedido() ? 'hidden' : ''}">
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
            <input name="slug" class="input" value="${esc(n.slug)}" maxlength="60" data-mascara="slug">
            <p class="text-xs text-warn">Atenção: mudar isso quebra o link antigo (bio, QR Code impresso).</p>
          </div>
          <label class="flex items-center gap-3 text-sm font-medium sm:col-span-2"><input type="checkbox" name="ativo" class="w-5 h-5" ${n.ativo ? 'checked' : ''}>Página no ar (desmarque para pausar ${pedido() ? 'os pedidos' : 'os agendamentos'})</label>
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
      if (pedido()) Object.assign(v, {
        faz_entrega: f.faz_entrega.checked, taxa_entrega: Math.max(0, Number(f.taxa_entrega.value) || 0), pedido_minimo: Math.max(0, Number(f.pedido_minimo.value) || 0),
        formas_pagamento: f.formas_pagamento.value.split(',').map((x) => x.trim()).filter(Boolean).join(', ') || L().pagamentos, prazo_entrega: f.prazo_entrega.value.trim()
      });
      if (ehPedido(v.nicho) !== pedido() && !confirma(ehPedido(v.nicho)
        ? 'Mudar para este tipo troca a agenda por um cardápio/vitrine com pedido no WhatsApp. Seus serviços viram itens. Continuar?'
        : 'Mudar para este tipo troca o cardápio/vitrine por agenda de horários. Continuar?')) return;
      if (v.nome.length < 2) return toast('Informe o nome.', 'erro');
      if (v.maps_url && !/^https:\/\//i.test(U.urlSegura(v.maps_url))) return toast('O link do mapa precisa começar com https:// (copie do Google Maps em "Compartilhar").', 'erro');
      v.instagram = U.instagramUser(v.instagram);
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
    const emo = nichoPorId(S.neg.nicho).emoji;
    const textos = pedido() ? [
      ['Bio do Instagram', `${emo} ${L().chamada}\n👇 ${link}`],
      ['Mensagem de saudação do WhatsApp Business', `Olá! Obrigado por chamar o ${S.neg.nome} ${emo}\n\n${L().chamada}, é rápido:\n${link}\n\nSe preferir, é só mandar sua dúvida que respondemos assim que possível.`],
      ['Mensagem de ausência (fora do horário)', `Estamos fora do horário agora, mas você já pode ${L().verTexto} por aqui: ${link}`],
      ['Status / Stories', `${L().chamada}! ${emo} ${link}`]
    ] : [
      ['Bio do Instagram', `✨ Agende online, 24h, sem baixar app\n👇 ${link}`],
      ['Mensagem de saudação do WhatsApp Business', `Olá! Obrigada por chamar o ${S.neg.nome} 💜\n\nPara agendar na hora, escolha serviço, dia e horário por aqui:\n${link}\n\nSe preferir, é só mandar sua dúvida que respondemos assim que possível.`],
      ['Mensagem de ausência (fora do horário)', `Estamos fora do horário agora, mas você pode garantir seu horário a qualquer momento por aqui: ${link}`],
      ['Status / Stories', `Agenda aberta! 📅 Escolha seu horário em menos de 1 minuto: ${link}`]
    ];
    const ondeQr = pedido() ? 'Imprima e deixe no balcão, nas mesas, na embalagem ou no cartão de visita.' : 'Imprima e deixe no espelho, no balcão ou no cartão de visita.';
    $('#conteudo').innerHTML = cabecalho('Divulgar', `Seu link${pedido() ? '' : ' de agendamento'} e textos prontos para copiar.`) + `
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
            <p class="mt-2 text-muted">Pronto: quem chamar pela primeira vez já recebe o seu link${pedido() ? '' : ' para agendar'}.</p>
          </div>
        </div>
        <div class="card p-5 text-center self-start min-w-0">
          <p class="font-semibold">QR Code para o balcão</p>
          <div class="mx-auto mt-4 w-56 bg-white p-2 rounded-xl">${qrSvg}</div>
          ${qrPng ? `<a href="${qrPng}" download="qrcode-${esc(S.neg.slug)}.gif" class="btn btn-ghost mt-4"><i data-lucide="download" class="w-4 h-4"></i>Baixar imagem</a>` : ''}
          <p class="text-xs text-muted mt-3">${ondeQr}</p>
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
      case 'sair': if ($('#mais').open) $('#mais').close(); await sb.auth.signOut(); Object.assign(S, { neg: null, papel: 'dono', meuProf: null, aba: 'agenda', filtroProf: '' }); telaAuth('entrar'); break;
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
      case 'ped-status': mudarStatusPedido(d.id, d.status); break;
      case 'ped-filtro': PD.filtro = d.filtro; abaPedidos(); break;
      case 'ped-dia': {
        const novo = isoDate(new Date(parseISO(PD.dia).getTime() + Number(d.delta) * 86400000 + 43200000));
        if (novo <= hojeNoFuso()) { PD.dia = novo; abaPedidos(); }
        break;
      }
      case 'mais': $('#mais').showModal(); break;
      case 'tema': alternarTema(); break;
      case 'filtro-cli': S.filtroCli = d.f; abaClientes(); break;
      case 'periodo': S.per = d.p; abaFinanceiro(); break;
      case 'csv': baixarCSV(); break;
      case 'fechamento': enviarFechamento(Number(d.i)); break;
      case 'convite': {
        const p = S.profs.find((x) => x.id === d.id);
        const { data: cod, error } = await sb.rpc('gerar_convite', { p_profissional: d.id });
        if (error) return toast(msgErro(error), 'erro');
        const link = new URL(`painel.html?convite=${cod}`, location.href.split(/[?#]/)[0]).href;
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
          async aoSalvar() {}, soFechar: true
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
    if (a === 'ped-data' && e.target.value) { PD.dia = e.target.value > hojeNoFuso() ? hojeNoFuso() : e.target.value; abaPedidos(); }
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
    $('#v-auth').innerHTML = `<div class="card p-6 max-w-md"><h1 class="font-semibold text-lg">Falta configurar o Supabase</h1><p class="text-muted text-sm mt-2">Abra <code>config.js</code> e preencha <b>supabaseUrl</b> e <b>supabaseKey</b>. O passo a passo está no README.</p></div>`;
    return;
  }
  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'PASSWORD_RECOVERY') setTimeout(() => telaAuth('nova'), 0);
    if (evento === 'SIGNED_IN' && !S.neg && $('#v-auth').querySelector('#f-auth')) setTimeout(carregarUsuario, 0);
  });
  carregarUsuario().catch((e) => { toast(msgErro(e), 'erro'); telaAuth('entrar'); });
})();
