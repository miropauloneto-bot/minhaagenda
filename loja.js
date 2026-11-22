/* =====================================================================
   LOJA.JS — página pública dos nichos de PEDIDO (marmitarias, passeios...).
     loja.html?n=slug-do-negocio  → cardápio/pacotes reais do Supabase
     loja.html?demo=marmitaria    → demonstração sem banco (nada é gravado)
   Monta os dados e entrega para o catalogo.js (o mesmo motor da vitrine).
   ===================================================================== */
window.LOJA_ASYNC = true;
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const demoId = params.get('demo');
  const slug = (params.get('n') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  const $ = (s) => document.querySelector(s);
  const slotEl = (n) => $(`[data-slot="${n}"]`);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const idCat = (s) => (U.slugify(s) || 'outros');

  function falhar(titulo, texto) {
    const c = slotEl('carregando');
    c.classList.add('erro');
    slotEl('carregando-titulo').textContent = titulo;
    slotEl('carregando-texto').textContent = texto || '';
    slotEl('carregando-voltar').hidden = false;
  }

  /* dia_semana → [['abre','fecha'], ...] (aceita mais de uma faixa por dia) */
  function horariosPorDia(lista) {
    const out = [null, null, null, null, null, null, null];
    lista.forEach(([d, abre, fecha]) => { (out[d] = out[d] || []).push([abre, fecha]); });
    return out;
  }

  /* categorias na ordem em que aparecem nos itens */
  function categoriasDe(produtos) {
    const vistas = new Map();
    produtos.forEach((p) => { if (!vistas.has(p.cat)) vistas.set(p.cat, { id: p.cat, nome: p.catNome }); });
    return [...vistas.values()];
  }

  /* grupos de escolha vindos do banco/nicho → formato do motor.
     Mantém a mesma ordem e quantidade do banco: o pedido manda as POSIÇÕES marcadas e o banco confere. */
  function gruposValidos(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.map((g) => {
      const itens = (Array.isArray(g?.itens) ? g.itens : []).map((o) => ({ nome: String(o?.nome || '—').slice(0, 80), preco: Math.max(0, Number(o?.preco) || 0) }));
      const max = Math.max(1, Math.min(Number(g?.max) || 1, itens.length || 1));
      const min = Math.max(0, Math.min(Number(g?.min) || 0, max, itens.length));
      return { titulo: String(g?.titulo || 'Escolha').slice(0, 60), min, max, itens };
    });
  }

  function textoDoNicho(p) {
    return Object.assign({ origem: p.loja.origem }, p.loja.textos);
  }

  function deDemo(id) {
    const p = NICHOS[id];
    const produtos = p.servicos.map((s, i) => ({
      id: `d${i}`, cat: idCat(s.categoria), catNome: s.categoria, nome: s.nome, desc: s.descricao, preco: s.preco,
      de: s.preco_de || null, selo: s.selo || '', figura: s.figura, cor: s.cor, grupos: gruposValidos(s.opcoes)
    }));
    const outros = Object.entries(NICHOS).filter(([, n]) => n.modo === 'pedido')
      .map(([k, n]) => `<a href="loja.html?demo=${k}" aria-current="${k === id}">${esc(n.emoji)} ${esc(n.rotulo.split(' & ')[0])}</a>`).join('');
    const faixa = slotEl('demo-faixa');
    faixa.innerHTML = `Demonstração do <a href="index.html#demo">${esc(CONFIG.produto?.nome || 'MinhaAgenda')}</a>: dados fictícios, nenhum pedido é gravado.<span class="trocar">${outros}</span>`;
    faixa.hidden = false;
    return {
      nome: p.nomeDemo, subtitulo: p.rotulo.split(' & ')[0].toLowerCase(), cor: U.rgbParaHex(p.tema.brand),
      endereco: [`Rua Exemplo, 123`, CONFIG.produto?.cidade].filter(Boolean).join(' - '),
      whatsapp: CONFIG.produto?.whatsapp || '', instagram: '',
      entrega: p.loja.entrega, taxaEntrega: p.loja.taxa, pedidoMinimo: p.loja.minimo, prazo: p.loja.prazo,
      pagamentos: p.loja.pagamentos.split(',').map((x) => x.trim()).filter(Boolean),
      horarios: horariosPorDia(p.horarios), textos: textoDoNicho(p), tituloPagina: p.hero.selo,
      categorias: categoriasDe(produtos), produtos,
      /* demonstração: simula o registro do pedido (nada é gravado) */
      salvarPedido: async () => { await new Promise((ok) => setTimeout(ok, 500)); return { numero: 1 + Math.floor(Math.random() * 40) }; }
    };
  }

  const COLS = 'id,slug,nome,nicho,whatsapp,instagram,endereco,cidade,cor_principal,ativo,faz_entrega,taxa_entrega,pedido_minimo,formas_pagamento,prazo_entrega';
  async function doBanco() {
    const sb = U.sb();
    const { data: n, error } = await sb.from('negocios').select(COLS).eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!n || !n.ativo) return null;
    const p = nichoPorId(n.nicho);
    if (p.modo !== 'pedido') { location.replace(`agendar.html?n=${encodeURIComponent(slug)}`); return 'redirecionado'; }
    const [sv, hr] = await Promise.all([
      sb.from('servicos').select('id,nome,descricao,preco,preco_de,categoria,selo,img_url,opcoes').eq('negocio_id', n.id).eq('ativo', true).order('ordem').order('nome'),
      sb.from('horarios').select('dia_semana,abre,fecha').eq('negocio_id', n.id).order('dia_semana').order('abre')
    ]);
    const erro = [sv, hr].find((r) => r.error);
    if (erro) throw erro.error;
    const produtos = sv.data.map((s) => ({
      id: s.id, cat: idCat(s.categoria || 'Outros'), catNome: s.categoria || 'Outros', nome: s.nome, desc: s.descricao,
      preco: Number(s.preco) || 0, de: s.preco_de ? Number(s.preco_de) : null, selo: s.selo || '',
      foto: U.urlSegura(s.img_url) && /^https:/i.test(s.img_url) ? s.img_url : '', grupos: gruposValidos(s.opcoes)
    }));
    return {
      nome: n.nome, subtitulo: p.rotulo.split(' & ')[0].toLowerCase(),
      cor: n.cor_principal || U.rgbParaHex(p.tema.brand),
      endereco: [n.endereco, n.cidade].filter(Boolean).join(' - '),
      whatsapp: n.whatsapp, instagram: n.instagram ? `@${U.instagramUser(n.instagram)}` : '',
      entrega: !!n.faz_entrega, taxaEntrega: Number(n.taxa_entrega) || 0, pedidoMinimo: Number(n.pedido_minimo) || 0, prazo: n.prazo_entrega || '',
      pagamentos: String(n.formas_pagamento || '').split(',').map((x) => x.trim()).filter(Boolean),
      horarios: horariosPorDia(hr.data.map((h) => [h.dia_semana, h.abre.slice(0, 5), h.fecha.slice(0, 5)])),
      textos: textoDoNicho(p), tituloPagina: p.hero.selo,
      categorias: categoriasDe(produtos), produtos,
      /* grava o pedido no painel do negócio; o banco recalcula preços e devolve o nº do pedido */
      async salvarPedido(x) {
        const { data, error } = await sb.rpc('criar_pedido', {
          p_slug: slug, p_itens: x.itens, p_nome: x.nome, p_whatsapp: x.fone, p_modo: x.modo,
          p_endereco: x.endereco, p_pagamento: x.pagamento, p_troco: x.troco, p_obs: ''
        });
        if (error) throw new Error(U.msgErro(error));
        return data;
      }
    };
  }

  async function iniciar() {
    let dados;
    try {
      if (demoId) {
        if (!NICHOS[demoId]) return falhar('Demonstração não encontrada', 'Escolha um dos tipos de negócio na página inicial.');
        if (NICHOS[demoId].modo !== 'pedido') { location.replace(`agendar.html?demo=${encodeURIComponent(demoId)}`); return; }
        dados = deDemo(demoId);
      } else if (slug) {
        if (!U.configurado()) return falhar('Sistema ainda não configurado', 'Preencha o endereço e a chave do Supabase em config.js.');
        dados = await doBanco();
        if (dados === 'redirecionado') return;
        if (!dados) return falhar('Página não encontrada', 'Este negócio não existe ou está temporariamente fora do ar.');
      } else {
        return falhar('Qual negócio?', 'Abra o link que o estabelecimento enviou para você.');
      }
    } catch (e) {
      return falhar('Não foi possível carregar', U.msgErro(e));
    }
    if (!dados.produtos.length) return falhar(`${dados.nome}`, 'Ainda não há itens cadastrados. Volte em breve.');
    if (typeof window.iniciarLoja !== 'function') await new Promise((ok) => window.addEventListener('DOMContentLoaded', ok, { once: true }));
    window.iniciarLoja(dados);
    slotEl('carregando').hidden = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
