/* =====================================================================
   CATALOGO.JS — vitrine de produtos com pedido pelo WhatsApp.
   Para usar com um cliente, edite só o objeto LOJA abaixo.
   Nada é gravado: o carrinho vive na memória da aba e o pedido
   sai como mensagem de WhatsApp para a loja.
   ===================================================================== */
(() => {
  'use strict';

  const LOJA = {
    nome: 'Studio Bella',
    sigla: 'SB',                         // aparece no quadrado do logo
    capa: ['Studio', 'Bella', 'loja do salão'],
    endereco: 'Av. Exemplo, 123 - Bairro Modelo, Fortaleza - CE',
    whatsapp: '5585900000000',           // DDI + DDD + número da LOJA (troque pelo do cliente)
    pedidoMinimo: 30,
    taxaEntrega: 8,
    entrega: true,                       // false = só retirada no salão
    prazo: 'Entrega em até 1 dia útil · retirada no mesmo dia',
    pagamentos: ['Pix', 'Cartão (na entrega ou retirada)', 'Dinheiro'],
    instagram: '@studiobella.exemplo',
    // 0 = domingo ... 6 = sábado. null = fechado. Horários em "HH:MM".
    horarios: [null, ['09:00', '19:00'], ['09:00', '19:00'], ['09:00', '19:00'], ['09:00', '20:00'], ['09:00', '20:00'], ['08:00', '16:00']],
    categorias: [
      { id: 'destaques', nome: 'Mais vendidos' },
      { id: 'cabelo', nome: 'Cabelo' },
      { id: 'unhas', nome: 'Unhas' },
      { id: 'pele', nome: 'Pele e corpo' },
      { id: 'presentes', nome: 'Kits e presentes' }
    ],
    // figura: frasco | pote | bisnaga | esmalte | oleo | kit | vale   (ou foto: 'img/arquivo.webp')
    produtos: [
      { id: 'p1', cat: 'destaques', nome: 'Máscara de hidratação 300 g', desc: 'Hidratação profunda para cabelos secos. Uso semanal, deixar agir 10 minutos.', preco: 59.9, de: 74.9, figura: 'pote', cor: '#8c86ff', selo: 'Mais pedido' },
      { id: 'p2', cat: 'destaques', nome: 'Óleo reparador de pontas', desc: 'Finalizador leve, sem pesar. 60 ml.', preco: 39.9, figura: 'oleo', cor: '#e8a35d' },
      { id: 'p3', cat: 'destaques', nome: 'Esmalte cremoso', desc: 'Secagem rápida, alta cobertura. Escolha a cor.', preco: 9.9, figura: 'esmalte', cor: '#d9476b',
        opcoes: { titulo: 'Escolha a cor', obrigatorio: true, itens: [{ nome: 'Vermelho clássico', cor: '#c3203a' }, { nome: 'Nude rosado', cor: '#e2b2a5' }, { nome: 'Vinho', cor: '#6d1a36' }, { nome: 'Lilás', cor: '#a99ae6' }] } },
      { id: 'p4', cat: 'cabelo', nome: 'Shampoo antirresíduo', desc: 'Limpeza profunda antes de química ou hidratação. 250 ml.', preco: 34.9, figura: 'frasco', cor: '#3d9ad1' },
      { id: 'p5', cat: 'cabelo', nome: 'Condicionador nutrição', desc: 'Desembaraça e dá brilho. 250 ml.', preco: 36.9, figura: 'frasco', cor: '#c98bd1' },
      { id: 'p6', cat: 'cabelo', nome: 'Leave-in protetor térmico', desc: 'Protege do secador e da chapinha até 230 °C.', preco: 42.0, figura: 'bisnaga', cor: '#f08a5d',
        opcoes: { titulo: 'Tamanho', obrigatorio: true, itens: [{ nome: '150 ml', preco: 0 }, { nome: '300 ml', preco: 18 }] } },
      { id: 'p7', cat: 'cabelo', nome: 'Pente de madeira', desc: 'Dentes largos, ideal para cabelo molhado.', preco: 19.9 },
      { id: 'p8', cat: 'unhas', nome: 'Base fortalecedora', desc: 'Para unhas fracas e que descamam.', preco: 14.9, figura: 'esmalte', cor: '#f3e6ef' },
      { id: 'p9', cat: 'unhas', nome: 'Óleo de cutícula', desc: 'Com caneta aplicadora. Aroma de amêndoas.', preco: 16.9, figura: 'oleo', cor: '#f0c35b' },
      { id: 'p10', cat: 'unhas', nome: 'Lixa profissional (kit com 5)', desc: 'Grão 100/180.', preco: 12.0 },
      { id: 'p11', cat: 'pele', nome: 'Hidratante corporal 200 ml', desc: 'Toque seco, absorção rápida.', preco: 29.9, figura: 'bisnaga', cor: '#6cc4a1' },
      { id: 'p12', cat: 'pele', nome: 'Sérum facial vitamina C', desc: 'Uniformiza o tom da pele. 30 ml.', preco: 69.9, de: 79.9, figura: 'oleo', cor: '#f5a623' },
      { id: 'p13', cat: 'pele', nome: 'Esfoliante de açúcar', desc: 'Para corpo e pés. Pote 250 g.', preco: 32.0, figura: 'pote', cor: '#ef7c8e' },
      { id: 'p14', cat: 'presentes', nome: 'Kit hidratação completa', desc: 'Shampoo + condicionador + máscara, com embalagem para presente.', preco: 119.9, de: 131.7, figura: 'kit', cor: '#3d35f5', selo: 'Presente' },
      { id: 'p15', cat: 'presentes', nome: 'Vale-presente', desc: 'Vale para usar em qualquer serviço do salão.', preco: 50, figura: 'vale', cor: '#1b1a3d',
        opcoes: { titulo: 'Valor do vale', obrigatorio: true, itens: [{ nome: 'R$ 50', preco: 0 }, { nome: 'R$ 100', preco: 50 }, { nome: 'R$ 200', preco: 150 }] } }
    ]
  };

  /* ---------------- utilidades ---------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const slot = (n) => $(`[data-slot="${n}"]`);
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const icone = {
    mais: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    lixo: '<svg class="i" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    wa: '<svg class="i" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
    escudo: '<svg class="i" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>',
    relogio: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    pino: '<svg class="i" viewBox="0 0 24 24"><path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    cartao: '<svg class="i" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    moto: '<svg class="i" viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 7.5M5.5 17.5 9 10h6l3.5 7.5"/></svg>',
    insta: '<svg class="i" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>'
  };

  /* ---------------- ilustrações (sem fotos de terceiros) ---------------- */
  function figura(tipo, cor, inteira) {
    const c = cor || '#8c86ff';
    const fundo = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity=".42"/></linearGradient></defs><rect width="200" height="200" fill="#f7f6fd"/><rect width="200" height="200" fill="url(#g)"/><circle cx="160" cy="40" r="46" fill="#fff" opacity=".35"/><ellipse cx="100" cy="172" rx="56" ry="8" fill="#1b1a3d" opacity=".12"/>`;
    const brilho = 'fill="#fff" opacity=".45"';
    const f = {
      frasco: `<rect x="86" y="30" width="28" height="16" rx="3" fill="#1b1a3d"/><rect x="70" y="44" width="60" height="126" rx="18" fill="${c}"/><rect x="80" y="86" width="40" height="44" rx="6" fill="#fff" opacity=".85"/><rect x="78" y="54" width="8" height="100" rx="4" ${brilho}/>`,
      pote: `<rect x="56" y="70" width="88" height="22" rx="6" fill="#1b1a3d"/><rect x="52" y="90" width="96" height="80" rx="16" fill="${c}"/><rect x="66" y="112" width="68" height="34" rx="6" fill="#fff" opacity=".85"/><rect x="60" y="98" width="8" height="60" rx="4" ${brilho}/>`,
      bisnaga: `<path d="M68 40h64l-8 112H76Z" fill="${c}"/><rect x="66" y="32" width="68" height="10" rx="3" fill="#fff" opacity=".9"/><rect x="84" y="150" width="32" height="22" rx="5" fill="#1b1a3d"/><rect x="82" y="72" width="36" height="40" rx="6" fill="#fff" opacity=".85"/>`,
      esmalte: `<rect x="86" y="28" width="28" height="60" rx="6" fill="#1b1a3d"/><rect x="62" y="84" width="76" height="86" rx="20" fill="${c}"/><rect x="72" y="94" width="10" height="62" rx="5" ${brilho}/>`,
      oleo: `<circle cx="100" cy="40" r="14" fill="#1b1a3d"/><rect x="92" y="46" width="16" height="22" fill="#1b1a3d"/><rect x="72" y="66" width="56" height="104" rx="14" fill="${c}" opacity=".9"/><rect x="82" y="100" width="36" height="38" rx="6" fill="#fff" opacity=".85"/><rect x="78" y="74" width="7" height="86" rx="3.5" ${brilho}/>`,
      kit: `<rect x="40" y="80" width="120" height="90" rx="12" fill="${c}"/><rect x="36" y="66" width="128" height="24" rx="8" fill="${c}"/><rect x="94" y="66" width="12" height="104" fill="#fff" opacity=".8"/><path d="M100 66c-14-26-40-22-32-6 6 10 32 6 32 6Zm0 0c14-26 40-22 32-6-6 10-32 6-32 6Z" fill="#fff" opacity=".9"/>`,
      vale: `<rect x="30" y="60" width="140" height="88" rx="14" fill="${c}"/><circle cx="30" cy="104" r="12" fill="#f7f6fd"/><circle cx="170" cy="104" r="12" fill="#f7f6fd"/><text x="100" y="98" text-anchor="middle" font-family="Bricolage Grotesque,system-ui" font-weight="800" font-size="20" fill="#fff">VALE</text><text x="100" y="122" text-anchor="middle" font-family="Manrope,system-ui" font-weight="700" font-size="12" fill="#fff" opacity=".75">PRESENTE</text>`
    };
    return `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid ${inteira ? 'meet' : 'slice'}" aria-hidden="true">${fundo}${f[tipo] || ''}</svg>`;
  }
  const visual = (p, inteira) => (p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:${inteira ? 'contain' : 'cover'}">` : p.figura ? figura(p.figura, p.cor, inteira) : '');

  /* ---------------- horário de funcionamento ---------------- */
  const minutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  function situacao(agora = new Date()) {
    const d = agora.getDay(); const m = agora.getHours() * 60 + agora.getMinutes();
    const hoje = LOJA.horarios[d];
    if (hoje && m >= minutos(hoje[0]) && m < minutos(hoje[1])) {
      const falta = minutos(hoje[1]) - m;
      return { aberto: true, detalhe: falta <= 60 ? `Fecha em ${falta} min.` : `Fecha às ${hoje[1]}` };
    }
    if (hoje && m < minutos(hoje[0])) return { aberto: false, detalhe: `Abre hoje às ${hoje[0]}` };
    for (let i = 1; i <= 7; i++) {
      const dia = (d + i) % 7; const h = LOJA.horarios[dia];
      if (h) return { aberto: false, detalhe: `Abre ${i === 1 ? 'amanhã' : DIAS[dia].toLowerCase()} às ${h[0]}` };
    }
    return { aberto: false, detalhe: 'Sem horário definido' };
  }
  function pintarStatus() {
    const s = situacao(); const el = slot('status');
    el.classList.toggle('fechado', !s.aberto);
    slot('status-titulo').textContent = s.aberto ? 'Aberto' : 'Fechado';
    slot('status-detalhe').textContent = s.detalhe;
  }

  /* ---------------- vitrine ---------------- */
  const sacola = new Map(); // chave -> { p, opcao, obs, qtd, unit }
  const qtdDoProduto = (id) => [...sacola.values()].filter((l) => l.p.id === id).reduce((a, l) => a + l.qtd, 0);

  function cartao(p) {
    const q = qtdDoProduto(p.id);
    const temFoto = !!(p.foto || p.figura);
    return `<button type="button" class="item ${temFoto ? '' : 'sem-foto'}" data-produto="${p.id}">
      ${q ? `<span class="qtd-chip">${q}</span>` : ''}
      <span class="item-txt">
        <span class="item-nome">${esc(p.nome)}</span>
        ${p.desc ? `<span class="item-desc">${esc(p.desc)}</span>` : ''}
        <span class="preco">${p.opcoes && p.opcoes.itens.some((o) => o.preco) ? 'A partir de ' : ''}${brl(p.preco)}${p.de ? `<s>${brl(p.de)}</s>` : ''}</span>
        ${p.selo ? `<span class="selo">${esc(p.selo)}</span>` : ''}
      </span>
      ${temFoto ? `<span class="foto">${visual(p)}<span class="mais" aria-hidden="true">${icone.mais}</span></span>` : `<span class="mais" aria-hidden="true">${icone.mais}</span>`}
      <span class="sr-only">Adicionar ${esc(p.nome)}</span>
    </button>`;
  }

  function pintarLista(filtro = '') {
    const f = norm(filtro.trim());
    const html = LOJA.categorias.map((c) => {
      const itens = LOJA.produtos.filter((p) => p.cat === c.id && (!f || norm(p.nome + ' ' + (p.desc || '')).includes(f)));
      if (!itens.length) return '';
      return `<section class="categoria" id="cat-${c.id}" data-cat="${c.id}"><h2>${esc(c.nome)}</h2>${itens.map(cartao).join('')}</section>`;
    }).join('');
    slot('lista').innerHTML = html || `<p class="vazio">Nenhum produto encontrado para “${esc(filtro)}”.</p>`;
    observarCategorias();
  }

  function pintarAbas() {
    slot('abas').innerHTML = LOJA.categorias.map((c, i) => `<a class="aba" href="#cat-${c.id}" data-aba="${c.id}" aria-current="${i === 0}">${esc(c.nome)}</a>`).join('');
  }
  function marcarAba(id) {
    document.querySelectorAll('[data-aba]').forEach((a) => {
      const ativo = a.dataset.aba === id; a.setAttribute('aria-current', ativo);
      if (ativo) { const box = slot('abas'); box.scrollTo({ left: a.offsetLeft - box.offsetLeft - 8, behavior: 'smooth' }); }
    });
  }
  let abaAtual = '';
  function observarCategorias() { abaAtual = ''; espiar(); }
  function espiar() {
    const secs = [...document.querySelectorAll('.categoria')]; if (!secs.length) return;
    let id = secs[0].dataset.cat;
    for (const sc of secs) { if (sc.getBoundingClientRect().top <= 110) id = sc.dataset.cat; }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) id = secs[secs.length - 1].dataset.cat;
    if (id !== abaAtual) { abaAtual = id; marcarAba(id); }
  }
  window.addEventListener('scroll', espiar, { passive: true });

  /* ---------------- folha (modal) ---------------- */
  let focoAnterior = null; let tFechar;
  function abrirFolha(titulo, corpo, pe) {
    clearTimeout(tFechar);
    if (slot('folha').hidden) focoAnterior = document.activeElement;
    slot('folha-titulo').textContent = titulo;
    slot('folha-corpo').innerHTML = corpo;
    slot('folha-pe').innerHTML = pe || '';
    slot('folha-pe').hidden = !pe;
    const fl = slot('folha'); fl.hidden = false;
    document.body.classList.add('travado');
    requestAnimationFrame(() => { fl.classList.add('aberta'); slot('fundo').classList.add('aberto'); $('[data-acao="fechar"]', fl).focus({ preventScroll: true }); });
    slot('folha-corpo').scrollTop = 0;
  }
  function fecharFolha() {
    const fl = slot('folha'); if (fl.hidden) return;
    fl.classList.remove('aberta'); slot('fundo').classList.remove('aberto');
    document.body.classList.remove('travado');
    tFechar = setTimeout(() => { fl.hidden = true; }, 260);
    focoAnterior && focoAnterior.focus && focoAnterior.focus({ preventScroll: true });
  }

  /* produto */
  let atual = null;
  function abrirProduto(id) {
    const p = LOJA.produtos.find((x) => x.id === id); if (!p) return;
    atual = { p, qtd: 1, opcao: null };
    const op = p.opcoes;
    const corpo = `
      ${p.foto || p.figura ? `<div class="produto-foto">${visual(p, true)}</div>` : ''}
      <h4 class="produto-nome">${esc(p.nome)}</h4>
      ${p.desc ? `<p class="produto-desc">${esc(p.desc)}</p>` : ''}
      <p class="preco">${brl(p.preco)}${p.de ? `<s>${brl(p.de)}</s>` : ''}</p>
      ${op ? `<div class="bloco"><p class="bloco-titulo"><span>${esc(op.titulo)}</span>${op.obrigatorio ? '<em>Obrigatório</em>' : ''}</p>
        ${op.itens.map((o, i) => `<label class="opcao"><span>${o.cor ? `<span style="display:inline-block;width:.9rem;height:.9rem;border-radius:50%;background:${esc(o.cor)};vertical-align:-2px;margin-right:.5rem;border:1px solid rgb(0 0 0/.1)"></span>` : ''}${esc(o.nome)}${o.preco ? ` <small>+ ${brl(o.preco)}</small>` : ''}</span><input type="radio" name="opcao" value="${i}"></label>`).join('')}</div>` : ''}
      <label class="rotulo" for="obs">Alguma observação?</label>
      <textarea id="obs" rows="2" maxlength="140" placeholder="Ex.: embrulhar para presente"></textarea>`;
    const pe = `<div class="linha-acao">
      <div class="passo"><button type="button" data-acao="qtd-menos" aria-label="Diminuir">${icone.menos}</button><output data-slot="p-qtd">1</output><button type="button" data-acao="qtd-mais" aria-label="Aumentar">${icone.mais}</button></div>
      <button type="button" class="btn btn-primary" data-acao="adicionar"><span>Adicionar</span><span data-slot="p-total"></span></button></div>`;
    abrirFolha('Adicionar à sacola', corpo, pe);
    atualizarProduto();
  }
  function unitario() { const o = atual.opcao != null ? atual.p.opcoes.itens[atual.opcao] : null; return atual.p.preco + (o && o.preco ? o.preco : 0); }
  function atualizarProduto() {
    slot('p-qtd').textContent = atual.qtd;
    slot('p-total').textContent = brl(unitario() * atual.qtd);
    $('[data-acao="qtd-menos"]').disabled = atual.qtd <= 1;
    const falta = atual.p.opcoes && atual.p.opcoes.obrigatorio && atual.opcao == null;
    $('[data-acao="adicionar"]').disabled = falta;
  }
  function adicionar() {
    const obs = ($('#obs') || {}).value ? $('#obs').value.trim() : '';
    const op = atual.opcao != null ? atual.p.opcoes.itens[atual.opcao].nome : '';
    const chave = [atual.p.id, op, obs].join('|');
    const linha = sacola.get(chave) || { p: atual.p, opcao: op, obs, qtd: 0, unit: unitario() };
    linha.qtd += atual.qtd; sacola.set(chave, linha);
    fecharFolha(); atualizarSacola(); avisar(`${atual.p.nome} adicionado`);
  }

  /* sacola */
  const subtotal = () => [...sacola.values()].reduce((a, l) => a + l.qtd * l.unit, 0);
  const totalItens = () => [...sacola.values()].reduce((a, l) => a + l.qtd, 0);
  function atualizarSacola() {
    const n = totalItens();
    slot('sacola-barra').classList.toggle('visivel', n > 0);
    slot('sacola-qtd').textContent = n;
    slot('sacola-total').textContent = brl(subtotal());
    const busca = slot('busca-campo').value; pintarLista(busca);
  }
  const pedido = { modo: LOJA.entrega ? 'entrega' : 'retirada', nome: '', endereco: '', pagamento: LOJA.pagamentos[0], troco: '' };
  function abrirSacola() {
    if (!sacola.size) return;
    const linhas = [...sacola.entries()].map(([k, l]) => `<div class="linha-sacola">
      <div class="mini">${visual(l.p)}</div>
      <div class="txt"><b>${esc(l.p.nome)}</b>${l.opcao ? `<small>${esc(l.opcao)}</small>` : ''}${l.obs ? `<small>Obs.: ${esc(l.obs)}</small>` : ''}<small><b>${brl(l.unit * l.qtd)}</b></small></div>
      <div class="passo"><button type="button" data-linha-menos="${esc(k)}" aria-label="Diminuir">${l.qtd === 1 ? icone.lixo : icone.menos}</button><output>${l.qtd}</output><button type="button" data-linha-mais="${esc(k)}" aria-label="Aumentar">${icone.mais}</button></div>
    </div>`).join('');
    const corpo = `${linhas}
      ${LOJA.entrega ? `<p class="rotulo">Como prefere receber?</p>
      <div class="segmento" role="radiogroup">
        <label><input type="radio" name="modo" value="entrega" ${pedido.modo === 'entrega' ? 'checked' : ''}><span>Entrega</span></label>
        <label><input type="radio" name="modo" value="retirada" ${pedido.modo === 'retirada' ? 'checked' : ''}><span>Retirar no salão</span></label>
      </div>` : ''}
      <label class="rotulo" for="ped-nome">Seu nome</label>
      <input class="campo" id="ped-nome" data-campo="nome" autocomplete="given-name" maxlength="60" value="${esc(pedido.nome)}" placeholder="Como a loja deve te chamar">
      <div data-slot="bloco-endereco" ${pedido.modo === 'entrega' ? '' : 'hidden'}>
        <label class="rotulo" for="ped-end">Endereço de entrega</label>
        <textarea id="ped-end" data-campo="endereco" rows="2" maxlength="200" autocomplete="street-address" placeholder="Rua, número, bairro e ponto de referência">${esc(pedido.endereco)}</textarea>
      </div>
      <label class="rotulo" for="ped-pag">Forma de pagamento</label>
      <select class="campo" id="ped-pag" data-campo="pagamento">${LOJA.pagamentos.map((p) => `<option ${p === pedido.pagamento ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
      <div data-slot="bloco-troco" ${/dinheiro/i.test(pedido.pagamento) ? '' : 'hidden'}>
        <label class="rotulo" for="ped-troco">Troco para quanto? (opcional)</label>
        <input class="campo" id="ped-troco" data-campo="troco" inputmode="decimal" maxlength="10" value="${esc(pedido.troco)}" placeholder="Ex.: 100">
      </div>
      <div class="totais" data-slot="totais"></div>
      <p class="aviso">${icone.escudo}<span>Seus dados vão só na mensagem do WhatsApp para a loja. Este site não grava nome, endereço nem pedido.</span></p>`;
    const pe = `<button type="button" class="btn btn-wa" data-acao="enviar">${icone.wa}<span>Enviar pedido no WhatsApp</span></button>`;
    if (slot('folha').hidden) abrirFolha('Sua sacola', corpo, pe);
    else { slot('folha-titulo').textContent = 'Sua sacola'; slot('folha-corpo').innerHTML = corpo; slot('folha-pe').innerHTML = pe; slot('folha-pe').hidden = false; }
    atualizarTotais();
  }
  function atualizarTotais() {
    const sub = subtotal(); const taxa = pedido.modo === 'entrega' ? LOJA.taxaEntrega : 0;
    const faltaMin = Math.max(0, LOJA.pedidoMinimo - sub);
    slot('totais').innerHTML = `<div><span>Subtotal</span><span>${brl(sub)}</span></div>
      ${pedido.modo === 'entrega' ? `<div><span>Taxa de entrega</span><span>${taxa ? brl(taxa) : 'Grátis'}</span></div>` : ''}
      <div class="total"><span>Total</span><span>${brl(sub + taxa)}</span></div>
      ${faltaMin ? `<div style="color:rgb(var(--bad));font-weight:700"><span>Faltam ${brl(faltaMin)} para o pedido mínimo de ${brl(LOJA.pedidoMinimo)}</span></div>` : ''}`;
    const btn = $('[data-acao="enviar"]');
    if (btn) btn.disabled = faltaMin > 0 || (pedido.modo === 'entrega' && pedido.endereco.trim().length < 8);
  }
  function mensagem() {
    const taxa = pedido.modo === 'entrega' ? LOJA.taxaEntrega : 0;
    const linhas = [...sacola.values()].map((l) => `• ${l.qtd}x ${l.p.nome}${l.opcao ? ` (${l.opcao})` : ''} — ${brl(l.unit * l.qtd)}${l.obs ? `\n   Obs.: ${l.obs}` : ''}`);
    return [
      `Olá, ${LOJA.nome}! Quero fazer um pedido pela vitrine:`, '',
      ...linhas, '',
      `Subtotal: ${brl(subtotal())}`,
      pedido.modo === 'entrega' ? `Entrega: ${taxa ? brl(taxa) : 'grátis'}` : 'Vou retirar no salão',
      `*Total: ${brl(subtotal() + taxa)}*`, '',
      pedido.nome.trim() ? `Nome: ${pedido.nome.trim()}` : '',
      pedido.modo === 'entrega' ? `Endereço: ${pedido.endereco.trim()}` : '',
      `Pagamento: ${pedido.pagamento}${/dinheiro/i.test(pedido.pagamento) && pedido.troco.trim() ? ` (troco para R$ ${pedido.troco.trim()})` : ''}`
    ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
  }
  function enviar() {
    const url = `https://wa.me/${LOJA.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem())}`;
    window.open(url, '_blank', 'noopener');
  }

  /* informação */
  function abrirInfo() {
    const hoje = new Date().getDay();
    const tabela = DIAS.map((d, i) => { const h = LOJA.horarios[i]; return `<tr class="${i === hoje ? 'hoje' : ''}"><td>${d}</td><td>${h ? `${h[0]} – ${h[1]}` : 'Fechado'}</td></tr>`; }).join('');
    abrirFolha('Informação', `<div class="info-lista">
      <div>${icone.pino}<span><b>Endereço</b><br>${esc(LOJA.endereco)}</span></div>
      ${LOJA.entrega ? `<div>${icone.moto}<span><b>Entrega</b><br>${esc(LOJA.prazo)}<br>Taxa: ${brl(LOJA.taxaEntrega)} · Pedido mínimo: ${brl(LOJA.pedidoMinimo)}</span></div>` : ''}
      <div>${icone.cartao}<span><b>Pagamento</b><br>${LOJA.pagamentos.map(esc).join(' · ')}</span></div>
      ${LOJA.instagram ? `<div>${icone.insta}<span><b>Instagram</b><br>${esc(LOJA.instagram)}</span></div>` : ''}
      <div>${icone.relogio}<span style="flex:1"><b>Horário de funcionamento</b><table class="horarios">${tabela}</table></span></div>
    </div>`);
  }
  function abrirMenu() {
    abrirFolha('Categorias', `<div class="menu-cat">${LOJA.categorias.map((c) => `<button type="button" data-ir="${c.id}"><span>${esc(c.nome)}</span><small>${LOJA.produtos.filter((p) => p.cat === c.id).length} itens</small></button>`).join('')}</div>`);
  }

  let tToast;
  function avisar(txt) { const t = slot('toast'); t.textContent = txt; t.classList.add('mostrar'); clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('mostrar'), 1800); }

  /* ---------------- eventos ---------------- */
  document.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-acao],[data-produto],[data-ir],[data-linha-mais],[data-linha-menos]');
    if (!alvo) return;
    if (alvo.dataset.produto) return abrirProduto(alvo.dataset.produto);
    if (alvo.dataset.ir) { fecharFolha(); const s = document.getElementById('cat-' + alvo.dataset.ir); s && setTimeout(() => s.scrollIntoView({ behavior: 'smooth' }), 120); return; }
    if (alvo.dataset.linhaMais || alvo.dataset.linhaMenos) {
      const k = alvo.dataset.linhaMais || alvo.dataset.linhaMenos; const l = sacola.get(k); if (!l) return;
      l.qtd += alvo.dataset.linhaMais ? 1 : -1; if (l.qtd <= 0) sacola.delete(k);
      atualizarSacola(); if (!sacola.size) fecharFolha(); else abrirSacola(); return;
    }
    switch (alvo.dataset.acao) {
      case 'fechar': fecharFolha(); break;
      case 'info': abrirInfo(); break;
      case 'menu': abrirMenu(); break;
      case 'sacola': abrirSacola(); break;
      case 'enviar': enviar(); break;
      case 'adicionar': adicionar(); break;
      case 'qtd-mais': atual.qtd = Math.min(99, atual.qtd + 1); atualizarProduto(); break;
      case 'qtd-menos': atual.qtd = Math.max(1, atual.qtd - 1); atualizarProduto(); break;
      case 'busca': {
        const b = slot('busca'); const aberta = b.classList.toggle('aberta'); alvo.setAttribute('aria-expanded', aberta);
        if (aberta) slot('busca-campo').focus(); else { slot('busca-campo').value = ''; pintarLista(); }
        break;
      }
      case 'limpar-busca': slot('busca-campo').value = ''; pintarLista(); slot('busca-campo').focus(); break;
    }
  });
  slot('fundo').addEventListener('click', fecharFolha);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharFolha(); });
  document.addEventListener('change', (e) => {
    if (e.target.name === 'opcao' && atual) { atual.opcao = Number(e.target.value); atualizarProduto(); }
    if (e.target.name === 'modo') { pedido.modo = e.target.value; slot('bloco-endereco').hidden = pedido.modo !== 'entrega'; atualizarTotais(); }
    if (e.target.dataset.campo === 'pagamento') { pedido.pagamento = e.target.value; slot('bloco-troco').hidden = !/dinheiro/i.test(pedido.pagamento); }
  });
  document.addEventListener('input', (e) => {
    const c = e.target.dataset.campo;
    if (c === 'nome' || c === 'endereco' || c === 'troco') { pedido[c] = e.target.value; if (c === 'endereco') atualizarTotais(); }
    if (e.target === slot('busca-campo')) pintarLista(e.target.value);
  });
  slot('abas').addEventListener('click', (e) => {
    const a = e.target.closest('[data-aba]'); if (!a) return;
    e.preventDefault(); marcarAba(a.dataset.aba);
    const s = document.getElementById('cat-' + a.dataset.aba); s && s.scrollIntoView({ behavior: 'smooth' });
  });
  const barra = slot('barra');
  window.addEventListener('scroll', () => barra.classList.toggle('colada', barra.getBoundingClientRect().top <= 0), { passive: true });

  /* ---------------- início ---------------- */
  document.title = `${LOJA.nome} · Peça pelo WhatsApp`;
  slot('nome').textContent = LOJA.nome;
  slot('logo').textContent = LOJA.sigla;
  slot('endereco').textContent = LOJA.endereco;
  slot('capa-texto').innerHTML = `${esc(LOJA.capa[0])}<br>${esc(LOJA.capa[1])}<small>${esc(LOJA.capa[2] || '')}</small>`;
  pintarStatus(); setInterval(pintarStatus, 60000);
  pintarAbas(); pintarLista();
})();
