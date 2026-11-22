/* =====================================================================
   COMUM.JS — funções usadas por todas as páginas.
   ===================================================================== */
window.U = (() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => (Number(v) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Grátis');
  const fmtDur = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`);
  const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
  const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const dataLonga = (iso) => parseISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
  const soDigitos = (s) => String(s ?? '').replace(/\D/g, '');
  const icons = () => window.lucide && window.lucide.createIcons();

  /* Hora local (HH:MM) e data (YYYY-MM-DD) de um timestamp, no fuso do negócio */
  const horaNoFuso = (ts, fuso) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: fuso });
  const dataNoFuso = (ts, fuso) => new Date(ts).toLocaleDateString('en-CA', { timeZone: fuso });
  /* Converte data + hora locais do negócio em timestamp ISO (funciona para fusos do Brasil e outros) */
  function localParaISO(iso, hhmm, fuso) {
    const alvo = new Date(`${iso}T${hhmm}:00Z`);
    const partes = new Intl.DateTimeFormat('en-US', { timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(alvo).reduce((o, p) => ({ ...o, [p.type]: p.value }), {});
    const comoUTC = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute);
    return new Date(alvo.getTime() - (comoUTC - alvo.getTime())).toISOString();
  }

  function mascaraFone(v) {
    const d = soDigitos(v).slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  }
  /* WhatsApp com DDI 55 se o número vier só com DDD */
  const foneWa = (v) => { const d = soDigitos(v); return d.length <= 11 ? `55${d}` : d; };
  const waLink = (numero, msg) => `https://wa.me/${foneWa(numero)}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;

  /* ---------- Tema ---------- */
  const hexParaRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`; };
  const rgbParaHex = (rgb) => '#' + rgb.split(' ').map((x) => Number(x).toString(16).padStart(2, '0')).join('');
  function contraste(rgb) {
    const [r, g, b] = rgb.split(' ').map((x) => { const c = Number(x) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '18 18 18' : '255 255 255';
  }
  function aplicarTema(tema, corHex) {
    const t = { ...tema };
    if (corHex && /^#[0-9a-f]{6}$/i.test(corHex)) { t.brand = hexParaRgb(corHex); t.brandContrast = contraste(t.brand); }
    const mapa = { brand: '--c-brand', brandContrast: '--c-brand-contrast', accent: '--c-accent', bg: '--c-bg', surface: '--c-surface', sunken: '--c-sunken', text: '--c-text', muted: '--c-muted', line: '--c-line' };
    const root = document.documentElement.style;
    Object.entries(mapa).forEach(([k, v]) => t[k] && root.setProperty(v, t[k]));
    const fontes = { serif: "'Fraunces'", condensed: "'Oswald'", sans: "'Bricolage Grotesque'" };
    root.setProperty('--font-display', fontes[t.fonte] || fontes.sans);
    const meta = $('meta[name="theme-color"]');
    if (meta && t.brand) meta.content = rgbParaHex(t.brand);
  }

  /* ---------- Supabase ---------- */
  const configurado = () => {
    const c = window.CONFIG || {};
    return /^https?:\/\/.+/.test(c.supabaseUrl || '') && !/SEU-PROJETO/.test(c.supabaseUrl) && c.supabaseKey && !/COLE_AQUI/.test(c.supabaseKey);
  };
  let cliente = null;
  const sb = () => {
    if (!cliente && configurado() && window.supabase) cliente = window.supabase.createClient(window.CONFIG.supabaseUrl, window.CONFIG.supabaseKey);
    return cliente;
  };

  /* ---------- Segurança: só deixa passar links http(s) e textos limpos ---------- */
  const urlSegura = (u) => { try { const x = new URL(String(u || '').trim()); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const limparTexto = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const instagramUser = (s) => String(s || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30);

  /* ---------- Armazenamento local (pode falhar em aba anônima) ---------- */
  const lsGet = (k, padrao = null) => { try { const v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch { return padrao; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignora */ } };

  /* Mensagem amigável para erros do banco */
  const CODIGOS = {
    SEM_PERMISSAO: 'Você não tem permissão para isso.', SEM_LOGIN: 'Entre na sua conta para continuar.',
    NEGOCIO_NAO_ENCONTRADO: 'Este negócio não está disponível agora.', STATUS_INVALIDO: 'Ação inválida.',
    MUITAS_TENTATIVAS: 'Muitas reservas seguidas. Espere alguns minutos e tente de novo.'
  };
  function msgErro(err) {
    if (!err) return 'Algo deu errado. Tente de novo.';
    if (err.hint) return err.hint;
    const m = err.message || String(err);
    if (CODIGOS[m]) return CODIGOS[m];
    if (err.code === '23P01' || /sem_conflito/.test(m)) return 'Já existe um agendamento nesse horário para esse profissional.';
    const REGRAS = {
      negocios_maps_seguro: 'O link do mapa precisa começar com https:// (copie do Google Maps em "Compartilhar").',
      negocios_instagram_valido: 'Instagram: use só o nome do perfil, sem espaços (ex.: studiobella).',
      negocios_whatsapp_valido: 'WhatsApp: use só números, com DDD.',
      negocios_textos_tamanho: 'Algum texto ficou longo demais. Encurte e tente de novo.',
      portfolio_img_segura: 'Endereço de imagem inválido.',
      agendamentos_textos_tamanho: 'Nome, WhatsApp ou observação fora do formato esperado.',
      servicos_textos_tamanho: 'Descrição ou categoria longas demais.',
      depoimentos_textos_tamanho: 'Depoimento longo demais.'
    };
    const regra = Object.keys(REGRAS).find((k) => m.includes(k));
    if (regra) return REGRAS[regra];
    if (err.code === '23505' && /slug/.test(m)) return 'Esse link já está em uso. Escolha outro.';
    if (/(faz_entrega|taxa_entrega|pedido_minimo|formas_pagamento|prazo_entrega|opcoes|preco_de|img_url|selo)/.test(m) && /column|schema cache/i.test(m)) return 'Falta rodar a atualização do banco (arquivo atualizacao-v4.sql) no Supabase. Veja o README.';
    if (/pedidos|criar_pedido/.test(m) && /does not exist|schema cache|Could not find/i.test(m)) return 'Falta rodar a atualização do banco (arquivo atualizacao-v5.sql) no Supabase. Veja o README.';
    if (/servicos_pedido_formato|negocios_pedido_formato/.test(m)) return 'Algum campo ficou fora do formato (etiqueta muito longa, foto inválida ou preço negativo).';
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (/User already registered/i.test(m)) return 'Esse e-mail já tem conta. Use "Entrar".';
    if (/Password should be|weak_password|Password is known/i.test(m)) return 'Escolha uma senha mais forte: pelo menos 8 caracteres, misturando letras e números.';
    if (/rate limit/i.test(m)) return 'Muitas tentativas seguidas. Espere alguns minutos.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet.';
    return m;
  }

  function toast(msg, tipo = 'ok') {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.setAttribute('role', 'status');
      t.className = 'fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[60] max-w-[90vw] rounded-2xl px-5 py-3 text-sm font-semibold shadow-2xl transition duration-300 opacity-0 translate-y-2 pointer-events-none';
      document.body.appendChild(t);
    }
    t.style.background = tipo === 'erro' ? '#b91c1c' : 'rgb(var(--c-text))';
    t.style.color = tipo === 'erro' ? '#fff' : 'rgb(var(--c-bg))';
    t.textContent = msg;
    t.classList.remove('opacity-0', 'translate-y-2');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add('opacity-0', 'translate-y-2'), tipo === 'erro' ? 5000 : 2800);
  }

  function revelar() {
    const els = $$('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('is-visible'));
    const ob = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); ob.unobserve(en.target); } }), { threshold: 0.1 });
    els.forEach((el) => ob.observe(el));
  }

  return { urlSegura, limparTexto, instagramUser, lsGet, lsSet, $, $$, esc, brl, fmtDur, toMin, toHHMM, isoDate, parseISO, dataLonga, slugify, soDigitos, icons, horaNoFuso, dataNoFuso, localParaISO, mascaraFone, foneWa, waLink, hexParaRgb, rgbParaHex, aplicarTema, configurado, sb, msgErro, toast, revelar };
})();
